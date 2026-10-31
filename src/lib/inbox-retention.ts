import type { VclawInboxMessage } from '../types/api'

/**
 * Retention divergence — the two sets are NOT the same set, in BOTH directions.
 *
 *   gateway (delivery record): 7-day TTL, 500 msgs / 1 MB per recipient
 *   local spool (local record): 2,000 lines, no TTL
 *
 * So a row can outlive the gateway locally, and a row can exist on the gateway having
 * never been captured locally. Neither set is "the truth" about the other, and **none
 * of the three divergences may ever render as an empty list**:
 *
 *   1. server row, absent locally      → "not captured locally"
 *   2. local row, absent on the gateway → "captured locally, no longer on the gateway"
 *   3. neither, plus `expiredThrough`   → "gone for good up to seq N"
 *
 * THE TRAP this module exists to prevent: annotating only "what the spool has" and
 * treating server data as truth makes case 2 render an eight-day-old message as if the
 * gateway still held it. Equally, claiming case 2 when no server set has been fetched at
 * all is a lie of the same size — hence `server === undefined` means "unknown", never
 * "absent".
 *
 * `expiredThrough` IS AN OBLIGATION, NOT A FIELD. It is additive on the wire, so
 * ignoring it parses fine — which is exactly why ignoring it is a failure: a page that
 * declares `expiredThrough: N` must render a persistent loss line ABOVE the list and
 * keep the rows; a page without it must render no loss line. A silently skipped
 * numbering gap is the same lie as an empty pane.
 */
export type VclawInboxPresence = 'both' | 'local-only' | 'server-only'

export interface VclawInboxRetentionRow {
  seq: number
  message: VclawInboxMessage
  presence: VclawInboxPresence
  /** The exact sentence the pane shows for a divergence, or undefined when they agree. */
  note?: string
}

export const RETENTION_NOT_CAPTURED = 'not captured locally'
export const RETENTION_GATEWAY_DROPPED = 'captured locally, no longer on the gateway'

export function retentionLossLine(expiredThrough: number | undefined): string | undefined {
  if (typeof expiredThrough !== 'number' || !Number.isFinite(expiredThrough)) return undefined
  return `Gone for good up to seq ${expiredThrough}. The gateway no longer retains those messages, so this list starts after them.`
}

export function retentionRows(input: {
  local: readonly VclawInboxMessage[]
  /** Gateway rows, once `inbox --sync` can fetch them. `undefined` means UNKNOWN. */
  server?: readonly VclawInboxMessage[]
  expiredThrough?: number
}): { rows: VclawInboxRetentionRow[]; lossLine?: string } {
  const localBySeq = new Map<number, VclawInboxMessage>()
  for (const message of input.local) localBySeq.set(message.seq, message)
  const serverBySeq = new Map<number, VclawInboxMessage>()
  for (const message of input.server ?? []) serverBySeq.set(message.seq, message)

  const seqs = [...new Set([...localBySeq.keys(), ...serverBySeq.keys()])].sort((a, b) => a - b)
  const rows: VclawInboxRetentionRow[] = seqs.map((seq) => {
    const local = localBySeq.get(seq)
    const server = serverBySeq.get(seq)
    if (local && server) return { seq, message: local, presence: 'both' }
    if (server && !local) return { seq, message: server, presence: 'server-only', note: RETENTION_NOT_CAPTURED }
    // Local row: only claim the gateway dropped it when a server set was actually
    // fetched. With `server === undefined` the gateway's set is UNKNOWN.
    const note = input.server === undefined ? undefined : RETENTION_GATEWAY_DROPPED
    return { seq, message: local as VclawInboxMessage, presence: 'local-only', ...(note ? { note } : {}) }
  })

  const lossLine = retentionLossLine(input.expiredThrough)
  return { rows, ...(lossLine ? { lossLine } : {}) }
}
