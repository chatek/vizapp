import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPrivateKey, createPublicKey, verify as cryptoVerify } from 'node:crypto'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createVizShareBroker, type CaptureRect, type VizShareBrokerOptions } from '../../electron/main/vizshare/broker'
import { AGENT_ASSERTION_MAX_BYTES, clearAgentAssertionForTests, latestAgentAssertion, storeAgentAssertion } from '../../electron/main/vizshare/agent-assertion-store'
import {
  ASSERTION_TTL_SECONDS,
  REGISTRY_ASSERTION_AUDIENCE,
  REGISTRY_ASSERTION_TOOL,
  buildRegistryAssertion,
  readAssertionSeed,
  type AssertionSeed,
} from '../../product/payload/src/tools/agent-assertion'

// Broker-retirement step 2 (spec §3.2 A, ruling §8.1): the agent PUSHES its
// registry assertion to the broker's agent-cap-gated loopback route; the
// broker caches the LATEST one in RAM only — never disk, never renderer-
// readable — and the OIDC getAccessToken leg is untouched this step.

const CAP = 'agent-cap-token'
const JWT = 'eyJhbGciOiJlZDI1NTE5LW5rZXkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJ1In0.c2ln'

function broker(overrides: Partial<VizShareBrokerOptions> = {}): { handle: (request: IncomingMessage, response: Partial<ServerResponse>) => Promise<void>; stored: string[] } {
  const stored: string[] = []
  const options: VizShareBrokerOptions = {
    port: 4599,
    oidc: {
      status: async () => ({ signedIn: false, user: null, expiresAt: null }),
      beginSignIn: async () => 'https://auth.example/start',
      completeSignIn: async () => ({ sub: 'probe-sub', handle: 'probe', display: 'probe', groups: ['vcc'] }),
    },
    api: {
      listMine: async () => [],
      submitViz: async () => { throw new Error('not used') },
      withdraw: async () => { throw new Error('not used') },
      createDraftOnly: async () => { throw new Error('not used') },
      uploadPoster: async () => { throw new Error('not used') },
      submitDraft: async () => { throw new Error('not used') },
    },
    openExternal: async () => undefined,
    isCapValid: () => false,
    isAgentCapValid: (cap) => cap === CAP,
    capturePage: async (_cap: string, _rect: CaptureRect) => null,
    ...overrides,
  }
  const listener = createVizShareBroker(options)
  return {
    stored,
    async handle(request, response) {
      await listener(request as IncomingMessage, response as unknown as ServerResponse)
    },
  }
}

function exchange(request: Partial<IncomingMessage>): { request: IncomingMessage; response: Partial<ServerResponse>; status(): number | undefined; body(): unknown; json(value: unknown): void } {
  const response: Partial<ServerResponse> = {}
  let status: number | undefined
  let payload: unknown
  response.setHeader = (() => response) as unknown as ServerResponse['setHeader']
  response.removeHeader = (() => undefined) as ServerResponse['removeHeader']
  response.writeHead = ((code: number) => { status = code }) as ServerResponse['writeHead']
  response.end = ((value?: string) => {
    if (typeof value === 'string' && value.length > 0) payload = JSON.parse(value)
  }) as ServerResponse['end']
  return {
    request: request as IncomingMessage,
    response,
    status: () => status,
    body: () => payload,
    json(value: unknown) {
      request.headers = { ...request.headers, 'content-type': 'application/json' }
      request.method = 'POST'
      // Minimal one-shot stream: readBody subscribes data/end/error/aborted.
      const data: Array<(chunk: Buffer) => void> = []
      const end: Array<() => void> = []
      let flushed = false
      const flush = (): void => {
        if (flushed) return
        flushed = true
        for (const callback of data) callback(Buffer.from(JSON.stringify(value), 'utf8'))
        for (const callback of end) callback()
      }
      request.on = ((_event: string, callback: (chunk: Buffer) => void) => {
        if (_event === 'data') data.push(callback)
        return request
      }) as IncomingMessage['on']
      request.once = ((_event: string, callback: () => void) => {
        if (_event === 'end') end.push(callback)
        return request
      }) as IncomingMessage['once']
      request.off = (() => request) as IncomingMessage['off']
      // Deferred: the broker subscribes data, end, error, aborted synchronously
      // when it reaches readBody — flush only after all four are registered.
      setImmediate(flush)
    },
  }
}

describe('POST /v1/agent-assertion', () => {
  afterEach(() => clearAgentAssertionForTests())

  it('stores a pushed assertion behind the agent cap and answers ok', async () => {
    const app = broker({ storeAgentAssertion: (a) => storeAgentAssertion(a) })
    const call = exchange({ url: '/v1/agent-assertion', headers: { host: '127.0.0.1:4599', 'x-vizshare-cap': CAP } })
    call.json({ assertion: JWT })
    void app.handle(call.request, call.response)
    await vi.waitFor(() => expect(call.status()).toBe(200))
    expect(call.body()).toEqual({ ok: true })
    expect(latestAgentAssertion()?.assertion).toBe(JWT)
  })

  it('uses the module RAM store by default — injectable for tests', async () => {
    const app = broker()
    const call = exchange({ url: '/v1/agent-assertion', headers: { host: '127.0.0.1:4599', 'x-vizshare-cap': CAP } })
    call.json({ assertion: JWT })
    void app.handle(call.request, call.response)
    await vi.waitFor(() => expect(call.status()).toBeDefined())
    expect(call.body()).toEqual({ ok: true })
  })

  it('refuses the route without the agent capability (origin gate)', async () => {
    const app = broker()
    const call = exchange({ url: '/v1/agent-assertion', headers: { host: '127.0.0.1:4599' } })
    call.json({ assertion: JWT })
    void app.handle(call.request, call.response)
    await vi.waitFor(() => expect(call.status()).toBe(403))
    expect(call.body()).toEqual({ error: 'forbidden_origin' })
    expect(latestAgentAssertion()).toBeNull()
  })

  it('refuses a wrong agent capability', async () => {
    const app = broker()
    const call = exchange({ url: '/v1/agent-assertion', headers: { host: '127.0.0.1:4599', 'x-vizshare-cap': 'wrong' } })
    call.json({ assertion: JWT })
    void app.handle(call.request, call.response)
    await vi.waitFor(() => expect(call.status()).toBeDefined())
    expect(call.status()).toBe(403)
    expect(latestAgentAssertion()).toBeNull()
  })

  it('keeps only the latest assertion (one-slot cache)', async () => {
    clearAgentAssertionForTests()
    expect(storeAgentAssertion('first')).toMatchObject({ ok: true })
    expect(storeAgentAssertion('second')).toMatchObject({ ok: true })
    expect(latestAgentAssertion()?.assertion).toBe('second')
  })

  it('refuses empty or oversized assertions with typed errors', () => {
    expect(storeAgentAssertion('')).toEqual({ ok: false, error: 'invalid_assertion' })
    expect(storeAgentAssertion(42)).toEqual({ ok: false, error: 'invalid_assertion' })
    expect(storeAgentAssertion('x'.repeat(AGENT_ASSERTION_MAX_BYTES + 1))).toEqual({ ok: false, error: 'assertion_too_large' })
  })

  it('never exposes the cache: even a same-cap GET is refused at the origin gate', async () => {
    const app = broker()
    const call = exchange({ url: '/v1/agent-assertion', headers: { host: '127.0.0.1:4599', 'x-vizshare-cap': CAP } })
    void app.handle(call.request, call.response)
    await vi.waitFor(() => expect(call.status()).toBeDefined())
    // The allow-list names POST only, so the GET falls through to the Origin
    // gate — there is no way to read the cached assertion back, ever.
    expect(call.status()).toBe(403)
    expect(call.body()).toEqual({ error: 'forbidden_origin' })
  })
})

describe('payload assertion minter', () => {
  // Verified against @nats-io/nkeys semantics: the seed is base32 of a raw
  // ed25519 seed and the header alg matches the registry compound verifier's
  // routing key (auth/agent.ts alg === 'ed25519-nkey').
  const SEED: AssertionSeed = {
    publicKey: 'UBYYRKJHZGXATWKWZRYT5VI6AG5YEL2U2QERQDAJP4EH7TVGEXT2JK5F',
    seed: new Uint8Array(32).fill(7),
  }

  it('mints a three-part JWT with the verifier-required claims', () => {
    const now = 1_700_000_000
    const { jwt, expiresAtEpochSeconds } = buildRegistryAssertion(SEED, now)
    const [headerPart, claimsPart, signaturePart] = jwt.split('.')
    expect(headerPart).toBeDefined()
    expect(claimsPart).toBeDefined()
    expect(signaturePart).toBeDefined()
    expect(JSON.parse(Buffer.from(headerPart!, 'base64url').toString('utf8'))).toEqual({ alg: 'ed25519-nkey', typ: 'JWT' })
    const claims = JSON.parse(Buffer.from(claimsPart!, 'base64url').toString('utf8'))
    expect(claims.iss).toBe(SEED.publicKey)
    expect(claims.sub).toBe(SEED.publicKey)
    expect(claims.aud).toBe(REGISTRY_ASSERTION_AUDIENCE)
    expect(claims.tool).toBe(REGISTRY_ASSERTION_TOOL)
    expect(claims.exp - claims.iat).toBe(ASSERTION_TTL_SECONDS)
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(300)
    expect(typeof claims.jti).toBe('string')
    expect(expiresAtEpochSeconds).toBe(now + ASSERTION_TTL_SECONDS)
  })

  it('mints distinct jtis for consecutive calls', () => {
    const first = buildRegistryAssertion(SEED, 1_700_000_000).jwt
    const second = buildRegistryAssertion(SEED, 1_700_000_000).jwt
    expect(first).not.toBe(second)
  })

  it('produces a signature that verifies as ed25519 over the signing input', async () => {
    const { jwt } = buildRegistryAssertion(SEED, 1_700_000_000)
    const [header, claims, signature] = jwt.split('.')
    // Independent verification path: rebuild the private key from the raw
    // seed and derive its public half — the signature must verify there.
    // (The U-form public key in the claims is ed25519-DERIVED from the seed,
    // not the seed bytes themselves.)
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(SEED.seed)])
    const priv = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
    const pub = createPublicKey(priv)
    const ok = cryptoVerify(null, Buffer.from(`${header}.${claims}`, 'utf8'), pub, Buffer.from(signature!, 'base64url'))
    expect(ok).toBe(true)
  })

  it('decodes the real encoded seed ("SU…") identically to @nats-io/nkeys', async () => {
    // Cross-implementation proof: generate a REAL encoded seed with the SDK's
    // own nkeys library, run it through readAssertionSeed + the node:crypto
    // minter, and verify the signature with the nkeys key. Also pins the
    // CREDS_DIR / VCLAW_HOME resolution (the SDK-divergence fold-in).
    const { nkeys } = await import('@nats-io/nats-core')
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const kp = nkeys.createUser()
    const encodedSeed = new TextDecoder().decode(kp.getSeed())
    const configDir = mkdtempSync(join(tmpdir(), 'vmassert-'))
    process.env.CREDS_DIR = configDir
    try {
      writeFileSync(join(configDir, 'credentials.json'), JSON.stringify({ name: 'probe', public_key: kp.getPublicKey(), seed: encodedSeed }))
      const seed = await readAssertionSeed()
      expect(seed).not.toBeNull()
      expect(seed!.publicKey).toBe(kp.getPublicKey())
      const { jwt } = buildRegistryAssertion(seed!, 1_700_000_000)
      const [header, claims, signature] = jwt.split('.')
      // kp.verify(input, signature).
      expect(kp.verify(Buffer.from(`${header}.${claims}`, 'utf8'), Buffer.from(signature!, 'base64url'))).toBe(true)
    } finally {
      delete process.env.CREDS_DIR
      rmSync(configDir, { recursive: true, force: true })
    }
  })
})
