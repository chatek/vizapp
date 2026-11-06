import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DRAFT_MAX_BYTES,
  PROMPTS_FLAG,
  SuggestionsService,
  bearerHeaders,
  createBearerTokenSource,
  jwtExpiresAt,
  parseSuggestion,
  promptSubjects,
  resolvePromptConfig,
  type PromptConfig,
  type SuggestionsNatsLike,
} from '../../electron/main/suggestions-service'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function config(overrides: Partial<PromptConfig> = {}): PromptConfig {
  const segment = 'vcc'
  const subHmac = 'hmac-student'
  return {
    segment,
    subHmac,
    identity: { nkey: 'UCZSAWGLDU7FKU4EXAMPLE', seed: 'SUAA277DNC5JEXAMPLE', subHmac },
    natsUrl: 'nats://fabric.test:4223',
    vgateUrl: 'https://vgate.test',
    name: 'vclaw-desktop-prompts:EXAMPLE',
    subjects: promptSubjects(segment, subHmac),
    ...overrides,
  }
}

interface FakeConnection {
  connection: SuggestionsNatsLike
  published: Array<{ subject: string; body: Record<string, unknown> }>
  requests: Array<{ subject: string; body: Record<string, unknown>; timeoutMs: number; headers?: Record<string, string> }>
  subscribed: string[]
  /** How many times the service asked for a re-minted token. */
  refreshes: number
  push(payload: unknown): void
  reply(subject: string, reply: (body: Record<string, unknown>) => unknown): void
  resetReplies(subject: string, ...replies: Array<(body: Record<string, unknown>) => unknown>): void
  closed: boolean
}

/**
 * A stand-in for the agent-sdk connection: it records the exact request options the service
 * builds (headers included), and its token source is scripted so the refresh path is observable.
 */
function fakeConnection(tokens: string[] = ['token-1', 'token-2']): FakeConnection {
  const state: FakeConnection = {
    connection: null as unknown as SuggestionsNatsLike,
    published: [],
    requests: [],
    subscribed: [],
    refreshes: 0,
    closed: false,
    push: () => undefined,
    reply: () => undefined,
    resetReplies: () => undefined,
  }
  let handler: ((data: Uint8Array) => void) | null = null
  const replies = new Map<string, Array<(body: Record<string, unknown>) => unknown>>()
  let token = tokens[0]
  state.push = (payload) => { handler?.(encoder.encode(JSON.stringify(payload))) }
  state.reply = (subject, reply) => replies.set(subject, [reply])
  state.resetReplies = (subject, ...next) => replies.set(subject, next)
  state.connection = {
    subscribe: async (subject, next) => {
      state.subscribed.push(subject)
      handler = next
      return () => { handler = null }
    },
    publish: (subject, data) => { state.published.push({ subject, body: JSON.parse(decoder.decode(data)) as Record<string, unknown> }) },
    request: async (subject, data, options) => {
      const body = JSON.parse(decoder.decode(data)) as Record<string, unknown>
      state.requests.push({ subject, body, timeoutMs: options.timeoutMs, ...(options.headers ? { headers: options.headers } : {}) })
      const queue = replies.get(subject)
      const reply = queue?.length ? queue.length > 1 ? queue.shift() : queue[0] : undefined
      if (!reply) throw new Error('timeout')
      return encoder.encode(JSON.stringify(reply(body)))
    },
    authToken: async () => token,
    refreshAuthToken: async () => {
      state.refreshes += 1
      token = tokens[Math.min(state.refreshes, tokens.length - 1)]
      return token
    },
    close: async () => { state.closed = true; handler = null },
  }
  return state
}

function serviceWith(connection: FakeConnection): SuggestionsService {
  return new SuggestionsService({
    connector: async () => connection.connection,
    config: config(),
    throttleMs: 300,
  })
}

const suggestion = {
  suggestionId: 'sug-1',
  roomId: 'room-1',
  requestId: 'req-1',
  prompt: '求解一元二次方程的最优提示',
  from: { kind: 'agent', nkey: 'UAGENTEXAMPLE', ownerHandle: 'teacher' },
  expiresAt: '2099-01-01T00:00:00.000Z',
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('prompt suggestion pushes', () => {
  it('subscribes to the student subject and forwards only contract-shaped pushes', async () => {
    const fake = fakeConnection()
    const service = serviceWith(fake)
    const seen: string[] = []
    service.onSuggestion((received) => seen.push(received.suggestionId))
    await service.start()

    expect(fake.subscribed).toEqual(['tenant.vcc.prompts.suggest.hmac-student'])
    fake.push(suggestion)
    fake.push({ ...suggestion, suggestionId: 'sug-bad', prompt: '   ' })
    fake.push({ ...suggestion, suggestionId: 'sug-bad2', from: { kind: 'robot', nkey: 'X' } })
    fake.push('not json at all')

    expect(seen).toEqual(['sug-1'])
    await service.stop()
  })

  it('parses an agent claim without upgrading it to a verified fact', () => {
    const parsed = parseSuggestion(encoder.encode(JSON.stringify(suggestion)))
    expect(parsed?.from).toEqual({ kind: 'agent', nkey: 'UAGENTEXAMPLE', ownerHandle: 'teacher' })
    expect(parseSuggestion(encoder.encode('{}'))).toBeNull()
  })
})

describe('consent-gated draft publishing', () => {
  it('publishes nothing at all while no consent session is open', async () => {
    vi.useFakeTimers()
    const fake = fakeConnection()
    const service = serviceWith(fake)
    await service.start()

    service.setDraft({ text: '一元二次方程', locale: 'zh-CN' })
    vi.advanceTimersByTime(1_000)

    expect(fake.published).toEqual([])
    await service.stop()
  })

  it('publishes one throttled draft view, tagged with the room, once the session opens', async () => {
    vi.useFakeTimers()
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', mutual: true, expiresAt: '2099-01-01T00:00:00.000Z' }))
    const service = serviceWith(fake)
    await service.start()

    const opened = await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })
    expect(opened).toEqual({ ok: true, data: { roomId: 'room-1', peer: 'UTEACHER', mutual: true, expiresAt: '2099-01-01T00:00:00.000Z' } })
    expect(fake.requests[0]).toMatchObject({ subject: 'vizregistry.prompts.room.open', body: { peer: 'UTEACHER', conversationId: 'conv-1' }, timeoutMs: 5_000 })

    service.setDraft({ text: '一元二次方程', locale: 'zh-CN' })
    service.setDraft({ text: '一元二次方程 求解', locale: 'zh-CN' })
    vi.advanceTimersByTime(299)
    expect(fake.published).toHaveLength(0)
    vi.advanceTimersByTime(1)

    expect(fake.published).toHaveLength(1)
    expect(fake.published[0].subject).toBe('tenant.vcc.prompts.draft.hmac-student')
    expect(fake.published[0].body).toMatchObject({ roomId: 'room-1', draft: '一元二次方程 求解', locale: 'zh-CN' })
    await service.stop()
  })

  it('stops publishing the moment the session closes, before the service answers', async () => {
    vi.useFakeTimers()
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    fake.reply('vizregistry.prompts.room.close', () => { throw new Error('request timeout') })
    const service = serviceWith(fake)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })
    service.setDraft({ text: 'first' })
    vi.advanceTimersByTime(300)
    expect(fake.published).toHaveLength(1)

    const closed = await service.closeSession()
    expect(closed).toEqual({ ok: false, error: 'timeout' })
    service.setDraft({ text: 'after revocation' })
    vi.advanceTimersByTime(1_000)

    expect(fake.published).toHaveLength(1)
    expect(service.session).toBeNull()
    await service.stop()
  })

  it('never publishes a draft past the 4 KiB payload cap', async () => {
    vi.useFakeTimers()
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    const service = serviceWith(fake)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })

    service.setDraft({ text: 'x'.repeat(DRAFT_MAX_BYTES + 1) })
    vi.advanceTimersByTime(1_000)

    expect(fake.published).toEqual([])
    await service.stop()
  })
})

describe('request mapping', () => {
  it('turns a refusal into the typed code the UI branches on', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.feedback', () => ({ rejected: 'not_mutual' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.feedback('sug-1', 'accepted', 900)).resolves.toEqual({ ok: false, error: 'not_mutual' })
    expect(fake.requests.at(-1)).toMatchObject({
      subject: 'vizregistry.prompts.feedback',
      body: { suggestionId: 'sug-1', outcome: 'accepted', ms: 900 },
      timeoutMs: 5_000,
    })
    await service.stop()
  })

  it('maps a missing service to unavailable and a silent one to timeout', async () => {
    const fake = fakeConnection()
    const service = serviceWith(fake)
    await service.start()

    fake.reply('vizregistry.prompts.feedback', () => ({ ok: true }))
    await expect(service.feedback('sug-2', 'rejected')).resolves.toEqual({ ok: true, data: { ok: true } })
    await expect(service.closeSession('room-9')).resolves.toEqual({ ok: false, error: 'timeout' })
    await service.stop()

    const offline = new SuggestionsService({ connector: async () => { throw new Error('no route') }, config: config() })
    await expect(offline.feedback('sug-3', 'rejected')).resolves.toEqual({ ok: false, error: 'unavailable' })
  })

  it('reports an unconfigured identity without inventing a subject', async () => {
    const readFile = vi.fn((path: string) => {
      if (path.endsWith('credentials.json')) return JSON.stringify({ nkey: 'UCZSAWGLDU7FEXAMPLE', seed: 'SUAA277DNC5JEXAMPLE' })
      return JSON.stringify({ server: 'nats://fabric.test:4223' })
    })
    const resolved = resolvePromptConfig({ [PROMPTS_FLAG]: '1' }, { readFile, home: '/home/student' })
    expect(resolved).toEqual({ ok: false, error: 'missing_sub_hmac' })

    const disabled = resolvePromptConfig({}, { readFile, home: '/home/student' })
    expect(disabled).toEqual({ ok: false, error: 'disabled' })

    const configured = resolvePromptConfig(
      { [PROMPTS_FLAG]: '1', VCLAW_PROMPTS_SUB_HMAC: 'hmac-student' },
      { readFile, home: '/home/student' },
    )
    expect(configured.ok && configured.config.subjects.suggest).toBe('tenant.vcc.prompts.suggest.hmac-student')
    expect(configured.ok && configured.config.natsUrl).toBe('nats://fabric.test:4223')
    expect(configured.ok && configured.config.accessToken).toBeUndefined()

    const withToken = resolvePromptConfig(
      { [PROMPTS_FLAG]: '1', VCLAW_PROMPTS_SUB_HMAC: 'hmac-student', VCLAW_PROMPTS_ACCESS_TOKEN: 'oidc-access-token' },
      { readFile, home: '/home/student' },
    )
    expect(withToken.ok && withToken.config.accessToken).toBe('oidc-access-token')
  })
})

describe('micro authorization', () => {
  it('sends the identity bearer token on every request path', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    fake.reply('vizregistry.prompts.room.close', () => ({ closed: true }))
    fake.reply('vizregistry.prompts.feedback', () => ({ ok: true }))
    const service = serviceWith(fake)
    await service.start()

    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })
    await service.closeSession()
    await service.feedback('sug-1', 'accepted')

    expect(fake.requests.map((request) => request.headers)).toEqual([
      { Authorization: 'Bearer token-1', 'X-Vizmaster-Token': 'token-1' },
      { Authorization: 'Bearer token-1', 'X-Vizmaster-Token': 'token-1' },
      { Authorization: 'Bearer token-1', 'X-Vizmaster-Token': 'token-1' },
    ])
    expect(fake.refreshes).toBe(0)
    await service.stop()
  })

  it('builds the canonical header plus the fallback the service accepts', () => {
    expect(bearerHeaders('abc.def.ghi')).toEqual({ Authorization: 'Bearer abc.def.ghi', 'X-Vizmaster-Token': 'abc.def.ghi' })
  })

  it('passes forbidden_segment through untouched instead of retrying', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ ok: false, code: 'forbidden_segment', message: 'wrong segment' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })).resolves.toEqual({ ok: false, error: 'forbidden_segment' })
    expect(fake.requests).toHaveLength(1)
    expect(fake.refreshes).toBe(0)
    expect(service.session).toBeNull()
    await service.stop()
  })

  it('re-mints the token once and retries when the service answers unauthorized', async () => {
    const fake = fakeConnection(['stale-token', 'fresh-token'])
    fake.resetReplies(
      'vizregistry.prompts.feedback',
      () => ({ ok: false, code: 'unauthorized' }),
      () => ({ ok: true }),
    )
    const service = serviceWith(fake)
    await service.start()

    await expect(service.feedback('sug-1', 'rejected')).resolves.toEqual({ ok: true, data: { ok: true } })
    expect(fake.refreshes).toBe(1)
    expect(fake.requests.map((request) => request.headers?.Authorization)).toEqual([
      'Bearer stale-token',
      'Bearer fresh-token',
    ])
    expect(fake.requests[1]?.headers?.['X-Vizmaster-Token']).toBe('fresh-token')
    await service.stop()
  })

  it('surfaces a typed unauthorized refusal after exactly one retry', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.feedback', () => ({ ok: false, code: 'unauthorized' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.feedback('sug-1', 'accepted')).resolves.toEqual({ ok: false, error: 'unauthorized' })
    expect(fake.requests).toHaveLength(2)
    expect(fake.refreshes).toBe(1)
    await service.stop()
  })

  it('never throws when the token source itself fails', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.feedback', () => ({ code: 'unauthorized' }))
    const failing: SuggestionsNatsLike = {
      ...fake.connection,
      authToken: async () => { throw new Error('vgate down') },
      refreshAuthToken: async () => { throw new Error('vgate down') },
    }
    const service = new SuggestionsService({ connector: async () => failing, config: config() })
    await service.start()

    await expect(service.feedback('sug-1', 'accepted')).resolves.toEqual({ ok: false, error: 'unauthorized' })
    expect(fake.requests[0]?.headers).toBeUndefined()
    await service.stop()
  })

  it('leaves a non-auth refusal unretried', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.close', () => ({ rejected: 'room_closed' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.closeSession('room-9')).resolves.toEqual({ ok: false, error: 'room_closed' })
    expect(fake.requests).toHaveLength(1)
    expect(fake.refreshes).toBe(0)
    await service.stop()
  })
})

describe('bearer token cache', () => {
  // A JWT payload is base64url JSON; only `exp` matters to the cache.
  const jwt = (expSeconds: number) => `x.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString('base64url')}.y`

  it('reads exp in milliseconds and treats an opaque token as non-expiring', () => {
    expect(jwtExpiresAt(jwt(1_700_000_000))).toBe(1_700_000_000_000)
    expect(jwtExpiresAt('opaque')).toBeNull()
    expect(jwtExpiresAt('a.not-base64-json.c')).toBeNull()
  })

  it('reuses a valid token and re-mints only inside the expiry skew', async () => {
    let clock = 1_000_000_000
    let mints = 0
    const source = createBearerTokenSource(async () => {
      mints += 1
      return jwt(clock / 1_000 + 600)
    }, { now: () => clock })

    const first = await source.token()
    expect(await source.token()).toBe(first)
    expect(mints).toBe(1)

    // 30 s before expiry: inside the 60 s skew, so the next call mints instead of sending it.
    clock += 570_000
    const second = await source.token()
    expect(second).not.toBe(first)
    expect(mints).toBe(2)

    await source.refresh()
    expect(mints).toBe(3)
  })

  it('shares one in-flight mint and keeps the previous token when a mint fails', async () => {
    let clock = 1_000_000_000
    let mints = 0
    let fail = false
    const source = createBearerTokenSource(async () => {
      mints += 1
      if (fail) throw new Error('vgate down')
      return jwt(clock / 1_000 + 600)
    }, { now: () => clock })

    const [a, b] = await Promise.all([source.token(), source.token()])
    expect(a).toBe(b)
    expect(mints).toBe(1)

    clock += 570_000
    fail = true
    expect(await source.refresh()).toBe(a)
    expect(mints).toBe(2)
  })
})
