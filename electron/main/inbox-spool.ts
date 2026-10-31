import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { VclawInboxMessage, VclawInboxSnapshot, VclawInboxState } from '../../src/types/api'
import { describeInboxState, INBOX_STATE_LABEL } from '../../src/lib/inbox-state'

export type { VclawInboxMessage, VclawInboxSnapshot, VclawInboxState }
export { describeInboxState, INBOX_STATE_LABEL }

/**
 * vclaw inbox spool — the read side of agent-sdk's durable spool.
 *
 * Contract frozen at pin bf1e237f (bundle 407c8722):
 *   ~/.vclaw/inbox/<tenant>__<self8>.jsonl   mode 0600, append-only, one JSON record per line
 *   record = the inbox `data.messages[]` entry; `kind` first; `seq` monotonic PER FILE
 *
 * THREE STATE LABELS AND NOTHING FINER — 'complete' does not exist in this vocabulary,
 * because the fabric grants agents no durable consumer: with the session closed the
 * spool is what was captured, not what was sent.
 *
 * `from`/`fromName` are ASSERTED by the sender (A2A publish is tenant-wide), never
 * verified. The pane keeps labelling them as a claim.
 */
const SELF_LENGTH = 8

/** First 8 characters of the own nkey — the only discriminator in the spool filename. */
export function selfPrefix(nkey: string): string {
  return nkey.trim().slice(0, SELF_LENGTH)
}

/**
 * Reads the nkey out of `~/.config/vclaw/credentials.json` without trusting anything
 * else in the file. Returns null when the file is absent or carries no nkey.
 */
export function readOwnNkey(readFile: (path: string) => string, home: string): string | null {
  try {
    const raw = readFile(join(home, '.config', 'vclaw', 'credentials.json'))
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const candidate = parsed.nkey ?? parsed.nKey ?? parsed.NKey
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
  } catch {
    return null
  }
}

/**
 * Finds this identity's spool by SCANNING THE DIRECTORY rather than composing the name:
 * the filename carries a tenant token we would otherwise have to decode from a JWT, and
 * a directory scan is rename-tolerant by construction. Multiple matches are a defect
 * elsewhere; the newest wins deterministically so the pane never flaps.
 */
export function findSpoolPath(listDirectory: (path: string) => string[], home: string, self8: string): string | null {
  const directory = join(home, '.vclaw', 'inbox')
  let entries: string[]
  try {
    entries = listDirectory(directory)
  } catch {
    return null
  }
  const matches = entries
    .filter((name) => name.endsWith(`__${self8}.jsonl`))
    .sort()
  if (matches.length === 0) return null
  return join(directory, matches[matches.length - 1])
}

/** Parses the spool; malformed lines are skipped, never fatal (the file is append-only). */
export function parseSpool(text: string): VclawInboxMessage[] {
  const messages: VclawInboxMessage[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      continue
    }
    if (typeof parsed !== 'object' || parsed === null) continue
    const record = parsed as Record<string, unknown>
    if (typeof record.seq !== 'number' || !Number.isFinite(record.seq)) continue
    if (typeof record.kind !== 'string') continue
    messages.push(record as unknown as VclawInboxMessage)
  }
  return messages.sort((a, b) => a.seq - b.seq)
}

/**
 * Merge a fresh read over what the pane has already shown.
 *
 * The spool may be REPLACED by rename (a --prune rewrite, an editor save, a copy). A
 * replaced file can carry fewer or no rows for seqs we already rendered; dropping them
 * would be a lost row, so the merge is a union keyed by `seq`, and `lastSeq` only ever
 * advances. That is what makes row 3 ("re-tail from the last seq, not a lost row") true.
 */
export function mergeSpool(previous: readonly VclawInboxMessage[], next: readonly VclawInboxMessage[]): VclawInboxMessage[] {
  const bySeq = new Map<number, VclawInboxMessage>()
  for (const record of previous) bySeq.set(record.seq, record)
  for (const record of next) bySeq.set(record.seq, record)
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq)
}

export function lastSeqOf(messages: readonly VclawInboxMessage[]): number {
  return messages.reduce((max, message) => (message.seq > max ? message.seq : max), 0)
}

/**
 * The whole state vocabulary, in one place: no identity ⇒ unavailable; identity but no
 * open harness session ⇒ cached (the spool may have gaps); session open ⇒ live.
 * There is deliberately no fourth value and no 'complete'.
 */
export function classifyState(hasIdentity: boolean, sessionOpen: boolean): VclawInboxState {
  if (!hasIdentity) return 'unavailable'
  return sessionOpen ? 'live' : 'cached'
}

export function unreadCount(messages: readonly VclawInboxMessage[]): number {
  return messages.filter((message) => message.read !== true).length
}

/** Snapshot builder shared by the service and its tests, so both speak one shape. */
export function buildSnapshot(input: {
  hasIdentity: boolean
  sessionOpen: boolean
  spoolPath: string
  messages: readonly VclawInboxMessage[]
  now: () => Date
  warning?: string
}): VclawInboxSnapshot {
  const messages = [...input.messages]
  return {
    state: classifyState(input.hasIdentity, input.sessionOpen),
    spoolPath: input.spoolPath,
    messages,
    lastSeq: lastSeqOf(messages),
    unread: unreadCount(messages),
    sessionOpen: input.sessionOpen,
    observedAt: input.now().toISOString(),
    ...(input.warning ? { warning: input.warning } : {}),
  }
}

/**
 * A spool readable by anyone else is a leak, not a style nit: DM bodies sit in it.
 * The pane keeps reading (the data is the user's) but must SAY the mode is wrong —
 * silent absorption would hide the leak behind a working-looking view.
 */
export function spoolModeWarning(mode: number): string | undefined {
  const permissions = mode & 0o777
  if (permissions === 0o600) return undefined
  return `Spool permissions are ${permissions.toString(8).padStart(3, '0')} — expected 600. Messages in it may be readable by other users on this machine.`
}

/** Directory listing helper for the service (kept here so tests can stub it). */
export function listInboxDirectory(directory: string): string[] {
  try {
    return readdirSync(directory)
  } catch {
    return []
  }
}
