import { readFileSync, statSync, watch, type FSWatcher } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import {
  buildSnapshot,
  findSpoolPath,
  lastSeqOf,
  listInboxDirectory,
  mergeSpool,
  parseSpool,
  spoolModeWarning,
  readOwnNkey,
  selfPrefix,
  type VclawInboxMessage,
  type VclawInboxSnapshot,
} from './inbox-spool'
import { inboxSpoolDirectory } from './vclaw-sdk-root'

/**
 * Watches the vclaw inbox directory and serves the pane's snapshot.
 *
 * Design constraints that come straight from the frozen spool contract:
 * - watch the DIRECTORY, not the file: a --prune rewrite or any rename replaces the
 *   inode, and a file watch would go silent on the exact event that matters;
 * - re-read whole and merge by `seq`: rows already shown are never dropped when the
 *   file is replaced with a shorter one;
 * - no byte offsets anywhere, so truncation cannot desynchronise the pane.
 */
export interface VclawInboxServiceOptions {
  /** Absolute home directory; injected so tests never touch the real one. */
  home?: string
  /** TRUE while a harness session is open on this host — the LIVE half of the vocabulary. */
  isSessionOpen: () => boolean
  /** Called whenever the snapshot changes; the IPC layer fans it out to renderers. */
  onChange?: (snapshot: VclawInboxSnapshot) => void
  /** Injected in tests; defaults to the real filesystem. */
  readFile?: (path: string) => string
  listDirectory?: (path: string) => string[]
  /** Injected in tests; defaults to real stat (mode is what the warning needs). */
  statFile?: (path: string) => { mode: number }
  now?: () => Date
  /** Debounce for directory events, in ms. */
  debounceMs?: number
}

export class VclawInboxService {
  private readonly home: string
  private readonly isSessionOpen: () => boolean
  private readonly onChange: ((snapshot: VclawInboxSnapshot) => void) | undefined
  private readonly readFileImpl: (path: string) => string
  private readonly listDirectoryImpl: (path: string) => string[]
  private readonly statFileImpl: (path: string) => { mode: number }
  private readonly now: () => Date
  private readonly debounceMs: number
  private watcher: FSWatcher | null = null
  private timer: NodeJS.Timeout | undefined
  private seen: VclawInboxMessage[] = []
  private snapshotValue: VclawInboxSnapshot
  private started = false
  private readonly listeners = new Set<(snapshot: VclawInboxSnapshot) => void>()

  constructor(options: VclawInboxServiceOptions) {
    this.home = options.home ?? homedir()
    this.isSessionOpen = options.isSessionOpen
    this.onChange = options.onChange
    this.readFileImpl = options.readFile ?? ((path) => readFileSync(path, 'utf8'))
    this.listDirectoryImpl = options.listDirectory ?? listInboxDirectory
    this.statFileImpl = options.statFile ?? ((path) => statSync(path))
    this.now = options.now ?? (() => new Date())
    this.debounceMs = options.debounceMs ?? 120
    this.snapshotValue = this.computeSnapshot()
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.refresh(true)
    try {
      this.watcher = watch(inboxSpoolDirectory(this.home), { persistent: false }, () => this.schedule())
      this.watcher.on('error', () => this.schedule())
    } catch {
      // No inbox directory yet (no identity, or no message ever received). The pane
      // stays UNAVAILABLE/CACHED with zero rows; a later start() or refresh() picks it up.
      this.watcher = null
    }
  }

  stop(): void {
    this.started = false
    clearTimeout(this.timer)
    this.timer = undefined
    this.watcher?.close()
    this.watcher = null
  }

  snapshot(): VclawInboxSnapshot {
    return this.snapshotValue
  }

  /** Fan-out for the IPC layer; returns an unsubscribe. */
  onSnapshot(listener: (snapshot: VclawInboxSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Re-reads the spool and notifies when anything in the snapshot changed. */
  refresh(force = false): VclawInboxSnapshot {
    const next = this.computeSnapshot()
    const changed = force || JSON.stringify(next) !== JSON.stringify(this.snapshotValue)
    this.snapshotValue = next
    if (changed) {
      this.onChange?.(next)
      for (const listener of this.listeners) listener(next)
    }
    return next
  }

  private schedule(): void {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.refresh()
    }, this.debounceMs)
    this.timer.unref?.()
  }

  private computeSnapshot(): VclawInboxSnapshot {
    const nkey = readOwnNkey(this.readFileImpl, this.home)
    const self8 = nkey ? selfPrefix(nkey) : ''
    const spoolPath = self8 ? findSpoolPath(this.listDirectoryImpl, this.home, self8) : null
    let next: VclawInboxMessage[] = []
    let warning: string | undefined
    if (spoolPath) {
      try {
        next = parseSpool(this.readFileImpl(spoolPath))
      } catch {
        next = []
      }
      try {
        warning = spoolModeWarning(this.statFileImpl(spoolPath).mode)
      } catch {
        warning = undefined
      }
    }
    // Union by seq: a replaced or truncated file must never erase a row we showed.
    this.seen = mergeSpool(this.seen, next)
    return buildSnapshot({
      hasIdentity: nkey !== null,
      sessionOpen: this.isSessionOpen(),
      spoolPath: spoolPath ?? '',
      messages: this.seen,
      now: this.now,
      warning,
    })
  }
}

/** Kept for callers that want the last rendered seq without the service. */
export function lastRenderedSeq(service: VclawInboxService): number {
  return lastSeqOf(service.snapshot().messages)
}
