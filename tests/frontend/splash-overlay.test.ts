// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissSplashOverlay,
  parseSplashHoldJitter,
  primeSplashOverlayCap,
  splashHoldDelayMs,
  splashPaintAnchorMs,
  SPLASH_MAX_HOLD_JITTER_MS,
  SPLASH_MAX_HOLD_MS,
  SPLASH_MIN_HOLD_MS,
  SPLASH_OVERLAY_FADE_MS,
  SPLASH_OVERLAY_ID,
} from '../../src/lib/splash-overlay'

/** Stubs the paint-timing entries so the hold math has a deterministic anchor. */
function stubPaintAnchor(startTimeMs: number): void {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { name: 'first-contentful-paint', startTime: startTimeMs, entryType: 'paint', duration: 0 } as PerformanceEntry,
  ])
}

beforeEach(() => {
  document.body.innerHTML = `<div id="${SPLASH_OVERLAY_ID}"><div class="vclaw-splash__shimmer">VClaw</div></div><div id="root"></div>`
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('splash hold timing (pure)', () => {
  it('waits out the 3s minimum when dismissal comes early', () => {
    expect(splashHoldDelayMs(500, 0, 0)).toBe(SPLASH_MIN_HOLD_MS - 500)
    expect(splashHoldDelayMs(2_999, 0, 0)).toBe(1)
  })

  it('fades at once when dismissal arrives after the hold window', () => {
    expect(splashHoldDelayMs(3_000, 0, 0)).toBe(0)
    expect(splashHoldDelayMs(9_000, 0, 2_000)).toBe(0)
  })

  it('extends the hold by the jitter, clamped so 3s+jitter never exceeds the 5s cap', () => {
    expect(splashHoldDelayMs(0, 0, 1_500)).toBe(SPLASH_MIN_HOLD_MS + 1_500)
    expect(splashHoldDelayMs(0, 0, SPLASH_MAX_HOLD_JITTER_MS)).toBe(SPLASH_MAX_HOLD_MS)
    expect(splashHoldDelayMs(0, 0, 99_999)).toBe(SPLASH_MAX_HOLD_MS)
    expect(splashHoldDelayMs(0, 0, -50)).toBe(SPLASH_MIN_HOLD_MS)
  })

  it('anchors on first paint, not on dismissal time', () => {
    // Paint at 400ms: the 3s window is measured from there, not from now.
    expect(splashHoldDelayMs(1_000, 400, 0)).toBe(2_400)
  })

  it('parses the dataset jitter defensively', () => {
    expect(parseSplashHoldJitter('1200')).toBe(1_200)
    expect(parseSplashHoldJitter(undefined)).toBe(0)
    expect(parseSplashHoldJitter('not-a-number')).toBe(0)
    expect(parseSplashHoldJitter('-5')).toBe(0)
    expect(parseSplashHoldJitter('999999')).toBe(SPLASH_MAX_HOLD_JITTER_MS)
  })

  it('falls back to a non-negative anchor when paint entries are absent', () => {
    expect(splashPaintAnchorMs()).toBeGreaterThanOrEqual(0)
  })
})

describe('splash overlay dismissal', () => {
  it('holds the 3s minimum, then fades and removes', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(0)
      dismissSplashOverlay()
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      expect(overlay).not.toBeNull()
      vi.advanceTimersByTime(SPLASH_MIN_HOLD_MS - 1)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(false)
      vi.advanceTimersByTime(1)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(true)
      vi.advanceTimersByTime(SPLASH_OVERLAY_FADE_MS + 80)
      expect(document.getElementById(SPLASH_OVERLAY_ID)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('extends by the delivered jitter (dataset from the main-process payload)', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(0)
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      overlay?.setAttribute('data-vclaw-hold-jitter', '1500')
      dismissSplashOverlay()
      vi.advanceTimersByTime(SPLASH_MIN_HOLD_MS + 1_499)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(false)
      vi.advanceTimersByTime(1)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('fades immediately when init was slower than the hold window', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(0)
      vi.advanceTimersByTime(SPLASH_MAX_HOLD_MS + 2_000)
      dismissSplashOverlay()
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('is idempotent: repeated dismissals remove the overlay exactly once', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(0)
      dismissSplashOverlay()
      dismissSplashOverlay()
      vi.advanceTimersByTime(SPLASH_MAX_HOLD_MS + SPLASH_OVERLAY_FADE_MS + 80)
      expect(document.getElementById(SPLASH_OVERLAY_ID)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('is a no-op when no overlay exists (generic build, or already removed)', () => {
    document.body.innerHTML = '<div id="root"></div>'
    expect(() => dismissSplashOverlay()).not.toThrow()
    expect(() => primeSplashOverlayCap()).not.toThrow()
  })
})

describe('splash overlay hard cap', () => {
  it('removes the overlay at first paint + 5s even without initialized', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(100)
      primeSplashOverlayCap()
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      vi.advanceTimersByTime(100 + SPLASH_MAX_HOLD_MS - 1)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(false)
      vi.advanceTimersByTime(1)
      expect(overlay?.classList.contains('vclaw-splash--hidden')).toBe(true)
      vi.advanceTimersByTime(SPLASH_OVERLAY_FADE_MS + 80)
      expect(document.getElementById(SPLASH_OVERLAY_ID)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('arms nothing when the overlay is absent', () => {
    document.body.innerHTML = '<div id="root"></div>'
    vi.useFakeTimers()
    try {
      primeSplashOverlayCap()
      vi.advanceTimersByTime(SPLASH_MAX_HOLD_MS * 2)
      expect(() => primeSplashOverlayCap()).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })
})
