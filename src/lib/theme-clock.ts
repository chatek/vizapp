/**
 * vizmaster (2026-11-07, operator): 'system' auto-tunes by the user's LOCAL TIME —
 * light 06:00–17:59, dark 18:00–05:59 — falling back to the OS preference when the
 * clock cannot be read. Exported for tests; the hook re-evaluates it every minute.
 */
export function themeForLocalTime(media: { matches: boolean }, now: Date = new Date()): 'light' | 'dark' {
  const hour = now.getHours()
  if (Number.isFinite(hour)) return hour >= 6 && hour < 18 ? 'light' : 'dark'
  return media.matches ? 'dark' : 'light'
}
