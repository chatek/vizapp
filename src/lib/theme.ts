import type { MessageKey } from '@/lib/i18n'
import type { ThemeMode, TitleBarTheme } from '@/types/api'

/**
 * Named themes — the theming demo layer on the vizmaster branch.
 *
 * The app was already fully token-driven: every colour the UI uses is a CSS custom
 * property on :root, with `:root[data-theme="dark"]` overriding the set, and the terminal
 * reading the same tokens at runtime. So a new theme is exactly one CSS block plus one
 * entry here — no component edits, no dependency. That is the whole answer to "how
 * themable is this Electron UI": completely, because nothing hardcodes a colour.
 *
 * Palette source: Catppuccin Mocha (the scheme the turbo-themes recommendation names),
 * hand-mapped onto this app's existing token names so the contract does not move.
 */
export interface NamedTheme {
  /** The value stored in settings and set as `data-theme` on the root element. */
  id: Exclude<ThemeMode, 'system' | 'light' | 'dark'>
  label: MessageKey
  /** Which native title-bar family the theme resolves to (Windows overlay). */
  family: TitleBarTheme
}

export const NAMED_THEMES: readonly NamedTheme[] = [
  { id: 'catppuccin-mocha', label: 'appearance.theme.catppuccin-mocha', family: 'dark' },
]

/** The value written to `document.documentElement.dataset.theme`. */
export function dataThemeOf(mode: ThemeMode, systemPrefersDark: boolean): string {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return mode
}

/** What the native chrome needs: a named theme resolves to its family, never its id. */
export function titleBarThemeOf(mode: ThemeMode, systemPrefersDark: boolean): TitleBarTheme {
  const named = NAMED_THEMES.find((theme) => theme.id === mode)
  if (named) return named.family
  if (mode === 'dark') return 'dark'
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light'
  return 'light'
}
