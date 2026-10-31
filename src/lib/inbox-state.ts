import type { VclawInboxState } from '../types/api'

/**
 * The frozen inbox vocabulary: three labels, and the sentences each may claim.
 *
 * Shared by the pane (renderer) and the spool reader (main) so the wording and the
 * classifier can be held to the same test. 'complete' is not a member by construction:
 * the fabric grants agents no durable consumer, so with the session closed the spool is
 * what was captured, not what was sent.
 *
 * When `serverSeq` exists (after `vclaw inbox --sync` lands), CACHED becomes PROVABLE:
 * the label does not change, the sentence gains the seq it is known caught up to.
 */
export const INBOX_STATE_LABEL: Record<VclawInboxState, string> = {
  live: 'LIVE',
  cached: 'CACHED',
  unavailable: 'UNAVAILABLE',
}

export function describeInboxState(state: VclawInboxState, serverSeq?: number): string {
  if (state === 'live') return 'Session open and the mailbox subscription is running — messages are spooled as they arrive.'
  if (state === 'unavailable') return 'No vclaw identity on this host, so there is no spool to read.'
  const gaps = 'No session is open, so messages sent while closed were not captured and this view may have gaps.'
  return typeof serverSeq === 'number'
    ? `Read from the local spool and synced as of seq ${serverSeq}. ${gaps}`
    : `Read from the local spool. ${gaps}`
}
