import { describe, expect, it } from 'vitest'
import { formatLastSeen, panePresenceCopy, panePresenceScript, parsePaneRoster, selectOwnPresence } from '../../src/lib/pane-presence'

const NOW = Date.parse('2026-11-28T12:00:00Z')

describe('panePresenceScript', () => {
  it('asks the pane guest for the same-origin roster route', () => {
    const script = panePresenceScript()
    expect(script).toContain("fetch('/api/v1/roster'")
    expect(script).toContain("credentials: 'same-origin'")
    // Feature detection: any non-OK answer resolves to null, never throws.
    expect(script).toContain('if (!res.ok) return null')
    expect(script).toContain('catch { return null }')
  })
})

describe('parsePaneRoster', () => {
  it('returns no rows for null and malformed payloads', () => {
    expect(parsePaneRoster(null)).toEqual([])
    expect(parsePaneRoster('not json')).toEqual([])
    expect(parsePaneRoster(JSON.stringify({ error: 'nope' }))).toEqual([])
    expect(parsePaneRoster(JSON.stringify('roster'))).toEqual([])
  })

  it('keeps valid rows and drops malformed ones', () => {
    const raw = JSON.stringify([
      { handle: '@river-fox', presence: { online: true, lastSeen: '2026-11-28T11:59:00Z' } },
      { handle: 42, presence: { online: true, lastSeen: '2026-11-28T11:59:00Z' } },
      { handle: '@no-presence' },
      { handle: '@null-presence', presence: null },
      { handle: '@bad-presence', presence: { online: 'yes', lastSeen: '2026-11-28T11:59:00Z' } },
      { handle: '@bad-ts', presence: { online: true, lastSeen: 7 } },
    ])
    expect(parsePaneRoster(raw)).toEqual([
      { handle: '@river-fox', presence: { online: true, lastSeen: '2026-11-28T11:59:00Z' } },
      { handle: '@no-presence', presence: null },
      { handle: '@null-presence', presence: null },
    ])
  })
})

describe('selectOwnPresence', () => {
  const roster = JSON.stringify([
    { handle: 'river-fox', presence: { online: false, lastSeen: '2026-11-28T10:00:00Z' } },
    { handle: '@other', presence: { online: true, lastSeen: '2026-11-28T11:59:00Z' } },
  ])

  it('matches the signed-in account with or without the display @', () => {
    expect(selectOwnPresence(roster, 'river-fox')).toEqual({ online: false, lastSeen: '2026-11-28T10:00:00Z' })
    expect(selectOwnPresence(roster, '@river-fox')).toEqual({ online: false, lastSeen: '2026-11-28T10:00:00Z' })
  })

  it('hides when signed out, absent, stale-hidden, or the payload failed', () => {
    expect(selectOwnPresence(roster, null)).toBeNull()
    expect(selectOwnPresence(roster, 'ghost')).toBeNull()
    expect(selectOwnPresence(JSON.stringify([{ handle: 'river-fox', presence: null }]), 'river-fox')).toBeNull()
    expect(selectOwnPresence(null, 'river-fox')).toBeNull()
    expect(selectOwnPresence('garbage', 'river-fox')).toBeNull()
  })
})

describe('formatLastSeen', () => {
  it('formats compact relative times, never an absolute claim', () => {
    expect(formatLastSeen('2026-11-28T11:59:50Z', NOW)).toBe('just now')
    expect(formatLastSeen('2026-11-28T11:55:00Z', NOW)).toBe('5m')
    expect(formatLastSeen('2026-11-28T10:00:00Z', NOW)).toBe('2h')
    expect(formatLastSeen('2026-11-25T12:00:00Z', NOW)).toBe('3d')
  })

  it('never renders a future or unparseable stamp as a duration', () => {
    expect(formatLastSeen('2026-11-28T12:05:00Z', NOW)).toBe('just now')
    expect(formatLastSeen('nope', NOW)).toBe('unknown')
  })
})

describe('panePresenceCopy', () => {
  it('renders online as a filled dot only', () => {
    expect(panePresenceCopy({ online: true, lastSeen: '2026-11-28T11:59:00Z' }, NOW)).toBe('● online')
  })

  it('renders absence of heartbeat as last seen, never offline', () => {
    expect(panePresenceCopy({ online: false, lastSeen: '2026-11-28T10:00:00Z' }, NOW)).toBe('○ last seen 2h')
    expect(panePresenceCopy({ online: false, lastSeen: '2026-11-25T12:00:00Z' }, NOW)).toBe('○ last seen 3d')
  })

  it('renders nothing for hidden/stale presence — no offline or idle state', () => {
    expect(panePresenceCopy(null, NOW)).toBeNull()
  })
})
