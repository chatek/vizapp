/**
 * Pre-React splash overlay dismissal and duration rules (renderer side). The
 * overlay itself is static HTML/CSS in index.html — no scripts, because
 * script-src 'self' forbids them — and the main process swaps the selected
 * scene in via executeJavaScript, carrying the per-launch hold jitter as a
 * dataset attribute. This module owns the timing:
 *
 * - fade-out begins at max(initialized, firstPaint + 3000ms + jitter), so every
 *   launch holds the splash 3-5s and varies (jitter 0-2000ms, chosen by main);
 * - a hard cap removes the overlay at firstPaint + 5000ms even if init never
 *   completes, so the app's own loading state is never hidden for long;
 * - the minimum is never shorter than 3s even on a fast init, and a slow init
 *   can only make the overlay gone sooner (it fades the moment dismiss runs
 *   past the cap).
 *
 * The paint anchor comes from the PerformancePaintTiming entries (first
 * contentful paint), falling back to module evaluation time when the entries
 * are not yet available. Idempotent and DOM-optional, so StrictMode
 * double-effects and overlay-less builds (the generic product's copy is
 * stripped by the main process before first show) are both no-ops.
 */
export const SPLASH_OVERLAY_ID = 'vclaw-splash'
export const SPLASH_OVERLAY_FADE_MS = 300
/**
 * The logo hold is TIMED TO THE MUSIC (operator 2026-11-07): the branded chime
 * always plays at its natural pitch and tempo — 17 eighths at 110 BPM ≈ 4.64s —
 * and the overlay holds exactly that long (4.7s floor = music + fade tail), with
 * NO jitter (a randomized extension would outlast the finished piece). The hard
 * cap keeps 300ms of fade headroom. Music and logo end together, every launch.
 */
export const SPLASH_MIN_HOLD_MS = 4_700
export const SPLASH_MAX_HOLD_JITTER_MS = 0
export const SPLASH_MAX_HOLD_MS = 5_000

/** Module evaluation time — the conservative fallback paint anchor. */
const moduleEvalMs = typeof performance !== 'undefined' ? performance.now() : 0

function overlayElement(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById(SPLASH_OVERLAY_ID)
}

/** First contentful paint (ms since navigation start), or module-eval time. */
export function splashPaintAnchorMs(): number {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return moduleEvalMs
  const paints = performance.getEntriesByType('paint')
  const first = paints.find((entry) => entry.name === 'first-contentful-paint') ?? paints[0]
  return first ? first.startTime : moduleEvalMs
}

/** Jitter from the scene-delivery dataset, clamped to the contract range. */
export function parseSplashHoldJitter(raw: string | undefined): number {
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN
  if (!Number.isFinite(parsed)) return 0
  return Math.min(SPLASH_MAX_HOLD_JITTER_MS, Math.max(0, parsed))
}

/**
 * How long the overlay must still hold once dismissal was requested, given the
 * current clock. Pure: `max(0, anchor + 3000 + jitter - now)`, never exceeding
 * the anchor+5000 cap — so a late dismissal (slow init) fades at once, and a
 * fast one waits out the 3-5s window.
 */
export function splashHoldDelayMs(nowMs: number, anchorMs: number, jitterMs: number): number {
  const jitter = Math.min(SPLASH_MAX_HOLD_JITTER_MS, Math.max(0, jitterMs))
  const holdUntil = anchorMs + SPLASH_MIN_HOLD_MS + jitter
  const capped = Math.min(holdUntil, anchorMs + SPLASH_MAX_HOLD_MS)
  return Math.max(0, capped - nowMs)
}
function fadeOutOverlay(): void {
  const overlay = overlayElement()
  if (!overlay || overlay.dataset.vclawFadeStarted === 'true') return
  overlay.dataset.vclawFadeStarted = 'true'
  overlay.classList.add('vclaw-splash--hidden')
  overlay.dataset.vclawDone = 'true'
  window.setTimeout(() => { overlay.remove() }, SPLASH_OVERLAY_FADE_MS + 80)
}

/**
 * Fades the splash overlay out once the app UI is initialized, honoring the
 * 3-5s hold window. Safe to call any number of times: the effective fade is
 * scheduled once per overlay element, and the hard cap below can never be
 * preceded by a second one.
 */
export function dismissSplashOverlay(): void {
  const overlay = overlayElement()
  if (!overlay || overlay.dataset.vclawFadeStarted === 'true') return
  const delay = splashHoldDelayMs(performance.now(), splashPaintAnchorMs(), parseSplashHoldJitter(overlay.dataset.vclawHoldJitter))
  if (delay === 0) {
    fadeOutOverlay()
    return
  }
  window.setTimeout(fadeOutOverlay, delay)
}

/**
 * Arms the hard cap: the overlay removes itself at firstPaint + 5000ms even if
 * the app never signals initialized (slow or stuck init). Called once from the
 * app's mount effect; a no-op when the overlay is absent (generic build).
 */
export function primeSplashOverlayCap(): void {
  if (typeof window === 'undefined' || !overlayElement()) return
  const delay = splashHoldDelayMs(performance.now(), splashPaintAnchorMs(), Number.MAX_SAFE_INTEGER)
  window.setTimeout(fadeOutOverlay, delay)
}
