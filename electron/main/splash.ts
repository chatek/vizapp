import { BrowserWindow } from 'electron'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { vclawSdkRootDirName } from './vclaw-sdk-root'

/**
 * Splash screen for member products: a frameless window that appears before the
 * main UI and plays one animated VizShow scene while the app boots.
 *
 * Scene selection is local-first: a random user scene from ~/.<profile>/shows
 * beats the cached official default, which beats the bundled defaults. The
 * official default is a poster image from VizRegistry that the splash renders
 * inside a desktop-side motion shell (Ken-Burns pan/zoom + attribution);
 * user and bundled scenes are self-contained animated HTML files loaded
 * directly. The official feed is a background refresh only — the splash NEVER
 * waits on the network, and every failure (DNS, 404, timeout, bad JSON, sha
 * mismatch) fails soft to the next tier until the bundled scenes, and
 * ultimately to an inline branded fallback page.
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
const SPLASH_FALLBACK_TIMEOUT_MS = 2_000
const SPLASH_FADE_MS = 300
/** The splash never outlives this, even if the main window is never shown. */
const SPLASH_MAX_LIFETIME_MS = 15_000
const SPLASH_WINDOW_WIDTH = 720
const SPLASH_WINDOW_HEIGHT = 480

export type SplashSceneSource = 'user' | 'official' | 'bundled'

export type SplashSceneChoice =
  | { mode: 'html'; source: Exclude<SplashSceneSource, 'official'>; htmlPath: string }
  | {
      mode: 'poster'
      source: 'official'
      /** Absolute path of the cached poster bytes. */
      posterPath: string
      /** Bare file name of the poster inside its cache directory (the shell references it relatively). */
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
 * launch modes where the main window is never shown (the splash would linger).
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
 * bundled scene. Null means nothing playable exists and the splash must use
 * the inline branded fallback.
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

/** Attribution corner line for the official poster, per the contract: `title — authorHandle`. */
export function officialAttribution(title: string, authorHandle: string, license: string | null): string {
  return license ? `${title} — ${authorHandle} · ${license}` : `${title} — ${authorHandle}`
}

const WORDMARK_CSS = [
  '#__vclaw_splash_mark{position:fixed;left:28px;bottom:24px;z-index:2147483647;pointer-events:none;',
  'font:600 15px/1.2 ui-sans-serif,-apple-system,"Segoe UI",system-ui,sans-serif;letter-spacing:.18em;',
  'color:rgba(244,244,245,.92);text-shadow:0 1px 10px rgba(0,0,0,.6)}',
].join('')

/** Wordmark laid over a loaded user/bundled scene, without touching the scene's own markup. */
const WORDMARK_SCRIPT = `(() => {
  const style = document.createElement('style')
  style.textContent = ${JSON.stringify(WORDMARK_CSS)}
  document.head.appendChild(style)
  const mark = document.createElement('div')
  mark.id = '__vclaw_splash_mark'
  mark.textContent = 'VClaw'
  document.body.appendChild(mark)
  return true
})()`

const SPLASH_FADE_SCRIPT = `(() => {
  const root = document.documentElement
  root.style.transition = 'opacity ${SPLASH_FADE_MS}ms ease'
  root.style.opacity = '0'
  return true
})()`

function escapeHtmlText(text: string): string {
  return text.replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch] ?? ch)
}

/**
 * Motion shell for the official poster: the image is referenced from a shell
 * file written next to it in the cache dir, so the pair stays plain local
 * files (no data-URL size ceiling, no network). Ken-Burns pan/zoom runs as
 * pure CSS over the img; the wordmark and attribution are baked in.
 */
export function buildPosterSplashShell(posterFileName: string, attribution: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent }
  .stage { position: fixed; inset: 10px; border-radius: 20px; overflow: hidden;
    background: #0a0e19; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55) }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
    animation: kenburns 16s ease-in-out infinite alternate; will-change: transform }
  /* vignette keeps the corner wordmark and attribution legible over any poster */
  .vignette { position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba(10, 14, 25, 0.28) 0%, rgba(10, 14, 25, 0) 30%),
      linear-gradient(0deg, rgba(10, 14, 25, 0.62) 0%, rgba(10, 14, 25, 0) 38%);
    pointer-events: none }
  .mark { position: absolute; left: 28px; bottom: 24px; pointer-events: none;
    font: 600 15px/1.2 ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
    letter-spacing: .18em; color: rgba(244, 244, 245, .92); text-shadow: 0 1px 10px rgba(0, 0, 0, .6) }
  .mark small { display: block; margin-top: 5px;
    font: 400 10.5px/1.3 ui-sans-serif, system-ui, sans-serif; letter-spacing: .02em;
    color: rgba(244, 244, 245, .6); text-shadow: 0 1px 6px rgba(0, 0, 0, .6) }
  @keyframes kenburns {
    from { transform: scale(1.06) translate(-1.5%, -1%) }
    to { transform: scale(1.17) translate(1.5%, 1.2%) }
  }
</style>
</head>
<body>
  <div class="stage">
    <img src="${posterFileName}" alt="">
    <div class="vignette"></div>
    <div class="mark">VClaw<small>${escapeHtmlText(attribution)}</small></div>
  </div>
</body>
</html>`
}

/** Last-resort page: wordmark + shimmer, entirely inline, shown when no scene can be picked or loaded in time. */
const SPLASH_FALLBACK_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; height: 100%; background: transparent; overflow: hidden }
  .card { position: fixed; inset: 0; border-radius: 18px;
    background: radial-gradient(120% 120% at 30% 20%, #16181f 0%, #0a0b0f 62%);
    display: flex; align-items: center; justify-content: center }
  .mark { font: 600 46px/1.1 ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
    letter-spacing: .14em; color: transparent;
    background: linear-gradient(100deg, #e7e5e4 20%, #9ca3af 40%, #f5f5f4 50%, #52525b 60%, #e7e5e4 80%);
    background-size: 220% 100%; -webkit-background-clip: text; background-clip: text;
    animation: shimmer 2.2s linear infinite }
  @keyframes shimmer { from { background-position: 120% 0 } to { background-position: -120% 0 } }
  .bar { position: fixed; left: 50%; bottom: 66px; width: 180px; height: 2px; margin-left: -90px;
    border-radius: 2px; background: #26272e; overflow: hidden }
  .bar i { position: absolute; top: 0; left: 0; height: 100%; width: 40%; border-radius: 2px;
    background: linear-gradient(90deg, transparent, #a8a29e); animation: slide 1.6s ease-in-out infinite }
  @keyframes slide { from { transform: translateX(-120%) } to { transform: translateX(320%) } }
</style>
</head>
<body>
  <div class="card"><div class="mark">VClaw</div></div>
  <div class="bar"><i></i></div>
</body>
</html>`

export interface SplashWindowOptions extends SplashSelectionOptions, SplashRefreshOptions {}

/**
 * Owns the splash window: shows a scene (or the branded fallback within the
 * hard 2s budget) and crossfades out when told. All entry points are
 * fail-soft; nothing here can throw into bootstrap.
 */
export class SplashController {
  private readonly window: BrowserWindow
  private readonly options: SplashWindowOptions
  /** A page (scene, poster shell, or fallback) has committed; later candidates must not replace it. */
  private settled = false
  private dismissed = false
  private readonly timers = new Set<NodeJS.Timeout>()

  constructor(options: SplashWindowOptions) {
    this.options = options
    this.window = new BrowserWindow({
      width: SPLASH_WINDOW_WIDTH,
      height: SPLASH_WINDOW_HEIGHT,
      show: false,
      center: true,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      skipTaskbar: true,
      focusable: false,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    })
    // Scene files are local and self-contained; the splash never navigates anywhere else.
    const contents = this.window.webContents
    contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    contents.on('will-navigate', (event) => {
      if (!this.dismissed) event.preventDefault()
    })
    this.window.once('closed', () => this.dismiss())
    this.arm(SPLASH_FALLBACK_TIMEOUT_MS, () => this.showFallback())
    void selectSplashScene(options).then(
      (choice) => {
        if (!choice) {
          this.showFallback()
          return
        }
        // The official cache only matters when the user's own shows did not win.
        if (choice.source !== 'user') {
          void refreshOfficialSplashScene(options).catch(() => {})
        }
        void this.present(choice)
      },
      () => this.showFallback(),
    )
  }

  /** Shows the scene or poster shell, or the fallback if neither can be loaded. */
  private async present(choice: SplashSceneChoice): Promise<void> {
    if (this.settled || this.dismissed) return
    try {
      if (choice.mode === 'poster') {
        // The shell references the poster by relative name, so it must live in the same directory.
        const shellPath = join(dirname(choice.posterPath), 'splash-shell.html')
        const filesystem = this.options.filesystem ?? defaultFilesystem
        await filesystem.writeFile(
          shellPath,
          buildPosterSplashShell(choice.posterFileName, officialAttribution(choice.title, choice.authorHandle, choice.license)),
          'utf8',
        )
        await this.window.loadFile(shellPath)
      } else {
        await this.window.loadFile(choice.htmlPath)
      }
      if (this.settled || this.dismissed) return
      this.settled = true
      if (choice.mode === 'html') {
        await this.window.webContents.executeJavaScript(WORDMARK_SCRIPT).catch(() => {})
      }
      if (!this.dismissed && !this.window.isDestroyed()) this.window.show()
    } catch {
      this.showFallback()
    }
  }

  private showFallback(): void {
    if (this.settled || this.dismissed) return
    this.settled = true
    void this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_FALLBACK_HTML)}`).then(
      () => {
        if (!this.dismissed && !this.window.isDestroyed()) this.window.show()
      },
      () => this.dismiss(),
    )
  }

  /** Crossfades the splash page out, then destroys the window. Idempotent. */
  dismiss(): void {
    if (this.dismissed) return
    this.dismissed = true
    for (const timer of this.timers) clearTimeout(timer)
    this.timers.clear()
    const window = this.window
    const finish = () => {
      if (!window.isDestroyed()) window.destroy()
      if (activeSplash === this) activeSplash = null
    }
    if (window.isDestroyed()) {
      finish()
      return
    }
    void window.webContents.executeJavaScript(SPLASH_FADE_SCRIPT).then(
      () => {
        const timer = setTimeout(finish, SPLASH_FADE_MS + 80)
        this.timers.add(timer)
      },
      finish,
    )
  }

  /**
   * Disposes the splash when the main window becomes visible. Also bounded by
   * a hard lifetime so a hidden main window cannot strand the splash.
   */
  followMainWindow(main: BrowserWindow | null): void {
    if (!main || main.isDestroyed() || main.isVisible()) {
      this.dismiss()
      return
    }
    main.once('show', () => this.dismiss())
    main.once('closed', () => this.dismiss())
    this.arm(SPLASH_MAX_LIFETIME_MS, () => this.dismiss())
  }

  private arm(ms: number, run: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer)
      run()
    }, ms)
    this.timers.add(timer)
  }
}

let activeSplash: SplashController | null = null

/** Disposes the splash if one is alive; called on startup failure and app teardown paths. */
export function dismissActiveSplash(): void {
  activeSplash?.dismiss()
}

/** Opens the splash synchronously; selection and the official refresh run in the background. */
export function openSplash(options: SplashWindowOptions): SplashController {
  const controller = new SplashController(options)
  activeSplash = controller
  return controller
}
