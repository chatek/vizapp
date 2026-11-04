// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { NAMED_THEMES, dataThemeOf, titleBarThemeOf } from '../../src/lib/theme'
import { HARNESS_SELECTOR_ORDER, HARNESS_PRODUCT_NAMES } from '../../src/lib/harness'
import { DEFAULT_SETTINGS } from '../../src/lib/data'

describe('vizmaster branch posture', () => {
  it('the harness menu offers OMP Work only', () => {
    expect(HARNESS_SELECTOR_ORDER).toEqual(['omp'])
    expect(HARNESS_PRODUCT_NAMES[HARNESS_SELECTOR_ORDER[0]]).toBe('OMP Work')
  })

  it('the browser home default is the marketplace', () => {
    expect(DEFAULT_SETTINGS.browserHome).toBe('https://vizmaster.app/')
  })
})

describe('named themes', () => {
  it('every named theme carries an id, a label key and a family', () => {
    for (const theme of NAMED_THEMES) {
      expect(['light', 'dark']).toContain(theme.family)
      expect(theme.id).not.toBe('system')
      expect(theme.label).toMatch(/^appearance\.theme\./)
    }
  })

  it('a named theme reaches the DOM as itself and the native chrome as its family', () => {
    expect(dataThemeOf('catppuccin-mocha', false)).toBe('catppuccin-mocha')
    expect(titleBarThemeOf('catppuccin-mocha', false)).toBe('dark')
    expect(titleBarThemeOf('catppuccin-mocha', true)).toBe('dark')
  })

  it('system and the base modes resolve exactly as before', () => {
    expect(dataThemeOf('system', true)).toBe('dark')
    expect(dataThemeOf('system', false)).toBe('light')
    expect(titleBarThemeOf('light', true)).toBe('light')
    expect(titleBarThemeOf('dark', false)).toBe('dark')
  })
})
