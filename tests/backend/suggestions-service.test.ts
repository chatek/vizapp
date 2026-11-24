import { readFileSync } from 'node:fs'
import { nkeys } from '@nats-io/nats-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CATALOGUE_RETRY_MS,
  DRAFT_MAX_BYTES,
  PROMPT_AUDIENCE,
  PROMPT_BIND_AUDIENCE,
  PROMPTS_FLAG,
  SuggestionsService,
  bearerHeaders,
  createBearerTokenSource,
  jwtExpiresAt,
  parseSuggestion,
  promptBearerTokenSource,
  promptSubjects,
  resolvePromptConfig,
  shouldStartPrompts,
  type PromptConfig,
  type SuggestionsNatsLike,
} from '../../electron/main/suggestions-service'
import { buildNkeyAssertion } from '../../electron/main/prompt-assertion'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** A U-form nkey fixture: delivery subjects are keyed by it now, never by a subHmac. */
const NKEY = 'UCZSAWGLDU7FKU4A5Z3N6VB2XQ7M9RTC1YD8KJHN4PLEWXZ'

function config(overrides: Partial<PromptConfig> = {}): PromptConfig {
  const segment = 'vcc'
  return {
    segment,
    identity: { nkey: NKEY, seed: 'SUAA277DNC5JEXAMPLE' },
    natsUrl: 'nats://fabric.test:4223',
    vgateUrl: 'https://vgate.test',
    name: 'vclaw-desktop-prompts:EXAMPLE',
    tool: 'prompt-collab',
    subjects: promptSubjects(segment, NKEY),
    ...overrides,
  }
}

interface FakeConnection {
  connection: SuggestionsNatsLike
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

const decodeToken = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as Record<string, unknown>

function serviceWith(connection: FakeConnection, throttleMs = 300): SuggestionsService {
  return new SuggestionsService({
    connector: async () => connection.connection,
    config: config(),
    throttleMs,
  })
}

/** Requests a test cares about: the service also warms the catalogue on start. */
const requestsFor = (fake: FakeConnection, subject: string) => fake.requests.filter((request) => request.subject === subject)

/** The flush is fire-and-forget by design, so a test waits for its observable outcome. */
const draftOutcomes = (service: SuggestionsService) => {
  const seen: Array<{ state: string; error?: string }> = []
  service.onDraftOutcome((outcome) => seen.push(outcome))
  return seen
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

    expect(fake.subscribed).toEqual([`tenant.vcc.prompts.suggest.${NKEY}`])
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

  it('keeps a well-formed vizshow intent as display data', () => {
    const parsed = parseSuggestion(encoder.encode(JSON.stringify({
      ...suggestion,
      vizshow: {
        tutorialId: ' quadratic-functions ',
        kind: 'three',
        params: { a: 1, b: -3, c: 2, crisp: true, mode: 'slide' },
      },
    })))

    expect(parsed?.suggestionId).toBe('sug-1')
    expect(parsed?.vizshow).toEqual({
      tutorialId: 'quadratic-functions',
      kind: 'three',
      params: { a: 1, b: -3, c: 2, crisp: true, mode: 'slide' },
    })
  })

  it('drops a malformed vizshow field without dropping the suggestion', () => {
    const malformed = [
      { tutorialId: 'quadratic-functions', kind: 'canvas', params: {} },
      { tutorialId: 'quadratic-functions', kind: 'three', params: { nested: { a: 1 } } },
      { tutorialId: 'quadratic-functions', kind: 'three', params: [1, 2] },
      { tutorialId: 'quadratic-functions', kind: 'three' },
      { tutorialId: '', kind: 'three', params: {} },
      { tutorialId: '   ', kind: 'three', params: {} },
      { tutorialId: 'x'.repeat(65), kind: 'three', params: {} },
      { tutorialId: 42, kind: 'three', params: {} },
      { tutorialId: 'quadratic-functions', kind: 'three', params: { a: Number.NaN } },
      'quadratic-functions',
      null,
    ]
    for (const vizshow of malformed) {
      const parsed = parseSuggestion(encoder.encode(JSON.stringify({ ...suggestion, vizshow })))
      expect(parsed, JSON.stringify(vizshow)).not.toBeNull()
      expect(parsed?.suggestionId, JSON.stringify(vizshow)).toBe('sug-1')
      expect(parsed?.prompt, JSON.stringify(vizshow)).toBe(suggestion.prompt)
      expect(parsed?.vizshow, JSON.stringify(vizshow)).toBeUndefined()
    }
  })

  it('accepts a human teacher push that carries no nkey', async () => {
    const human = { ...suggestion, suggestionId: 'sug-human', from: { kind: 'human', display: 'teacher-lin' } }
    const parsed = parseSuggestion(encoder.encode(JSON.stringify(human)))
    expect(parsed?.suggestionId).toBe('sug-human')
    expect(parsed?.from).toEqual({ kind: 'human', display: 'teacher-lin' })

    const fake = fakeConnection()
    const service = serviceWith(fake)
    const seen: unknown[] = []
    service.onSuggestion((received) => seen.push(received.from))
    await service.start()
    fake.push(human)
    expect(seen).toEqual([{ kind: 'human', display: 'teacher-lin' }])
    await service.stop()
  })

  it('still accepts an nkey-sender push and still rejects malformed senders', () => {
    const agent = parseSuggestion(encoder.encode(JSON.stringify(suggestion)))
    expect(agent?.from).toEqual({ kind: 'agent', nkey: 'UAGENTEXAMPLE', ownerHandle: 'teacher' })

    const malformed = [
      { kind: 'human' },
      { kind: 'human', display: '   ' },
      { kind: 'agent' },
      { kind: 'agent', display: 'no-key' },
      { kind: 'agent', nkey: 42 },
      { kind: 'robot', nkey: 'X' },
      {},
      'human',
      null,
    ]
    for (const from of malformed) {
      expect(parseSuggestion(encoder.encode(JSON.stringify({ ...suggestion, from }))), JSON.stringify(from)).toBeNull()
    }
  })
})

describe('prompt plane wiring', () => {
  it('starts the desktop service only when VCLAW_PROMPTS is exactly 1', () => {
    expect(shouldStartPrompts({})).toBe(false)
    expect(shouldStartPrompts({ [PROMPTS_FLAG]: '' })).toBe(false)
    expect(shouldStartPrompts({ [PROMPTS_FLAG]: '0' })).toBe(false)
    expect(shouldStartPrompts({ [PROMPTS_FLAG]: 'true' })).toBe(false)
    expect(shouldStartPrompts({ [PROMPTS_FLAG]: '1' })).toBe(true)
  })

  it('reads no credentials while the flag is off', () => {
    const readFile = vi.fn((): string => {
      throw new Error('credential file must not be read while the flag is off')
    })
    expect(resolvePromptConfig({}, { readFile, home: '/home/student' })).toEqual({ ok: false, error: 'disabled' })
    expect(readFile).not.toHaveBeenCalled()
  })
})

describe('consent-gated draft requests', () => {
  it('sends nothing at all while no consent session is open', async () => {
    vi.useFakeTimers()
    const fake = fakeConnection()
    const service = serviceWith(fake)
    await service.start()

    service.setDraft({ text: '一元二次方程', locale: 'zh-CN' })
    vi.advanceTimersByTime(1_000)

    expect(requestsFor(fake, 'vizregistry.prompts.draft')).toEqual([])
    expect(service.lastDraftOutcome).toBeNull()
    await service.stop()
  })

  it('sends the draft as a Micro REQUEST to the contract endpoint, never as a publish', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', mutual: true, expiresAt: '2099-01-01T00:00:00.000Z' }))
    fake.reply('vizregistry.prompts.draft', () => ({ accepted: true, requestId: 'req-1', teachersOnline: 1 }))
    const service = serviceWith(fake, 1)
    const outcomes = draftOutcomes(service)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })
    fake.requests.length = 0

    service.setDraft({ text: '一元二次方程', locale: 'zh-CN', cursor: 6 })
    service.setDraft({ text: '一元二次方程 求解', locale: 'zh-CN' })

    await vi.waitFor(() => expect(outcomes).toHaveLength(1))
    const drafts = requestsFor(fake, 'vizregistry.prompts.draft')
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      subject: 'vizregistry.prompts.draft',
      body: { roomId: 'room-1', draft: '一元二次方程 求解', locale: 'zh-CN' },
      timeoutMs: 10_000,
    })
    expect(drafts[0].headers?.Authorization).toMatch(/^Bearer /)
    expect(outcomes).toEqual([{ state: 'sent', error: undefined, at: expect.any(String) }].map(({ state }) => expect.objectContaining({ state })))
    await service.stop()
  })

  it('stops sending the moment the session closes, before the service answers', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    fake.reply('vizregistry.prompts.draft', () => ({ accepted: true }))
    fake.reply('vizregistry.prompts.room.close', () => { throw new Error('request timeout') })
    const service = serviceWith(fake, 1)
    const outcomes = draftOutcomes(service)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })
    service.setDraft({ text: 'first' })
    await vi.waitFor(() => expect(outcomes).toHaveLength(1))

    const closed = await service.closeSession()
    expect(closed).toEqual({ ok: false, error: 'timeout' })
    service.setDraft({ text: 'after revocation' })
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(outcomes).toHaveLength(1)
    expect(fake.requests.filter((request) => request.subject === 'vizregistry.prompts.draft')).toHaveLength(1)
    expect(service.session).toBeNull()
    await service.stop()
  })

  it('refuses a draft past the 4 KiB cap as a typed state instead of dropping it', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    const service = serviceWith(fake, 1)
    const outcomes = draftOutcomes(service)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })
    fake.requests.length = 0

    service.setDraft({ text: 'x'.repeat(DRAFT_MAX_BYTES + 1) })

    await vi.waitFor(() => expect(outcomes).toHaveLength(1))
    expect(outcomes[0]).toMatchObject({ state: 'refused', error: 'too_large' })
    expect(requestsFor(fake, 'vizregistry.prompts.draft')).toEqual([])
    await service.stop()
  })

  it('surfaces rate_limited from the service instead of swallowing it', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    fake.reply('vizregistry.prompts.draft', () => ({ ok: false, code: 'rate_limited', message: 'draft budget exhausted' }))
    const service = serviceWith(fake, 1)
    const outcomes = draftOutcomes(service)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })

    service.setDraft({ text: '一元二次方程' })

    await vi.waitFor(() => expect(outcomes).toHaveLength(1))
    expect(outcomes[0]).toMatchObject({ state: 'refused', error: 'rate_limited' })
    expect(service.lastDraftOutcome).toMatchObject({ state: 'refused', error: 'rate_limited' })
    await service.stop()
  })

  it('keeps one draft request in flight and only the latest view waiting', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ roomId: 'room-1', peer: 'UTEACHER', expiresAt: '2099-01-01T00:00:00.000Z' }))
    fake.reply('vizregistry.prompts.draft', () => ({ accepted: true }))
    const slow = fake.connection.request
    const sent: string[] = []
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let held = false
    fake.connection.request = async (subject, data, options) => {
      if (subject === 'vizregistry.prompts.draft') {
        const body = JSON.parse(decoder.decode(data)) as { draft?: string }
        sent.push(String(body.draft))
        if (!held) { held = true; await gate }
      }
      return slow(subject, data, options)
    }
    const service = serviceWith(fake, 1)
    const outcomes = draftOutcomes(service)
    await service.start()
    await service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })

    service.setDraft({ text: 'v1' })
    await vi.waitFor(() => expect(sent).toEqual(['v1']))
    service.setDraft({ text: 'v2' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    service.setDraft({ text: 'v3' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(sent).toEqual(['v1'])
    release()

    await vi.waitFor(() => expect(sent).toEqual(['v1', 'v3']))
    await vi.waitFor(() => expect(outcomes).toHaveLength(2))
    await service.stop()
  })
})

describe('capability catalogue', () => {
  const manifests = [
    { id: 'quadratic-functions', kind: 'elucim', params: { a: { type: 'number', min: -10, max: 10 }, crisp: { type: 'boolean' } } },
    { id: 'vectors-3d', kind: 'three', params: { scale: { type: 'number', min: 0.1, max: 4 }, mode: { type: 'string', values: ['iso', 'top'] } } },
  ]

  it('fetches once and serves every later call from the cache', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.catalogue', () => ({ ok: true, manifests }))
    const service = serviceWith(fake)

    const first = await service.catalogue()
    const second = await service.catalogue()

    expect(first).toEqual({
      entries: [
        { tutorialId: 'quadratic-functions', kind: 'elucim', params: [{ key: 'a', type: 'number', min: -10, max: 10 }, { key: 'crisp', type: 'boolean' }] },
        { tutorialId: 'vectors-3d', kind: 'three', params: [{ key: 'scale', type: 'number', min: 0.1, max: 4 }, { key: 'mode', type: 'string', values: ['iso', 'top'] }] },
      ],
    })
    expect(second).toEqual(first)
    expect(requestsFor(fake, 'vizregistry.prompts.catalogue')).toHaveLength(1)
    await service.stop()
  })

  it('shares one in-flight fetch between concurrent callers', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.catalogue', () => ({ ok: true, manifests }))
    const service = serviceWith(fake)

    const [a, b] = await Promise.all([service.catalogue(), service.catalogue()])

    expect(a).toEqual(b)
    expect(requestsFor(fake, 'vizregistry.prompts.catalogue')).toHaveLength(1)
    await service.stop()
  })

  it('drops malformed manifests and malformed params instead of failing the fetch', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.catalogue', () => ({
      ok: true,
      manifests: [
        manifests[0],
        { id: 'no-kind', params: {} },
        { id: 'bad-kind', kind: 'hologram', params: {} },
        { kind: 'elucim', params: {} },
        { id: 'params-not-record', kind: 'elucim', params: 'nope' },
        'not a manifest',
        {
          id: 'partial-params',
          kind: 'vectorplay',
          params: {
            '': { type: 'number' },
            blank: null,
            unknown: { type: 'hologram' },
            ok: { type: 'number', min: Number.NaN },
            flag: { type: 'boolean', values: ['x', 3] },
          },
        },
      ],
    }))
    const service = serviceWith(fake)

    await expect(service.catalogue()).resolves.toEqual({
      entries: [
        { tutorialId: 'quadratic-functions', kind: 'elucim', params: [{ key: 'a', type: 'number', min: -10, max: 10 }, { key: 'crisp', type: 'boolean' }] },
        // The manifest is usable; only its unusable param record is reduced to `[]`.
        { tutorialId: 'params-not-record', kind: 'elucim', params: [] },
        { tutorialId: 'partial-params', kind: 'vectorplay', params: [{ key: 'ok', type: 'number' }, { key: 'flag', type: 'boolean', values: ['x'] }] },
      ],
    })
    await service.stop()
  })

  it('parses the real wire shape, including the shipped catalogue kinds', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.catalogue', () => ({
      ok: true,
      manifests: [
        { id: 'unit-circle', kind: 'elucim', params: { angle: { type: 'number', min: 0, max: 6.283 } } },
        { id: 'solid-geometry', kind: 'three', params: { showSphere: { type: 'boolean' }, depth: { type: 'number', min: 0, max: 1 } } },
        { id: 'vectors-3d', kind: 'vectorplay', params: {} },
        { id: 'future-kind', kind: 'canvas', params: {} },
      ],
    }))
    const service = serviceWith(fake)

    await expect(service.catalogue()).resolves.toEqual({
      entries: [
        { tutorialId: 'unit-circle', kind: 'elucim', params: [{ key: 'angle', type: 'number', min: 0, max: 6.283 }] },
        { tutorialId: 'solid-geometry', kind: 'three', params: [{ key: 'showSphere', type: 'boolean' }, { key: 'depth', type: 'number', min: 0, max: 1 }] },
        { tutorialId: 'vectors-3d', kind: 'vectorplay', params: [] },
      ],
    })
    await service.stop()
  })

  it('answers an empty list with a typed error and retries only after the backoff', async () => {
    let clock = 1_000_000
    const fake = fakeConnection()
    const service = new SuggestionsService({ connector: async () => fake.connection, config: config(), now: () => clock })

    await expect(service.catalogue()).resolves.toEqual({ entries: [], error: 'timeout' })
    expect(requestsFor(fake, 'vizregistry.prompts.catalogue')).toHaveLength(1)

    // Still inside the backoff: the answer repeats without touching the fabric.
    await expect(service.catalogue()).resolves.toEqual({ entries: [], error: 'timeout' })
    expect(requestsFor(fake, 'vizregistry.prompts.catalogue')).toHaveLength(1)

    clock += CATALOGUE_RETRY_MS
    fake.reply('vizregistry.prompts.catalogue', () => ({ ok: true, manifests }))
    await expect(service.catalogue()).resolves.toEqual({ entries: expect.arrayContaining([expect.objectContaining({ tutorialId: 'quadratic-functions' })]) })
    expect(requestsFor(fake, 'vizregistry.prompts.catalogue')).toHaveLength(2)
    await service.stop()
  })

  it('warms the cache once the service is up', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.catalogue', () => ({ ok: true, manifests }))
    const service = serviceWith(fake)
    await service.start()

    await vi.waitFor(() => expect(service).toBeDefined())
    await vi.waitFor(async () => expect(await service.catalogue()).toEqual({ entries: expect.arrayContaining([expect.objectContaining({ tutorialId: 'quadratic-functions' })]) }))
    expect(requestsFor(fake, 'vizregistry.prompts.catalogue')).toHaveLength(1)
    await service.stop()
  })
})

describe('no publish plane', () => {
  it('never publishes a draft: no publish call and no draft.* delivery subject in main', () => {
    const source = readFileSync('electron/main/suggestions-service.ts', 'utf8')
    // A raw publish has no owner (nobody subscribes from this side) and vgate grants PUB only on
    // `vizregistry.prompts.>`, so it would be denied silently while looking successful.
    expect(source).not.toMatch(/\.publish\(/)
    expect(source).not.toMatch(/prompts\.draft\./)
    const resolved = resolvePromptConfig(
      { [PROMPTS_FLAG]: '1' },
      {
        readFile: (path: string) => path.endsWith('credentials.json')
          ? JSON.stringify({ public_key: NKEY, seed: 'SUAA277DNC5JEXAMPLE' })
          : '{}',
        home: '/home/student',
      },
    )
    if (!resolved.ok) throw new Error('expected a resolved config')
    for (const subject of Object.values(resolved.config.subjects)) expect(subject).not.toMatch(/\.draft\./)
    expect(resolved.config.subjects.draft).toBe('vizregistry.prompts.draft')
  })
})

describe('request mapping', () => {
  it('turns a refusal into the typed code the UI branches on', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.feedback', () => ({ rejected: 'not_mutual' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.feedback('sug-1', 'accepted', 900)).resolves.toEqual({ ok: false, error: 'not_mutual' })
    expect(requestsFor(fake, 'vizregistry.prompts.feedback').at(-1)).toMatchObject({
      subject: 'vizregistry.prompts.feedback',
      body: { suggestionId: 'sug-1', outcome: 'accepted', ms: 900 },
      timeoutMs: 10_000,
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

  it('keys every delivery subject by the nkey from the credentials file, never by a subHmac', () => {
    const readFile = vi.fn((path: string) => {
      if (path.endsWith('credentials.json')) {
        // A sub_hmac may still be present in the file: it is a SERVER-side authorization
        // concept and must not leak into any subject this client subscribes or publishes to.
        return JSON.stringify({ public_key: NKEY, seed: 'SUAA277DNC5JEXAMPLE', sub_hmac: 'hmac-student' })
      }
      return JSON.stringify({ server: 'nats://fabric.test:4223' })
    })

    const configured = resolvePromptConfig({ [PROMPTS_FLAG]: '1' }, { readFile, home: '/home/student' })
    expect(configured.ok && configured.config.subjects).toEqual({
      suggest: `tenant.vcc.prompts.suggest.${NKEY}`,
      draft: 'vizregistry.prompts.draft',
      roomOpen: 'vizregistry.prompts.room.open',
      roomClose: 'vizregistry.prompts.room.close',
      feedback: 'vizregistry.prompts.feedback',
      catalogue: 'vizregistry.prompts.catalogue',
    })
    expect(configured.ok && configured.config.natsUrl).toBe('nats://fabric.test:4223')
    expect(configured.ok && configured.config.accessToken).toBeUndefined()
    if (!configured.ok) throw new Error('expected a resolved config')
    for (const subject of Object.values(configured.config.subjects)) expect(subject).not.toMatch(/hmac/i)

    const disabled = resolvePromptConfig({}, { readFile, home: '/home/student' })
    expect(disabled).toEqual({ ok: false, error: 'disabled' })

    const withoutIdentity = resolvePromptConfig({ [PROMPTS_FLAG]: '1' }, { readFile: () => { throw new Error('missing') }, home: '/home/student' })
    expect(withoutIdentity).toEqual({ ok: false, error: 'missing_identity' })

    const withToken = resolvePromptConfig(
      { [PROMPTS_FLAG]: '1', VCLAW_PROMPTS_ACCESS_TOKEN: 'oidc-access-token' },
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

    expect(['vizregistry.prompts.room.open', 'vizregistry.prompts.room.close', 'vizregistry.prompts.feedback']
      .flatMap((subject) => requestsFor(fake, subject))
      .map((request) => request.headers)).toEqual([
      { Authorization: 'Bearer token-1', 'X-VizMaster-Token': 'token-1' },
      { Authorization: 'Bearer token-1', 'X-VizMaster-Token': 'token-1' },
      { Authorization: 'Bearer token-1', 'X-VizMaster-Token': 'token-1' },
    ])
    expect(fake.refreshes).toBe(0)
    await service.stop()
  })

  it('builds the canonical header plus the fallback the service accepts', () => {
    expect(bearerHeaders('abc.def.ghi')).toEqual({ Authorization: 'Bearer abc.def.ghi', 'X-VizMaster-Token': 'abc.def.ghi' })
  })

  it('passes forbidden_segment through untouched instead of retrying', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.open', () => ({ ok: false, code: 'forbidden_segment', message: 'wrong segment' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.openSession({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })).resolves.toEqual({ ok: false, error: 'forbidden_segment' })
    expect(requestsFor(fake, 'vizregistry.prompts.room.open')).toHaveLength(1)
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
    const feedback = requestsFor(fake, 'vizregistry.prompts.feedback')
    expect(feedback.map((request) => request.headers?.Authorization)).toEqual([
      'Bearer stale-token',
      'Bearer fresh-token',
    ])
    expect(feedback[1]?.headers?.['X-VizMaster-Token']).toBe('fresh-token')
    await service.stop()
  })

  it('surfaces a typed unauthorized refusal after exactly one retry', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.feedback', () => ({ ok: false, code: 'unauthorized' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.feedback('sug-1', 'accepted')).resolves.toEqual({ ok: false, error: 'unauthorized' })
    expect(requestsFor(fake, 'vizregistry.prompts.feedback')).toHaveLength(2)
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
    expect(requestsFor(fake, 'vizregistry.prompts.feedback')[0]?.headers).toBeUndefined()
    await service.stop()
  })

  it('leaves a non-auth refusal unretried', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.room.close', () => ({ rejected: 'room_closed' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.closeSession('room-9')).resolves.toEqual({ ok: false, error: 'room_closed' })
    expect(requestsFor(fake, 'vizregistry.prompts.room.close')).toHaveLength(1)
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

describe('request credential', () => {
  const keypair = () => {
    const created = nkeys.createUser()
    return { publicKey: created.getPublicKey(), seed: new TextDecoder().decode(created.getSeed()) }
  }

  it('mints an assertion with the claims the verifier reads and a signature it can check', async () => {
    const { publicKey, seed } = keypair()
    const assertion = await buildNkeyAssertion({ seed, publicKey, audience: PROMPT_AUDIENCE, tool: 'prompt-collab' })

    const [header, payload] = assertion.split('.')
    expect(JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))).toEqual({ alg: 'ed25519-nkey', typ: 'JWT' })
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
    expect(claims.iss).toBe(publicKey)
    expect(claims.sub).toBe(publicKey)
    expect(claims.aud).toBe('vizmaster-registry-vcc')
    expect(claims.tool).toBe('prompt-collab')
    expect(Number(claims.exp) - Number(claims.iat)).toBeLessThanOrEqual(300)
    expect(typeof claims.jti).toBe('string')

    const signature = new Uint8Array(Buffer.from(assertion.split('.')[2], 'base64url'))
    expect(nkeys.fromPublic(publicKey).verify(new TextEncoder().encode(`${header}.${payload}`), signature)).toBe(true)
  })

  it('refuses to sign a key that is not the U-form or a ttl above the verifier ceiling', async () => {
    const { publicKey, seed } = keypair()
    await expect(buildNkeyAssertion({ seed, publicKey: publicKey.slice(2), audience: PROMPT_AUDIENCE })).rejects.toThrow(/U-form/)
    await expect(buildNkeyAssertion({ seed, publicKey, audience: PROMPT_AUDIENCE, ttlSeconds: 301 })).rejects.toThrow(/1\.\.300/)
  })

  it('prefers the self-signed assertion and falls back to the configured OIDC token', async () => {
    const { publicKey, seed } = keypair()
    const primary = await promptBearerTokenSource({ ...config(), identity: { nkey: publicKey, seed } }).token()
    expect(primary?.split('.').length).toBe(3)
    expect(decodeToken(primary ?? '').aud).toBe('vizmaster-registry-vcc')

    const fallback = await promptBearerTokenSource({ ...config(), identity: { nkey: publicKey, seed: 'SU-broken' }, accessToken: 'oidc-token' }).token()
    expect(fallback).toBe('oidc-token')

    const unsigned = await promptBearerTokenSource({ ...config(), identity: { nkey: publicKey, seed: 'SU-broken' } }).token()
    expect(unsigned).toBeNull()
  })

  it('surfaces an unbound identity as a typed refusal', async () => {
    const fake = fakeConnection()
    fake.reply('vizregistry.prompts.feedback', () => ({ ok: false, code: 'unbound', message: 'This nkey is not bound to an owner' }))
    const service = serviceWith(fake)
    await service.start()

    await expect(service.feedback('sug-1', 'accepted')).resolves.toEqual({ ok: false, error: 'unbound' })
    expect(requestsFor(fake, 'vizregistry.prompts.feedback')).toHaveLength(1)
    expect(fake.refreshes).toBe(0)
    await service.stop()
  })
})

describe('identity enrolment', () => {
  const { publicKey, seed } = (() => {
    const created = nkeys.createUser()
    return { publicKey: created.getPublicKey(), seed: new TextDecoder().decode(created.getSeed()) }
  })()

  const bound = () => new SuggestionsService({
    connector: async () => fakeConnection().connection,
    config: { ...config(), identity: { nkey: publicKey, seed }, accessToken: 'owner-oidc-token', registryUrl: 'https://registry.test' },
  })

  afterEach(() => { vi.unstubAllGlobals() })

  it('PUTs the bind assertion to the existing route with the owner token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, nkey: publicKey }), { status: 200, headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(bound().link()).resolves.toEqual({ ok: true, data: { ok: true, nkey: publicKey } })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`https://registry.test/api/me/agent-bindings/${publicKey}`)
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer owner-oidc-token')
    const body = JSON.parse(String(init.body)) as { assertion: string }
    // the bind route's field name, not the token endpoint's client_assertion (measured)
    const claims = JSON.parse(Buffer.from(body.assertion.split('.')[1], 'base64url').toString('utf8')) as Record<string, unknown>
    expect(claims.aud).toBe(PROMPT_BIND_AUDIENCE)
    expect(claims.iss).toBe(publicKey)
  })

  it('reports a refusal code instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'forbidden_segment', message: 'wrong segment' }), { status: 403 })))
    await expect(bound().link()).resolves.toEqual({ ok: false, error: 'forbidden_segment' })

    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    await expect(bound().link()).resolves.toEqual({ ok: false, error: 'http_500' })

    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    await expect(bound().link()).resolves.toEqual({ ok: false, error: 'unreachable' })
  })

  it('answers typed codes when the enrolment cannot even be attempted', async () => {
    const noToken = new SuggestionsService({ connector: async () => fakeConnection().connection, config: { ...config(), identity: { nkey: publicKey, seed }, registryUrl: 'https://registry.test' } })
    await expect(noToken.link()).resolves.toEqual({ ok: false, error: 'no_access_token' })

    const noRegistry = new SuggestionsService({ connector: async () => fakeConnection().connection, config: { ...config(), identity: { nkey: publicKey, seed }, accessToken: 'owner-oidc-token' } })
    await expect(noRegistry.link()).resolves.toEqual({ ok: false, error: 'unconfigured' })
  })
})
