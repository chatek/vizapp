import type { VclawInboxMessage, VclawInboxSnapshot } from '@/types/api'

/**
 * Inbox prototype fixtures — DEV-ONLY data for iterating the pane's UI/UX.
 *
 * WHY THIS EXISTS: the pane's interesting states (LIVE / CACHED / UNAVAILABLE, a declared
 * loss, a divergence note, unread weight, a threaded conversation) are states of the WORLD,
 * not of the markup — and most of them cannot be produced on demand from a real spool. The
 * harness in `useInboxSnapshot` swaps the data source in dev; this file is the data.
 *
 * Every fixture is a complete `VclawInboxSnapshot`, so the panel renders the SAME markup it
 * ships. Nothing here may drift from the frozen contract (`src/types/api.ts`): fixtures are
 * typed, and a fixture that stops compiling is a contract change noticed at build time.
 */

export type InboxFixtureId =
  | 'live-busy'
  | 'live-threaded'
  | 'cached-synced'
  | 'cached-gaps'
  | 'loss-line'
  | 'divergence'
  | 'mode-warning'
  | 'unavailable'
  | 'empty'

function message(input: Partial<VclawInboxMessage> & Pick<VclawInboxMessage, 'seq'>): VclawInboxMessage {
  return { kind: 'message', ts: '2026-11-03T09:00:00Z', from: 'NBXC4TESTSENDER0000000000000000000000000', fromName: 'kev-agent', subject: '', body: '', ...input }
}

function snapshot(input: Partial<VclawInboxSnapshot> & Pick<VclawInboxSnapshot, 'state' | 'messages'>): VclawInboxSnapshot {
  const lastSeq = input.messages.reduce((max, item) => Math.max(max, item.seq), 0)
  const unread = input.messages.filter((item) => !item.read).length
  return {
    spoolPath: '/home/you/.vclaw/inbox/tenant__abcd1234.jsonl',
    lastSeq,
    unread,
    sessionOpen: input.state === 'live',
    observedAt: '2026-11-03T09:05:00Z',
    ...input,
  }
}

const busyMessages: VclawInboxMessage[] = [
  message({ seq: 41, fromName: 'kev-agent', subject: 'Nightly digest', body: '3 doors completed, 1 needs review.', read: true }),
  message({ seq: 42, fromName: 'worker2', subject: 'M1 seam types landed', body: 'SEAM_VERSION exported; both halves import it now.' }),
  message({ seq: 43, fromName: 'vpass', subject: 'Payment requested', body: 'USD 4.20 for services rendered (bill b-104).' }),
  message({ seq: 44, fromName: 'kev-agent', subject: 'Degraded verdict', body: 'A 200 omitted the guardrail answer; marked degraded, kept the verdict.' }),
]

const threadedMessages: VclawInboxMessage[] = [
  message({ seq: 50, fromName: 'worker3', subject: 'Golden vector', body: 'Recomputed 6c066a18 through the package import.', conversationId: 'conv-m1', read: true }),
  message({ seq: 51, fromName: 'worker2', subject: 'Re: Golden vector', body: 'Matches. Collapse is done, guard is green.', conversationId: 'conv-m1', read: true }),
  message({ seq: 52, fromName: 'worker3', subject: 'Re: Golden vector', body: 'Then M1 proceeds. I will not re-ask about vkey-tools.', conversationId: 'conv-m1' }),
  message({ seq: 53, fromName: 'danilab-builder', subject: 'Build of record', body: 'VKey.bin 658,704 B at efdffc5, OTA table emitted.', read: true }),
]

export const INBOX_FIXTURES: Record<InboxFixtureId, VclawInboxSnapshot> = {
  'live-busy': snapshot({ state: 'live', messages: busyMessages }),
  'live-threaded': snapshot({ state: 'live', messages: threadedMessages }),
  'cached-synced': snapshot({ state: 'cached', messages: busyMessages.map((item) => ({ ...item, read: true })), serverSeq: 44 }),
  'cached-gaps': snapshot({ state: 'cached', messages: busyMessages.slice(2) }),
  'loss-line': snapshot({ state: 'cached', messages: busyMessages.slice(1), serverSeq: 44, expiredThrough: 40 }),
  divergence: snapshot({
    state: 'cached',
    messages: busyMessages.filter((item) => item.seq !== 43),
    serverSeq: 44,
    // NOTE: the live pane cannot yet produce a `server` set (sync does not exist), so the
    // divergence notes are not reachable from real data today — which is exactly why this
    // fixture exists. See docs/INBOX_STATUS_2026-11-03.md.
  }),
  'mode-warning': snapshot({
    state: 'cached',
    messages: busyMessages.slice(0, 1),
    warning: 'Spool mode is 0644 (not 0600): other users on this host can read the inbox.',
  }),
  unavailable: snapshot({ state: 'unavailable', messages: [], spoolPath: '' }),
  empty: snapshot({ state: 'live', messages: [] }),
}

export const INBOX_FIXTURE_OPTIONS: Array<{ value: InboxFixtureId; label: string }> = [
  { value: 'live-busy', label: 'live·busy' },
  { value: 'live-threaded', label: 'live·thread' },
  { value: 'cached-synced', label: 'cached·synced' },
  { value: 'cached-gaps', label: 'cached·gaps' },
  { value: 'loss-line', label: 'loss' },
  { value: 'divergence', label: 'divergence' },
  { value: 'mode-warning', label: 'warning' },
  { value: 'unavailable', label: 'unavailable' },
  { value: 'empty', label: 'empty' },
]

export function isFixtureId(value: string): value is InboxFixtureId {
  return Object.hasOwn(INBOX_FIXTURES, value)
}
