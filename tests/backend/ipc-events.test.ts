import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  app: {},
  ipcMain: {
    removeHandler: vi.fn(),
    handle: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  shell: { openExternal: vi.fn(), showItemInFolder: vi.fn() },
}))

vi.mock('electron', () => electronMocks)

import { registerIpc } from '../../electron/main/ipc'
import type { VclawInboxService } from '../../electron/main/inbox-service'
import type { PromptSuggestionInvokeResult, VclawInboxSnapshot } from '../../src/types/api'


/**
 * Every member `registerIpc` requires, with stub values. Annotating a fixture with this is the
 * point: adding a required member to `Services` then fails TYPECHECK here, at construction, in every
 * suite — instead of a TypeError at the first call site (measured 2026-10-31: three suites went red
 * with `services.inbox` undefined because the fixtures were `Record<string, unknown>`).
 * Extra fixture-only keys stay legal through the index signature.
 */
type RegisterIpcServices = Parameters<typeof registerIpc>[0]
type ServiceFixtures = { [Key in keyof RegisterIpcServices]: unknown } & Record<string, unknown>

/** Members these suites never exercise. Spreading them lets a fixture satisfy `Services` completely
 *  without listing a dozen spies, so a NEW required member still fails typecheck at construction. */
type UnrelatedServices = Pick<ServiceFixtures, 'refreshHarnesses' | 'popupApplicationMenu' | 'setTitleBarTheme' | 'checkouts' | 'providerSetup' | 'providers' | 'updates' | 'cuaDriver' | 'heartbeats' | 'voice' | 'pets'>
function unrelatedServices(): UnrelatedServices {
  return serviceStub() as UnrelatedServices
}

function serviceStub(): Record<string, unknown> {
  return new Proxy({}, { get: () => vi.fn(async () => undefined) })
}

// `Services.inbox` is REQUIRED, and these suites exercise other channels. The stub provides
// exactly what `registerIpc` touches: a snapshot, and a subscription that returns an
// unsubscribe. Ownership rule: a required service arrives with the fixtures that construct it.
function inboxStub(): Pick<VclawInboxService, 'snapshot' | 'onSnapshot'> {
  // Typed, not inferred: `state` widens to `string` otherwise, which is exactly the drift a
  // narrowed view is meant to stop.
  const snapshot: VclawInboxSnapshot = { state: 'unavailable', spoolPath: '', messages: [], lastSeq: 0, unread: 0, sessionOpen: false, observedAt: '1970-01-01T00:00:00.000Z' }
  return { snapshot: vi.fn(() => snapshot), onSnapshot: vi.fn(() => () => undefined) }
}

function harnessStub(): Record<string, unknown> {
  return {
    projects: { ...serviceStub(), authorizePath: vi.fn(async () => { throw new Error('denied') }) },
    sessions: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined), requireSessionPath: vi.fn(async () => { throw new Error('denied') }) },
    agents: { ...serviceStub(), has: vi.fn(() => false) },
    catalog: serviceStub(),
  }
}

describe('app:reveal-path authorization', () => {
  const expectedUrl = 'prime-work://app/'

  function revealHarness(overrides: { projects?: unknown; sessions?: unknown; plugins?: unknown }) {
    const services = {
      ...unrelatedServices(),
      meta: {},
      projects: overrides.projects ?? serviceStub(),
      sessions: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()), ...(overrides.sessions as object | undefined) },
      agents: serviceStub(),
      terminals: serviceStub(),
      git: serviceStub(),
      plugins: overrides.plugins ?? serviceStub(),
      settings: serviceStub(),
      heartbeats: serviceStub(),
      schedules: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()) },
      browser: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()), onPointer: vi.fn(() => vi.fn()), onActivity: vi.fn(() => vi.fn()) },
      omp: harnessStub(),
      inbox: inboxStub(),
      pi: harnessStub(),
    } satisfies ServiceFixtures
    electronMocks.ipcMain.handle.mockClear()
    electronMocks.shell.showItemInFolder.mockClear()
    const registration = registerIpc(services as never, expectedUrl)
    const sender = {
      id: 11,
      getURL: () => expectedUrl,
      mainFrame: { url: expectedUrl },
      isDestroyed: () => false,
    }
    registration.authorize(sender as never)
    const handler = electronMocks.ipcMain.handle.mock.calls.find(([channel]) => channel === 'app:reveal-path')?.[1] as
      (event: unknown, path: unknown) => Promise<boolean>
    const invoke = (path: unknown) => handler({ sender, senderFrame: sender.mainFrame }, path)
    return { invoke, registration }
  }

  it('reveals a path through the first authorization domain that accepts it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-'))
    try {
      const deny = async () => { throw new Error('not a project path') }
      const { invoke, registration } = revealHarness({
        projects: { ...serviceStub(), authorizePath: vi.fn(deny) },
        sessions: { requireSessionPath: vi.fn(async () => dir) },
      })
      await expect(invoke(dir)).resolves.toBe(true)
      expect(electronMocks.shell.showItemInFolder).toHaveBeenCalledWith(dir)
      registration.dispose()
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('returns false without revealing when every authorization domain denies', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-denied-'))
    try {
      const deny = () => { throw new Error('denied') }
      const { invoke, registration } = revealHarness({
        projects: { ...serviceStub(), authorizePath: vi.fn(async () => deny()) },
        sessions: { requireSessionPath: vi.fn(async () => deny()) },
        plugins: { ...serviceStub(), authorizeReveal: vi.fn(deny) },
      })
      await expect(invoke(dir)).resolves.toBe(false)
      await expect(invoke(join(dir, 'missing.txt'))).resolves.toBe(false)
      expect(electronMocks.shell.showItemInFolder).not.toHaveBeenCalled()
      registration.dispose()
    } finally { rmSync(dir, { recursive: true, force: true }) }
  })

  it('warns instead of swallowing an unexpected reveal failure', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-error-'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const { invoke, registration } = revealHarness({
        projects: { ...serviceStub(), authorizePath: vi.fn(async () => dir) },
      })
      electronMocks.shell.showItemInFolder.mockImplementationOnce(() => { throw new Error('shell unavailable') })
      await expect(invoke(dir)).resolves.toBe(false)
      expect(warn).toHaveBeenCalledWith('Rejected app:reveal-path:', 'shell unavailable')
      registration.dispose()
    } finally {
      warn.mockRestore()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('session change IPC', () => {
  it('broadcasts only to still-trusted authorized renderers and unsubscribes on disposal', () => {
    let notify: ((event: { filePath?: string }) => void) | undefined
    const unsubscribe = vi.fn()
    const sessions = {
      ...serviceStub(),
      onDidChange: vi.fn((listener: (event: { filePath?: string }) => void) => {
        notify = listener
        return unsubscribe
      }),
    }
    const services = {
      ...unrelatedServices(),
      meta: {},
      projects: serviceStub(),
      sessions,
      agents: serviceStub(),
      terminals: serviceStub(),
      git: serviceStub(),
      plugins: serviceStub(),
      settings: serviceStub(),
      schedules: serviceStub(),
      browser: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()), onPointer: vi.fn(() => vi.fn()), onActivity: vi.fn(() => vi.fn()) },
      omp: harnessStub(),
      inbox: inboxStub(),
      pi: harnessStub(),
    } satisfies ServiceFixtures
    const expectedUrl = 'prime-work://app/'
    const trusted = {
      id: 1,
      getURL: () => expectedUrl,
      mainFrame: { url: expectedUrl },
      isDestroyed: () => false,
      send: vi.fn(),
    }
    let navigatedUrl = expectedUrl
    const navigated = {
      id: 2,
      getURL: () => navigatedUrl,
      mainFrame: { get url() { return navigatedUrl } },
      isDestroyed: () => false,
      send: vi.fn(),
    }
    const unauthorized = {
      id: 3,
      getURL: () => expectedUrl,
      mainFrame: { url: expectedUrl },
      isDestroyed: () => false,
      send: vi.fn(),
    }

    const registration = registerIpc(services as never, expectedUrl)
    registration.authorize(trusted as never)
    registration.authorize(navigated as never)
    navigatedUrl = 'https://example.com/'
    notify?.({ filePath: '/tmp/session.jsonl' })

    expect(trusted.send).toHaveBeenCalledWith('sessions:changed', { filePath: '/tmp/session.jsonl' })
    expect(navigated.send).not.toHaveBeenCalled()
    expect(unauthorized.send).not.toHaveBeenCalled()

    registration.revoke(trusted.id)
    notify?.({})
    expect(trusted.send).toHaveBeenCalledTimes(1)

    registration.dispose()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    notify?.({ filePath: '/tmp/later.jsonl' })
    expect(trusted.send).toHaveBeenCalledTimes(1)
  })
})

describe('shell-facing app handlers', () => {
  const expectedUrl = 'prime-work://app/'
  const dirs: string[] = []
  let handlers: Map<string, (event: unknown, ...args: unknown[]) => unknown>
  let sender: { id: number; isDestroyed: () => boolean; getURL: () => string; mainFrame: { url: string } }
  let event: { sender: typeof sender; senderFrame: { url: string } }

  function register(overrides: Record<string, unknown> = {}) {
    handlers = new Map()
    electronMocks.ipcMain.handle.mockImplementation((channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
      handlers.set(channel, listener)
    })
    const services = {
      ...unrelatedServices(),
      meta: {},
      projects: serviceStub(),
      sessions: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined) },
      agents: serviceStub(),
      terminals: serviceStub(),
      git: serviceStub(),
      plugins: serviceStub(),
      settings: serviceStub(),
      schedules: serviceStub(),
      browser: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()), onPointer: vi.fn(() => vi.fn()), onActivity: vi.fn(() => vi.fn()) },
      omp: harnessStub(),
      inbox: inboxStub(),
      pi: harnessStub(),
      ...overrides,
    } satisfies ServiceFixtures
    const registration = registerIpc(services as never, expectedUrl)
    registration.authorize(sender as never)
    return registration
  }

  beforeEach(() => {
    const mainFrame = { url: expectedUrl }
    sender = { id: 11, isDestroyed: () => false, getURL: () => expectedUrl, mainFrame }
    event = { sender, senderFrame: mainFrame }
    electronMocks.shell.openExternal.mockReset()
    electronMocks.shell.showItemInFolder.mockReset()
    electronMocks.ipcMain.handle.mockReset()
  })

  afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })

  it('opens validated web and mailto URLs through the shell', async () => {
    const registration = register()
    electronMocks.shell.openExternal.mockResolvedValue(undefined)
    await expect(handlers.get('app:open-external')!(event, 'https://example.com')).resolves.toBe(true)
    expect(electronMocks.shell.openExternal).toHaveBeenCalledWith('https://example.com/', { activate: true })
    await expect(handlers.get('app:open-external')!(event, 'mailto:team@example.com')).resolves.toBe(true)
    expect(electronMocks.shell.openExternal).toHaveBeenCalledWith('mailto:team@example.com', { activate: true })
    registration.dispose()
  })

  it('refuses disallowed URLs without ever reaching the shell', async () => {
    const registration = register()
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'https://user:pass@example.com/', 42, `https://example.com/${'a'.repeat(8192)}`]) {
      await expect(handlers.get('app:open-external')!(event, url), String(url)).resolves.toBe(false)
    }
    expect(electronMocks.shell.openExternal).not.toHaveBeenCalled()
    registration.dispose()
  })

  it('reports failure when the shell itself rejects the launch', async () => {
    const registration = register()
    electronMocks.shell.openExternal.mockRejectedValue(new Error('no handler'))
    await expect(handlers.get('app:open-external')!(event, 'https://example.com')).resolves.toBe(false)
    expect(electronMocks.shell.openExternal).toHaveBeenCalledTimes(1)
    registration.dispose()
  })

  it('reveals a path only after project authorization succeeds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-')); dirs.push(dir)
    const file = join(dir, 'file.txt'); writeFileSync(file, 'data')
    const canonical = await realpath(file)
    const authorizePath = vi.fn(async (path: string) => path)
    const registration = register({ projects: { ...serviceStub(), authorizePath } })
    await expect(handlers.get('app:reveal-path')!(event, file)).resolves.toBe(true)
    expect(authorizePath).toHaveBeenCalledWith(canonical)
    expect(electronMocks.shell.showItemInFolder).toHaveBeenCalledWith(canonical)
    registration.dispose()
  })

  it('falls back to session and then plugin authorization in order', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-')); dirs.push(dir)
    const file = join(dir, 'file.txt'); writeFileSync(file, 'data')
    const canonical = await realpath(file)
    const authorizePath = vi.fn(async () => { throw new Error('outside projects') })
    const requireSessionPath = vi.fn(async () => { throw new Error('not a session file') })
    const authorizeReveal = vi.fn(() => canonical)
    const registration = register({
      projects: { ...serviceStub(), authorizePath },
      sessions: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined), requireSessionPath },
      plugins: { ...serviceStub(), authorizeReveal },
    })
    await expect(handlers.get('app:reveal-path')!(event, file)).resolves.toBe(true)
    expect(requireSessionPath).toHaveBeenCalledWith(canonical)
    expect(authorizeReveal).toHaveBeenCalledWith(canonical)
    expect(electronMocks.shell.showItemInFolder).toHaveBeenCalledWith(canonical)
    registration.dispose()
  })

  it('denies reveal when every authorizer refuses the path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-')); dirs.push(dir)
    const file = join(dir, 'file.txt'); writeFileSync(file, 'data')
    const registration = register({
      projects: { ...serviceStub(), authorizePath: vi.fn(async () => { throw new Error('denied') }) },
      sessions: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined), requireSessionPath: vi.fn(async () => { throw new Error('denied') }) },
      plugins: { ...serviceStub(), authorizeReveal: vi.fn(() => { throw new Error('denied') }) },
    })
    await expect(handlers.get('app:reveal-path')!(event, file)).resolves.toBe(false)
    expect(electronMocks.shell.showItemInFolder).not.toHaveBeenCalled()
    registration.dispose()
  })

  it('denies reveal for nonexistent or relative paths before consulting authorizers', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'prime-work-reveal-')); dirs.push(dir)
    const authorizePath = vi.fn(async (path: string) => path)
    const registration = register({ projects: { ...serviceStub(), authorizePath } })
    await expect(handlers.get('app:reveal-path')!(event, join(dir, 'missing.txt'))).resolves.toBe(false)
    await expect(handlers.get('app:reveal-path')!(event, 'relative/path.txt')).resolves.toBe(false)
    await expect(handlers.get('app:reveal-path')!(event, 42)).resolves.toBe(false)
    expect(authorizePath).not.toHaveBeenCalled()
    expect(electronMocks.shell.showItemInFolder).not.toHaveBeenCalled()
    registration.dispose()
  })
})

describe('IPC registration lifecycle', () => {
  function servicesWithUnsubscribe(unsubscribe: () => void) {
    return {
      ...unrelatedServices(),
      meta: {},
      projects: serviceStub(),
      sessions: { ...serviceStub(), onDidChange: vi.fn(() => unsubscribe) },
      agents: serviceStub(),
      terminals: serviceStub(),
      git: serviceStub(),
      plugins: serviceStub(),
      settings: serviceStub(),
      schedules: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()) },
      browser: { ...serviceStub(), onDidChange: vi.fn(() => vi.fn()), onPointer: vi.fn(() => vi.fn()), onActivity: vi.fn(() => vi.fn()) },
      omp: harnessStub(),
      inbox: inboxStub(),
      pi: harnessStub(),
    } satisfies ServiceFixtures
  }

  it('removes any prior listener before registering event channels', () => {
    electronMocks.ipcMain.on.mockClear()
    electronMocks.ipcMain.removeAllListeners.mockClear()
    const registration = registerIpc(servicesWithUnsubscribe(vi.fn()) as never, 'prime-work://app/')

    const eventChannels = electronMocks.ipcMain.on.mock.calls.map(([channel]) => channel)
    expect(eventChannels.length).toBeGreaterThan(0)
    const removed = electronMocks.ipcMain.removeAllListeners.mock.calls.map(([channel]) => channel)
    for (const channel of eventChannels) expect(removed).toContain(channel)

    registration.dispose()
  })

  it('warns and disposes a previous registration when registerIpc is called again', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const firstUnsubscribe = vi.fn()
    const first = registerIpc(servicesWithUnsubscribe(firstUnsubscribe) as never, 'prime-work://app/')
    expect(firstUnsubscribe).not.toHaveBeenCalled()

    const second = registerIpc(servicesWithUnsubscribe(vi.fn()) as never, 'prime-work://app/')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('previous registration'))
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1)

    // Disposing the stale handle again is a no-op.
    first.dispose()
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1)
    second.dispose()
    warn.mockRestore()
  })
})

describe('prompt suggestion IPC', () => {
  const expectedUrl = 'prime-work://app/'
  type Suggestion = Parameters<Parameters<NonNullable<Parameters<typeof registerIpc>[0]['suggestions']>['onSuggestion']>[0]>[0]
  type DraftOutcome = { state: 'sent' | 'refused'; error?: string; at: string }

  function suggestionsStub() {
    let notify: ((suggestion: Suggestion) => void) | null = null
    let notifyDraft: ((outcome: DraftOutcome) => void) | null = null
    const unsubscribe = vi.fn()
    const unsubscribeDraft = vi.fn()
    return {
      push: (suggestion: Suggestion) => notify?.(suggestion),
      unsubscribe,
      onSuggestion: vi.fn((listener: (suggestion: Suggestion) => void) => { notify = listener; return unsubscribe }),
      pushDraft: (outcome: DraftOutcome) => notifyDraft?.(outcome),
      unsubscribeDraft,
      onDraftOutcome: vi.fn((listener: (outcome: DraftOutcome) => void) => { notifyDraft = listener; return unsubscribeDraft }),
      setDraft: vi.fn(),
      openSession: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: true, data: { roomId: 'room-1', peer: 'UTEACHER' } })),
      closeSession: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: true, data: { closed: true } })),
      feedback: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: true, data: { ok: true } })),
      link: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: true, data: { ok: true, bound: true } })),
      catalogue: vi.fn(async () => ({ entries: [{ tutorialId: 'quadratic-functions', kind: 'elucim', params: [{ key: 'a', type: 'number', min: -10, max: 10 }] }] })),
    }
  }

  function register(suggestions?: ReturnType<typeof suggestionsStub>) {
    const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
    const listeners = new Map<string, (event: unknown, ...args: unknown[]) => void>()
    electronMocks.ipcMain.handle.mockImplementation((channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
      handlers.set(channel, listener)
    })
    electronMocks.ipcMain.on.mockImplementation((channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
      listeners.set(channel, listener)
    })
    const services = {
      ...unrelatedServices(),
      meta: {},
      projects: serviceStub(),
      sessions: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined) },
      agents: serviceStub(),
      terminals: serviceStub(),
      git: serviceStub(),
      plugins: serviceStub(),
      settings: serviceStub(),
      schedules: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined) },
      browser: { ...serviceStub(), onDidChange: vi.fn(() => () => undefined), onPointer: vi.fn(() => () => undefined), onActivity: vi.fn(() => () => undefined) },
      omp: harnessStub(),
      inbox: inboxStub(),
      pi: harnessStub(),
      ...(suggestions ? { suggestions } : {}),
    } satisfies ServiceFixtures
    const registration = registerIpc(services as never, expectedUrl)
    const trusted = { id: 1, getURL: () => expectedUrl, mainFrame: { url: expectedUrl }, isDestroyed: () => false, send: vi.fn() }
    let navigatedUrl = expectedUrl
    const navigated = { id: 2, getURL: () => expectedUrl, mainFrame: { get url() { return navigatedUrl } }, isDestroyed: () => false, send: vi.fn() }
    registration.authorize(trusted as never)
    registration.authorize(navigated as never)
    navigatedUrl = 'https://example.com/'
    const event = { sender: trusted, senderFrame: trusted.mainFrame }
    const consent = (request: unknown) => Promise.resolve(handlers.get('vclaw-suggestions:consent')!(event, request))
    const link = () => Promise.resolve(handlers.get('vclaw-suggestions:link')!(event))
    const catalogue = () => Promise.resolve(handlers.get('vclaw-suggestions:catalogue')!(event))
    const feedback = (suggestionId: unknown, outcome: unknown, ms?: unknown) => Promise.resolve(handlers.get('vclaw-suggestions:feedback')!(event, suggestionId, outcome, ms))
    return { registration, trusted, navigated, handlers, listeners, event, consent, feedback, link, catalogue }
  }

  const pushed = {
    suggestionId: 'sug-1',
    roomId: 'room-1',
    requestId: 'req-1',
    prompt: '一元二次方程',
    from: { kind: 'agent' as const, nkey: 'UAGENT' },
  }

  it('forwards a pushed suggestion to trusted renderers only and unsubscribes on dispose', () => {
    const suggestions = suggestionsStub()
    const { registration, trusted, navigated, handlers } = register(suggestions)
    expect(suggestions.onSuggestion).toHaveBeenCalledTimes(1)

    suggestions.push(pushed)
    expect(trusted.send).toHaveBeenCalledWith('vclaw-suggestions:changed', pushed)
    expect(navigated.send).not.toHaveBeenCalled()
    expect(handlers.has('vclaw-suggestions:consent')).toBe(true)
    expect(handlers.has('vclaw-suggestions:feedback')).toBe(true)

    registration.dispose()
    expect(suggestions.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('forwards a refused draft to trusted renderers and unsubscribes on dispose', () => {
    const suggestions = suggestionsStub()
    const { registration, trusted, navigated } = register(suggestions)
    expect(suggestions.onDraftOutcome).toHaveBeenCalledTimes(1)

    suggestions.pushDraft({ state: 'refused', error: 'rate_limited', at: '2026-11-06T00:00:00.000Z' })
    expect(trusted.send).toHaveBeenCalledWith('vclaw-suggestions:draft-state', { state: 'refused', error: 'rate_limited', at: '2026-11-06T00:00:00.000Z' })
    expect(navigated.send).not.toHaveBeenCalled()

    registration.dispose()
    expect(suggestions.unsubscribeDraft).toHaveBeenCalledTimes(1)
  })

  it('answers disabled for every verb when the flag kept the service off', async () => {
    const { registration, consent, feedback, listeners, event } = register()
    await expect(consent({ action: 'open', peer: 'U', conversationId: 'c' })).resolves.toEqual({ ok: false, error: 'disabled' })
    await expect(feedback('sug-1', 'accepted')).resolves.toEqual({ ok: false, error: 'disabled' })
    const draft = listeners.get('vclaw-suggestions:draft')
    expect(draft).toBeTypeOf('function')
    expect(() => draft!(event, { text: 'draft' })).not.toThrow()
    registration.dispose()
  })

  it('validates the consent verb before it reaches the fabric', async () => {
    const suggestions = suggestionsStub()
    const { registration, consent } = register(suggestions)

    await expect(consent({ action: 'open', peer: '  ', conversationId: 'c' })).resolves.toEqual({ ok: false, error: 'invalid_payload' })
    await expect(consent({ action: 'open', peer: 'UTEACHER', conversationId: '' })).resolves.toEqual({ ok: false, error: 'invalid_payload' })
    await expect(consent({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1', ttlS: 60 })).resolves.toEqual({ ok: true, data: { roomId: 'room-1', peer: 'UTEACHER' } })
    expect(suggestions.openSession).toHaveBeenCalledWith({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1', ttlS: 60 })
    await expect(consent({ action: 'close' })).resolves.toEqual({ ok: true, data: { closed: true } })
    expect(suggestions.closeSession).toHaveBeenCalledWith(undefined)
    await expect(consent({ action: 'nope' })).resolves.toEqual({ ok: false, error: 'unknown_action' })
    registration.dispose()
  })

  it('maps feedback outcomes and refuses an outcome outside the lifecycle', async () => {
    const suggestions = suggestionsStub()
    const { registration, feedback } = register(suggestions)

    await expect(feedback('sug-1', 'accepted', 1200)).resolves.toEqual({ ok: true, data: { ok: true } })
    expect(suggestions.feedback).toHaveBeenCalledWith('sug-1', 'accepted', 1200)
    await expect(feedback('sug-2', 'archived')).resolves.toEqual({ ok: false, error: 'invalid_payload' })
    await expect(feedback('', 'rejected')).resolves.toEqual({ ok: false, error: 'invalid_payload' })
    expect(suggestions.feedback).toHaveBeenCalledTimes(1)
    registration.dispose()
  })

  it('serves the cached catalogue and answers disabled without the service', async () => {
    const off = register()
    expect(off.handlers.has('vclaw-suggestions:catalogue')).toBe(true)
    await expect(off.catalogue()).resolves.toEqual({ entries: [], error: 'disabled' })
    off.registration.dispose()

    const suggestions = suggestionsStub()
    const on = register(suggestions)
    await expect(on.catalogue()).resolves.toEqual({
      entries: [{ tutorialId: 'quadratic-functions', kind: 'elucim', params: [{ key: 'a', type: 'number', min: -10, max: 10 }] }],
    })
    expect(suggestions.catalogue).toHaveBeenCalledTimes(1)
    on.registration.dispose()
  })

  it('exposes the one-time enrolment and answers disabled without the service', async () => {
    const off = register()
    expect(off.handlers.has('vclaw-suggestions:link')).toBe(true)
    await expect(off.link()).resolves.toEqual({ ok: false, error: 'disabled' })
    off.registration.dispose()

    const suggestions = suggestionsStub()
    const on = register(suggestions)
    await expect(on.link()).resolves.toEqual({ ok: true, data: { ok: true, bound: true } })
    expect(suggestions.link).toHaveBeenCalledTimes(1)
    on.registration.dispose()

    const refused = register({ ...suggestionsStub(), link: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: false, error: 'unbound' })) })
    await expect(refused.link()).resolves.toEqual({ ok: false, error: 'unbound' })
    refused.registration.dispose()
  })

  it('passes a typed unauthorized refusal straight through to the renderer', async () => {
    const suggestions = {
      ...suggestionsStub(),
      feedback: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: false, error: 'unauthorized' })),
      openSession: vi.fn(async (): Promise<PromptSuggestionInvokeResult> => ({ ok: false, error: 'unauthorized' })),
    }
    const { registration, consent, feedback } = register(suggestions)

    await expect(feedback('sug-1', 'accepted')).resolves.toEqual({ ok: false, error: 'unauthorized' })
    await expect(consent({ action: 'open', peer: 'UTEACHER', conversationId: 'conv-1' })).resolves.toEqual({ ok: false, error: 'unauthorized' })
    registration.dispose()
  })

  it('drops a draft it cannot read and hands a valid one to the service', () => {
    const suggestions = suggestionsStub()
    const { registration, listeners, event } = register(suggestions)
    const draft = listeners.get('vclaw-suggestions:draft')!

    draft(event, { text: 42 })
    draft(event, 'raw string')
    expect(suggestions.setDraft).not.toHaveBeenCalled()

    draft(event, { text: '一元二次方程', locale: 'zh-CN', cursor: 6, vizshowId: 'show-1' })
    expect(suggestions.setDraft).toHaveBeenCalledWith({ text: '一元二次方程', locale: 'zh-CN', cursor: 6, vizshowId: 'show-1' })
    registration.dispose()
  })
})
