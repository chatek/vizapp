import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import {
  memberProviderSetupPaths,
  mergeProviderStanza,
  ProviderSetupService,
  renderProviderStanza,
  validateModelIds,
  validateOwnProviderKey,
  validateVclawLlmKey,
  VCLAW_LLM_STANZA_SPEC,
  type ProviderStanza,
} from '../../electron/main/provider-setup'
import { readFile, readdir } from 'node:fs/promises'

const KEY_STORE_SK_SECRET = 'sk-live-unit-test-abc123'

function tempHome(): { home: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), 'provider-setup-'))
  return { home, cleanup: () => rmSync(home, { recursive: true, force: true }) }
}

function service(home: string, options: ConstructorParameters<typeof ProviderSetupService>[1] = {}): ProviderSetupService {
  const paths = memberProviderSetupPaths(home, '.vizmaster', '.vizmaster')!
  return new ProviderSetupService(paths, options)
}

let cleanupFns: Array<() => void> = []

beforeEach(() => { cleanupFns = [] })
afterEach(() => { for (const fn of cleanupFns.splice(0)) fn() })

describe('member provider setup path gating', () => {
  it('returns null for the generic app (profile vclaw)', () => {
    expect(memberProviderSetupPaths('/home/x', '.omp', null)).toBeNull()
  })

  it('resolves the isolated member dirs', () => {
    expect(memberProviderSetupPaths('/home/x', '.vizmaster', '.vizmaster')).toEqual({
      agentDir: join('/home/x', '.vizmaster', 'agent'),
      keyStoreDir: join('/home/x', '.vizmaster', 'config', 'provider-keys'),
    })
  })
})

describe('stanza rendering and merge semantics', () => {
  const stanza: ProviderStanza = {
    id: 'vclaw',
    baseUrl: 'https://llm.vclawhub.com/v1',
    api: 'openai-completions',
    keyCommand: '!cat /keys/vclaw.key',
    models: [{ id: 'deepseek/deepseek-flash', name: 'Vizmaster Door', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 8192 }],
  }

  it('renders the agent-sdk two-space stanza shape', () => {
    expect(renderProviderStanza(stanza)).toBe([
      '  vclaw:',
      '    baseUrl: https://llm.vclawhub.com/v1',
      '    api: openai-completions',
      '    apiKey: "!cat /keys/vclaw.key"',
      '    models:',
      '      - id: deepseek/deepseek-flash',
      '        name: Vizmaster Door',
      '        api: openai-completions',
      '        reasoning: true',
      '        input: [text]',
      '        contextWindow: 1048576',
      '        maxTokens: 8192',
    ].join('\n'))
  })

  it('creates the providers root when the file is empty', () => {
    const merged = mergeProviderStanza('', stanza)
    expect(merged.startsWith('providers:\n  vclaw:')).toBe(true)
  })

  it('inserts under an existing providers root and preserves siblings', () => {
    const existing = ['providers:', '  deepseek:', '    baseUrl: https://api.deepseek.com', '    api: openai-completions', '    apiKey: "!cat /k/d.key"', '    models:', '      - id: deepseek-chat', '        api: openai-completions'].join('\n')
    const merged = mergeProviderStanza(existing, stanza)
    expect(merged).toContain('  deepseek:\n    baseUrl: https://api.deepseek.com')
    expect(merged).toContain('  vclaw:\n    baseUrl: https://llm.vclawhub.com/v1')
    // The new stanza is inserted directly under `providers:`, above existing siblings.
    expect(merged.startsWith('providers:\n  vclaw:\n    baseUrl: https://llm.vclawhub.com/v1')).toBe(true)
  })

  it('replaces an existing block for the same provider id and is idempotent', () => {
    const existing = `providers:\n  vclaw:\n    baseUrl: https://old.example/v1\n    api: openai-completions\n    apiKey: "!cat /old.key"\n    models:\n      - id: old-model\n        api: openai-completions\n  deepseek:\n    baseUrl: https://api.deepseek.com\n    api: openai-completions\n    apiKey: "!cat /k/d.key"\n    models:\n      - id: deepseek-chat\n        api: openai-completions`
    const once = mergeProviderStanza(existing, stanza)
    const twice = mergeProviderStanza(once, stanza)
    expect(twice).toBe(once)
    expect(once).not.toContain('old.example')
    expect(once).toContain('  deepseek:\n    baseUrl: https://api.deepseek.com')
  })
})

describe('option 1 — Vizmaster LLM', () => {
  it('writes the door stanza, the 0600 key file, and never a plaintext key in models.yml', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const result = await service(home).setupVclawLlm(KEY_STORE_SK_SECRET)

    const yml = readFileSync(result.modelsYmlPath, 'utf-8')
    expect(yml).toContain('  vclaw:\n    baseUrl: https://llm.vclawhub.com/v1\n    api: openai-completions\n    apiKey: "!cat ')
    expect(yml).not.toContain(KEY_STORE_SK_SECRET)
    expect(yml).toContain('- id: deepseek/deepseek-flash')
    expect(yml).toContain('- id: glm/glm-5.3-flash')

    expect(result.keyPath.endsWith('vclaw.key')).toBe(true)
    expect(readFileSync(result.keyPath, 'utf-8').trim()).toBe(KEY_STORE_SK_SECRET)
    const mode = statSync(result.keyPath).mode & 0o777
    expect(mode & 0o077).toBe(0)
    expect(result.modelKeys).toEqual(['vclaw/deepseek/deepseek-flash', 'vclaw/glm/glm-5.3-flash'])
  })

  it('marks the door model ids provisional', () => {
    expect(VCLAW_LLM_STANZA_SPEC.models.every((model) => model.name?.toLowerCase().includes('provisional'))).toBe(true)
  })

  it('rejects keys that are not sk- tokens', () => {
    expect(() => validateVclawLlmKey('')).toThrow(/sk-/)
    expect(() => validateVclawLlmKey('not-a-key')).toThrow(/sk-/)
    expect(() => validateVclawLlmKey(`sk-${'x'.repeat(200)}`)).toThrow(/sk-/)
    expect(validateVclawLlmKey('  sk-abc12345  ')).toBe('sk-abc12345')
  })

  it('is idempotent on re-run (same stanza bytes)', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const provider = service(home)
    const first = await provider.setupVclawLlm(KEY_STORE_SK_SECRET)
    const second = await provider.setupVclawLlm('sk-rotated-token-456')
    expect(readFileSync(first.modelsYmlPath, 'utf-8')).toBe(readFileSync(second.modelsYmlPath, 'utf-8'))
    expect(readFileSync(second.keyPath, 'utf-8').trim()).toBe('sk-rotated-token-456')
  })
})

describe('option 2 — own provider families', () => {
  it('writes a family stanza with the prefilled model ids and a 0600 key', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const result = await service(home).setupOwnProvider('deepseek', 'sk-oai-test-987654321', ['deepseek-chat', 'deepseek-reasoner'])

    const yml = readFileSync(result.modelsYmlPath, 'utf-8')
    expect(yml).toContain('  deepseek:\n    baseUrl: https://api.deepseek.com\n    api: openai-completions\n    apiKey: "!cat ')
    expect(yml).toContain('- id: deepseek-chat')
    expect(yml).toContain('- id: deepseek-reasoner')
    expect(yml).not.toContain('sk-oai-test-987654321')
    expect(statSync(result.keyPath).mode & 0o077).toBe(0)
  })

  it('accepts model ids outside the prefill when the member names one', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const result = await service(home).setupOwnProvider('glm', 'zai-glm-key-12345', ['glm-9.9-preview'])
    expect(readFileSync(result.modelsYmlPath, 'utf-8')).toContain('- id: glm-9.9-preview')
    expect(result.modelKeys).toEqual(['zai/glm-9.9-preview'])
  })

  it('rejects unknown families, empty keys, and bad model ids', () => {
    expect(() => validateOwnProviderKey('')).toThrow(/8–512/)
    expect(() => validateOwnProviderKey('has space inside')).toThrow(/spaces/)
    expect(() => validateModelIds([])).toThrow(/1 and 16/)
    expect(() => validateModelIds(['bad id!'])).toThrow(/model id/)
    expect(validateModelIds(['ok-id', 'ok-id'])).toEqual(['ok-id'])
  })
})

describe('door status and usage vocabulary', () => {
  const withStubServer = async (handler: (url: string, sendStatus: (status: number, body?: string) => void) => void): Promise<void> => {
    const server: Server = createServer((request, response) => {
      const sendStatus = (status: number, body = '') => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(body) }
      handler(request.url ?? '', sendStatus)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (typeof address !== 'object' || address === null) throw new Error('stub server did not start')
    try {
      const { home, cleanup } = tempHome()
      cleanupFns.push(cleanup)
      const provider = service(home, { urls: { llmBaseUrl: `http://127.0.0.1:${address.port}/v1` } })
      await provider.setupVclawLlm(KEY_STORE_SK_SECRET)
      const result = await provider.vclawDoorStatus()
      expect(result).toEqual(expectedDoor)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }

  let expectedDoor: { connected: boolean; modelCount?: number; problem?: string }

  it('reports the model count on a 200', async () => {
    expectedDoor = { connected: true, modelCount: 2 }
    await withStubServer((url, sendStatus) => {
      if (url === '/v1/models') sendStatus(200, JSON.stringify({ data: [{ id: 'deepseek/deepseek-flash' }, { id: 'glm/glm-5.3-flash' }] }))
      else sendStatus(404)
    })
  })

  it('maps 401 to the estate vocabulary', async () => {
    expectedDoor = { connected: false, problem: 'Vizmaster key invalid or missing' }
    await withStubServer((_url, sendStatus) => sendStatus(401))
  })

  it('maps 402 to the wallet-cap message', async () => {
    expectedDoor = { connected: false, problem: 'Wallet cap or balance exhausted — check the Vizmaster usage row' }
    await withStubServer((_url, sendStatus) => sendStatus(402))
  })

  it('maps 413 to the door-limit message', async () => {
    expectedDoor = { connected: false, problem: 'Prompt too large (8 MiB door limit)' }
    await withStubServer((_url, sendStatus) => sendStatus(413))
  })

  it('maps an unreachable host to the retry message', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const provider = service(home, { urls: { llmBaseUrl: 'http://127.0.0.1:1/v1' }, requestTimeoutMs: 250 })
    await provider.setupVclawLlm(KEY_STORE_SK_SECRET)
    const result = await provider.vclawDoorStatus()
    expect(result).toEqual({ connected: false, problem: 'Vizmaster LLM is unreachable — try again shortly' })
  })

  it('says no key is stored before any setup', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const result = await service(home).vclawDoorStatus()
    expect(result).toEqual({ connected: false, problem: 'No Vizmaster API key is stored yet' })
  })
})

describe('vpay usage read (money never via the LLM host)', () => {
  it('renders usage unavailable while unauthenticated — never a zero', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    const provider = service(home)
    await provider.setupVclawLlm(KEY_STORE_SK_SECRET)
    const usage = await provider.vclawUsage()
    expect(usage.status).toBe('unavailable')
    if (usage.status === 'unavailable') expect(usage.reason).not.toMatch(/^0/)
  })

  it('reads the wallet through vpay when a principal is configured', async () => {
    const server: Server = createServer((request, response) => {
      if (request.url === '/v1/vpay/accounts/agent-xyz') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ op: 'query', ok: true, nkey: 'agent-xyz', balance: '1200000', reserved: '100000', available: '1100000', unit: 'tiko' }))
        return
      }
      response.writeHead(404)
      response.end()
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const address = server.address()
      if (typeof address !== 'object' || address === null) throw new Error('stub server did not start')
      const { home, cleanup } = tempHome()
      cleanupFns.push(cleanup)
      const provider = service(home, { urls: { vpayBaseUrl: `http://127.0.0.1:${address.port}` }, vpayPrincipal: 'agent-xyz' })
      await provider.setupVclawLlm(KEY_STORE_SK_SECRET)
      const usage = await provider.vclawUsage()
      expect(usage).toEqual({ status: 'ok', balance: '1200000', reserved: '100000', available: '1100000', unit: 'tiko' })
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

describe('credential boundary (docs/VCLAW_LLM.md ground rule 2)', () => {
  it('never reads the member identity credentials file', async () => {
    const { home, cleanup } = tempHome()
    cleanupFns.push(cleanup)
    // Plant a canary credentials.json where the identity store would live.
    const configDir = join(home, '.vizmaster', 'config')
    mkdirSync(configDir, { recursive: true })
    writeFileSync(join(configDir, 'credentials.json'), JSON.stringify({ seed: 'CANARY' }))
    const provider = service(home)
    await provider.setupVclawLlm(KEY_STORE_SK_SECRET)
    await provider.vclawDoorStatus()
    await provider.vclawUsage()
    // The canary is untouched and the key store contains only provider keys.
    expect(readFileSync(join(configDir, 'credentials.json'), 'utf-8')).toContain('CANARY')
    expect(await readdir(join(configDir, 'provider-keys'))).toEqual(['vclaw.key'])
  })

  it('keeps the provider-setup module free of identity-credential reads (grep-level)', async () => {
    const source = await readFile(new URL('../../electron/main/provider-setup.ts', import.meta.url), 'utf-8')
    // Strip comment lines first: the module's header comment NAMES the boundary it must keep.
    const code = source.split('\n').filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*')).join('\n')
    expect(code).not.toMatch(/credentials\.json/)
    expect(code).not.toMatch(/vclawCredentialsPath/)
    expect(code).not.toMatch(/loadCredentials/)
  })
})
