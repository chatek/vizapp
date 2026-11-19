import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ASSERTION_FRESH_MARGIN_MS,
  assertionExpiryEpochMs,
  createRegistryTokenSource,
} from '../../electron/main/vizshare/agent-token-source'
import { clearAgentAssertionForTests, latestAgentAssertion, storeAgentAssertion } from '../../electron/main/vizshare/agent-assertion-store'
import { ReauthRequiredError } from '../../electron/main/vizshare/oidc'

// Broker cutover, dual mode (spec §5 step 3): a fresh pushed assertion serves
// the registry leg first; no assertion falls back to the fully-functional OIDC
// leg; neither available surfaces the typed reauth failure. Every call logs the
// SERVING LEG and never the token material itself.

const NOW = 1_700_000_000_000

function mintedAssertion(expEpochSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ iss: 'U', sub: 'U', aud: 'vizmaster-registry-vcc', exp: expEpochSeconds, iat: Math.floor(NOW / 1000), tool: 'vizshare-broker' }), 'utf8').toString('base64url')
  return `eyJhbGciOiJlZDI1NTE5LW5rZXkiLCJ0eXAiOiJKV1QifQ.${payload}.c2ln`
}

/** Collects the source's log lines so tests can assert on the diagnostic surface. */
function harness(oidc: { accessToken(): Promise<string> }, prefer = true) {
  const logs: string[] = []
  const source = createRegistryTokenSource(oidc, { preferAgentAssertion: prefer, now: () => NOW })
  return {
    run: async () => {
      const result = await source((message) => logs.push(message))
      return result
    },
    logs,
  }
}

afterEach(() => {
  clearAgentAssertionForTests()
  vi.restoreAllMocks()
})

describe('dual-mode registry token source', () => {
  it('serves a fresh pushed assertion on the agent-assertion leg and never touches oidc', async () => {
    storeAgentAssertion(mintedAssertion(Math.floor((NOW + ASSERTION_FRESH_MARGIN_MS + 60_000) / 1000)))
    const oidc = { accessToken: vi.fn(async () => 'oidc-bearer-token') }
    const { run, logs } = harness(oidc)
    const result = await run()
    expect(result.leg).toBe('agent-assertion')
    expect(result.token).toBe(latestAgentAssertion()?.assertion ?? '')
    expect(oidc.accessToken).not.toHaveBeenCalled()
    expect(logs.some((line) => line.includes('agent-assertion leg'))).toBe(true)
    expect(logs.some((line) => line.includes('oidc leg'))).toBe(false)
  })

  it('falls back to the oidc leg when no assertion was pushed', async () => {
    const oidc = { accessToken: vi.fn(async () => 'oidc-bearer-token') }
    const { run, logs } = harness(oidc)
    const result = await run()
    expect(result).toEqual({ token: 'oidc-bearer-token', leg: 'oidc' })
    expect(oidc.accessToken).toHaveBeenCalledTimes(1)
    expect(logs.some((line) => line.includes('oidc leg'))).toBe(true)
  })

  it('treats an expired (or near-expiry) assertion as not fresh and falls back to oidc', async () => {
    storeAgentAssertion(mintedAssertion(Math.floor((NOW + ASSERTION_FRESH_MARGIN_MS - 1) / 1000)))
    const oidc = { accessToken: vi.fn(async () => 'oidc-bearer-token') }
    const { run } = harness(oidc)
    const result = await run()
    expect(result.leg).toBe('oidc')
    expect(oidc.accessToken).toHaveBeenCalledTimes(1)
  })

  it('surfaces the typed reauth failure when neither leg has anything', async () => {
    const oidc = { accessToken: vi.fn(async () => { throw new ReauthRequiredError() }) }
    const { run, logs } = harness(oidc)
    await expect(run()).rejects.toMatchObject({ name: 'OidcError', code: 'reauth_required' })
    expect(logs.some((line) => line.includes('oidc leg'))).toBe(true)
  })

  it('serves oidc exclusively when the preference constant is flipped (the step-3 rollback)', async () => {
    storeAgentAssertion(mintedAssertion(Math.floor((NOW + 600_000) / 1000)))
    const oidc = { accessToken: vi.fn(async () => 'oidc-bearer-token') }
    const { run } = harness(oidc, false)
    const result = await run()
    expect(result.leg).toBe('oidc')
  })

  it('never emits token material into the diagnostic surface', async () => {
    const assertion = mintedAssertion(Math.floor((NOW + 600_000) / 1000))
    storeAgentAssertion(assertion)
    const logs: string[] = []
    const source = createRegistryTokenSource({ accessToken: async () => 'oidc-bearer-token' }, { now: () => NOW })
    await source((message) => logs.push(message))
    clearAgentAssertionForTests()
    await source((message) => logs.push(message))
    const surface = logs.join('\n')
    expect(surface).not.toContain(assertion)
    expect(surface).not.toContain('oidc-bearer-token')
    // Every line names the leg that served: the soak-readable diagnostic.
    for (const line of logs) expect(line).toMatch(/agent-assertion leg|oidc leg|agent assertion/)
  })
})

describe('assertionExpiryEpochMs', () => {
  it('reads exp from a well-formed assertion payload and refuses everything else', () => {
    expect(assertionExpiryEpochMs(mintedAssertion(1_700_000_500))).toBe(1_700_000_500_000)
    expect(assertionExpiryEpochMs('not-a-jwt')).toBeNull()
    expect(assertionExpiryEpochMs('a.b.c')).toBeNull()
    expect(assertionExpiryEpochMs(mintedAssertion(Number.NaN))).toBeNull()
  })
})
