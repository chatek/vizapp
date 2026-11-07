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
/**
 * The logo hold is TIMED TO THE MUSIC (operator 2026-11-07): the branded chime
 * always plays at its natural pitch and tempo — 17 eighths at 110 BPM ≈ 4.64s —
 * and the overlay holds long enough for it to FINISH. MEASURED (2026-11-07, dev):
 * the chime starts ~1.8s after page load (window creation → dynamic import →
 * AudioContext) while the hold anchors at first contentful paint, so the budget
 * is chime start latency (~1.8s) + the music's natural 4.64s + fade margin —
 * 6.8s floor. NO jitter (a randomized extension would outlast the finished
 * piece); the 7.2s cap bounds stuck init. The music always finishes; the logo
 * outlasts it by design, never the reverse.
 */
export const SPLASH_MIN_HOLD_MS = 6_800
export const SPLASH_MAX_HOLD_JITTER_MS = 0
/** Hard cap: the overlay is gone by this point after first paint, whatever init does. */
export const SPLASH_MAX_HOLD_MS = 7_200
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
      /** Show id (seeds the ambient presentation) and its opaque spec passthrough. */
      showId: string
      passthrough?: Record<string, unknown>
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
): Promise<{ fileName: string; title: string; authorHandle: string; license: string | null; showId: string; passthrough?: Record<string, unknown> } | null> {
  const state = await readCacheState(cacheDir, filesystem)
  const poster = state?.poster
  if (!poster) return null
  try {
    const bytes = await filesystem.readBinary(join(cacheDir, poster.fileName))
    if (sha256Bytes(bytes) !== poster.sha256.toLowerCase()) return null
    return {
      fileName: poster.fileName,
      title: poster.title,
      authorHandle: poster.authorHandle,
      license: poster.license ?? null,
      showId: poster.id,
      ...(poster.passthrough ? { passthrough: poster.passthrough } : {}),
    }
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
      showId: cached.showId,
      ...(cached.passthrough ? { passthrough: cached.passthrough } : {}),
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

/**
 * Deterministic per-show derivations for the official poster's ambient
 * presentation. Everything is a pure function of the frozen contract's fields,
 * so the same show id always produces the same composition (the "surprise" is
 * stable, not random per launch). All values are computed in the MAIN process
 * — the overlay script only receives finished numbers, never show fields, so
 * the page-side code stays inert data-plumbing.
 */
export interface AmbientFieldSpec {
  /** 32-bit seed derived from the show id, for any page-side PRNG. */
  seed: number
  /** Particle count for the constellation (14-40, denser ids => denser field). */
  particles: number
  /** Flow-field drift angle in degrees, one of 8 cardinal directions from id bytes. */
  driftDegrees: number
  /** Particle speed factor (0.4-1.2), from id bytes. */
  speed: number
}

export interface AmbientPalette {
  /** Accent hue in degrees for the field tint. */
  hue: number
  /** Secondary hue, ~40-80 degrees away, for depth variation. */
  secondaryHue: number
}

/** FNV-1a over the show id: deterministic, cheap, and identical in any runtime. */
export function showSeed(showId: string): number {
  let hash = 0x811c9dc5
  for (let index = 0; index < showId.length; index++) {
    hash ^= showId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

export function ambientFieldSpec(showId: string): AmbientFieldSpec {
  const seed = showSeed(showId)
  return {
    seed,
    particles: 14 + (seed % 27),
    driftDegrees: (seed >>> 8) % 8 * 45,
    speed: 0.4 + ((seed >>> 16) % 81) / 100,
  }
}

/**
 * Accent hue from the SUBJECT string: a hash maps any subject onto the cool
 * half of the wheel (160-300 degrees) for a consistently dark-friendly palette
 * with per-subject variety — no per-subject lookup table.
 */
export function ambientPalette(subject: string | undefined): AmbientPalette {
  const base = showSeed(subject ?? '')
  const hue = 160 + (base % 141)
  return { hue, secondaryHue: (hue + 40 + (base >>> 8) % 41) % 360 }
}

/** Compact spec echo line: `kind · key=value …` (params values JSON-encoded, then tidied). */
export function specEchoLine(kind: string | undefined, params: Record<string, unknown> | undefined): string {
  const head = (kind ?? '').trim() || 'vizshow'
  const entries = Object.entries(params ?? {})
    .map(([key, value]) => `${key}=${typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}`)
    .join(' ')
  return entries ? `${head} · ${entries}` : head
}

/** What the overlay swap script can receive: a sandboxed scene document, or a poster image with attribution. */
export type SplashOverlayPayload =
  | { mode: 'html'; html: string }
  | {
      mode: 'poster'
      dataUrl: string
      attribution: string | null
      /** Presentation spec for the official leg; absent keeps the plain Ken-Burns. */
      presentation?: {
        title: string
        authorLine: string
        specEcho: string
        field: AmbientFieldSpec
        palette: AmbientPalette
      }
    }

/**
 * Script the main process executes in the main window to swap the selected
 * scene into the static overlay. Scenes embed as a sandboxed srcdoc iframe —
 * no scripts, opaque origin, no URL fetch (so no frame-src interaction) — and
 * posters as a data-URL img. With a presentation spec the poster leg becomes
 * a layered composition: a seeded ambient SVG field, a staged poster reveal
 * (blur+scale settle) with Ken-Burns continuing behind it, title/author
 * textContent. The script is a no-op once the overlay has been dismissed or
 * removed. The per-launch hold jitter for the renderer's 3-5s duration rule
 * rides along as a dataset attribute.
 */
export function splashOverlaySceneScript(payload: SplashOverlayPayload, holdJitterMs = 0): string {
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
  const presentationBody = payload.mode === 'poster' && payload.presentation
    ? buildPosterPresentationScript(payload.presentation)
    : ''
  return `(() => {
  const overlay = document.getElementById(${JSON.stringify(SPLASH_OVERLAY_ID)})
  if (!overlay || overlay.classList.contains('vclaw-splash--hidden')) return false
  overlay.dataset.vclawHoldJitter = ${JSON.stringify(String(holdJitterMs))}
  const host = overlay.querySelector('.vclaw-splash__scene')
  if (!host) return false
  host.textContent = ''
${sceneBody}
${presentationBody}
  overlay.classList.add('vclaw-splash--scene')
  return true
})()`
}

/**
 * Layered presentation for the official poster: ambient field, staged reveal,
 * typography, spec echo. The page-side code is deliberately dumb — every
 * creative decision (seed, counts, hues, angles, text) was computed in the
 * main process and arrives as inert data. Ambient positions come from a
 * page-side mulberry32 seeded with the show seed, so the same show always
 * paints the same constellation.
 */
function buildPosterPresentationScript(presentation: NonNullable<Extract<SplashOverlayPayload, { mode: 'poster' }>['presentation']>): string {
  return `  const spec = ${JSON.stringify(presentation)}
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Ambient field: seeded constellation of drifting particles + connecting hairlines.
  const field = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  field.setAttribute('class', 'vclaw-splash__ambient')
  field.setAttribute('viewBox', '0 0 100 100')
  field.setAttribute('preserveAspectRatio', 'xMidYMid slice')
  let state = spec.field.seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const points = []
  for (let i = 0; i < spec.field.particles; i++) {
    const x = 4 + next() * 92, y = 4 + next() * 92, r = 0.25 + next() * 0.55, delay = next() * 8
    points.push([x, y])
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', x.toFixed(2)); dot.setAttribute('cy', y.toFixed(2)); dot.setAttribute('r', r.toFixed(2))
    dot.setAttribute('fill', 'hsl(' + (next() < 0.3 ? spec.palette.secondaryHue : spec.palette.hue) + ' 80% 72%)')
    if (!reduced) {
      dot.style.setProperty('--dx', Math.cos(spec.field.driftDegrees * Math.PI / 180).toFixed(3))
      dot.style.setProperty('--dy', Math.sin(spec.field.driftDegrees * Math.PI / 180).toFixed(3))
      dot.style.setProperty('--spd', (spec.field.speed * (0.5 + next())).toFixed(3))
      dot.style.animationDelay = delay.toFixed(2) + 's'
      dot.style.animationDuration = (9 + next() * 9).toFixed(2) + 's'
    }
    field.appendChild(dot)
  }
  for (let i = 0; i + 1 < points.length; i += 2) {
    const [x1, y1] = points[i], [x2, y2] = points[i + 1]
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', x1.toFixed(2)); line.setAttribute('y1', y1.toFixed(2))
    line.setAttribute('x2', x2.toFixed(2)); line.setAttribute('y2', y2.toFixed(2))
    line.setAttribute('stroke', 'hsl(' + spec.palette.hue + ' 70% 60% / 0.16)')
    if (!reduced) line.style.animationDelay = (next() * 6).toFixed(2) + 's'
    field.appendChild(line)
  }
  host.parentNode.insertBefore(field, host)
  overlay.classList.add('vclaw-splash--ambient')
  // Typography: title rises per-word, author line fades in behind it.
  const titleEl = overlay.querySelector('.vclaw-splash__title')
  if (titleEl) {
    titleEl.textContent = ''
    for (const word of spec.title.split(/\\s+/)) {
      const span = document.createElement('span')
      span.className = 'vclaw-splash__title-word'
      span.textContent = word
      titleEl.appendChild(span)
      titleEl.appendChild(document.createTextNode(' '))
    }
  }
  const authorEl = overlay.querySelector('.vclaw-splash__author')
  if (authorEl) authorEl.textContent = spec.authorLine
  overlay.classList.add('vclaw-splash--presented')
  // Spec echo: typewriter-in monospace line (full text present for reduced motion).
  const echoEl = overlay.querySelector('.vclaw-splash__spec')
  if (echoEl) {
    if (reduced) {
      echoEl.textContent = spec.specEcho
    } else {
      let shown = 0
      const tick = () => {
        if (shown >= spec.specEcho.length || echoEl.dataset.vclawDone === 'true') { echoEl.textContent = spec.specEcho; return }
        shown = Math.min(spec.specEcho.length, shown + 1)
        echoEl.textContent = spec.specEcho.slice(0, shown)
        setTimeout(tick, 34)
      }
      setTimeout(tick, 900)
    }
  }`
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
  /** Per-launch random hold extension (0..2000ms) handed to the renderer; injectable for tests. */
  holdJitter?: () => number
}

export interface SplashOverlayPresentation {
  /**
   * Delivers the selected scene into the main window's overlay. Safe to call
   * once with a null or destroyed target (window creation failed): selection
   * still ran, nothing is presented, nothing throws.
   */
  deliverTo(target: SplashOverlayTarget | null): void
  /**
   * The logo overlay's hold time for THIS launch (min hold + the per-launch jitter),
   * in ms — the same value the scene swap waits. The startup chime is timed to it so
   * the branded sound plays exactly as long as the logo set is on screen.
   */
  readonly holdMs: number
}

/**
 * Starts scene selection immediately (so the scene is ready the moment the
 * main window's overlay can receive it) and returns the delivery handle the
 * bootstrap hands the created window's webContents. Any failure at any stage
 * is silent: the static shimmer overlay simply continues.
 */
export function beginSplash(options: SplashOverlayOptions): SplashOverlayPresentation {
  const filesystem = options.filesystem ?? defaultFilesystem
  const holdJitter = options.holdJitter ?? (() => Math.floor(Math.random() * (SPLASH_MAX_HOLD_JITTER_MS + 1)))
  // ONE hold value per launch: the scene swap waits it, and the chime is timed
  // to it, so the branded sound lasts exactly as long as the logo set is shown.
  const holdMs = SPLASH_MIN_HOLD_MS + holdJitter()
  let expired = false
  const deadline = setTimeout(() => { expired = true }, options.sceneSwapDeadlineMs ?? SPLASH_SCENE_SWAP_DEADLINE_MS)
  deadline.unref()
  const selection = selectSplashScene(options).then((choice) => {
    // The official cache only matters when the user's own shows did not win.
    if (choice && choice.source !== 'user') void refreshOfficialSplashScene(options).catch(() => {})
    return choice
  })
  return {
    holdMs,
    deliverTo(target) {
      if (!target || target.isDestroyed()) return
      void selection.then(async (choice) => {
        if (expired || !choice || target.isDestroyed()) return
        const passthrough = choice.mode === 'poster' ? choice.passthrough : undefined
        const kind = typeof passthrough?.kind === 'string' ? passthrough.kind : undefined
        const subject = typeof passthrough?.subject === 'string' ? passthrough.subject : undefined
        const params = passthrough && typeof passthrough.params === 'object' && passthrough.params !== null
          ? (passthrough.params as Record<string, unknown>)
          : undefined
        const script = choice.mode === 'html'
          ? splashOverlaySceneScript({ mode: 'html', html: await filesystem.readFile(choice.htmlPath, 'utf8') }, holdMs - SPLASH_MIN_HOLD_MS)
          : splashOverlaySceneScript({
              mode: 'poster',
              dataUrl: posterDataUrl(await filesystem.readBinary(choice.posterPath), choice.posterFileName),
              attribution: officialAttribution(choice.title, choice.authorHandle, choice.license),
              presentation: {
                title: choice.title,
                authorLine: officialAttribution(choice.title, choice.authorHandle, choice.license),
                specEcho: specEchoLine(kind, params),
                field: ambientFieldSpec(choice.showId),
                palette: ambientPalette(subject),
              },
            }, holdMs - SPLASH_MIN_HOLD_MS)
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
