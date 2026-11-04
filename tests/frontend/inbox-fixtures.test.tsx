// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InboxPanel } from '../../src/components/inspector/InboxPanel'
import { INBOX_FIXTURES, isFixtureId } from '../../src/lib/inbox-fixtures'
import { retentionLossLine } from '../../src/lib/inbox-retention'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/**
 * The fixture harness is a UI/UX prototyping tool, so its own contract is: every fixture
 * is a valid snapshot, the panel renders each one through the SAME markup it ships, and
 * the loss line appears exactly when `expiredThrough` says so — never as an inferred gap.
 */
describe('inbox prototype fixtures', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    window.localStorage.clear()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('every fixture is internally consistent (counts, lastSeq, state vocabulary)', () => {
    for (const [id, snapshot] of Object.entries(INBOX_FIXTURES)) {
      expect(isFixtureId(id), id).toBe(true)
      expect(['live', 'cached', 'unavailable']).toContain(snapshot.state)
      expect(snapshot.lastSeq).toBe(snapshot.messages.reduce((max, item) => Math.max(max, item.seq), 0))
      expect(snapshot.unread).toBe(snapshot.messages.filter((item) => !item.read).length)
      expect(snapshot.messages.every((item) => item.kind === 'message')).toBe(true)
    }
  })

  it('a fixture with expiredThrough declares a loss, and one without does not', () => {
    expect(retentionLossLine(INBOX_FIXTURES['loss-line'].expiredThrough)).toMatch(/Gone for good up to seq 40/)
    expect(retentionLossLine(INBOX_FIXTURES['live-busy'].expiredThrough)).toBeUndefined()
  })

  it('renders the loss-line fixture with the loss line above the rows, never as an empty pane', async () => {
    window.localStorage.setItem('vclaw.inbox.fixture', 'loss-line')
    await act(async () => root.render(<InboxPanel />))
    const loss = document.querySelector('.inbox-loss')
    expect(loss?.textContent).toContain('Gone for good up to seq 40')
    expect(document.querySelectorAll('.inbox-row').length).toBe(INBOX_FIXTURES['loss-line'].messages.length)
  })

  it('renders the threaded fixture with conversation ids present in the record', async () => {
    window.localStorage.setItem('vclaw.inbox.fixture', 'live-threaded')
    await act(async () => root.render(<InboxPanel />))
    expect(document.querySelector('.inbox-badge--live')?.textContent).toBe('LIVE')
    expect(document.querySelectorAll('.inbox-row').length).toBe(4)
    expect(INBOX_FIXTURES['live-threaded'].messages.filter((item) => item.conversationId === 'conv-m1').length).toBe(3)
  })

  it('renders UNAVAILABLE as its named state, not as an error', async () => {
    window.localStorage.setItem('vclaw.inbox.fixture', 'unavailable')
    await act(async () => root.render(<InboxPanel />))
    expect(document.querySelector('.inbox-badge--unavailable')?.textContent).toBe('UNAVAILABLE')
    expect(document.querySelector('.inbox-panel')?.getAttribute('data-state')).toBe('unavailable')
    expect(document.body.textContent).toContain('no identity on this host')
  })

  it('with no fixture selected it reads the real spool through preload (the prototype never touches prod data)', async () => {
    const read = vi.fn(() => Promise.resolve(INBOX_FIXTURES['cached-gaps']))
    const onChanged = vi.fn(() => () => undefined)
    vi.stubGlobal('prime', { inbox: { read, onChanged } })
    await act(async () => root.render(<InboxPanel />))
    expect(read).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.inbox-badge--cached')?.textContent).toBe('CACHED')
    vi.unstubAllGlobals()
  })
})
