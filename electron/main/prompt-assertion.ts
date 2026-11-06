import type { PromptSuggestionInvokeResult } from '../../src/types/api'

/**
 * The credential this desktop PRESENTS to VizRegistry, and the one-time proof that binds it to
 * its owner's account.
 *
 * The same shape agent-sdk signs for `/v1/agent/token` (`src/lib/agent-assertion.ts`): an
 * Ed25519 NKey assertion in three base64url parts, `iss === sub === <U-key>`, `exp - iat ≤ 300`.
 * Two claims are added because the registry's verifier reads them: `aud` (domain separation —
 * a request credential must not be replayable as a bind proof) and `tool` (what this client does).
 *
 * What it is NOT: a session. There is no long-lived bearer on disk, and nothing here is cached
 * beyond the assertion's own short life (the caller's token source owns that cache).
 */

/** The header both certificate families pin. A literal, not config — the verifier reads it. */
const ASSERTION_HEADER = { alg: 'ed25519-nkey', typ: 'JWT' } as const

/** `exp - iat` ceiling the verifier enforces: an assertion is a request credential, not a session. */
export const ASSERTION_TTL_SECONDS = 300

export interface NkeyAssertionInput {
  /** The encoded seed (`"SU…"`) from `~/.config/vclaw/credentials.json`. */
  seed: string
  /** The NKey-pub U-form (`"U…"`) — `iss` AND `sub`; a bytes/base64 key is refused by the verifier. */
  publicKey: string
  /** Domain separator: `vizmaster-registry-vcc` for requests, `…-agent-bind` for enrolment. */
  audience: string
  /** What this client does, as the verifier's `tool` claim requires. */
  tool?: string
  ttlSeconds?: number
  now?: () => number
}

const b64url = (data: string | Uint8Array): string => Buffer.from(data).toString('base64url')

/**
 * Mints one short-lived assertion. Throws only on programmer error (bad key form, bad ttl) —
 * a caller that cannot sign must fix its input, never retry the same bytes.
 */
export async function buildNkeyAssertion(input: NkeyAssertionInput): Promise<string> {
  if (!input.publicKey.startsWith('U')) {
    throw new Error(`buildNkeyAssertion: publicKey must be the U-form (got "${input.publicKey.slice(0, 4)}…")`)
  }
  const ttl = input.ttlSeconds ?? ASSERTION_TTL_SECONDS
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > ASSERTION_TTL_SECONDS) {
    throw new Error(`buildNkeyAssertion: exp-iat must be 1..${ASSERTION_TTL_SECONDS} seconds (got ${ttl})`)
  }
  // The signer is the nkeys implementation agent-sdk itself signs with; loading it lazily keeps
  // the crypto out of the app's startup path when the feature is off.
  const { nkeys } = await import('@nats-io/nats-core')
  const iat = Math.floor((input.now?.() ?? Date.now()) / 1_000)
  const payload: Record<string, unknown> = {
    iss: input.publicKey,
    sub: input.publicKey,
    aud: input.audience,
    ...(input.tool ? { tool: input.tool } : {}),
    iat,
    exp: iat + ttl,
    // Replay guard: the bind route records what it has seen, so two enrolments cannot share one.
    jti: globalThis.crypto.randomUUID(),
  }
  const signingInput = `${b64url(JSON.stringify(ASSERTION_HEADER))}.${b64url(JSON.stringify(payload))}`
  const key = nkeys.fromSeed(new TextEncoder().encode(input.seed))
  const signature = key.sign(new TextEncoder().encode(signingInput))
  return `${signingInput}.${b64url(signature)}`
}

/** Split + decode an assertion's payload; a test seam and a diagnostic, never a decision. */
export function decodeAssertion(assertion: string): Record<string, unknown> {
  const [, payload] = assertion.split('.')
  if (!payload) throw new Error('decodeAssertion: expected 3 parts')
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
}

export interface LinkIdentityInput {
  /** Registry origin, e.g. `https://vizmaster.app/api`'s origin + the `/api` prefix handled here. */
  registryUrl: string
  /** The OWNER's OIDC access token (`aud vizmaster-vcc`) — this route is human-authenticated. */
  accessToken: string
  publicKey: string
  /** The bind assertion (`aud vizmaster-registry-agent-bind`) minted from this host's seed. */
  assertion: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const LINK_TIMEOUT_MS = 10_000

/**
 * One-time enrolment: `PUT /api/me/agent-bindings/<nkey>`. The owner proves account ownership
 * with the OIDC token and the host proves seed possession with the assertion — after this the
 * desktop is a BOUND nkey of its own owner and every request credential resolves to that
 * `ownerSubHmac` server-side. There is no new endpoint and no link table.
 */
export async function linkIdentity(input: LinkIdentityInput): Promise<PromptSuggestionInvokeResult> {
  const base = input.registryUrl.replace(/\/+$/, '')
  const url = `${base}/api/me/agent-bindings/${encodeURIComponent(input.publicKey)}`
  const send = input.fetchImpl ?? fetch
  let response: Response
  try {
    response = await send(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.accessToken}` },
      // `client_assertion` is this estate's name for the field (the token endpoint's own body).
      body: JSON.stringify({ client_assertion: input.assertion }),
      signal: AbortSignal.timeout(input.timeoutMs ?? LINK_TIMEOUT_MS),
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : ''
    return { ok: false, error: name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'unreachable' }
  }
  const text = await response.text().catch(() => '')
  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = text ? JSON.parse(text) : {}
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) body = parsed as Record<string, unknown>
  } catch { /* a non-JSON body is a refusal without a code */ }
  if (response.ok) return { ok: true, data: body }
  if (typeof body.error === 'string' && body.error) return { ok: false, error: body.error }
  return { ok: false, error: `http_${response.status}` }
}
