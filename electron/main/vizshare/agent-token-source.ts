import { latestAgentAssertion } from './agent-assertion-store'
import type { OidcClient } from './oidc'

/**
 * Broker-retirement migration STEP 3 (spec §5): dual-mode registry auth.
 *
 * getAccessToken resolution order:
 *   1. a FRESH agent assertion from the RAM store (the agent pushed it, §3.2 A) —
 *      the target state, zero human credential involved;
 *   2. the OIDC access token (temporary dual mode) — kept fully functional so a
 *      revert is flipping one constant below;
 *   3. no assertion and no session → the OIDC client's typed failure
 *      (ReauthRequiredError → api maps it to `reauth_required`), which the share
 *      sheet renders; un-bound hosts instead get `agent_not_owned` from the
 *      registry once assertions flow and OIDC is retired (step 5).
 *
 * Diagnostic surface: the SERVING LEG is logged on every call so soak runs can
 * prove which path served, and no leg ever logs token material — the assertion
 * embeds a signed proof and the OIDC token is a bearer credential; neither may
 * reach a log line.
 */

/** Flip to `false` to serve everything from OIDC again (the step-3 rollback). */
export const PREFER_AGENT_ASSERTION = true

/** An assertion is fresh while its exp is at least this far in the future. */
export const ASSERTION_FRESH_MARGIN_MS = 30_000

export type RegistryAuthLeg = 'agent-assertion' | 'oidc'

export type RegistryTokenSource = (log: (message: string) => void) => Promise<{ token: string; leg: RegistryAuthLeg }>

/**
 * Reads the JWT payload's `exp` WITHOUT verifying: the broker never holds the
 * signing seed, so verification is the registry's job — here the value is only
 * a freshness hint for leg selection. Returns null for anything unparseable.
 */
export function assertionExpiryEpochMs(assertion: string): number | null {
  const parts = assertion.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<string, unknown>
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function createRegistryTokenSource(
  oidc: Pick<OidcClient, 'accessToken'>,
  options: { preferAgentAssertion?: boolean; now?: () => number } = {},
): RegistryTokenSource {
  const prefer = options.preferAgentAssertion ?? PREFER_AGENT_ASSERTION
  const now = options.now ?? Date.now
  return async (log) => {
    if (prefer) {
      const entry = latestAgentAssertion()
      const expiry = entry === null ? null : assertionExpiryEpochMs(entry.assertion)
      const fresh = expiry !== null && expiry - now() >= ASSERTION_FRESH_MARGIN_MS
      if (entry !== null && fresh) {
        log('vizshare: registry auth served by the agent-assertion leg (pushed by the agent runtime)')
        return { token: entry.assertion, leg: 'agent-assertion' }
      }
      log(`vizshare: no ${entry === null ? 'agent assertion pushed yet' : 'fresh agent assertion (expired)'} — falling back to the oidc leg`)
    }
    log('vizshare: registry auth served by the oidc leg (dual mode; agent assertions retire it in step 5)')
    return { token: await oidc.accessToken(), leg: 'oidc' }
  }
}
