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
  // d916a27f retuned the budget to the measured chime reality: MIN 6.8s
  // (chime start latency ~1.8-4.0s + the piece's natural 4.64s + fade margin),
  // cap 7.2s, jitter 0 (a randomized extension would outlast the finished
  // piece). These tests assert via the live constants, never stale literals.
  it('waits out the full minimum when dismissal comes early', () => {
    expect(splashHoldDelayMs(500, 0, 0)).toBe(SPLASH_MIN_HOLD_MS - 500)
    expect(splashHoldDelayMs(SPLASH_MIN_HOLD_MS - 1, 0, 0)).toBe(1)
  })

  it('fades at once when dismissal arrives after the hold window', () => {
    expect(splashHoldDelayMs(SPLASH_MIN_HOLD_MS, 0, 0)).toBe(0)
    expect(splashHoldDelayMs(SPLASH_MAX_HOLD_MS + 2_000, 0, 2_000)).toBe(0)
  })

  it('jitter is retired (0): any delivered value cannot extend the hold past the cap', () => {
    expect(splashHoldDelayMs(0, 0, 1_500)).toBe(SPLASH_MIN_HOLD_MS)
    expect(splashHoldDelayMs(0, 0, SPLASH_MAX_HOLD_JITTER_MS)).toBe(SPLASH_MIN_HOLD_MS)
    expect(splashHoldDelayMs(0, 0, 99_999)).toBe(SPLASH_MIN_HOLD_MS)
    expect(splashHoldDelayMs(0, 0, -50)).toBe(SPLASH_MIN_HOLD_MS)
  })

  it('anchors on first paint, not on dismissal time', () => {
    // Paint at 400ms: the hold window is measured from there, not from now.
    expect(splashHoldDelayMs(1_000, 400, 0)).toBe(SPLASH_MIN_HOLD_MS + 400 - 1_000)
  })

  it('parses the dataset jitter defensively — and the clamp is 0 since the retune', () => {
    // Parsing stays defensive; the VALUE is always clamped to 0 (jitter was
    // retired in d916a27f: any extension would outlast the finished chime).
    expect(parseSplashHoldJitter('1200')).toBe(SPLASH_MAX_HOLD_JITTER_MS)
    expect(parseSplashHoldJitter(undefined)).toBe(0)
    expect(parseSplashHoldJitter('not-a-number')).toBe(0)
    expect(parseSplashHoldJitter('-5')).toBe(0)
    expect(parseSplashHoldJitter('999999')).toBe(SPLASH_MAX_HOLD_JITTER_MS)
    expect(SPLASH_MAX_HOLD_JITTER_MS).toBe(0)
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

  it('a delivered jitter no longer extends the hold (retired in d916a27f)', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(0)
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      overlay?.setAttribute('data-vclaw-hold-jitter', '1500')
      dismissSplashOverlay()
      vi.advanceTimersByTime(SPLASH_MIN_HOLD_MS - 1)
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
  it('removes the overlay at first paint + the hold even without initialized', () => {
    vi.useFakeTimers()
    try {
      stubPaintAnchor(100)
      const beforeArm = performance.now()
      primeSplashOverlayCap()
      const overlay = document.getElementById(SPLASH_OVERLAY_ID)
      // The cap arms with jitter clamped to 0 (retired in d916a27f), so the
      // removal lands at anchor + SPLASH_MIN_HOLD_MS; SPLASH_MAX_HOLD_MS only
      // bounds a jitter extension should one ever return. Advance relative to
      // the arming instant, not to zero — keeps the boundary exact.
      vi.advanceTimersByTime(Math.max(0, 100 + SPLASH_MIN_HOLD_MS - beforeArm - 1))
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
