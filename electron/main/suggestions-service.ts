import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { isRecord } from './validation'
import type {
  PromptDraftInput,
  PromptSuggestion,
  PromptSuggestionConsentRequest,
  PromptSuggestionInvokeResult,
  PromptSuggestionOutcome,
  PromptSuggestionSession,
} from '../../src/types/api'

/**
 * Shared prompt auto-complete — the desktop half of VIZREGISTRY_PROMPT_COLLAB_2026-11-06 §8.
 *
 * v3 reality: the product ships agent-sdk, so the main process reaches the fabric exactly the
 * way every other vclaw surface does — `fetchNatsUserJWT` + `connectViaJWT` with the user's own
 * credentials. Nothing here speaks the NATS wire protocol; the renderer holds no connection.
 *
 * Three rules decide whether a byte leaves the machine:
 *   1. `VCLAW_PROMPTS=1`, else the service is not constructed at all (handlers answer `disabled`).
 *   2. The push subject needs this identity's own `<subHmac>` — server-derived, so it is
 *      CONFIGURED (`VCLAW_PROMPTS_SUB_HMAC` or the credentials file), never guessed here.
 *   3. Drafts are published only while a consent session (a `room.open` reply) is live.
 */

/** The single switch; every other value (including unset) keeps the service dark. */
export const PROMPTS_FLAG = 'VCLAW_PROMPTS'

/** Segment default; the resolved value is logged at startup, never used silently. */
export const DEFAULT_SEGMENT = 'vcc'

/** §8: 20/s server-side cap, so the client sends a trailing view at machine pace, not per key. */
export const DRAFT_THROTTLE_MS = 300

/** §8 payload cap. Oversized drafts are NOT truncated: a truncated teaching input is a lie. */
export const DRAFT_MAX_BYTES = 4 * 1024

export const REQUEST_TIMEOUT_MS = 5_000

/** The SDK refreshes 10 minutes before the 1h JWT expiry; reconnects read the latest value. */
const JWT_REFRESH_MS = 50 * 60 * 1_000

export type SuggestionsEnabled = { enabled: true } | { enabled: false; error: 'disabled' }

export function suggestionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[PROMPTS_FLAG] === '1'
}

export interface PromptIdentity {
  /** Public NKey (`U…`) the JWT is minted for. */
  nkey: string
  /** Encoded seed (`SU…`) — nkeys.fromSeed takes the encoded string, not raw bytes. */
  seed: string
  /** `sub_hmac` from the credentials file, when vgate wrote one. */
  subHmac?: string
}

export interface PromptConfig {
  segment: string
  /** `<studentSubHmac>` for every subject this desktop uses: it is the same identity. */
  subHmac: string
  identity: PromptIdentity
  natsUrl: string
  vgateUrl: string
  name: string
  subjects: PromptSubjects
}

export interface PromptSubjects {
  /** Push in: teacher/agent suggestions for this identity. */
  suggest: string
  /** Push out: live draft views while a consent session is open. */
  draft: string
  roomOpen: string
  roomClose: string
  feedback: string
}

export type PromptConfigResolution = { ok: true; config: PromptConfig } | { ok: false; error: string }

/**
 * Subject tree for one segment. Two namespaces, on purpose:
 *   - PUSH subjects are per-student and therefore segment-scoped (§8):
 *     `tenant.<seg>.prompts.suggest|draft.<subHmac>`;
 *   - the Micro ENDPOINTS are one service shared by every segment and keep the names in §3's
 *     table (`vizregistry.prompts.room.open|room.close|feedback`) — §8 moved the push subjects,
 *     not the endpoints.
 * Exported so the tests, the startup log, and the E2E harness share one truth.
 */
export function promptSubjects(segment: string, subHmac: string): PromptSubjects {
  const push = `tenant.${segment}.prompts`
  const micro = 'vizregistry.prompts'
  return {
    suggest: `${push}.suggest.${subHmac}`,
    draft: `${push}.draft.${subHmac}`,
    roomOpen: `${micro}.room.open`,
    roomClose: `${micro}.room.close`,
    feedback: `${micro}.feedback`,
  }
}

function segmentFor(env: NodeJS.ProcessEnv): string {
  return env.VCLAW_PROMPTS_SEGMENT || env.VCLAW_SEGMENT || env.VCHAT_SEGMENT || DEFAULT_SEGMENT
}

function configFileHome(): string {
  return process.env.HOME || homedir()
}

/** Same credentials file the inbox reads: identity is main-process only. */
export function credentialsPath(home: string = configFileHome()): string {
  return join(home, '.config', 'vclaw', 'credentials.json')
}

function readJsonFile(read: (path: string) => string, path: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(read(path))
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** `nkey` is the historical field; newer credentials carry `public_key`. */
export function readPromptIdentity(read: (path: string) => string, home: string): PromptIdentity | null {
  const parsed = readJsonFile(read, credentialsPath(home))
  if (!parsed) return null
  const nkey = nonEmpty(parsed.nkey) ?? nonEmpty(parsed.public_key)
  const seed = nonEmpty(parsed.seed)
  if (!nkey || !seed) return null
  const subHmac = nonEmpty(parsed.sub_hmac) ?? nonEmpty(parsed.subHmac)
  return subHmac ? { nkey, seed, subHmac } : { nkey, seed }
}

/**
 * Resolves everything the service needs, or names what is missing. There is deliberately no
 * identity-derived `<subHmac>` branch: the service derives it from the OIDC subject, so a client
 * computing one would subscribe to a subject nobody publishes to.
 */
export function resolvePromptConfig(
  env: NodeJS.ProcessEnv = process.env,
  deps: { readFile?: (path: string) => string; home?: string } = {},
): PromptConfigResolution {
  if (!suggestionsEnabled(env)) return { ok: false, error: 'disabled' }
  const home = deps.home ?? configFileHome()
  const read = deps.readFile ?? ((path: string) => readFileSync(path, 'utf8'))
  const identity = readPromptIdentity(read, home)
  if (!identity) return { ok: false, error: 'missing_identity' }
  const subHmac = nonEmpty(env.VCLAW_PROMPTS_SUB_HMAC) ?? identity.subHmac
  if (!subHmac) return { ok: false, error: 'missing_sub_hmac' }
  const config = readJsonFile(read, join(home, '.config', 'vclaw', 'config.json'))
  const server = nonEmpty(env.VCLAW_PROMPTS_NATS_URL) ?? nonEmpty(env.VCLAW_NATS_URL) ?? nonEmpty(config?.server) ?? 'nats://vchat3:4223'
  const vgateUrl = nonEmpty(env.VCLAW_PROMPTS_VGATE_URL) ?? nonEmpty(env.VCLAW_API_URL) ?? nonEmpty(env.VCLAW_VGATE_URL) ?? nonEmpty(config?.vgateUrl) ?? 'https://api.vclawhub.com'
  const segment = segmentFor(env)
  return {
    ok: true,
    config: {
      segment,
      subHmac,
      identity,
      natsUrl: server,
      vgateUrl: vgateUrl.replace(/\/+$/, ''),
      name: `vclaw-desktop-prompts:${identity.nkey.slice(-8)}`,
      subjects: promptSubjects(segment, subHmac),
    },
  }
}

/** Minimal surface the service consumes, so tests drive it with a fake and no SDK import. */
export interface SuggestionsNatsLike {
  subscribe(subject: string, handler: (data: Uint8Array) => void): Promise<() => void>
  publish(subject: string, data: Uint8Array): void
  request(subject: string, data: Uint8Array, timeoutMs: number): Promise<Uint8Array>
  close(): Promise<void>
}

export type SuggestionsConnector = () => Promise<SuggestionsNatsLike>

/**
 * agent-sdk's `connectViaJWT` ends the PROCESS when the fabric error-closes the connection
 * (the SDK assumes an agent supervisor that restarts it). A desktop has no supervisor, so that
 * guard would take the user's running agents down with the window. It is contained here, once:
 * while a suggestions connection is live, an exit(1) request is logged as a connection failure
 * instead of a process death. Any other code passes through to Node.
 */
let armedConnections = 0
let exitGuardInstalled = false

function installSdkExitGuard(): void {
  if (exitGuardInstalled) return
  exitGuardInstalled = true
  const exit = process.exit.bind(process)
  process.exit = ((code?: number) => {
    if (code === 1 && armedConnections > 0) {
      console.error('[vclaw-prompts] fabric connection closed unexpectedly; staying alive (no supervisor to restart us)')
      return undefined as never
    }
    return exit(code)
  }) as typeof process.exit
}

const encoder = new TextEncoder()

/**
 * The real connection: agent-sdk mints a NATS user JWT from the vgate token endpoint and
 * connects with it, refreshing on the same 50-minute cadence the CLI uses so a reconnect never
 * presents an expired token.
 */
export async function connectSuggestionsNats(config: PromptConfig): Promise<SuggestionsNatsLike> {
  installSdkExitGuard()
  // Dynamic on purpose: agent-sdk pulls @nats-io/{transport-node,nats-core} plus zod and the MCP
  // SDK. A static import would pay that parse on EVERY app launch, including the many launches
  // where `VCLAW_PROMPTS` is off and no connection is ever made.
  const { connectViaJWT, fetchNatsUserJWT } = await import('@vclawhub/agent')
  let currentJwt = await fetchNatsUserJWT(config.vgateUrl, config.identity.nkey, config.identity.seed)
  const refresh = setInterval(() => {
    void fetchNatsUserJWT(config.vgateUrl, config.identity.nkey, config.identity.seed)
      .then((next) => { currentJwt = next })
      .catch((error: unknown) => {
        console.warn('[vclaw-prompts] JWT refresh failed; keeping the current token:', error instanceof Error ? error.message : error)
      })
  }, JWT_REFRESH_MS)
  refresh.unref?.()
  const nc = await connectViaJWT(config.natsUrl, () => currentJwt, config.identity.seed, config.name)
  armedConnections += 1
  return {
    subscribe: async (subject, handler) => {
      const sub = nc.subscribe(subject, {
        callback: (error, message) => { if (!error) handler(message.data) },
      })
      return () => { try { sub.unsubscribe() } catch { /* already closed */ } }
    },
    publish: (subject, data) => nc.publish(subject, data),
    request: async (subject, data, timeoutMs) => {
      const message = await nc.request(subject, data, { timeout: timeoutMs })
      return message.data
    },
    close: async () => {
      clearInterval(refresh)
      armedConnections = Math.max(0, armedConnections - 1)
      try { await nc.drain() } catch { /* already closed */ }
    },
  }
}

const textDecoder = new TextDecoder()

/**
 * A push is untrusted input until it proves it is a suggestion. `from.kind` is a CLAIM the
 * renderer labels as such; the service is what verified it.
 */
export function parseSuggestion(data: Uint8Array): PromptSuggestion | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(textDecoder.decode(data))
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  const { suggestionId, roomId, requestId, prompt, from } = parsed
  if (typeof suggestionId !== 'string' || typeof roomId !== 'string' || typeof requestId !== 'string') return null
  if (typeof prompt !== 'string' || !prompt.trim()) return null
  if (!isRecord(from)) return null
  if (from.kind !== 'human' && from.kind !== 'agent') return null
  if (typeof from.nkey !== 'string' || !from.nkey) return null
  const suggestion: PromptSuggestion = {
    suggestionId,
    roomId,
    requestId,
    prompt,
    from: {
      kind: from.kind,
      nkey: from.nkey,
      ...(typeof from.ownerHandle === 'string' && from.ownerHandle ? { ownerHandle: from.ownerHandle } : {}),
      ...(typeof from.display === 'string' && from.display ? { display: from.display } : {}),
    },
  }
  if (typeof parsed.rationale === 'string' && parsed.rationale) suggestion.rationale = parsed.rationale
  if (typeof parsed.locale === 'string' && parsed.locale) suggestion.locale = parsed.locale
  if (typeof parsed.expiresAt === 'string' && parsed.expiresAt) suggestion.expiresAt = parsed.expiresAt
  if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) suggestion.confidence = parsed.confidence
  return suggestion
}

export interface SuggestionsServiceOptions {
  connector: SuggestionsConnector
  config: PromptConfig
  throttleMs?: number
  now?: () => number
}

/**
 * Owns the connection, the consent session, and the draft throttle. Every failure is a VALUE:
 * a dead broker, a refusal, and a missing session are all states the renderer can render, and
 * none of them may throw through an IPC handler.
 */
export class SuggestionsService {
  readonly config: PromptConfig
  #connector: SuggestionsConnector
  #throttleMs: number
  #now: () => number
  #connection: SuggestionsNatsLike | null = null
  #connecting: Promise<SuggestionsNatsLike | null> | null = null
  #unsubscribe: (() => void) | null = null
  #listeners = new Set<(suggestion: PromptSuggestion) => void>()
  #session: PromptSuggestionSession | null = null
  #pending: { input: PromptDraftInput; at: number } | null = null
  #timer: ReturnType<typeof setTimeout> | null = null
  #stopped = false

  constructor(options: SuggestionsServiceOptions) {
    this.config = options.config
    this.#connector = options.connector
    this.#throttleMs = options.throttleMs ?? DRAFT_THROTTLE_MS
    this.#now = options.now ?? Date.now
  }

  /** The open consent session, or null. An expired session reads as closed, never as open. */
  get session(): PromptSuggestionSession | null {
    if (!this.#session) return null
    const expiresAt = Date.parse(this.#session.expiresAt)
    if (Number.isFinite(expiresAt) && expiresAt <= this.#now()) return null
    return this.#session
  }

  get connected(): boolean {
    return this.#connection !== null
  }

  /**
   * Connects and subscribes. Never awaited by the app: a broker that is down must not delay
   * startup, and push delivery resumes on the next `start`/consent attempt.
   */
  async start(): Promise<void> {
    const connection = await this.#ensureConnection()
    if (connection) console.info(`[vclaw-prompts] listening on ${this.config.subjects.suggest} (segment ${this.config.segment})`)
  }

  #ensureConnection(): Promise<SuggestionsNatsLike | null> {
    if (this.#stopped) return Promise.resolve(null)
    if (this.#connection) return Promise.resolve(this.#connection)
    if (this.#connecting) return this.#connecting
    this.#connecting = (async () => {
      try {
        const connection = await this.#connector()
        if (this.#stopped) { await connection.close(); return null }
        this.#connection = connection
        const unsubscribe = await connection.subscribe(this.config.subjects.suggest, (data) => {
          const suggestion = parseSuggestion(data)
          if (!suggestion) return
          for (const listener of this.#listeners) listener(suggestion)
        })
        this.#unsubscribe = unsubscribe
        return connection
      } catch (error) {
        console.warn('[vclaw-prompts] fabric connection unavailable:', error instanceof Error ? error.message : error)
        return null
      } finally {
        this.#connecting = null
      }
    })()
    return this.#connecting
  }

  onSuggestion(listener: (suggestion: PromptSuggestion) => void): () => void {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  /** `room.open`: the consent switch. The room id it returns is what gates draft publishing. */
  async openSession(request: Extract<PromptSuggestionConsentRequest, { action: 'open' }>): Promise<PromptSuggestionInvokeResult> {
    const connection = await this.#ensureConnection()
    if (!connection) return { ok: false, error: 'unavailable' }
    const result = await this.#request(connection, this.config.subjects.roomOpen, {
      peer: request.peer,
      conversationId: request.conversationId,
      ...(request.ttlS === undefined ? {} : { ttlS: request.ttlS }),
    })
    if (!result.ok) return result
    const roomId = typeof result.data.roomId === 'string' ? result.data.roomId : ''
    if (!roomId) return { ok: false, error: 'invalid_reply' }
    const peer = typeof result.data.peer === 'string' && result.data.peer ? result.data.peer : request.peer
    const expiresAt = typeof result.data.expiresAt === 'string' ? result.data.expiresAt : new Date(this.#now() + 30 * 60 * 1_000).toISOString()
    this.#session = { roomId, peer, expiresAt }
    this.#scheduleFlush()
    return result
  }

  /**
   * `room.close`: publishing stops BEFORE the request is made, so a slow or dead service can
   * never keep the student's draft flowing after they revoked consent.
   */
  async closeSession(roomId?: string): Promise<PromptSuggestionInvokeResult> {
    const target = roomId ?? this.#session?.roomId
    this.#session = null
    this.#pending = null
    this.#clearTimer()
    if (!target) return { ok: false, error: 'no_session' }
    const connection = await this.#ensureConnection()
    if (!connection) return { ok: false, error: 'unavailable' }
    return this.#request(connection, this.config.subjects.roomClose, { roomId: target })
  }

  /** `feedback` (§3 rule 6): accepted / rejected / superseded, recorded by the service. */
  async feedback(suggestionId: string, outcome: PromptSuggestionOutcome, ms?: number): Promise<PromptSuggestionInvokeResult> {
    const connection = await this.#ensureConnection()
    if (!connection) return { ok: false, error: 'unavailable' }
    return this.#request(connection, this.config.subjects.feedback, {
      suggestionId,
      outcome,
      ...(ms === undefined ? {} : { ms }),
    })
  }

  /**
   * Records a draft view. This is a GATE, not a queue: with no open session the text is dropped
   * right here and never reaches the throttle timer, so nothing can be replayed on consent.
   */
  setDraft(input: PromptDraftInput): void {
    if (this.#stopped) return
    if (!this.session) { this.#pending = null; return }
    if (!input.text.trim()) { this.#pending = null; return }
    if (encoder.encode(input.text).byteLength > DRAFT_MAX_BYTES) { this.#pending = null; return }
    this.#pending = { input, at: this.#now() }
    this.#scheduleFlush()
  }

  #clearTimer(): void {
    if (!this.#timer) return
    clearTimeout(this.#timer)
    this.#timer = null
  }

  #scheduleFlush(): void {
    if (this.#timer || !this.#pending) return
    this.#timer = setTimeout(() => {
      this.#timer = null
      void this.#flush()
    }, this.#throttleMs)
    this.#timer.unref?.()
  }

  async #flush(): Promise<void> {
    const session = this.session
    const pending = this.#pending
    if (!session || !pending) return
    const connection = this.#connection ?? await this.#ensureConnection()
    if (!connection) return
    const body = JSON.stringify({
      roomId: session.roomId,
      draft: pending.input.text,
      ...(pending.input.locale ? { locale: pending.input.locale } : {}),
      ...(pending.input.cursor === undefined ? {} : { cursor: pending.input.cursor }),
      ...(pending.input.vizshowId ? { vizshowId: pending.input.vizshowId } : {}),
      at: new Date(pending.at).toISOString(),
    })
    if (encoder.encode(body).byteLength > DRAFT_MAX_BYTES) return
    try {
      connection.publish(this.config.subjects.draft, encoder.encode(body))
    } catch (error) {
      console.warn('[vclaw-prompts] draft publish failed:', error instanceof Error ? error.message : error)
    }
  }

  async #request(
    connection: SuggestionsNatsLike,
    subject: string,
    payload: Record<string, unknown>,
  ): Promise<PromptSuggestionInvokeResult> {
    let reply: Uint8Array
    try {
      reply = await connection.request(subject, encoder.encode(JSON.stringify(payload)), REQUEST_TIMEOUT_MS)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: /timeout/i.test(message) ? 'timeout' : 'unavailable' }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(textDecoder.decode(reply))
    } catch {
      return { ok: false, error: 'invalid_reply' }
    }
    if (!isRecord(parsed)) return { ok: false, error: 'invalid_reply' }
    if (typeof parsed.rejected === 'string' && parsed.rejected) return { ok: false, error: parsed.rejected }
    if (parsed.ok === false) return { ok: false, error: typeof parsed.error === 'string' && parsed.error ? parsed.error : 'refused' }
    return { ok: true, data: parsed }
  }

  async stop(): Promise<void> {
    this.#stopped = true
    this.#session = null
    this.#pending = null
    this.#clearTimer()
    this.#unsubscribe?.()
    this.#unsubscribe = null
    this.#listeners.clear()
    const connection = this.#connection
    this.#connection = null
    await connection?.close()
  }
}
