import { memo } from 'react'
import { Inbox, RefreshCw } from 'lucide-react'
import { describeInboxState, INBOX_STATE_LABEL } from '@/lib/inbox-state'
import { retentionRows } from '@/lib/inbox-retention'
import { INBOX_FIXTURE_OPTIONS } from '@/lib/inbox-fixtures'
import { useInboxSnapshot } from '@/hooks/useInboxSnapshot'
import { EmptyState, IconButton } from '../ui'

/**
 * The vclaw inbox pane: a read-only view of the frozen spool.
 *
 * The only vocabulary is LIVE | CACHED | UNAVAILABLE. There is no "complete" state
 * because the fabric grants agents no durable consumer — with the session closed the
 * spool is what was captured, not what was sent. `from`/`fromName` are asserted by the
 * sender and are labelled as a claim, never shown as verified identity.
 *
 * In dev builds a fixture bar sits above the header (see `useInboxSnapshot`): it swaps
 * the data source between the real spool and `INBOX_FIXTURES`, so every world state —
 * including ones the live pane cannot yet produce, like a divergence note — can be
 * designed against with hot reload and no backend. It compiles away in production.
 */
export const InboxPanel = memo(function InboxPanel() {
  const { snapshot, error, fixture, choose, refresh } = useInboxSnapshot()

  if (error) return <EmptyState icon={<Inbox size={22} />} title="Inbox unavailable">{error}</EmptyState>
  if (!snapshot) return <div className="inbox-panel"><p className="inbox-empty">Reading the spool…</p></div>

  // CACHED becomes PROVABLE when sync exists (serverSeq present): same label, better
  // sentence. That is the whole change the fourth state source needs — no new state.
  const detail = describeInboxState(snapshot.state, snapshot.serverSeq)
  // Retention divergence: rows joined across the local spool and (once sync exists) the
  // gateway. With no server set fetched yet, `server` is undefined = UNKNOWN, so no row
  // claims the gateway dropped it. A declared expiry renders a loss line ABOVE the list.
  const { rows, lossLine } = retentionRows({ local: snapshot.messages, expiredThrough: snapshot.expiredThrough })
  return (
    <div className="inbox-panel" data-state={snapshot.state}>
      {import.meta.env.DEV ? (
        <div className="inbox-fixture-bar" role="group" aria-label="Prototype fixtures (dev only)">
          <span className="inbox-fixture-bar__label">fixture</span>
          <button type="button" className={fixture === null ? 'is-active' : ''} aria-pressed={fixture === null} onClick={() => choose(null)}>spool</button>
          {INBOX_FIXTURE_OPTIONS.map((option) => (
            <button type="button" key={option.value} className={fixture === option.value ? 'is-active' : ''} aria-pressed={fixture === option.value} onClick={() => choose(option.value)}>{option.label}</button>
          ))}
        </div>
      ) : null}
      <header className="inbox-header">
        <div>
          <span className={`inbox-badge inbox-badge--${snapshot.state}`}>{INBOX_STATE_LABEL[snapshot.state]}</span>
          <span className="inbox-counts">
            {snapshot.messages.length} message{snapshot.messages.length === 1 ? '' : 's'} · {snapshot.unread} unread · last seq {snapshot.lastSeq}
          </span>
        </div>
        <IconButton label="Refresh inbox" onClick={refresh}><RefreshCw size={15} /></IconButton>
      </header>
      <p className="inbox-detail">{detail}</p>
      {snapshot.warning ? <p className="inbox-warning" role="alert">{snapshot.warning}</p> : null}
      {lossLine ? <p className="inbox-loss" role="note">{lossLine}</p> : null}
      {snapshot.messages.length === 0
        ? <p className="inbox-empty">{snapshot.state === 'unavailable' ? 'Nothing to show — no identity on this host.' : 'No messages spooled yet.'}</p>
        : (
          <ul className="inbox-list">
            {rows.map(({ message, note }) => (
              <li className={`inbox-row${message.read ? '' : ' is-unread'}`} key={message.seq}>
                <div className="inbox-row__meta">
                  {/* Asserted, never verified: A2A publish is tenant-wide, so the sender chooses this value. */}
                  <span className="inbox-row__from" title="Asserted by the sender — not verified">{message.fromName || message.from || 'unknown sender'} <em>(asserted)</em></span>
                  <span className="inbox-row__seq">#{message.seq}</span>
                  {message.ts ? <time className="inbox-row__ts">{message.ts}</time> : null}
                </div>
                <div className="inbox-row__subject">{message.subject || '(no subject)'}</div>
                {message.body ? <p className="inbox-row__body">{message.body}</p> : null}
                {note ? <p className="inbox-row__note">{note}</p> : null}
              </li>
            ))}
          </ul>
        )}
    </div>
  )
})
