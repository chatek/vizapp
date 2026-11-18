/**
 * VizMaster@VClaw — loopback HTTP broker.
 *
 * The dashboard (http://localhost:5173 or http://127.0.0.1:5173) calls this
 * server; the server holds the tokens and calls the registry. Requests are
 * accepted only when the `Host` is the exact loopback authority, the `Origin`
 * is the dashboard, and `X-Vizshare-Cap` matches an injected per-webContents
 * capability. Responses never allow credentials.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { VizSharePayloadError, decodePoster, parseDraft, parseDraftCompletion, parseSubmission, type VizShowApi } from './api'
import { AGENT_ASSERTION_MAX_BYTES, storeAgentAssertion } from './agent-assertion-store'
import { latestBuildTrace, type VizBuildTrace } from './build-trace'
import { OidcError, ReauthRequiredError, type OidcClient } from './oidc'

/**
 * Page origins the share bridge accepts. 5174 is the DEFAULT PROJECT's pinned
 * origin (`dashboard/package.json` runs dev/preview with `--port 5174
 * --strictPort` — 5173 belongs to the desktop's own renderer dev server).
 * 5173 stays for the standalone/dashboard-dev flow.
 */
export const SHARE_ORIGINS = [
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const
export const SUBMIT_BODY_LIMIT = 2 * 1024 * 1024
/** Same id alphabet `parseSubmission` enforces for `tutorialId`. */
const TUTORIAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const DRAFT_SUBMIT_PATH = /^\/v1\/drafts\/([A-Za-z0-9][A-Za-z0-9._-]{0,63})\/submit$/

export interface CaptureRect {
  x: number
  y: number
  width: number
  height: number
}

export interface VizShareBrokerOptions {
  port: number
  oidc: Pick<OidcClient, 'status' | 'beginSignIn' | 'completeSignIn'>
  api: Pick<VizShowApi, 'listMine' | 'submitViz' | 'withdraw' | 'createDraftOnly' | 'uploadPoster' | 'submitDraft'>
  openExternal: (url: string) => Promise<void>
  isCapValid: (cap: string) => boolean
  /** File-delivered same-user agent capability; replaces Origin only for the two API routes. */
  isAgentCapValid?: (cap: string) => boolean
  /**
   * Where a pushed agent assertion lands (spec §3.2 A). Defaults to the
   * RAM-only store; injectable so route tests never share module state.
   */
  storeAgentAssertion?: (assertion: unknown) => { ok: true; bytes: number } | { ok: false; error: string }
  /** Defaults to `isCapValid`; override to keep capture browser-webContents-only. */
  isCaptureCapValid?: (cap: string) => boolean
  /** Electron webContents.capturePage; returns null when the cap has no page. */
  capturePage: (cap: string, rect: CaptureRect) => Promise<string | null>
  /**
   * Latest local build trace for a tutorial id (BUILD.json → prompt excerpt +
   * tools), or null when no build matches. Defaults to the real reader
   * (`latestBuildTrace`); injectable for tests. Must never throw.
   */
  getBuildTrace?: (tutorialId: string) => Promise<VizBuildTrace | null>
  /**
   * C1 (§4.6): carrier-gated pane capture for `/v1/draft`. Given a buildId,
   * returns a poster data URL captured from the live Browser pane serving that
   * build, or null when no pane shows it / the hook is unwired — the draft
   * then leaves the poster for review-time capture. Must never throw.
   */
  captureBuildPoster?: (buildId: string) => Promise<string | null>
}

export type VizShareRequestListener = (request: IncomingMessage, response: ServerResponse) => void

class BodyTooLargeError extends Error {
  constructor() {
    super('The request body exceeds the broker limit')
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

export function createVizShareBroker(options: VizShareBrokerOptions): VizShareRequestListener {
  const authority = `127.0.0.1:${options.port}`

  return (request, response) => {
    void handle(request, response).catch((error: unknown) => {
      sendFailure(request, response, error)
    })
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    setBaseHeaders(response)
    if (headerValue(request, 'host') !== authority) {
      sendJson(response, 403, { error: 'forbidden_host' })
      return
    }

    let url: URL
    try {
      url = new URL(request.url ?? '/', `http://${authority}`)
    } catch {
      sendJson(response, 400, { error: 'invalid_request' })
      return
    }

    // The browser redirect carries no Origin and is not a dashboard fetch.
    if (url.pathname === '/callback') {
      await completeSignIn(request, response, url)
      return
    }

    const method = request.method ?? 'GET'
    const agentCap = headerValue(request, 'x-vizshare-cap')
    // C1 rescope (§4.2): the agent capability reaches exactly POST /v1/draft
    // and GET /v1/mine. /v1/submit is origin-gated renderer traffic only —
    // it completes the consent-bearing chain, which must stay human — and
    // joins /callback and /v1/capture as agent-unreachable surfaces.
    // Broker-retirement step 2 (spec §3.2 A, ruling §8.1): the agent also
    // PUSHES its registry assertion here — POST /v1/agent-assertion, the
    // seed stays inside the agent process. One-way: there is no read route.
    const agentDirect =
      agentCap !== null &&
      options.isAgentCapValid?.(agentCap) === true &&
      ((url.pathname === '/v1/draft' && method === 'POST') ||
        (url.pathname === '/v1/mine' && method === 'GET') ||
        (url.pathname === '/v1/agent-assertion' && method === 'POST'))

    // Browser requests keep the Origin allow-list and CORS response. A valid
    // file-delivered agent capability is an alternative on exactly these two
    // non-browser API routes; it never relaxes /callback or page capture.
    if (!agentDirect) {
      const origin = headerValue(request, 'origin')
      if (origin === null || !(SHARE_ORIGINS as readonly string[]).includes(origin)) {
        sendJson(response, 403, { error: 'forbidden_origin' })
        return
      }
      setCorsHeaders(response, origin)

      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'access-control-max-age': '600' })
        response.end()
        return
      }

      const cap = headerValue(request, 'x-vizshare-cap')
      if (cap === null || !options.isCapValid(cap)) {
        sendJson(response, 403, { error: 'invalid_cap' })
        return
      }
    }
    const cap = agentDirect ? agentCap! : headerValue(request, 'x-vizshare-cap')!
    if (url.pathname === '/v1/capture') {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      // Capture needs the exact Electron page; the file-delivered agent
      // capability deliberately has no webContents and cannot capture it.
      if (!(options.isCaptureCapValid ?? options.isCapValid)(cap)) {
        sendJson(response, 403, { error: 'invalid_capture_cap' })
        return
      }
      const raw = await readBody(request, 8192)
      let rect: unknown
      try {
        rect = (JSON.parse(raw.toString('utf8')) as { rect?: unknown }).rect
      } catch {
        sendJson(response, 400, { error: 'invalid_request' })
        return
      }
      const parsed = parseRect(rect)
      if (parsed === null) {
        sendJson(response, 400, { error: 'invalid_rect' })
        return
      }
      let dataUrl: string | null
      try {
        dataUrl = await options.capturePage(cap, parsed)
      } catch {
        dataUrl = null
      }
      if (dataUrl === null) {
        sendJson(response, 502, { error: 'capture_failed' })
        return
      }
      sendJson(response, 200, { dataUrl })
      return
    }
    if (url.pathname === '/v1/auth/status') {
      requireMethod(response, method, 'GET')
      if (method !== 'GET') return
      sendJson(response, 200, await options.oidc.status())
      return
    }
    if (url.pathname === '/v1/auth/sign-in') {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      const authorizeUrl = await options.oidc.beginSignIn()
      await options.openExternal(authorizeUrl)
      sendJson(response, 202, { started: true })
      return
    }
    if (url.pathname === '/v1/mine') {
      requireMethod(response, method, 'GET')
      if (method !== 'GET') return
      const records = await options.api.listMine()
      sendJson(response, 200, { shows: Array.isArray(records) ? records : [] })
      return
    }
    if (url.pathname === '/v1/agent-assertion') {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      // One-way push (spec §3.2 A): the broker caches the assertion in RAM
      // only — no disk, no renderer read path, no log line carrying it. The
      // registry validates it; the broker never parses beyond the frame.
      const body = await readJson(request, AGENT_ASSERTION_MAX_BYTES)
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        sendJson(response, 400, { error: 'invalid_request' })
        return
      }
      const stored = (options.storeAgentAssertion ?? storeAgentAssertion)((body as Record<string, unknown>).assertion)
      if (!stored.ok) {
        sendJson(response, 400, { error: stored.error })
        return
      }
      sendJson(response, 200, { ok: true })
      return
    }
    if (url.pathname === '/v1/build-trace') {
      requireMethod(response, method, 'GET')
      if (method !== 'GET') return
      const tutorialId = url.searchParams.get('tutorialId') ?? ''
      if (!TUTORIAL_ID.test(tutorialId)) {
        sendJson(response, 400, { error: 'invalid_request' })
        return
      }
      const trace = await (options.getBuildTrace ?? latestBuildTrace)(tutorialId)
      sendJson(response, 200, { trace })
      return
    }
    if (url.pathname === '/v1/draft') {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      // parseDraft refuses any body carrying consent or poster (§4.7): the
      // agent's non-delegability is mechanical, not behavioural.
      const draft = parseDraft(await readJson(request))
      // Same traceability channel as /v1/submit: the DESKTOP attaches the
      // matching build's prompt excerpt, overriding any claim, so the
      // recorded `promptExcerpt` is a local-build fact.
      const trace = await (options.getBuildTrace ?? latestBuildTrace)(draft.tutorialId)
      if (trace !== null) draft.promptExcerpt = trace.promptExcerpt
      const created = await options.api.createDraftOnly(draft)
      // Best-effort poster (§4.6): when the carrier wired the pane hook and
      // it returns a data URL, attach it immediately; any failure leaves the
      // poster for review-time capture from the live scene.
      let poster: 'attached' | 'pending-review' = 'pending-review'
      let revision = created.revision
      if (options.captureBuildPoster !== undefined) {
        let dataUrl: string | null = null
        try {
          dataUrl = await options.captureBuildPoster(draft.buildId)
        } catch {
          dataUrl = null
        }
        if (dataUrl !== null) {
          try {
            const uploaded = await options.api.uploadPoster(created.id, decodePoster(dataUrl), `W/"${created.revision}"`)
            poster = 'attached'
            revision = uploaded.revision
          } catch {
            // The draft exists; a failed upload must not fail the response.
          }
        }
      }
      sendJson(response, 200, { id: created.id, state: 'draft', poster, revision })
      return
    }
    if (url.pathname === '/v1/submit') {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      const submission = parseSubmission(await readJson(request))
      // Traceability channel (see ./build-trace.ts): the DESKTOP attaches the
      // matching build's prompt excerpt, overriding whatever the renderer
      // claimed, so the recorded `promptExcerpt` is a local-build fact. No
      // matching build (a hand-written lesson) leaves the payload untouched.
      const trace = await (options.getBuildTrace ?? latestBuildTrace)(submission.tutorialId)
      if (trace !== null) submission.promptExcerpt = trace.promptExcerpt
      const receipt = headerValue(request, 'x-consent-receipt')
      const result = await options.api.submitViz(submission, receipt ?? undefined)
      sendJson(response, 200, { id: result.id, state: 'submitted' })
      return
    }
    // C1 (§4.5): the human completion of an agent-created draft. Renderer-only
    // by construction — the agentDirect allow-list above never names it, so
    // the page cap + Origin gate are the only way in, and the consent union
    // reaches the record exclusively through a human tap.
    if (DRAFT_SUBMIT_PATH.test(url.pathname)) {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      const id = DRAFT_SUBMIT_PATH.exec(url.pathname)?.[1]
      if (id === undefined) {
        sendJson(response, 400, { error: 'invalid_request' })
        return
      }
      const completion = parseDraftCompletion(await readJson(request))
      const receipt = headerValue(request, 'x-consent-receipt')
      const result = await options.api.submitDraft(id, completion, receipt ?? undefined)
      sendJson(response, 200, { id, state: 'submitted', revision: result.revision })
      return
    }
    if (url.pathname === '/v1/withdraw') {
      requireMethod(response, method, 'POST')
      if (method !== 'POST') return
      const body = await readJson(request)
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new HttpError(400, 'invalid_body', 'The withdraw body must be a JSON object')
      }
      const record = body as Record<string, unknown>
      if (typeof record.id !== 'string' || record.id.length === 0 || record.id.length > 64) {
        throw new HttpError(400, 'invalid_body', 'id must be a VizShow id')
      }
      const revision = typeof record.revision === 'number' && Number.isSafeInteger(record.revision) && record.revision >= 1
        ? record.revision
        : undefined
      const result = await options.api.withdraw(record.id, revision)
      sendJson(response, 200, { id: record.id, state: 'withdrawn', revision: result.revision })
      return
    }

    sendJson(response, 404, { error: 'not_found' })
  }

  async function completeSignIn(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    if (request.method !== 'GET') {
      sendHtml(response, 405, 'Method not allowed', 'The sign-in callback is a browser redirect.')
      return
    }
    const failure = url.searchParams.get('error')
    if (failure !== null) {
      const description = url.searchParams.get('error_description') ?? failure
      sendHtml(response, 400, 'Sign-in failed', description)
      return
    }
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (code === null || code.length === 0 || state === null || state.length === 0) {
      sendHtml(response, 400, 'Sign-in failed', 'The callback carried no authorization code.')
      return
    }
    try {
      const user = await options.oidc.completeSignIn({ code, state })
      const suffix = user.name === undefined ? '' : ` as ${user.name}`
      sendHtml(response, 200, 'Signed in', `You are signed in${suffix}. Close this window and return to VizMaster.`)
    } catch (error) {
      sendHtml(response, 400, 'Sign-in failed', error instanceof Error ? error.message : 'Sign-in failed')
    }
  }
}

function requireMethod(response: ServerResponse, method: string, allowed: 'GET' | 'POST'): void {
  if (method === allowed) return
  response.setHeader('allow', allowed)
  sendJson(response, 405, { error: 'method_not_allowed' })
}

function setBaseHeaders(response: ServerResponse): void {
  response.setHeader('cache-control', 'no-store')
  response.setHeader('x-content-type-options', 'nosniff')
  response.setHeader('referrer-policy', 'no-referrer')
}

function setCorsHeaders(response: ServerResponse, origin: string): void {
  response.setHeader('access-control-allow-origin', origin)
  response.setHeader('vary', 'origin')
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  response.setHeader('access-control-allow-headers', 'content-type, x-vizshare-cap, x-consent-receipt')
  // Deliberately no Access-Control-Allow-Credentials: the capability is a
  // header, not a cookie, and ambient credentials must never ride along.
}

function headerValue(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name]
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] ?? null
  return null
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
  })
  response.end(payload)
}

function sendHtml(response: ServerResponse, status: number, title: string, message: string): void {
  const payload = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></body></html>`
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
    'content-security-policy': "default-src 'none'",
  })
  response.end(payload)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      default:
        return '&#39;'
    }
  })
}

function readJson(request: IncomingMessage, limit = SUBMIT_BODY_LIMIT): Promise<unknown> {
  const contentType = headerValue(request, 'content-type')
  if (contentType === null || !contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'The request body must be application/json')
  }
  if (request.method === 'GET' || request.method === 'HEAD') {
    throw new HttpError(400, 'invalid_body', 'A JSON body is required')
  }
  return readBody(request, limit).then(
    (bytes) => {
      if (bytes.length === 0) throw new HttpError(400, 'invalid_body', 'A JSON body is required')
      try {
        return JSON.parse(bytes.toString('utf8')) as unknown
      } catch {
        throw new HttpError(400, 'invalid_body', 'The request body was not valid JSON')
      }
    },
    (error: unknown) => {
      throw error instanceof BodyTooLargeError
        ? new HttpError(413, 'payload_too_large', 'The request body must be at most 2 MiB')
        : error
    },
  )
}

function parseRect(value: unknown): CaptureRect | null {
  if (typeof value !== 'object' || value === null) return null
  const { x, y, width, height } = value as Record<string, unknown>
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    return null
  }
  if (![x, y, width, height].every((entry) => Number.isFinite(entry))) return null
  if (width < 1 || height < 1 || width > 4096 || height > 4096) return null
  return { x, y, width, height }
}

function readBody(request: IncomingMessage, limit: number): Promise<Buffer> {
  // Electron 43 runs Node 24, but the fork's lib target is ES2022: type the
  // ES2024 helper here instead of widening every consumer's `lib`.
  const { promise, resolve, reject } = (
    Promise as unknown as {
      withResolvers<T>(): {
        promise: Promise<T>
        resolve: (value: T | PromiseLike<T>) => void
        reject: (reason?: unknown) => void
      }
    }
  ).withResolvers<Buffer>()
  const chunks: Buffer[] = []
  let size = 0
  let settled = false
  const onData = (chunk: Buffer) => {
    if (settled) return
    size += chunk.length
    if (size > limit) {
      settled = true
      request.off('data', onData)
      reject(new BodyTooLargeError())
      return
    }
    chunks.push(chunk)
  }
  const onEnd = () => {
    if (settled) return
    settled = true
    resolve(Buffer.concat(chunks))
  }
  const onError = (error: Error) => {
    if (settled) return
    settled = true
    reject(error)
  }
  request.on('data', onData)
  request.once('end', onEnd)
  request.once('error', onError)
  request.once('aborted', () => onError(new Error('The request was aborted')))
  return promise
}

function sendFailure(request: IncomingMessage, response: ServerResponse, error: unknown): void {
  if (response.headersSent) {
    response.end()
    return
  }
  if (error instanceof BodyTooLargeError) {
    response.setHeader('connection', 'close')
    response.once('finish', () => request.destroy())
    sendJson(response, 413, { error: 'payload_too_large', message: 'The request body must be at most 2 MiB' })
    return
  }
  if (error instanceof HttpError) {
    sendJson(response, error.status, { error: error.code, message: error.message })
    return
  }
  if (error instanceof VizSharePayloadError) {
    sendJson(response, 400, { error: error.code, message: error.message })
    return
  }
  if (error instanceof ReauthRequiredError) {
    sendJson(response, 401, { error: 'reauth_required', message: error.message })
    return
  }
  if (error instanceof OidcError) {
    if (error.code === 'not_member') {
      sendJson(response, 403, { error: 'not_member', message: error.message })
      return
    }
    sendJson(response, 502, { error: error.code, message: error.message })
    return
  }
  if (error instanceof Error && 'status' in error && 'code' in error) {
    const apiError = error as Error & { status: number; code: string; details?: unknown }
    if (apiError.status === 401) {
      sendJson(response, 401, { error: 'reauth_required', message: apiError.message })
      return
    }
    sendJson(response, apiError.status, {
      error: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
    })
    return
  }
  console.warn('[vizshare] broker request failed', error)
  sendJson(response, 500, { error: 'internal_error' })
}
