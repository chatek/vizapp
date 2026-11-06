import { readdirSync, readFileSync, statSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import { isBuildId, vizmasterHome } from './vizshow-service'
import type { VizshowBuild, VizshowShow, VizshowShowsSnapshot } from '../../src/types/api'

/**
 * Creator-composed SHOWS: `~/.vizmaster/shows/<showId>/SHOW.json`.
 *
 * A show is a NAMED, ordered list of VizShow builds — the sibling surface to the per-prompt
 * builds the loopback server serves. The watcher's contract (agreed with the proposal lane) is
 * deliberately narrow:
 *
 *   · a show is announced when its **SHOW.json changes** (mtime), never per file written inside
 *     the directory. A build registers hundreds of files; a show is one manifest, and that is the
 *     unit a renderer can act on.
 *   · SHOW.json is UNTRUSTED: a show that cannot prove `id` (which must equal its directory
 *     name), `name` and `slug` is dropped — and dropping one never affects the others.
 *   · an absent or empty root is inert: no watch, no announcements, no errors.
 */

/** `~/.vizmaster/shows`, overridable for tests exactly like VIZMASTER_VIZSHOW_DIR. */
export function showsRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.VIZMASTER_SHOWS_DIR?.trim() || join(vizmasterHome(env), 'shows')
}

function nonEmptyString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max || trimmed.includes('\0')) return null
  return trimmed
}

/**
 * A show's build list: only ids that are valid directory names survive, and the ORDER is the
 * creator's (it is the play order — reordering the array is a real edit).
 */
function parseBuildList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const builds: string[] = []
  for (const entry of value) {
    if (!isBuildId(entry) || seen.has(entry)) continue
    seen.add(entry)
    builds.push(entry)
  }
  return builds
}

/**
 * Parses one SHOW.json. Returns null for anything that cannot be proven — including an `id` that
 * disagrees with the directory it sits in (a copied directory is not that show).
 */
export function parseShowManifest(raw: unknown, fallbackId: string): VizshowShow | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const id = nonEmptyString(record.id, 128)
  if (!id || !isBuildId(id) || id !== fallbackId) return null
  const name = nonEmptyString(record.name, 200)
  const slug = nonEmptyString(record.slug, 128)
  if (!name || !slug) return null
  const show: VizshowShow = { id, name, slug, builds: parseBuildList(record.builds) }
  const prompt = nonEmptyString(record.prompt, 2_000)
  if (prompt) show.prompt = prompt
  const createdAt = nonEmptyString(record.createdAt, 64)
  if (createdAt) show.createdAt = createdAt
  const updatedAt = nonEmptyString(record.updatedAt, 64)
  if (updatedAt) show.updatedAt = updatedAt
  return show
}

/** The newest build of a show, judged by the vizshow service's own `createdAt` ordering. */
export function newestShowBuild(show: VizshowShow, builds: readonly VizshowBuild[]): VizshowBuild | null {
  const listed = new Set(show.builds)
  for (const build of builds) if (listed.has(build.id)) return build
  return null
}

export interface ShowsServiceOptions {
  root?: string
  readdir?: (path: string) => string[]
  readFile?: (path: string) => string
  /** `mtimeMs` of a SHOW.json — the announcement trigger, injectable so tests pin it. */
  mtime?: (path: string) => number
  debounceMs?: number
}

/**
 * Watches the shows root. `start()` is inert when the directory does not exist yet (the creator
 * makes it on first save); the next `snapshot()`/`start()` after that picks it up.
 */
export class ShowsService {
  readonly root: string
  #readdir: (path: string) => string[]
  #readFile: (path: string) => string
  #mtime: (path: string) => number
  #debounceMs: number
  #watcher: FSWatcher | null = null
  #timer: ReturnType<typeof setTimeout> | undefined
  #shows: VizshowShow[] = []
  #mtimes = new Map<string, number>()
  #listeners = new Set<(snapshot: VizshowShowsSnapshot) => void>()
  #started = false
  #stopped = false

  constructor(options: ShowsServiceOptions = {}) {
    this.root = options.root ?? showsRoot()
    this.#readdir = options.readdir ?? ((path) => readdirSync(path))
    this.#readFile = options.readFile ?? ((path) => readFileSync(path, 'utf8'))
    this.#mtime = options.mtime ?? ((path) => statSync(path).mtimeMs)
    this.#debounceMs = options.debounceMs ?? 120
  }

  get shows(): readonly VizshowShow[] { return this.#shows }

  snapshot(): VizshowShowsSnapshot {
    return { shows: this.#shows, latest: this.#shows[0] ?? null }
  }

  onChanged(listener: (snapshot: VizshowShowsSnapshot) => void): () => void {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** Begins watching. A missing root is a state, not an error — nothing is scheduled. */
  start(): void {
    if (this.#started || this.#stopped) return
    this.#started = true
    this.refresh()
    try {
      this.#watcher = watch(this.root, { persistent: false }, () => { this.schedule() })
      this.#watcher.on('error', () => { this.schedule() })
    } catch {
      // The root appears when the creator writes its first show.
      this.#watcher = null
    }
  }

  schedule(): void {
    if (this.#stopped) return
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => { this.refresh() }, this.#debounceMs)
    this.#timer.unref?.()
  }

  /**
   * Re-reads the root and announces ONCE per change. The comparison is per SHOW.json mtime: file
   * churn inside a show directory (build outputs) cannot trigger an announcement, and a burst of
   * watcher events for one save collapses through the debounce.
   */
  refresh(): void {
    if (this.#stopped) return
    const names = this.#safeReaddir()
    const next: VizshowShow[] = []
    const mtimes = new Map<string, number>()
    let changed = false
    for (const name of names) {
      if (!isBuildId(name)) continue
      const manifestPath = join(this.root, name, 'SHOW.json')
      let mtimeMs: number
      try {
        mtimeMs = this.#mtime(manifestPath)
      } catch {
        continue
      }
      let show: VizshowShow | null = null
      try {
        show = parseShowManifest(JSON.parse(this.#readFile(manifestPath)), name)
      } catch {
        // An unreadable or malformed manifest drops THIS show only.
        show = null
      }
      if (!show) continue
      next.push(show)
      mtimes.set(name, mtimeMs)
      if (this.#mtimes.get(name) !== mtimeMs) changed = true
    }
    if (next.length !== this.#shows.length) changed = true
    this.#shows = next.sort((left, right) => (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '') || left.id.localeCompare(right.id))
    this.#mtimes = mtimes
    if (changed) this.#emit()
  }

  #safeReaddir(): string[] {
    try { return this.#readdir(this.root) } catch { return [] }
  }

  #emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.#listeners) listener(snapshot)
  }

  stop(): void {
    this.#stopped = true
    clearTimeout(this.#timer)
    this.#watcher?.close()
    this.#watcher = null
    this.#listeners.clear()
  }
}
