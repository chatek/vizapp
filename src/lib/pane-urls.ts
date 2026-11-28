/**
 * Pane URL helpers for the embedded Browser pane (D3).
 *
 * The desktop appends `?embed=vizapp` to vizmaster.app URLs it loads in the
 * Browser pane. The site treats the param as an UNTRUSTED UI HINT (S1): it
 * only swaps the download card for an embed panel, and the pane keeps its own
 * hardening (partition, allowlist, download guard) regardless.
 */

const EMBED_HOST_PATTERN = /(^|\.)vizmaster\.app$/i;
const EMBED_PARAM = 'embed';
const EMBED_VALUE = 'vizapp';

/** True when the URL points at vizmaster.app or a subdomain. */
export function isVizmasterAppUrl(raw: string): boolean {
  try {
    return EMBED_HOST_PATTERN.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

/**
 * Appends the `embed=vizapp` hint to a vizmaster.app URL, preserving any
 * existing query and hash. Non-vizmaster URLs pass through untouched and the
 * operation is idempotent (an existing embed param is left alone).
 */
export function withEmbedHint(raw: string): string {
  if (!isVizmasterAppUrl(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.searchParams.has(EMBED_PARAM)) return url.href;
    url.searchParams.set(EMBED_PARAM, EMBED_VALUE);
    return url.href;
  } catch {
    return raw;
  }
}

/**
 * The pane's sign-in / renewal / sign-out URL: vizmaster.app root with a
 * `returnTo` (sign-in/renewal) or `signout` (sign-out) query marker. The
 * desktop intercepts these from the guest and routes sign-in/renewal into a
 * child tab so /play state survives (D3).
 */
export function isPaneSignInUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!EMBED_HOST_PATTERN.test(url.hostname)) return false;
    if (url.pathname !== '/' && url.pathname !== '') return false;
    return url.searchParams.has('returnTo') || url.searchParams.has('signout');
  } catch {
    return false;
  }
}
