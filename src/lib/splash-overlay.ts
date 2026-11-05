/**
 * Pre-React splash overlay dismissal (renderer side). The overlay itself is
 * static HTML/CSS in index.html — no scripts, because script-src 'self'
 * forbids them — and the main process swaps the selected scene in via
 * executeJavaScript. This module fades the overlay out once the app UI is
 * initialized, revealing the UI behind it. Idempotent and DOM-optional, so
 * StrictMode double-effects and overlay-less builds (the generic product's
 * copy is stripped by the main process before first show) are both no-ops.
 */
export const SPLASH_OVERLAY_ID = 'vclaw-splash'
export const SPLASH_OVERLAY_FADE_MS = 300

/** Fades the splash overlay out and removes it after the transition. Safe to call any number of times. */
export function dismissSplashOverlay(): void {
  const overlay = document.getElementById(SPLASH_OVERLAY_ID)
  if (!overlay || overlay.dataset.vclawDismissed === 'true') return
  overlay.dataset.vclawDismissed = 'true'
  overlay.classList.add('vclaw-splash--hidden')
  window.setTimeout(() => { overlay.remove() }, SPLASH_OVERLAY_FADE_MS + 80)
}
