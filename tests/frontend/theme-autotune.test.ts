import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// vizmaster (2026-11-07, operator): 'system' follows the user's LOCAL TIME (light 06:00-17:59,
// dark otherwise), re-evaluated every minute; explicit light/dark always wins.
describe('theme auto-tune by local time', () => {
  it('maps local hours to light in daytime and dark at night', async () => {
    const { themeForLocalTime } = await import('../../src/lib/theme-clock')
    vi.setSystemTime(new Date('2026-11-07T10:00:00')) // 10:00 local
    expect(themeForLocalTime({ matches: false })).toBe('light')
    vi.setSystemTime(new Date('2026-11-07T15:59:00'))
    expect(themeForLocalTime({ matches: false })).toBe('light')
    vi.setSystemTime(new Date('2026-11-07T18:00:00'))
    expect(themeForLocalTime({ matches: false })).toBe('dark')
    vi.setSystemTime(new Date('2026-11-07T05:59:00'))
    expect(themeForLocalTime({ matches: false })).toBe('dark')
  })
  it('falls back to the OS preference when the clock cannot be read', async () => {
    const { themeForLocalTime } = await import('../../src/lib/theme-clock')
    vi.setSystemTime(new Date('2026-11-07T10:00:00'))
    expect(themeForLocalTime({ matches: true })).toBe('light') // clock readable => OS ignored in daytime
    const broken = { getHours: () => NaN } as unknown as Date
    expect((await import('../../src/lib/theme-clock')).themeForLocalTime({ matches: true }, broken)).toBe('dark')
  })
})
