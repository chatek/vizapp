/**
 * `vizshow://<build-id>` links and the chip both end up here: the renderer never composes a
 * loopback origin itself. Main resolves the build to a URL (and binds the server lazily), and the
 * App installs the navigator that puts that URL in the Browser pane.
 *
 * Kept as a module-level seam so the transcript's markdown renderer — a leaf component with no
 * access to App state — can open a build without prop-drilling a callback through every message.
 */

export type VizshowNavigator = (url: string) => void

let navigator: VizshowNavigator | null = null

/** Installed by App on mount; returns the uninstall for the effect cleanup. */
export function setVizshowNavigator(next: VizshowNavigator | null): () => void {
  navigator = next
  return () => { if (navigator === next) navigator = null }
}

/**
 * `vizshow://<id>`, `vizshow:<id>` and a bare build id all mean the same thing. Anything else —
 * including a path or a query — is refused: a build id is a directory name, never a URL.
 */
export function parseVizshowHref(href: string): string | null {
  const match = /^vizshow:\/\/([A-Za-z0-9][A-Za-z0-9._-]{0,127})\/?$/i.exec(href.trim())
  return match ? match[1] : null
}

/**
 * Resolves a build id through the bridge and hands the URL to the navigator. `false` means the
 * click did nothing — no bridge, no such build, or the server could not bind — and the caller
 * should leave a trace rather than pretend the link worked.
 */
/** Navigates the pane to a URL main already resolved (the project preview uses this path). */
export function navigateVizshowUrl(url: string): boolean {
  if (!navigator) return false
  navigator(url)
  return true
}

export async function openVizshow(idOrHref: string): Promise<boolean> {
  const id = parseVizshowHref(idOrHref) ?? idOrHref
  const api = window.prime?.vizshow
  if (!api) return false
  const resolved = await api.url(id)
  if (!resolved.ok) return false
  if (!navigator) return false
  navigator(resolved.url)
  return true
}
