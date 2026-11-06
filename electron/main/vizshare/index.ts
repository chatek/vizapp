/**
 * VizMaster@VClaw — Electron-side share broker.
 *
 * Starts a loopback-only HTTP server (`127.0.0.1:0`) and injects
 * `window.__vizshare = { port, cap }` into dashboard webContents loaded from
 * `http://localhost:5173` or `http://127.0.0.1:5173`. Each guest gets its own
 * 32-byte capability, which is revoked when the page navigates away or the
 * webContents is destroyed. The renderer never receives a token.
 *
 * Same-user OMP agents cannot be Electron webContents, so the broker also
 * writes a single agent capability to `userData/vizshare-agent-cap`
 * (0600, atomic replace). Agents on the same OS user can read that file and
 * call the same loopback API; no renderer Origin is accepted for them, and the
 * capability disappears when the broker stops.
 *
 * The fork calls `startVizShare({ app, session, shell, safeStorage })` once,
 * from `bootstrap` after the state store is open; see scripts/integrate-vcclaw.mjs.
 *
 * Types are structural so this module can be unit-tested without Electron;
 * `app`, `session`, `shell` and `safeStorage` are the real Electron objects in
 * the app. `fetch` defaults to `session.defaultSession.fetch` (Electron
 * `net.fetch`) and is injectable for tests.
 */
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, open, rename, rm } from 'node:fs/promises'
import { once } from 'node:events'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { dirname, join } from 'node:path'
import { createVizShowApi, type VizShareFetch } from './api'
import { SHARE_ORIGINS, createVizShareBroker, type VizShareRequestListener } from './broker'
import { OidcClient, type SafeStorageLike } from './oidc'

export interface VizShareWebContents {
  id: number
  getURL(): string
  isDestroyed(): boolean
  executeJavaScript(code: string, userGesture?: boolean): Promise<unknown>
  capturePage(rect: { x: number; y: number; width: number; height: number }): Promise<{ toDataURL(): string }>
  on(event: 'did-finish-load' | 'did-navigate' | 'destroyed', listener: () => void): unknown
}

export interface VizShareApp {
  getPath(name: 'userData'): string
  on(
    event: 'web-contents-created',
    listener: (event: unknown, contents: VizShareWebContents) => void,
  ): unknown
  removeListener(
    event: 'web-contents-created',
    listener: (event: unknown, contents: VizShareWebContents) => void,
  ): unknown
}

export interface VizShareStartOptions {
  app: VizShareApp
  session: { defaultSession: { fetch: VizShareFetch } }
  shell: { openExternal(url: string): Promise<void> }
  safeStorage?: SafeStorageLike
  /** Tests only: replaces `session.defaultSession.fetch`. */
  fetch?: VizShareFetch
}

export interface VizShareHandle {
  port: number
  redirectUri: string
  /** 0600 JSON capability file for same-user OMP agents. */
  agentCapabilityPath: string
  close(): Promise<void>
}

interface AgentCapabilityFile {
  version: 1
  pid: number
  port: number
  cap: string
}

export async function startVizShare(options: VizShareStartOptions): Promise<VizShareHandle> {
  const caps = new Map<number, string>()
  const contentsByCap = new Map<string, VizShareWebContents>()
  const dropCap = (id: number): void => {
    const cap = caps.get(id)
    if (cap !== undefined) contentsByCap.delete(cap)
    caps.delete(id)
  }
  const fetchImpl: VizShareFetch =
    options.fetch ?? ((input, init) => options.session.defaultSession.fetch(input, init))

  let broker: VizShareRequestListener | null = null
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (broker === null) {
      response.writeHead(503, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end('{"error":"not_ready"}')
      return
    }
    broker(request, response)
  })

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (address === null || typeof address === 'string') {
    await closeServer(server)
    throw new Error('vizshare: the broker did not bind a loopback IP port')
  }

  const port = address.port
  const redirectUri = `http://127.0.0.1:${port}/callback`
  const agentCapabilityPath = join(options.app.getPath('userData'), 'vizshare-agent-cap')
  const agentCap = randomBytes(32).toString('base64url')
  await writeAgentCapability(agentCapabilityPath, { version: 1, pid: process.pid, port, cap: agentCap })
  const oidc = new OidcClient({
    fetch: fetchImpl,
    redirectUri,
    storePath: join(options.app.getPath('userData'), 'vizshare-auth.bin'),
    ...(options.safeStorage === undefined ? {} : { safeStorage: options.safeStorage }),
  })
  const api = createVizShowApi({ fetch: fetchImpl, getAccessToken: () => oidc.accessToken() })

  broker = createVizShareBroker({
    port,
    oidc,
    api,
    openExternal: (url) => options.shell.openExternal(url),
    isCapValid: (cap) => {
      for (const stored of caps.values()) {
        if (constantTimeEqual(stored, cap)) return true
      }
      return false
    },
    isAgentCapValid: (cap) => constantTimeEqual(agentCap, cap),
    isCaptureCapValid: (cap) => {
      for (const stored of caps.values()) {
        if (constantTimeEqual(stored, cap)) return true
      }
      return false
    },
    capturePage: async (cap, rect) => {
      const contents = contentsByCap.get(cap)
      if (contents === undefined || contents.isDestroyed()) return null
      const image = await contents.capturePage(rect)
      return image.toDataURL()
    },
  })

  const onWebContentsCreated = (_event: unknown, contents: VizShareWebContents): void => {
    const inject = (): void => {
      let current: string
      try {
        current = contents.getURL()
      } catch {
        dropCap(contents.id)
        return
      }
      if (!isSharePage(current) || contents.isDestroyed()) {
        dropCap(contents.id)
        return
      }
      // One capability per guest, not one per process: a destroyed or
      // navigated-away page cannot keep a replayable header.
      const cap = randomBytes(32).toString('base64url')
      caps.set(contents.id, cap)
      contentsByCap.set(cap, contents)
      const script = `Object.defineProperty(window, '__vizshare', { value: Object.freeze(${JSON.stringify({ port, cap })}), configurable: true, enumerable: true, writable: false });`
      void contents.executeJavaScript(script).catch(() => {
        dropCap(contents.id)
      })
    }

    contents.on('did-finish-load', inject)
    contents.on('did-navigate', () => {
      if (!isSharePage(contents.getURL())) dropCap(contents.id)
    })
    contents.on('destroyed', () => {
      dropCap(contents.id)
    })
  }
  options.app.on('web-contents-created', onWebContentsCreated)

  return {
    port,
    redirectUri,
    agentCapabilityPath,
    close: async () => {
      options.app.removeListener('web-contents-created', onWebContentsCreated)
      caps.clear()
      contentsByCap.clear()
      await rm(agentCapabilityPath, { force: true })
      await closeServer(server)
    },
  }
}

/** True only for the dashboard dev origins the broker serves. */
export function isSharePage(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && (SHARE_ORIGINS as readonly string[]).includes(url.origin)
  } catch {
    return false
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Replace the capability without a world-readable or symlink-target window. */
async function writeAgentCapability(path: string, payload: AgentCapabilityFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
  const handle = await open(temp, 'w', 0o600)
  try {
    await handle.writeFile(`${JSON.stringify(payload)}\n`, { encoding: 'utf8' })
    await handle.sync()
  } finally {
    await handle.close()
  }
  await rename(temp, path)
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return
  server.closeAllConnections()
  server.close()
  await once(server, 'close')
}
