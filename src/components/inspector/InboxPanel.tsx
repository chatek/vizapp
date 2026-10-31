import { memo, useEffect, useState } from 'react'
import { Inbox, RefreshCw } from 'lucide-react'
import type { VclawInboxSnapshot } from '@/types/api'
import { describeInboxState, INBOX_STATE_LABEL } from '@/lib/inbox-state'
import { errorMessage } from '@/lib/errors'
import { EmptyState, IconButton } from '../ui'

/**
 * The vclaw inbox pane: a read-only view of the frozen spool.
 *
 * The only vocabulary is LIVE | CACHED | UNAVAILABLE. There is no "complete" state
 * because the fabric grants agents no durable consumer — with the session closed the
 * spool is what was captured, not what was sent. `from`/`fromName` are asserted by the
 * sender and are labelled as a claim, never shown as verified identity.
 */
export const InboxPanel = memo(function InboxPanel() {
  const [snapshot, setSnapshot] = useState<VclawInboxSnapshot | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    window.prime.inbox.read()
      .then((value) => { if (live) setSnapshot(value) })
      .catch((reason: unknown) => { if (live) setError(errorMessage(reason)) })
    const unsubscribe = window.prime.inbox.onChanged((value) => { if (live) { setSnapshot(value); setError('') } })
    return () => { live = false; unsubscribe() }
  }, [])

  const refresh = (): void => {
    window.prime.inbox.read()
      .then((value) => { setSnapshot(value); setError('') })
      .catch((reason: unknown) => setError(errorMessage(reason)))
  }

  if (error) return <EmptyState icon={<Inbox size={22} />} title="Inbox unavailable">{error}</EmptyState>
  if (!snapshot) return <div className="inbox-panel"><p className="inbox-empty">Reading the spool…</p></div>

  // CACHED becomes PROVABLE when sync exists (serverSeq present): same label, better
  // sentence. That is the whole change the fourth state source needs — no new state.
  const detail = describeInboxState(snapshot.state, snapshot.serverSeq)
  return (
    <div className="inbox-panel" data-state={snapshot.state}>
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
      {snapshot.messages.length === 0
        ? <p className="inbox-empty">{snapshot.state === 'unavailable' ? 'Nothing to show — no identity on this host.' : 'No messages spooled yet.'}</p>
        : (
          <ul className="inbox-list">
            {snapshot.messages.map((message) => (
              <li className={`inbox-row${message.read ? '' : ' is-unread'}`} key={message.seq}>
                <div className="inbox-row__meta">
                  {/* Asserted, never verified: A2A publish is tenant-wide, so the sender chooses this value. */}
                  <span className="inbox-row__from" title="Asserted by the sender — not verified">{message.fromName || message.from || 'unknown sender'} <em>(asserted)</em></span>
                  <span className="inbox-row__seq">#{message.seq}</span>
                  {message.ts ? <time className="inbox-row__ts">{message.ts}</time> : null}
                </div>
                <div className="inbox-row__subject">{message.subject || '(no subject)'}</div>
                {message.body ? <p className="inbox-row__body">{message.body}</p> : null}
              </li>
            ))}
          </ul>
        )}
    </div>
  )
})
