import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { createReadStream, existsSync, readFileSync, readdirSync, realpathSync, statSync, watch, type FSWatcher } from 'node:fs'
import { homedir } from 'node:os'
import { extname, join, normalize, resolve, sep } from 'node:path'
import type { VizshowBuild, VizshowSnapshot } from '../../src/types/api'

/**
 * The per-prompt VizShow surface: a loopback-only static server over
 * `~/.vizmaster/vizshow/`, plus the watch that notices a new build arrive.
 *
 * This is NOT the project preview (that is `npm run preview` on 5174, see
 * `vizmaster-preview.ts`): these are immutable artefacts the agent produced, one directory per
 * prompt. The pane loads `http://127.0.0.1:<port>/<build-id>/` — never `file://`, which would
 * widen the browser pane's URL policy beyond credential-free http(s).
 *
 * Three properties this server must never lose:
 *   1. LOOPBACK ONLY — a build artefact is user content; it must never be reachable off-host.
 *   2. TRAVERSAL-PROOF — every served path is realpath-resolved and proven to live inside the
 *      root, so `..`, symlinks and encoded separators cannot escape it.
 *   3. LAZY — nothing binds a port until something asks for a build. A desktop that never
 *      renders a VizShow runs no extra listener.
 */

/** Preferred port. Not the project preview's 5174: the two surfaces must not collide. */
export const DEFAULT_VIZSHOW_PORT = 47_361

export const BUILD_STATUS_DONE = 'done'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
}

export function mimeTypeFor(path: string): string {
  return MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
}

/** `~/.vizmaster`, the layout root the payload and the desktop share. */
export function vizmasterHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.VIZMASTER_HOME?.trim() || join(homedir(), '.vizmaster')
}

/** The immutable per-prompt builds (this server's root). */
export function vizshowRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.VIZMASTER_VIZSHOW_DIR?.trim() || join(vizmasterHome(env), 'vizshow')
}

/** The seeded project the live preview serves (`npm run preview` runs here). */
export function vizmasterProjectRoot(env: NodeJS.ProcessEnv = process.env): string {
  return env.VIZMASTER_DEFAULT_DIR?.trim() || join(vizmasterHome(env), 'default')
}

// vizmaster (2026-11-07): the parser contract is CANONICAL in @vizmaster/vizshow-contract
// (packages/vizshow-contract, sha 9133a36; vendored as the tarball in vendor/ per the
// established file:-dependency mechanism). This module re-exports it so existing importers
// keep working; the definitions are no longer duplicated here — the 'defined twice' hole
// (which produced the built/done drift) is closed at the source.
export { isBuildId, parseBuildManifest } from '@vizmaster/vizshow-contract'
import { isBuildId, parseBuildManifest } from '@vizmaster/vizshow-contract'

export interface VizshowServiceOptions {
  root?: string
  port?: number
  /** Directory lister, injectable so tests need no real filesystem. */
  readdir?: (path: string) => string[]
  readFile?: (path: string) => string
}

/**
 * Owns the watch and the server. `start()` only begins WATCHING; the listener binds on the first
 * `urlFor()` call (the affordance asking for a build), which is what makes the port lazy.
 */
export class VizshowService {
  readonly root: string
  #server: Server | null = null
  #binding: Promise<number | null> | null = null
  #port: number | null = null
  #preferredPort: number
  #watcher: FSWatcher | null = null
  #watchedParent: string | null = null
  #latest: VizshowBuild | null = null
  #builds: VizshowBuild[] = []
  #readdir: (path: string) => string[]
  #readFile: (path: string) => string
  #listeners = new Set<(snapshot: VizshowSnapshot) => void>()
  #rescanTimer: ReturnType<typeof setTimeout> | null = null
  #stopped = false

  constructor(options: VizshowServiceOptions = {}) {
    this.root = options.root ?? vizshowRoot()
    this.#preferredPort = options.port ?? DEFAULT_VIZSHOW_PORT
    this.#readdir = options.readdir ?? ((path) => readdirSync(path))
    this.#readFile = options.readFile ?? ((path) => readFileSync(path, 'utf8'))

  }

  #emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.#listeners) listener(snapshot)
  }

  /** Subscribes to build/port changes; the caller owns nothing but the returned unsubscribe. */
  onChanged(listener: (snapshot: VizshowSnapshot) => void): () => void {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  get port(): number | null { return this.#port }
  get latest(): VizshowBuild | null { return this.#latest }
  get builds(): readonly VizshowBuild[] { return this.#builds }

  snapshot(): VizshowSnapshot {
    return {
      latest: this.#latest,
      builds: this.#builds.length,
      port: this.#port,
      baseUrl: this.#port === null ? null : `http://127.0.0.1:${this.#port}`,
    }
  }

  /**
   * Begins watching for builds. Never throws: a missing directory is created by the payload and
   * is simply not there yet, and a watch we cannot establish degrades to a rescan on demand.
   */
  start(): void {
    if (this.#stopped || this.#watcher) return
    this.#scan()
    const parent = resolve(this.root, '..')
    try {
      this.#watcher = watch(parent, { persistent: false }, () => { this.#scheduleScan() })
      this.#watchedParent = parent
    } catch {
      // The parent may not exist yet; the affordance's own `latest()` call rescans.
      this.#watcher = null
    }
  }

  /** Coalesces the burst of events one `vite build` produces into one scan. */
  #scheduleScan(): void {
    if (this.#rescanTimer || this.#stopped) return
    this.#rescanTimer = setTimeout(() => {
      this.#rescanTimer = null
      this.#scan()
    }, 150)
    this.#rescanTimer.unref?.()
  }

  #scan(): void {
    if (this.#stopped) return
    let names: string[]
    try {
      names = this.#readdir(this.root)
    } catch {
      names = []
    }
    const builds: VizshowBuild[] = []
    for (const name of names) {
      if (!isBuildId(name)) continue
      const directory = join(this.root, name)
      try {
        if (!statSync(directory).isDirectory()) continue
      } catch {
        continue
      }
      // A build is offered only once the tool says it is finished: half-written output is not a
      // VizShow, and navigating to it would show a broken page.
      let manifest: VizshowBuild | null
      try {
        manifest = parseBuildManifest(JSON.parse(this.#readFile(join(directory, 'BUILD.json'))), name)
      } catch {
        manifest = null
      }
      if (!manifest || manifest.status !== BUILD_STATUS_DONE) continue
      if (manifest.id !== name) continue
      builds.push(manifest)
    }
    const sorted = builds.sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? '') || right.id.localeCompare(left.id))
    const changed = sorted.length !== this.#builds.length || sorted[0]?.id !== this.#latest?.id
    this.#builds = sorted
    this.#latest = sorted[0] ?? null
    if (changed) this.#emit()
  }

  /**
   * Resolves a build to a pane URL, binding the listener on first use. `null` means "no such
   * build" — never a guessed URL.
   */
  async urlFor(buildId?: string): Promise<{ ok: true; url: string; build: VizshowBuild } | { ok: false; error: string }> {
    this.start()
    if (this.#latest === null) this.#scan()
    const build = buildId === undefined ? this.#latest : this.#builds.find((candidate) => candidate.id === buildId) ?? null
    if (!build) return { ok: false, error: buildId === undefined ? 'no_build' : 'unknown_build' }
    const port = await this.#ensureListening()
    if (port === null) return { ok: false, error: 'unavailable' }
    return { ok: true, url: `${this.#baseUrl(port)}/${encodeURIComponent(build.id)}/`, build }
  }

  #baseUrl(port: number): string { return `http://127.0.0.1:${port}` }

  async #ensureListening(): Promise<number | null> {
    if (this.#port !== null) return this.#port
    this.#binding ??= this.#listen()
    return this.#binding
  }

  /**
   * Binds 127.0.0.1. The preferred port is honoured when free; if something already holds it we
   * bind an ephemeral one and LOG it — the desktop owns both ends of this URL, so a fallback the
   * caller learns about is safe, while a silent drift (the `5174` failure mode) is not.
   */
  async #listen(): Promise<number | null> {
    for (const candidate of [this.#preferredPort, 0]) {
      const server = createServer((request, response) => { void this.#handle(request, response) })
      server.keepAliveTimeout = 5_000
      const bound = await new Promise<number | null>((done) => {
        server.once('error', () => { done(null) })
        server.listen(candidate, '127.0.0.1', () => {
          const address = server.address()
          done(typeof address === 'object' && address !== null ? address.port : null)
        })
      })
      if (bound === null) {
        server.close()
        if (candidate === this.#preferredPort) {
          console.warn(`[vclaw-vizshow] preferred port ${this.#preferredPort} is taken; falling back to an ephemeral port`)
        }
        continue
      }
      this.#server = server
      this.#port = bound
      // The port is part of the snapshot, so a late bind is news to the renderer.
      this.#emit()
      return bound
    }
    console.warn('[vclaw-vizshow] could not bind a loopback port; VizShow URLs are unavailable')
    return null
  }

  async #handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD' }).end()
      return
    }
    const resolved = this.#resolveRequestPath(request.url ?? '/')
    if (!resolved.ok) {
      response.writeHead(resolved.status).end()
      return
    }
    let target = resolved.path
    try {
      const stats = statSync(target)
      if (stats.isDirectory()) {
        target = join(target, 'index.html')
        if (!existsSync(target)) { response.writeHead(404).end(); return }
      }
      response.writeHead(200, {
        'content-type': mimeTypeFor(target),
        'content-length': statSync(target).size,
        'cache-control': 'no-store',
        // A build is untrusted content: no scripts may reach out, and nothing may frame us.
        'content-security-policy': "default-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'",
        'x-content-type-options': 'nosniff',
      })
      if (request.method === 'HEAD') { response.end(); return }
      createReadStream(target).on('error', () => { response.destroy() }).pipe(response)
    } catch {
      response.writeHead(404).end()
    }
  }

  /**
   * Traversal proof: resolve the URL to a path, then realpath it and require the REAL path to sit
   * inside the REAL root. Enforced after resolution, so `..`, `%2e%2e`, and symlinks are all
   * covered by the same check.
   */
  #resolveRequestPath(rawUrl: string): { ok: true; path: string } | { ok: false; status: number } {
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(rawUrl, 'http://127.0.0.1').pathname)
    } catch {
      return { ok: false, status: 400 }
    }
    if (pathname.includes('\0')) return { ok: false, status: 400 }
    const relative = normalize(pathname).replace(/^([/\\])+/, '')
    // A leading separator after normalize means the path escaped; refuse rather than clamp.
    if (pathname.startsWith('//') || relative.includes('..')) return { ok: false, status: 403 }
    let rootReal: string
    try {
      rootReal = realpathSync(this.root)
    } catch {
      return { ok: false, status: 404 }
    }
    const candidate = resolve(rootReal, relative)
    let targetReal: string
    try {
      targetReal = realpathSync(candidate)
    } catch {
      return { ok: false, status: 404 }
    }
    if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${sep}`)) return { ok: false, status: 403 }
    return { ok: true, path: targetReal }
  }

  async stop(): Promise<void> {
    this.#stopped = true
    this.#listeners.clear()
    if (this.#rescanTimer) { clearTimeout(this.#rescanTimer); this.#rescanTimer = null }
    this.#watcher?.close()
    this.#watcher = null
    const server = this.#server
    this.#server = null
    this.#port = null
    this.#binding = null
    await new Promise<void>((resolveClose) => {
      if (!server) { resolveClose(); return }
      server.close(() => { resolveClose() })
      server.closeAllConnections?.()
    })
  }
}
