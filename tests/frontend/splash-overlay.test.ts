// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissSplashOverlay, SPLASH_OVERLAY_FADE_MS, SPLASH_OVERLAY_ID } from '../../src/lib/splash-overlay'

describe('splash overlay dismissal', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="${SPLASH_OVERLAY_ID}"><div class="vclaw-splash__shimmer">VClaw</div></div><div id="root"></div>`
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('fades the overlay out and removes it after the transition', () => {
    vi.useFakeTimers()
    try {
      dismissSplashOverlay()
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      expect(overlay).not.toBeNull()
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(true)
      vi.advanceTimersByTime(SPLASH_OVERLAY_FADE_MS + 80)
      expect(document.getElementById(SPLASH_OVERLAY_ID)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('is idempotent: repeated calls remove the overlay exactly once', () => {
    vi.useFakeTimers()
    try {
      dismissSplashOverlay()
      dismissSplashOverlay()
      vi.advanceTimersByTime(SPLASH_OVERLAY_FADE_MS + 80)
      expect(document.getElementById(SPLASH_OVERLAY_ID)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('is a no-op when no overlay exists (generic build, or already removed)', () => {
    document.body.innerHTML = '<div id="root"></div>'
    expect(() => dismissSplashOverlay()).not.toThrow()
  })
})
