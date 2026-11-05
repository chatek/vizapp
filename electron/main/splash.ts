import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { vclawSdkRootDirName } from './vclaw-sdk-root'

/**
 * Splash for member products: an IN-FRAME overlay painted by index.html before
 * the JS bundle, inside the main window (no second window). The overlay's
 * static markup is the branded fallback (wordmark + shimmer); the selected
 * scene is swapped in by the main process once selection resolves, and the
 * renderer fades the overlay out when the app UI is initialized.
 *
 * Scene selection is local-first: a random user scene from ~/.<profile>/shows
 * beats the cached official default, which beats the bundled defaults. The
 * official default is a poster image from VizRegistry rendered with a
 * Ken-Burns CSS animation and an attribution corner; user and bundled scenes
 * are self-contained animated HTML files embedded as sandboxed srcdoc iframes
 * (no scripts, opaque origin — strictly safer than a file URL). The official
 * feed is a background refresh only — the splash NEVER waits on the network,
 * and every failure (DNS, 404, timeout, bad JSON, sha mismatch) fails soft to
 * the next tier, with the static shimmer as the last resort.
 *
 * CSP note: the renderer forbids inline scripts (script-src 'self' in both the
 * dev meta policy and the packaged protocol policy), so the overlay carries
 * markup and styles only; ALL behavior reaches it through main-process
 * executeJavaScript, which is not a page resource and bypasses page CSP.
 */

/**
 * VizRegistry's splash VizShow feed. Contract of record: docs/splash-vizshow-api.md
 * in chatek/vizmaster @ main 96a661b, plus the rename/projection confirmation in
 * chatek/vizmaster#1 comments 27/28 — GET /api/vizshows/featured returns
 * { show: { id, title, authorHandle, license?, tutorialId, kind, params,
 * posterUrl, posterSha256, subject, lang, publishedAt }, rotatedAt }.
 * `tutorialId`, `kind`, `params`, `subject`, `lang`, and `rotatedAt` are
 * opaque passthrough — cached for a future spec renderer, never interpreted
 * here. The endpoint's max-age=600 does not govern us; our own 24h throttle does.
 */
export const OFFICIAL_VIZSHOW_FEATURED_URL = 'https://vizmaster.app/api/vizshows/featured'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
/** A downloaded poster larger than this is rejected before it can displace the last good cache entry. */
const MAX_OFFICIAL_POSTER_BYTES = 2_000_000
/**
 * Ceiling on selection+read time: a scene that has not been swapped in by then
 * never swaps — the static shimmer fallback simply continues. The overlay never
 * blocks the UI behind it (pointer-events: none), so there is no lifetime cap.
 */
const SPLASH_SCENE_SWAP_DEADLINE_MS = 2_000

/** DOM id of the overlay element index.html paints; mirrored in src/lib/splash-overlay.ts. */
export const SPLASH_OVERLAY_ID = 'vclaw-splash'

export type SplashSceneSource = 'user' | 'official' | 'bundled'

export type SplashSceneChoice =
  | { mode: 'html'; source: Exclude<SplashSceneSource, 'official'>; htmlPath: string }
  | {
      mode: 'poster'
      source: 'official'
      /** Absolute path of the cached poster bytes. */
      posterPath: string
      /** Bare file name of the poster inside its cache directory (used for the data-URL mime type). */
      posterFileName: string
      title: string
      authorHandle: string
      license: string | null
    }

/** Injectable filesystem so selection and cache refresh are testable without touching the real home. */
export interface SplashFilesystem {
  readdir(path: string): Promise<string[]>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  /** Binary read for poster bytes. */
  readBinary(path: string): Promise<Uint8Array>
  writeFile(path: string, contents: string, encoding: 'utf8'): Promise<void>
  writeBinary(path: string, contents: Uint8Array): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<string | undefined>
  rename(from: string, to: string): Promise<void>
}

const defaultFilesystem: SplashFilesystem = {
  readdir: (path) => readdir(path),
  readFile: (path, encoding) => readFile(path, encoding),
  readBinary: async (path) => new Uint8Array(await readFile(path)),
  writeFile: (path, contents, encoding) => writeFile(path, contents, encoding),
  writeBinary: (path, contents) => writeFile(path, contents),
  mkdir: (path, options) => mkdir(path, options),
  rename: (from, to) => rename(from, to),
}

/** The slice of fetch the refresh needs; Response satisfies it structurally. */
export type SplashFetch = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  arrayBuffer(): Promise<ArrayBuffer>
  headers: { get(name: string): string | null }
}>

const defaultFetch: SplashFetch = (url, init) => fetch(url, init)

interface CachedOfficialPoster {
  id: string
  title: string
  authorHandle: string
  sha256: string
  fileName: string
  fetchedAt: number
  license?: string
  /** Opaque show fields (tutorialId, kind, params, subject, lang) kept verbatim for a future spec renderer. */
  passthrough?: Record<string, unknown>
}

interface SplashCacheState {
  version: 1
  lastAttemptAt: number
  poster?: CachedOfficialPoster
}

export interface SplashGate {
  startInBackground: boolean
  hiddenForTests: boolean
  smokeRun: boolean
}

/**
 * Whether this launch shows a splash at all. The generic product (id 'vclaw')
 * never does — its behavior is byte-for-byte unchanged — and neither do the
 * launch modes where the main window is never shown.
 */
export function shouldShowSplash(profileId: string, gate: SplashGate): boolean {
  if (vclawSdkRootDirName(profileId) === null) return false
  return !(gate.startInBackground || gate.hiddenForTests || gate.smokeRun)
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function listHtmlFiles(dir: string, filesystem: SplashFilesystem): Promise<string[]> {
  try {
    const entries = await filesystem.readdir(dir)
    return entries.filter((name) => name.toLowerCase().endsWith('.html')).sort()
  } catch {
    return []
  }
}

function pickRandom<T>(items: readonly T[], random: () => number): T | null {
  if (items.length === 0) return null
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
  return items[index]
}

async function readCacheState(cacheDir: string, filesystem: SplashFilesystem): Promise<SplashCacheState | null> {
  try {
    const parsed: unknown = JSON.parse(await filesystem.readFile(join(cacheDir, 'state.json'), 'utf8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>
    if (record.version !== 1 || typeof record.lastAttemptAt !== 'number') return null
    let poster: CachedOfficialPoster | undefined
    if (typeof record.poster === 'object' && record.poster !== null) {
      const candidate = record.poster as Record<string, unknown>
      if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string'
        || typeof candidate.authorHandle !== 'string' || typeof candidate.sha256 !== 'string'
        || typeof candidate.fileName !== 'string' || typeof candidate.fetchedAt !== 'number') return null
      const license = typeof candidate.license === 'string' && candidate.license.trim() !== '' ? candidate.license : undefined
      const passthrough = typeof candidate.passthrough === 'object' && candidate.passthrough !== null
        ? (candidate.passthrough as Record<string, unknown>)
        : undefined
      poster = {
        id: candidate.id,
        title: candidate.title,
        authorHandle: candidate.authorHandle,
        sha256: candidate.sha256,
        fileName: candidate.fileName,
        fetchedAt: candidate.fetchedAt,
        ...(license ? { license } : {}),
        ...(passthrough ? { passthrough } : {}),
      }
    }
    return { version: 1, lastAttemptAt: record.lastAttemptAt, ...(poster ? { poster } : {}) }
  } catch {
    return null
  }
}

async function writeCacheState(cacheDir: string, state: SplashCacheState, filesystem: SplashFilesystem): Promise<void> {
  await filesystem.mkdir(cacheDir, { recursive: true })
  await filesystem.writeFile(join(cacheDir, 'state.json'), JSON.stringify(state), 'utf8')
}

/**
 * The cached official poster, but only when its bytes still match the recorded
 * digest (which also proves the file is the exact image the feed signed).
 */
async function readCachedOfficialPoster(
  cacheDir: string,
  filesystem: SplashFilesystem,
): Promise<{ fileName: string; title: string; authorHandle: string; license: string | null } | null> {
  const state = await readCacheState(cacheDir, filesystem)
  const poster = state?.poster
  if (!poster) return null
  try {
    const bytes = await filesystem.readBinary(join(cacheDir, poster.fileName))
    if (sha256Bytes(bytes) !== poster.sha256.toLowerCase()) return null
    return { fileName: poster.fileName, title: poster.title, authorHandle: poster.authorHandle, license: poster.license ?? null }
  } catch {
    return null
  }
}

export interface SplashSelectionOptions {
  homeDir: string
  profileId: string
  bundledDir: string
  filesystem?: SplashFilesystem
  random?: () => number
}

/**
 * Selection order: (1) a uniformly random user scene from the shows dir,
 * (2) the cached official poster once its sha256 verifies, (3) a random
 * bundled scene. Null means nothing playable exists and the static shimmer
 * fallback continues.
 */
export async function selectSplashScene(options: SplashSelectionOptions): Promise<SplashSceneChoice | null> {
  const rootDir = vclawSdkRootDirName(options.profileId)
  if (!rootDir) return null
  const filesystem = options.filesystem ?? defaultFilesystem
  const random = options.random ?? Math.random
  const userScene = pickRandom(await listHtmlFiles(join(options.homeDir, rootDir, 'shows'), filesystem), random)
  if (userScene) {
    return { mode: 'html', source: 'user', htmlPath: join(options.homeDir, rootDir, 'shows', userScene) }
  }
  const cacheDir = join(options.homeDir, rootDir, 'cache', 'splash')
  const cached = await readCachedOfficialPoster(cacheDir, filesystem)
  if (cached) {
    return {
      mode: 'poster',
      source: 'official',
      posterPath: join(cacheDir, cached.fileName),
      posterFileName: cached.fileName,
      title: cached.title,
      authorHandle: cached.authorHandle,
      license: cached.license,
    }
  }
  const bundledScene = pickRandom(await listHtmlFiles(options.bundledDir, filesystem), random)
  if (bundledScene) {
    return { mode: 'html', source: 'bundled', htmlPath: join(options.bundledDir, bundledScene) }
  }
  return null
}

/** The show fields this module consumes; the wrapper's `rotatedAt` is opaque. */
interface FeaturedVizShow {
  id: string
  title: string
  authorHandle: string
  posterUrl: string
  posterSha256: string
  license: string | null
  /** tutorialId/kind/params/subject/lang verbatim — never interpreted, cached for a future spec renderer. */
  passthrough: Record<string, unknown>
}

/**
 * Parses the { show, rotatedAt } wrapper. `tutorialId`, `kind`, `params`,
 * `subject`, `lang`, `publishedAt`, and `rotatedAt` are opaque passthrough
 * per the contract — they exist for a future spec-renderer upgrade.
 */
function validateSplashPayload(raw: unknown): FeaturedVizShow | null {
  if (typeof raw !== 'object' || raw === null) return null
  const show = (raw as Record<string, unknown>).show
  if (typeof show !== 'object' || show === null) return null
  const record = show as Record<string, unknown>
  const id = typeof record.id === 'string' ? record.id.trim() : ''
  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const authorHandle = typeof record.authorHandle === 'string' ? record.authorHandle.trim() : ''
  const posterUrl = typeof record.posterUrl === 'string' ? record.posterUrl.trim() : ''
  const posterSha256 = typeof record.posterSha256 === 'string' ? record.posterSha256.trim().toLowerCase() : ''
  const license = typeof record.license === 'string' && record.license.trim() !== '' ? record.license : null
  if (!id || !title || !authorHandle || !posterUrl || !/^[0-9a-f]{64}$/.test(posterSha256)) return null
  const passthrough: Record<string, unknown> = {}
  for (const field of ['tutorialId', 'kind', 'params', 'subject', 'lang'] as const) {
    if (field in record) passthrough[field] = record[field]
  }
  return { id, title, authorHandle, posterUrl, posterSha256, license, passthrough }
}

/**
 * Cache extension derived from the poster response's content type — the live
 * endpoint serves image/jpeg (the design docs' "PNG" is not what ships), so
 * the extension must never be hardcoded. Returns null for anything that is
 * not an image, which fails soft to the previous cache entry.
 */
function posterExtension(contentType: string | null): string | null {
  if (!contentType) return null
  const subtype = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  if (!subtype.startsWith('image/')) return null
  const format = subtype.slice('image/'.length).replace(/[^a-z0-9]/g, '')
  if (format === '') return null
  return `.${format === 'jpeg' ? 'jpg' : format}`
}

function isLoopbackOrPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0') return true
  return /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)
}

/**
 * The live registry has served posterUrl with its internal bind address
 * (http://127.0.0.1:8089/...) instead of the public origin — measured
 * 2026-11-05; the same poster is served and sha256-verified at the API's own
 * public origin. A loopback/private-host posterUrl is rebuilt against that
 * origin; every other URL is used verbatim. Poster sha256 verification still
 * gates the bytes, so this can only recover the official poster, never
 * substitute one, and the client never dials the user's loopback.
 */
function publicPosterUrl(posterUrl: string): string {
  try {
    const url = new URL(posterUrl)
    if (!isLoopbackOrPrivateHost(url.hostname)) return posterUrl
    const api = new URL(OFFICIAL_VIZSHOW_FEATURED_URL)
    return `${api.origin}${url.pathname}${url.search}`
  } catch {
    return posterUrl
  }
}

export interface SplashRefreshOptions {
  homeDir: string
  profileId: string
  now?: () => number
  filesystem?: SplashFilesystem
  fetch?: SplashFetch
  fetchTimeoutMs?: number
}

/**
 * Background refresh of the official poster: fetch the splash VizShow at most
 * once per 24h, download and sha256-verify its poster, and keep the last good
 * entry on any failure. The attempt is stamped BEFORE the network call so a
 * dead endpoint cannot turn every launch into a request. Never throws.
 */
export async function refreshOfficialSplashScene(options: SplashRefreshOptions): Promise<boolean> {
  const rootDir = vclawSdkRootDirName(options.profileId)
  if (!rootDir) return false
  const filesystem = options.filesystem ?? defaultFilesystem
  const fetchImpl = options.fetch ?? defaultFetch
  const now = options.now ?? Date.now
  const timeoutMs = options.fetchTimeoutMs ?? 5_000
  const cacheDir = join(options.homeDir, rootDir, 'cache', 'splash')
  const previous = await readCacheState(cacheDir, filesystem)
  // No previous state means never attempted (epoch would wrongly throttle for 24h).
  if (previous && now() - previous.lastAttemptAt < TWENTY_FOUR_HOURS_MS) return false
  const attemptedAt = now()
  try {
    await writeCacheState(cacheDir, { version: 1, lastAttemptAt: attemptedAt, ...(previous?.poster ? { poster: previous.poster } : {}) }, filesystem)
  } catch {
    return false
  }
  try {
    const featuredResponse = await fetchImpl(OFFICIAL_VIZSHOW_FEATURED_URL, { signal: AbortSignal.timeout(timeoutMs) })
    if (!featuredResponse.ok) return false
    const featured = validateSplashPayload(await featuredResponse.json())
    if (!featured) return false
    const posterResponse = await fetchImpl(publicPosterUrl(featured.posterUrl), { signal: AbortSignal.timeout(timeoutMs) })
    if (!posterResponse.ok) return false
    const extension = posterExtension(posterResponse.headers.get('content-type'))
    if (!extension) return false
    const poster = new Uint8Array(await posterResponse.arrayBuffer())
    if (poster.length === 0 || poster.length > MAX_OFFICIAL_POSTER_BYTES) return false
    const digest = sha256Bytes(poster)
    if (digest !== featured.posterSha256) return false
    // Stage then rename so a partial write can never displace the last good poster.
    const posterFileName = `poster${extension}`
    const partialPath = join(cacheDir, `poster.partial${extension}`)
    const posterPath = join(cacheDir, posterFileName)
    await filesystem.writeBinary(partialPath, poster)
    await filesystem.rename(partialPath, posterPath)
    await writeCacheState(
      cacheDir,
      {
        version: 1,
        lastAttemptAt: attemptedAt,
        poster: {
          id: featured.id,
          title: featured.title,
          authorHandle: featured.authorHandle,
          sha256: digest,
          fileName: posterFileName,
          fetchedAt: attemptedAt,
          ...(featured.license ? { license: featured.license } : {}),
          ...(Object.keys(featured.passthrough).length > 0 ? { passthrough: featured.passthrough } : {}),
        },
      },
      filesystem,
    )
    return true
  } catch {
    return false
  }
}

/** Attribution corner line for the official poster: `title — authorHandle`, plus the license when the feed supplies one. */
export function officialAttribution(title: string, authorHandle: string, license: string | null): string {
  return license ? `${title} — ${authorHandle} · ${license}` : `${title} — ${authorHandle}`
}

/** Mime types for the poster cache extensions posterExtension() can produce. */
const POSTER_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

function posterDataUrl(bytes: Uint8Array, posterFileName: string): string {
  const mimeType = POSTER_MIME_TYPES[extname(posterFileName).toLowerCase()] ?? 'image/jpeg'
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
}

/** What the overlay swap script can receive: a sandboxed scene document, or a poster image with attribution. */
export type SplashOverlayPayload =
  | { mode: 'html'; html: string }
  | { mode: 'poster'; dataUrl: string; attribution: string | null }

/**
 * Script the main process executes in the main window to swap the selected
 * scene into the static overlay. Scenes embed as a sandboxed srcdoc iframe —
 * no scripts, opaque origin, no URL fetch (so no frame-src interaction) — and
 * posters as a data-URL img animated by the overlay's Ken-Burns CSS. The
 * script is a no-op once the overlay has been dismissed or removed.
 */
export function splashOverlaySceneScript(payload: SplashOverlayPayload): string {
  const sceneBody = payload.mode === 'html'
    ? `  const frame = document.createElement('iframe')
  frame.className = 'vclaw-splash__frame'
  frame.title = 'VizShow'
  frame.setAttribute('sandbox', '')
  frame.srcdoc = ${JSON.stringify(payload.html)}
  host.appendChild(frame)`
    : `  const image = document.createElement('img')
  image.className = 'vclaw-splash__poster'
  image.alt = ''
  image.src = ${JSON.stringify(payload.dataUrl)}
  host.appendChild(image)
  const credit = overlay.querySelector('.vclaw-splash__attribution')
  if (credit && ${JSON.stringify(Boolean(payload.attribution))}) credit.textContent = ${JSON.stringify(payload.attribution ?? '')}`
  return `(() => {
  const overlay = document.getElementById(${JSON.stringify(SPLASH_OVERLAY_ID)})
  if (!overlay || overlay.classList.contains('vclaw-splash--hidden')) return false
  const host = overlay.querySelector('.vclaw-splash__scene')
  if (!host) return false
  host.textContent = ''
${sceneBody}
  overlay.classList.add('vclaw-splash--scene')
  return true
})()`
}

/**
 * Removes the overlay outright, with no fade. The main process runs this for
 * launches that must not show a splash (the generic build) while the window is
 * still hidden, so the static overlay markup in index.html is never presented.
 */
export const SPLASH_OVERLAY_REMOVE_SCRIPT = `(() => {
  document.getElementById(${JSON.stringify(SPLASH_OVERLAY_ID)})?.remove()
  return true
})()`

/** The slice of a WebContents the overlay delivery needs; the real one satisfies it structurally. */
export interface SplashOverlayTarget {
  executeJavaScript(script: string): Promise<unknown>
  isDestroyed(): boolean
}

export interface SplashOverlayOptions extends SplashSelectionOptions, SplashRefreshOptions {
  /** Ceiling on selection+read time before the shimmer fallback locks in; default 2s. */
  sceneSwapDeadlineMs?: number
}

export interface SplashOverlayPresentation {
  /**
   * Delivers the selected scene into the main window's overlay. Safe to call
   * once with a null or destroyed target (window creation failed): selection
   * still ran, nothing is presented, nothing throws.
   */
  deliverTo(target: SplashOverlayTarget | null): void
}

/**
 * Starts scene selection immediately (so the scene is ready the moment the
 * main window's overlay can receive it) and returns the delivery handle the
 * bootstrap hands the created window's webContents. Any failure at any stage
 * is silent: the static shimmer overlay simply continues.
 */
export function beginSplash(options: SplashOverlayOptions): SplashOverlayPresentation {
  const filesystem = options.filesystem ?? defaultFilesystem
  let expired = false
  const deadline = setTimeout(() => { expired = true }, options.sceneSwapDeadlineMs ?? SPLASH_SCENE_SWAP_DEADLINE_MS)
  deadline.unref()
  const selection = selectSplashScene(options).then((choice) => {
    // The official cache only matters when the user's own shows did not win.
    if (choice && choice.source !== 'user') void refreshOfficialSplashScene(options).catch(() => {})
    return choice
  })
  return {
    deliverTo(target) {
      if (!target || target.isDestroyed()) return
      void selection.then(async (choice) => {
        if (expired || !choice || target.isDestroyed()) return
        const script = choice.mode === 'html'
          ? splashOverlaySceneScript({ mode: 'html', html: await filesystem.readFile(choice.htmlPath, 'utf8') })
          : splashOverlaySceneScript({
              mode: 'poster',
              dataUrl: posterDataUrl(await filesystem.readBinary(choice.posterPath), choice.posterFileName),
              attribution: officialAttribution(choice.title, choice.authorHandle, choice.license),
            })
        if (expired || target.isDestroyed()) return
        await target.executeJavaScript(script).catch(() => {})
      }).catch(() => {})
    },
  }
}

export interface MainWindowPresentationState {
  /** Member products paint the splash overlay before the JS bundle and may present the window at first paint. */
  splashOverlay: boolean
  readyToShow: boolean
  rendererLoaded: boolean
  /** Set once the generic build's unused overlay copy has been stripped (irrelevant when splashOverlay is true). */
  overlayCleared: boolean
}

/**
 * When the main window may present itself. A member window shows at first
 * paint (the static overlay is what paints, before the bundle finishes); the
 * generic build keeps its historical gate — load complete AND its overlay copy
 * removed — so its presentation is unchanged and the overlay is never visible.
 */
export function shouldPresentMainWindow(state: MainWindowPresentationState): boolean {
  if (!state.readyToShow) return false
  if (state.splashOverlay) return true
  return state.rendererLoaded && state.overlayCleared
}
