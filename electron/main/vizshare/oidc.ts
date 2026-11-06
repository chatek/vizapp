/**
 * VizMaster@VClaw — VClaw IdP sign-in for the local share broker.
 *
 * Public client (`vizmaster-vcc`) with authorization code + PKCE S256 against
 * `https://auth.vclawhub.com`; the system browser is used, never an embedded
 * webview. The authorization code is exchanged at `/api/oidc/token`, the
 * `id_token` is verified locally against `/jwks.json` with `node:crypto`, and
 * access/refresh tokens are persisted with Electron `safeStorage` in
 * `userData/vizshare-auth.bin` (0600). Nothing in this module returns a token
 * to the renderer.
 *
 * Refresh is single-flight and happens when the access token is within 60 s of
 * expiry. A failed refresh is a `reauth_required` error, never a silent retry.
 * Membership in `vcc` is required from the ID token's `groups` claim.
 */
import { createHash, randomBytes, timingSafeEqual, verify, createPublicKey, type KeyObject } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const OIDC_ISSUER = 'https://auth.vclawhub.com'
export const OIDC_CLIENT_ID = 'vizmaster-vcc'
export const OIDC_SCOPES = 'openid profile email groups offline_access'
export const OIDC_AUTHORIZATION_ENDPOINT = `${OIDC_ISSUER}/api/oidc/authorization`
export const OIDC_TOKEN_ENDPOINT = `${OIDC_ISSUER}/api/oidc/token`
export const OIDC_JWKS_URI = `${OIDC_ISSUER}/jwks.json`
export const REQUIRED_GROUP = 'vcc'

const REFRESH_WINDOW_MS = 60_000
const CLOCK_SKEW_MS = 60_000
const JWKS_TTL_MS = 5 * 60_000
const PENDING_TTL_MS = 10 * 60_000
const TOKEN_TIMEOUT_MS = 20_000

export type VizShareFetch = (input: string, init?: RequestInit) => Promise<Response>

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptString(value: string): Buffer
  decryptString(value: Buffer): string
}

export interface VizShareIdentity {
  sub: string
  email?: string
  name?: string
  groups: string[]
}

export interface AuthStatus {
  signedIn: boolean
  user: VizShareIdentity | null
  /** Access-token expiry in epoch milliseconds. */
  expiresAt: number | null
}

export class OidcError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'OidcError'
  }
}

export class ReauthRequiredError extends OidcError {
  constructor(message = 'Sign in again to finish') {
    super('reauth_required', message)
  }
}

interface PersistedAuth {
  version: 1
  accessToken: string
  refreshToken?: string
  expiresAt: number
  claims: VizShareIdentity
}

interface PendingSignIn {
  state: string
  nonce: string
  verifier: string
  redirectUri: string
  createdAt: number
}

interface VerifiedIdToken {
  claims: VizShareIdentity
  /** `null` when the token carries no `groups` claim at all. */
  groupsClaim: string[] | null
}

interface JwkEntry {
  kid?: string
  key: KeyObject
}

export interface OidcClientOptions {
  fetch: VizShareFetch
  /** `http://127.0.0.1:<brokerPort>/callback` */
  redirectUri: string
  /** `userData/vizshare-auth.bin`; omitted in tests keeps everything in memory. */
  storePath?: string
  safeStorage?: SafeStorageLike
  now?: () => number
}

export class OidcClient {
  private readonly fetch: VizShareFetch
  private readonly redirectUri: string
  private readonly storePath: string | undefined
  private readonly safeStorage: SafeStorageLike | undefined
  private readonly now: () => number
  private auth: PersistedAuth | null = null
  private loadPromise: Promise<void> | null = null
  private pending: PendingSignIn | null = null
  private refreshInFlight: Promise<PersistedAuth> | null = null
  private jwks: { fetchedAt: number; entries: JwkEntry[] } | null = null

  constructor(options: OidcClientOptions) {
    this.fetch = options.fetch
    this.redirectUri = options.redirectUri
    this.storePath = options.storePath
    this.safeStorage = options.safeStorage
    this.now = options.now ?? Date.now
  }

  async status(): Promise<AuthStatus> {
    await this.ensureLoaded()
    const auth = this.auth
    if (auth === null) return { signedIn: false, user: null, expiresAt: null }
    const usable = auth.expiresAt - this.now() > 0 || auth.refreshToken !== undefined
    if (!usable) return { signedIn: false, user: null, expiresAt: null }
    return { signedIn: true, user: auth.claims, expiresAt: auth.expiresAt }
  }

  /** Generate state, nonce and a PKCE verifier; return the browser URL. */
  async beginSignIn(): Promise<string> {
    const verifier = randomBytes(32).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const state = randomBytes(32).toString('base64url')
    const nonce = randomBytes(32).toString('base64url')
    this.pending = { state, nonce, verifier, redirectUri: this.redirectUri, createdAt: this.now() }

    const url = new URL(OIDC_AUTHORIZATION_ENDPOINT)
    url.search = new URLSearchParams({
      client_id: OIDC_CLIENT_ID,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: OIDC_SCOPES,
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString()
    return url.toString()
  }

  async completeSignIn(params: { code: string; state: string }): Promise<VizShareIdentity> {
    const pending = this.pending
    // Consume before any await: a replayed callback can never reach the exchange.
    this.pending = null
    if (pending === null) throw new OidcError('invalid_state', 'No sign-in is pending')
    if (this.now() - pending.createdAt > PENDING_TTL_MS) throw new OidcError('invalid_state', 'The sign-in request expired')
    if (!safeEqual(pending.state, params.state)) throw new OidcError('invalid_state', 'The sign-in state does not match')

    const tokens = await this.tokenRequest(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: pending.redirectUri,
        client_id: OIDC_CLIENT_ID,
        code_verifier: pending.verifier,
      }),
    )
    if (tokens.idToken === undefined) throw new OidcError('invalid_token_response', 'The token response carried no id_token')

    const verified = await this.verifyIdToken(tokens.idToken, { nonce: pending.nonce })
    if (verified.groupsClaim === null || !verified.groupsClaim.includes(REQUIRED_GROUP)) {
      throw new OidcError('not_member', `This account is not a member of the ${REQUIRED_GROUP} group`)
    }

    await this.persist({
      version: 1,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: this.now() + tokens.expiresIn * 1000,
      claims: verified.claims,
    })
    return verified.claims
  }

  /** A valid access token, refreshed inside the 60 s window. */
  async accessToken(): Promise<string> {
    await this.ensureLoaded()
    const auth = this.auth
    if (auth === null) throw new ReauthRequiredError()
    if (auth.expiresAt - this.now() >= REFRESH_WINDOW_MS) return auth.accessToken
    if (auth.refreshToken === undefined) throw new ReauthRequiredError()
    return (await this.refresh()).accessToken
  }

  private async refresh(): Promise<PersistedAuth> {
    if (this.refreshInFlight === null) {
      this.refreshInFlight = this.doRefresh().finally(() => {
        this.refreshInFlight = null
      })
    }
    return this.refreshInFlight
  }

  private async doRefresh(): Promise<PersistedAuth> {
    await this.ensureLoaded()
    const auth = this.auth
    if (auth === null || auth.refreshToken === undefined) throw new ReauthRequiredError()

    let tokens: TokenResponse
    try {
      tokens = await this.tokenRequest(
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: OIDC_CLIENT_ID,
          refresh_token: auth.refreshToken,
        }),
      )
    } catch (error) {
      if (error instanceof OidcError && (error.code === 'invalid_grant' || error.code === 'invalid_token')) {
        await this.clear()
        throw new ReauthRequiredError()
      }
      throw error
    }

    let claims = auth.claims
    if (tokens.idToken !== undefined) {
      const verified = await this.verifyIdToken(tokens.idToken, {})
      if (verified.groupsClaim !== null) {
        if (!verified.groupsClaim.includes(REQUIRED_GROUP)) {
          await this.clear()
          throw new OidcError('not_member', `This account is not a member of the ${REQUIRED_GROUP} group`)
        }
        claims = verified.claims
      }
    }

    const next: PersistedAuth = {
      version: 1,
      accessToken: tokens.accessToken,
      // Persisted before the rotation is considered complete; the old file is
      // replaced atomically by persist().
      refreshToken: tokens.refreshToken ?? auth.refreshToken,
      expiresAt: this.now() + tokens.expiresIn * 1000,
      claims,
    }
    await this.persist(next)
    return next
  }

  private async tokenRequest(params: URLSearchParams): Promise<TokenResponse> {
    let response: Response
    try {
      response = await this.fetch(OIDC_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: params.toString(),
        signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
      })
    } catch (error) {
      throw new OidcError('token_endpoint_unreachable', `The identity provider could not be reached: ${describe(error)}`)
    }

    const text = await response.text()
    let payload: unknown = null
    if (text.length > 0) {
      try {
        payload = JSON.parse(text) as unknown
      } catch {
        payload = null
      }
    }
    if (!response.ok) {
      const failure = tokenError(payload, response.status)
      throw new OidcError(failure.code, failure.message)
    }
    return parseTokenResponse(payload)
  }

  private async verifyIdToken(idToken: string, options: { nonce?: string }): Promise<VerifiedIdToken> {
    const parts = idToken.split('.')
    if (parts.length !== 3) throw new OidcError('invalid_token', 'The id_token is not a compact JWS')
    const [headerPart, payloadPart, signaturePart] = parts as [string, string, string]
    const header = decodeJwtJson(headerPart)
    if (header.alg !== 'RS256') throw new OidcError('invalid_token', 'The id_token algorithm is not RS256')
    const kid = typeof header.kid === 'string' ? header.kid : undefined
    const key = await this.signingKey(kid)
    const signed = verify('RSA-SHA256', Buffer.from(`${headerPart}.${payloadPart}`), key, Buffer.from(signaturePart, 'base64url'))
    if (!signed) throw new OidcError('invalid_token', 'The id_token signature is invalid')

    const payload = decodeJwtJson(payloadPart)
    if (payload.iss !== OIDC_ISSUER) throw new OidcError('invalid_token', 'The id_token issuer does not match')
    const audience = Array.isArray(payload.aud) ? payload.aud.filter((entry) => typeof entry === 'string') : [payload.aud]
    if (!audience.includes(OIDC_CLIENT_ID)) throw new OidcError('invalid_token', 'The id_token audience does not match')
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= this.now() - CLOCK_SKEW_MS) {
      throw new OidcError('invalid_token', 'The id_token has expired')
    }
    if (options.nonce !== undefined) {
      if (typeof payload.nonce !== 'string' || !safeEqual(payload.nonce, options.nonce)) {
        throw new OidcError('invalid_token', 'The id_token nonce does not match')
      }
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new OidcError('invalid_token', 'The id_token has no subject')

    const groupsClaim = Array.isArray(payload.groups)
      ? payload.groups.filter((group): group is string => typeof group === 'string')
      : null
    const name =
      typeof payload.name === 'string'
        ? payload.name
        : typeof payload.preferred_username === 'string'
          ? payload.preferred_username
          : undefined
    const claims: VizShareIdentity = {
      sub: payload.sub,
      ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      ...(name === undefined ? {} : { name }),
      groups: groupsClaim ?? [],
    }
    return { claims, groupsClaim }
  }

  private async signingKey(kid: string | undefined): Promise<KeyObject> {
    let entries = await this.jwksEntries(false)
    let entry = selectKey(entries, kid)
    if (entry === undefined) {
      entries = await this.jwksEntries(true)
      entry = selectKey(entries, kid)
    }
    if (entry === undefined) throw new OidcError('jwks_unavailable', 'No matching signing key was published')
    return entry.key
  }

  private async jwksEntries(force: boolean): Promise<JwkEntry[]> {
    const cached = this.jwks
    if (!force && cached !== null && this.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.entries

    let response: Response
    try {
      response = await this.fetch(OIDC_JWKS_URI, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
      })
    } catch (error) {
      throw new OidcError('jwks_unavailable', `The JWKS could not be fetched: ${describe(error)}`)
    }
    if (!response.ok) throw new OidcError('jwks_unavailable', `The JWKS request failed with ${response.status}`)

    let document: unknown
    try {
      document = (await response.json()) as unknown
    } catch {
      throw new OidcError('jwks_unavailable', 'The JWKS response was not JSON')
    }
    const keys = typeof document === 'object' && document !== null && 'keys' in document ? document.keys : undefined
    if (!Array.isArray(keys)) throw new OidcError('jwks_unavailable', 'The JWKS response carried no keys')

    const entries: JwkEntry[] = []
    for (const candidate of keys) {
      if (typeof candidate !== 'object' || candidate === null) continue
      const jwk = candidate as Record<string, unknown>
      if (jwk.kty !== 'RSA' || typeof jwk.n !== 'string' || typeof jwk.e !== 'string') continue
      if (jwk.use !== undefined && jwk.use !== 'sig') continue
      try {
        const key = createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' })
        entries.push({ ...(typeof jwk.kid === 'string' ? { kid: jwk.kid } : {}), key })
      } catch {
        // A malformed key cannot verify anything; keep the rest.
      }
    }
    if (entries.length === 0) throw new OidcError('jwks_unavailable', 'The JWKS response carried no usable RSA keys')
    this.jwks = { fetchedAt: this.now(), entries }
    return entries
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadPromise === null) this.loadPromise = this.load()
    return this.loadPromise
  }

  private async load(): Promise<void> {
    if (this.storePath === undefined || !this.encryptionAvailable()) return
    let raw: Buffer
    try {
      raw = await readFile(this.storePath)
    } catch {
      return
    }
    try {
      const parsed: unknown = JSON.parse(this.safeStorage?.decryptString(raw) ?? '')
      this.auth = parsePersistedAuth(parsed)
    } catch {
      // An unreadable store (rotated keychain key, truncated write) is a
      // signed-out device, not a crash.
      this.auth = null
    }
  }

  private async persist(auth: PersistedAuth): Promise<void> {
    if (this.storePath !== undefined && this.encryptionAvailable()) {
      const storePath = this.storePath
      try {
        await mkdir(dirname(storePath), { recursive: true })
        const encrypted = this.safeStorage?.encryptString(JSON.stringify(auth))
        if (encrypted !== undefined) {
          const temporary = `${storePath}.${process.pid}.${Date.now()}.tmp`
          await writeFile(temporary, encrypted, { mode: 0o600 })
          await rename(temporary, storePath)
        }
      } catch (error) {
        console.warn(`[vizshare] could not persist the sign-in; it will not survive a restart: ${describe(error)}`)
      }
    }
    // The in-memory rotation is authoritative even if the disk write failed.
    this.auth = auth
  }

  private async clear(): Promise<void> {
    this.auth = null
    if (this.storePath === undefined) return
    await rm(this.storePath, { force: true }).catch(() => undefined)
  }

  private encryptionAvailable(): boolean {
    if (this.storePath === undefined || this.safeStorage === undefined) return false
    try {
      return this.safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }
}

interface TokenResponse {
  accessToken: string
  refreshToken?: string
  idToken?: string
  expiresIn: number
}

function parseTokenResponse(payload: unknown): TokenResponse {
  if (typeof payload !== 'object' || payload === null) throw new OidcError('invalid_token_response', 'The token response was empty')
  const record = payload as Record<string, unknown>
  if (typeof record.access_token !== 'string' || record.access_token.length === 0) {
    throw new OidcError('invalid_token_response', 'The token response carried no access_token')
  }
  const expiresIn = typeof record.expires_in === 'number' && Number.isFinite(record.expires_in) && record.expires_in > 0 ? record.expires_in : 300
  return {
    accessToken: record.access_token,
    ...(typeof record.refresh_token === 'string' ? { refreshToken: record.refresh_token } : {}),
    ...(typeof record.id_token === 'string' ? { idToken: record.id_token } : {}),
    expiresIn,
  }
}

function tokenError(payload: unknown, status: number): { code: string; message: string } {
  if (typeof payload === 'object' && payload !== null) {
    const record = payload as Record<string, unknown>
    const code = typeof record.error === 'string' ? record.error : `http_${status}`
    const description = typeof record.error_description === 'string' ? record.error_description : `The token request failed with ${status}`
    return { code, message: description }
  }
  return { code: `http_${status}`, message: `The token request failed with ${status}` }
}

function parsePersistedAuth(value: unknown): PersistedAuth | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const claims = record.claims
  if (record.version !== 1 || typeof record.accessToken !== 'string' || typeof record.expiresAt !== 'number') return null
  if (typeof claims !== 'object' || claims === null) return null
  const identity = claims as Record<string, unknown>
  if (typeof identity.sub !== 'string' || identity.sub.length === 0) return null
  const groups = Array.isArray(identity.groups) ? identity.groups.filter((group): group is string => typeof group === 'string') : []
  return {
    version: 1,
    accessToken: record.accessToken,
    ...(typeof record.refreshToken === 'string' ? { refreshToken: record.refreshToken } : {}),
    expiresAt: record.expiresAt,
    claims: {
      sub: identity.sub,
      ...(typeof identity.email === 'string' ? { email: identity.email } : {}),
      ...(typeof identity.name === 'string' ? { name: identity.name } : {}),
      groups,
    },
  }
}

function decodeJwtJson(segment: string): Record<string, unknown> {
  let value: unknown
  try {
    value = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as unknown
  } catch {
    throw new OidcError('invalid_token', 'The id_token is not valid JSON')
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new OidcError('invalid_token', 'The id_token is not a JSON object')
  }
  return value as Record<string, unknown>
}

function selectKey(entries: JwkEntry[], kid: string | undefined): JwkEntry | undefined {
  if (kid !== undefined) {
    const exact = entries.find((entry) => entry.kid === kid)
    if (exact !== undefined) return exact
    // Some IdPs publish a single unlabelled key; the signature still decides.
    return entries.length === 1 ? entries[0] : undefined
  }
  return entries.find((entry) => entry.kid !== undefined) ?? entries[0]
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
