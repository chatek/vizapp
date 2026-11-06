import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { buildNkeyAssertion, linkIdentity } from './prompt-assertion'
import { isRecord } from './validation'
import type {
  PromptCatalogueEntry,
  PromptCatalogueParam,
  PromptCatalogueResult,
  PromptDraftInput,
  PromptDraftOutcome,
  PromptSuggestion,
  PromptSuggestionConsentRequest,
  PromptSuggestionInvokeResult,
  PromptSuggestionOutcome,
  PromptSuggestionSession,
  PromptSuggestionViz,
  PromptSuggestionVizKind,
  PromptSuggestionVizParams,
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
 *   2. Delivery subjects are keyed by this identity's own NKEY (`public_key`), the only form
 *      vgate can scope; a `subHmac` never appears in a subject this client builds.
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

/**
 * Micro request ceiling. Measured on the real fabric (service re-key 4ce6e7b): room_open 5.0 s,
 * draft 2.8 s, suggest 3.6 s, feedback 3.0 s, close 3.0 s — the mutual check builds an ephemeral
 * pull consumer per `kv.keys()` across hosts. 10 s is the safety margin until the service's direct
 * edge-key index is measured lower; a genuine stall still answers the typed `timeout`.
 */
export const REQUEST_TIMEOUT_MS = 10_000

/** Audience the registry verifies a REQUEST credential against (domain-separated from bind). */
export const PROMPT_AUDIENCE = 'vizmaster-registry-vcc'

/** Audience of the one-time bind proof the OWNER uploads for this host's nkey. */
export const PROMPT_BIND_AUDIENCE = 'vizmaster-registry-agent-bind'

/** The `tool` claim, so the registry can tell this client from every other nkey holder. */
export const DEFAULT_PROMPT_TOOL = 'prompt-collab'

/** The SDK refreshes 10 minutes before the 1h JWT expiry; reconnects read the latest value. */
const JWT_REFRESH_MS = 50 * 60 * 1_000

export type SuggestionsEnabled = { enabled: true } | { enabled: false; error: 'disabled' }

export function suggestionsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[PROMPTS_FLAG] === '1'
}

export interface PromptIdentity {
  /** Public NKey (`U…`) — the JWT is minted for it AND every delivery subject is keyed by it. */
  nkey: string
  /** Encoded seed (`SU…`) — nkeys.fromSeed takes the encoded string, not raw bytes. */
  seed: string
}

export interface PromptConfig {
  segment: string
  identity: PromptIdentity
  natsUrl: string
  vgateUrl: string
  name: string
  /**
   * The OWNER's OIDC access token (`aud vizmaster-vcc`). Two jobs: it authorises the one-time
   * `agent-bindings` enrolment, and it is the FALLBACK request credential when this host cannot
   * sign an assertion. The primary credential is always the self-signed assertion below.
   */
  accessToken?: string
  /** Registry origin for the enrolment route; absent ⇒ `link()` answers `unconfigured`. */
  registryUrl?: string
  /** The `tool` claim this client presents (`VCLAW_PROMPTS_TOOL`, default `prompt-collab`). */
  tool: string
  subjects: PromptSubjects
}

export interface PromptSubjects {
  /** Push in: teacher/agent suggestions for this identity (the only delivery subject). */
  suggest: string
  /** The `draft` Micro ENDPOINT — the service owns fan-out to the consenting teachers. */
  draft: string
  roomOpen: string
  roomClose: string
  feedback: string
  /** The manifest catalogue: request/reply, authenticated, no room or consent required. */
  catalogue: string
}

export type PromptConfigResolution = { ok: true; config: PromptConfig } | { ok: false; error: string }

/**
 * Subject tree for one segment. Two namespaces, on purpose:
 *   - the DELIVERY subject is per-identity and segment-scoped, keyed by the **NKEY**: vgate can
 *     scope a nkey, and it cannot compute a `subHmac` (which is why the client plane was
 *     un-grantable). `subHmac` is a SERVER-side authorization concept and never appears in a
 *     subject this client builds. Suggestions are the ONLY delivery plane the desktop has:
 *     drafts go out as a Micro request and the service fans them out itself.
 *   - the Micro ENDPOINTS are one service shared by every segment and keep §3's names
 *     (`vizregistry.prompts.room.open|room.close|feedback`).
 * Exported so the tests, the startup log, and the E2E harness share one truth.
 */
export function promptSubjects(segment: string, nkey: string): PromptSubjects {
  const push = `tenant.${segment}.prompts`
  const micro = 'vizregistry.prompts'
  return {
    suggest: `${push}.suggest.${nkey}`,
    draft: `${micro}.draft`,
    roomOpen: `${micro}.room.open`,
    roomClose: `${micro}.room.close`,
    feedback: `${micro}.feedback`,
    catalogue: `${micro}.catalogue`,
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
  return { nkey, seed }
}

/**
 * Resolves everything the service needs, or names what is missing. There is deliberately no
 * identity-derived `<subHmac>` branch: a `subHmac` is a server-side authorization concept, so a
 * client computing one would subscribe to a subject nobody publishes to.
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
  const config = readJsonFile(read, join(home, '.config', 'vclaw', 'config.json'))
  const server = nonEmpty(env.VCLAW_PROMPTS_NATS_URL) ?? nonEmpty(env.VCLAW_NATS_URL) ?? nonEmpty(config?.server) ?? 'nats://vchat3:4223'
  const vgateUrl = nonEmpty(env.VCLAW_PROMPTS_VGATE_URL) ?? nonEmpty(env.VCLAW_API_URL) ?? nonEmpty(env.VCLAW_VGATE_URL) ?? nonEmpty(config?.vgateUrl) ?? 'https://api.vclawhub.com'
  const segment = segmentFor(env)
  const accessToken = nonEmpty(env.VCLAW_PROMPTS_ACCESS_TOKEN) ?? nonEmpty(config?.vizmasterAccessToken)
  const registryUrl = nonEmpty(env.VCLAW_PROMPTS_REGISTRY_URL) ?? nonEmpty(config?.vizmasterRegistryUrl)
  const tool = nonEmpty(env.VCLAW_PROMPTS_TOOL) ?? DEFAULT_PROMPT_TOOL
  return {
    ok: true,
    config: {
      segment,
      identity,
      natsUrl: server,
      vgateUrl: vgateUrl.replace(/\/+$/, ''),
      name: `vclaw-desktop-prompts:${identity.nkey.slice(-8)}`,
      ...(accessToken ? { accessToken } : {}),
      ...(registryUrl ? { registryUrl } : {}),
      tool,
      subjects: promptSubjects(segment, identity.nkey),
    },
  }
}

/**
 * Both headers carry the SAME token: the service reads `Authorization` case-insensitively and
 * falls back to `X-Vizmaster-Token` for transports whose header framing cannot take the
 * triple-slash value. Sending both is one field on the wire and removes a whole class of
 * "which client mangled my header" failures.
 */
export function bearerHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'X-Vizmaster-Token': token }
}

/** Request options the service owns; the transport only forwards them. */
export interface SuggestionsRequestOptions {
  timeoutMs: number
  /** Sent as-is on the request; `Authorization: Bearer <jwt>` is the service's auth (§3). */
  headers?: Record<string, string>
}

/** Minimal surface the service consumes, so tests drive it with a fake and no SDK import. */
export interface SuggestionsNatsLike {
  subscribe(subject: string, handler: (data: Uint8Array) => void): Promise<() => void>
  /**
   * No `publish`: every outbound message the desktop sends is a REQUEST the service answers.
   * A raw publish has no owner — nobody subscribes to the delivery subject from this side, and
   * vgate grants PUB only on `vizregistry.prompts.>`, so a fire-and-forget would be denied
   * silently while looking successful.
   */
  request(subject: string, data: Uint8Array, options: SuggestionsRequestOptions): Promise<Uint8Array>
  /** The identity's bearer token, minted from vgate by agent-sdk; cached until it nears expiry. */
  authToken(): Promise<string | null>
  /** Re-mints the bearer token after the service refused the cached one. */
  refreshAuthToken(): Promise<string | null>
  close(): Promise<void>
}

export type SuggestionsConnector = () => Promise<SuggestionsNatsLike>

/** Tokens are re-minted this long before `exp` so a request never races the expiry. */
const TOKEN_EXPIRY_SKEW_MS = 60_000

/** `exp` from a JWT payload, in epoch milliseconds, or null when the token carries none. */
export function jwtExpiresAt(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof parsed !== 'object' || parsed === null) return null
    const exp = (parsed as { exp?: unknown }).exp
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1_000 : null
  } catch {
    return null
  }
}

export interface BearerTokenSource {
  token(): Promise<string | null>
  refresh(): Promise<string | null>
}

/**
 * Caches one minted token until shortly before it expires. Concurrent callers share a single
 * in-flight mint, and a failed mint keeps the previous token: presenting a stale token is a
 * typed `unauthorized` the UI can show, while presenting none is a silent 401 with no recovery.
 */
export function createBearerTokenSource(
  mint: () => Promise<string>,
  options: { now?: () => number; skewMs?: number } = {},
): BearerTokenSource {
  const now = options.now ?? Date.now
  const skew = options.skewMs ?? TOKEN_EXPIRY_SKEW_MS
  let cached: string | null = null
  let expiresAt: number | null = null
  let pending: Promise<string> | null = null
  const mintOnce = (): Promise<string> => {
    pending ??= mint()
      .then((token) => { cached = token; expiresAt = jwtExpiresAt(token); return token })
      .finally(() => { pending = null })
    return pending
  }
  return {
    token: async () => {
      if (cached && (expiresAt === null || expiresAt - now() > skew)) return cached
      try { return await mintOnce() } catch { return cached }
    },
    refresh: async () => {
      try { return await mintOnce() } catch { return cached }
    },
  }
}

/**
 * The credential this desktop PRESENTS on every Micro call.
 *
 * Primary: an assertion signed with the host's own seed, so the service can verify it with the
 * nkey alone and resolve the owner from the binding store. Fallback: the owner's OIDC access
 * token, for a host that cannot sign (no seed, or a key form the signer refuses). Neither is
 * cached beyond its own short validity — `createBearerTokenSource` re-mints inside the 60 s skew.
 */
export function promptBearerTokenSource(config: PromptConfig): BearerTokenSource {
  const fallback = config.accessToken
  if (config.identity.seed && config.identity.nkey) {
    return createBearerTokenSource(async () => {
      try {
        return await buildNkeyAssertion({
          seed: config.identity.seed,
          publicKey: config.identity.nkey,
          audience: PROMPT_AUDIENCE,
          tool: config.tool,
        })
      } catch (error) {
        if (fallback) return fallback
        throw error
      }
    })
  }
  if (fallback) return createBearerTokenSource(async () => fallback)
  return { token: async () => null, refresh: async () => null }
}

/**
 * agent-sdk's `connectViaJWT` ends the PROCESS when the fabric error-closes the connection
 * (the SDK assumes an agent supervisor that restarts it). A desktop has no supervisor, so that
 * guard would take the user's running agents down with the window. It is contained here, once:
 * while a suggestions connection is live, an exit(1) request is logged as a connection failure
 * instead of a process death. Any other code passes through to Node.
 */
let armedConnections = 0
let exitGuardInstalled = false

/**
 * Installs the containment once. `exitGuardInstalled` is what makes a second call a no-op: two
 * wrappers would capture each other and a single exit request would be logged twice.
 */
export function installSdkExitGuard(): void {
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

/** Arms the containment for one live connection; every arm needs its `disarm`. */
export function armSdkExitGuard(): void {
  installSdkExitGuard()
  armedConnections += 1
}

/** Disarms one connection; at zero the guard is inert and exits pass through again. */
export function disarmSdkExitGuard(): void {
  armedConnections = Math.max(0, armedConnections - 1)
}

const encoder = new TextEncoder()

/**
 * The real connection: agent-sdk mints a NATS user JWT from the vgate token endpoint and
 * connects with it. The REQUEST credential is separate — this host's own signed assertion —
 * because VizRegistry verifies the caller, not the broker session.
 */
export async function connectSuggestionsNats(config: PromptConfig): Promise<SuggestionsNatsLike> {
  installSdkExitGuard()
  // Dynamic on purpose: agent-sdk pulls @nats-io/{transport-node,nats-core} plus zod and the MCP
  // SDK. A static import would pay that parse on EVERY app launch, including the many launches
  // where `VCLAW_PROMPTS` is off and no connection is ever made.
  const [{ connectViaJWT, fetchNatsUserJWT }, { headers: natsHeaders }] = await Promise.all([
    import('@vclawhub/agent'),
    // `headers()` builds the MsgHdrs nats.js requires; a plain object throws `hdrs.encode is not
    // a function` on the wire, which is exactly how the missing Authorization was invisible.
    import('@nats-io/nats-core'),
  ])
  // TWO credentials, deliberately distinct:
  //   · the NATS user JWT authenticates the CONNECTION (vgate mints it, the SDK refreshes it);
  //   · the assertion authenticates each Micro REQUEST to VizRegistry (the service verifies it
  //     with this host's nkey and resolves the owner from the binding store).
  const connectionTokens = createBearerTokenSource(() => fetchNatsUserJWT(config.vgateUrl, config.identity.nkey, config.identity.seed))
  const requestTokens = promptBearerTokenSource(config)
  const minted = await connectionTokens.token()
  if (!minted) throw new Error('vgate returned no NATS token')
  // `jwtAuthenticator` takes a SYNCHRONOUS provider that it re-reads on every (re)connect; this
  // mirror is what a refresh updates, so a reconnect presents the token the cache just minted.
  let current = minted
  const adopt = async (next: Promise<string | null>): Promise<string | null> => {
    const token = await next
    if (token) current = token
    return token
  }
  const nc = await connectViaJWT(config.natsUrl, () => current, config.identity.seed, config.name)
  const refresh = setInterval(() => { void adopt(connectionTokens.refresh()) }, JWT_REFRESH_MS)
  refresh.unref?.()
  armSdkExitGuard()
  return {
    subscribe: async (subject, handler) => {
      const sub = nc.subscribe(subject, {
        callback: (error, message) => { if (!error) handler(message.data) },
      })
      return () => { try { sub.unsubscribe() } catch { /* already closed */ } }
    },
    request: async (subject, data, options) => {
      const frame = options.headers ? natsHeaders() : null
      if (frame) for (const [name, value] of Object.entries(options.headers ?? {})) frame.set(name, value)
      const message = await nc.request(subject, data, {
        timeout: options.timeoutMs,
        ...(frame ? { headers: frame } : {}),
      })
      return message.data
    },
    authToken: () => requestTokens.token(),
    refreshAuthToken: () => requestTokens.refresh(),
    close: async () => {
      clearInterval(refresh)
      disarmSdkExitGuard()
      try { await nc.drain() } catch { /* already closed */ }
    },
  }
}

const textDecoder = new TextDecoder()

const VIZ_KINDS: readonly PromptSuggestionVizKind[] = ['elucim', 'three', 'vectorplay']

/** How long a failed catalogue fetch is left alone: the call costs ~2 s, a hot loop costs more. */
export const CATALOGUE_RETRY_MS = 60_000

const CATALOGUE_PARAM_TYPES: readonly PromptCatalogueParam['type'][] = ['number', 'boolean', 'string']

function parseCatalogueParam(value: unknown): PromptCatalogueParam | null {
  if (!isRecord(value)) return null
  const key = typeof value.key === 'string' ? value.key.trim() : ''
  if (!key || key.length > 64) return null
  if (!CATALOGUE_PARAM_TYPES.includes(value.type as PromptCatalogueParam['type'])) return null
  const param: PromptCatalogueParam = { key, type: value.type as PromptCatalogueParam['type'] }
  if (typeof value.min === 'number' && Number.isFinite(value.min)) param.min = value.min
  if (typeof value.max === 'number' && Number.isFinite(value.max)) param.max = value.max
  if (Array.isArray(value.values)) {
    const values = value.values.filter((item): item is string => typeof item === 'string' && item.length > 0)
    if (values.length) param.values = values
  }
  return param
}

/**
 * The catalogue reply is untrusted input like every push: a manifest that cannot be trusted is
 * DROPPED (never repaired, never fatal), and a malformed param is dropped from a manifest that
 * is otherwise usable — a typo in one schema must not cost five tutorials.
 */
export function parseCatalogue(payload: unknown): PromptCatalogueEntry[] {
  if (!isRecord(payload)) return []
  const manifests = Array.isArray(payload.manifests) ? payload.manifests : []
  const entries: PromptCatalogueEntry[] = []
  for (const manifest of manifests) {
    if (!isRecord(manifest)) continue
    const tutorialId = typeof manifest.tutorialId === 'string' ? manifest.tutorialId.trim() : ''
    if (!tutorialId || tutorialId.length > 64) continue
    if (!VIZ_KINDS.includes(manifest.kind as PromptSuggestionVizKind)) continue
    if (!Array.isArray(manifest.params)) continue
    const params = manifest.params
      .map(parseCatalogueParam)
      .filter((param): param is PromptCatalogueParam => param !== null)
    entries.push({ tutorialId, kind: manifest.kind as PromptSuggestionVizKind, params })
  }
  return entries
}

/**
 * `vizshow` is display-only intent, so it is validated like any other untrusted input: every
 * field must prove its shape or the FIELD is dropped. A malformed intent never costs the
 * student the suggestion itself, and never reaches anything except the chip.
 */
function parseVizshow(value: unknown): PromptSuggestionViz | undefined {
  if (!isRecord(value)) return undefined
  const tutorialId = typeof value.tutorialId === 'string' ? value.tutorialId.trim() : ''
  if (!tutorialId || tutorialId.length > 64) return undefined
  if (!VIZ_KINDS.includes(value.kind as PromptSuggestionVizKind)) return undefined
  if (!isRecord(value.params)) return undefined
  const params: PromptSuggestionVizParams = {}
  for (const [key, param] of Object.entries(value.params)) {
    if (typeof param === 'number') {
      if (!Number.isFinite(param)) return undefined
    } else if (typeof param !== 'boolean' && typeof param !== 'string') {
      return undefined
    }
    params[key] = param
  }
  return { tutorialId, kind: value.kind as PromptSuggestionVizKind, params }
}

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
  const vizshow = parseVizshow(parsed.vizshow)
  if (vizshow) suggestion.vizshow = vizshow
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
  #draftListeners = new Set<(outcome: PromptDraftOutcome) => void>()
  #draftInFlight = false
  #draftQueued: { session: PromptSuggestionSession; input: PromptDraftInput; at: number } | null = null
  #lastDraft: PromptDraftOutcome | null = null
  #catalogue: PromptCatalogueEntry[] | null = null
  #catalogueInFlight: Promise<PromptCatalogueResult> | null = null
  #catalogueRetryAt = 0
  #catalogueError: string | null = null
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
    if (!connection) return
    console.info(`[vclaw-prompts] listening on ${this.config.subjects.suggest} (segment ${this.config.segment})`)
    // A token source exists and the service is up: warm the catalogue off the critical path.
    this.#warmCatalogue()
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
    // "First successful session" is also a warming point, for a start() that raced a dead broker.
    this.#warmCatalogue()
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
    this.#draftQueued = null
    this.#catalogueInFlight = null
    this.#clearTimer()
    if (!target) return { ok: false, error: 'no_session' }
    const connection = await this.#ensureConnection()
    if (!connection) return { ok: false, error: 'unavailable' }
    return this.#request(connection, this.config.subjects.roomClose, { roomId: target })
  }

  /**
   * The capability catalogue, fetched ONCE per process and cached for its lifetime: the call
   * costs ~2 s (auth pair + RTT), so a UI that asks twice must not pay twice. A failure answers
   * `{entries: [], error}` and is left alone for `CATALOGUE_RETRY_MS` — the next call after the
   * backoff retries, and nothing polls in between.
   */
  async catalogue(): Promise<PromptCatalogueResult> {
    if (this.#catalogue) return { entries: this.#catalogue }
    if (this.#catalogueInFlight) return this.#catalogueInFlight
    if (this.#now() < this.#catalogueRetryAt) return { entries: [], error: this.#catalogueError ?? 'unavailable' }
    this.#catalogueInFlight = this.#fetchCatalogue().finally(() => { this.#catalogueInFlight = null })
    return this.#catalogueInFlight
  }

  async #fetchCatalogue(): Promise<PromptCatalogueResult> {
    const connection = await this.#ensureConnection()
    if (!connection) return this.#failCatalogue('unavailable')
    const result = await this.#request(connection, this.config.subjects.catalogue, {})
    if (!result.ok) return this.#failCatalogue(result.error)
    // The reply body is untrusted: `parseCatalogue` drops what it cannot prove.
    const entries = parseCatalogue(result.data)
    this.#catalogue = entries
    this.#catalogueError = null
    return { entries }
  }

  #failCatalogue(error: string): PromptCatalogueResult {
    this.#catalogueError = error
    this.#catalogueRetryAt = this.#now() + CATALOGUE_RETRY_MS
    return { entries: [], error }
  }

  /** Warms the cache without making anyone wait; failures leave the backoff in place. */
  #warmCatalogue(): void {
    void this.catalogue().catch(() => undefined)
  }

  /**
   * The ONE-TIME enrolment: this host signs a bind assertion with its own seed and the owner
   * uploads it with their OIDC token. Idempotent server-side; a refusal is a typed code.
   */
  async link(): Promise<PromptSuggestionInvokeResult> {
    if (!this.config.registryUrl) return { ok: false, error: 'unconfigured' }
    if (!this.config.accessToken) return { ok: false, error: 'no_access_token' }
    let assertion: string
    try {
      assertion = await buildNkeyAssertion({
        seed: this.config.identity.seed,
        publicKey: this.config.identity.nkey,
        audience: PROMPT_BIND_AUDIENCE,
      })
    } catch {
      return { ok: false, error: 'assertion_failed' }
    }
    return linkIdentity({
      registryUrl: this.config.registryUrl,
      accessToken: this.config.accessToken,
      publicKey: this.config.identity.nkey,
      assertion,
    })
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
    // Oversized text still goes through the throttle so the refusal is REPORTED (`too_large`)
    // instead of vanishing: a silent drop is exactly the failure this plane cannot afford.
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

  /**
   * Sends the pending draft view. It is a Micro REQUEST to `vizregistry.prompts.draft`: the
   * service owns fan-out to each consenting teacher's nkey subject, and this identity is not
   * granted PUB on any `draft.*` subject — a raw publish would be denied silently.
   *
   * Single-flight: the server takes seconds per call while the throttle fires every 300 ms, so
   * an in-flight request keeps only the LATEST pending view (a queue of stale snapshots would be
   * `rate_limited` noise). The dispatch itself is fire-and-forget for the typing path.
   */
  async #flush(): Promise<void> {
    const session = this.session
    const pending = this.#pending
    if (!session || !pending) return
    this.#pending = null
    if (this.#draftInFlight) {
      this.#draftQueued = { session, input: pending.input, at: pending.at }
      return
    }
    await this.#sendDraft(session, pending)
  }

  async #sendDraft(session: PromptSuggestionSession, pending: { input: PromptDraftInput; at: number }): Promise<void> {
    this.#draftInFlight = true
    try {
      await this.#dispatchDraft(session, pending)
    } finally {
      this.#draftInFlight = false
      const next = this.#draftQueued
      this.#draftQueued = null
      // The queued view is only worth sending while the session is still open.
      if (next && this.session) void this.#sendDraft(next.session, { input: next.input, at: next.at })
    }
  }

  async #dispatchDraft(session: PromptSuggestionSession, pending: { input: PromptDraftInput; at: number }): Promise<void> {
    const body = {
      roomId: session.roomId,
      draft: pending.input.text,
      ...(pending.input.locale ? { locale: pending.input.locale } : {}),
      ...(pending.input.cursor === undefined ? {} : { cursor: pending.input.cursor }),
      ...(pending.input.vizshowId ? { vizshowId: pending.input.vizshowId } : {}),
    }
    // The 4 KiB contract cap is enforced here too: a truncated teaching input is worse than none.
    if (encoder.encode(JSON.stringify(body)).byteLength > DRAFT_MAX_BYTES) {
      this.#emitDraft({ state: 'refused', error: 'too_large', at: new Date(pending.at).toISOString() })
      return
    }
    const connection = this.#connection ?? await this.#ensureConnection()
    if (!connection) {
      this.#emitDraft({ state: 'refused', error: 'unavailable', at: new Date(pending.at).toISOString() })
      return
    }
    const result = await this.#request(connection, this.config.subjects.draft, body)
    this.#emitDraft(result.ok
      ? { state: 'sent', at: new Date(pending.at).toISOString() }
      : { state: 'refused', error: result.error, at: new Date(pending.at).toISOString() })
  }

  #emitDraft(outcome: PromptDraftOutcome): void {
    this.#lastDraft = outcome
    for (const listener of this.#draftListeners) listener(outcome)
  }

  /** The last flush outcome, so a renderer that mounts late still sees a standing refusal. */
  get lastDraftOutcome(): PromptDraftOutcome | null {
    return this.#lastDraft
  }

  onDraftOutcome(listener: (outcome: PromptDraftOutcome) => void): () => void {
    this.#draftListeners.add(listener)
    return () => { this.#draftListeners.delete(listener) }
  }

  /**
   * One Micro request, carrying the identity's token in `Authorization` + `X-Vizmaster-Token`.
   * Only `unauthorized` re-mints and retries EXACTLY once — a second refusal is terminal and
   * `forbidden_segment` is passed through untouched, because a loop would turn a wrong-segment
   * client into a request storm.
   *
   * Endpoint NAMES (`vizregistry_prompts`, `room_open`, …) never appear here — the service's
   * names cannot contain dots, so the only strings the desktop builds are SUBJECTS.
   */
  async #request(
    connection: SuggestionsNatsLike,
    subject: string,
    payload: Record<string, unknown>,
  ): Promise<PromptSuggestionInvokeResult> {
    const body = encoder.encode(JSON.stringify(payload))
    for (let attempt = 0; attempt < 2; attempt += 1) {
      // A token source that fails must not throw through an IPC handler: an absent header is a
      // typed `unauthorized` from the service, which the renderer can render.
      const token = await (attempt === 0 ? connection.authToken() : connection.refreshAuthToken()).catch(() => null)
      let reply: Uint8Array
      try {
        reply = await connection.request(subject, body, {
          timeoutMs: REQUEST_TIMEOUT_MS,
          ...(token ? { headers: bearerHeaders(token) } : {}),
        })
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
      const refusal = typeof parsed.rejected === 'string' && parsed.rejected
        ? parsed.rejected
        : typeof parsed.code === 'string' && parsed.code
          ? parsed.code
          : typeof parsed.error === 'string' && parsed.error
            ? parsed.error
            : parsed.ok === false
              ? 'refused'
              : null
      if (refusal === 'unauthorized' && attempt === 0) continue
      if (refusal) return { ok: false, error: refusal }
      return { ok: true, data: parsed }
    }
    return { ok: false, error: 'unauthorized' }
  }

  async stop(): Promise<void> {
    this.#stopped = true
    this.#session = null
    this.#pending = null
    this.#draftQueued = null
    this.#catalogueInFlight = null
    this.#clearTimer()
    this.#unsubscribe?.()
    this.#unsubscribe = null
    this.#listeners.clear()
    const connection = this.#connection
    this.#connection = null
    await connection?.close()
  }
}
