// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderSettings, ProvidersSettings } from '../../src/pages/settings/ProviderSettings'
import type { PrimeModelCatalog, PrimeWorkApi, ProviderSetupOptions, VclawDoorStatus, VclawUsageStatus } from '../../src/types/api'

vi.mock('../../src/components/ui', () => ({
  Modal: ({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) => <div role="dialog" aria-label={title}>{children}{footer}</div>,
}))

const catalog: PrimeModelCatalog = {
  primeVersion: '0.7.0',
  refreshedAt: '2026-11-05T00:00:00.000Z',
  models: [],
  providers: [],
}

const options: ProviderSetupOptions = {
  families: [
    { id: 'glm', label: 'GLM (Z.ai / BigModel)', description: 'Zhipu GLM models through the BigModel coding endpoint.', providerId: 'zai', baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4', api: 'openai-completions', defaultModelIds: ['glm-5.2', 'glm-5.3'] },
    { id: 'deepseek', label: 'DeepSeek', description: 'DeepSeek chat and reasoner models.', providerId: 'deepseek', baseUrl: 'https://api.deepseek.com', api: 'openai-completions', defaultModelIds: ['deepseek-chat'] },
    { id: 'claude', label: 'Claude (Anthropic)', description: 'Anthropic Claude models through the Messages API.', providerId: 'anthropic', baseUrl: 'https://api.anthropic.com', api: 'anthropic-messages', defaultModelIds: ['claude-sonnet-5'] },
    { id: 'gpt', label: 'GPT (OpenAI)', description: 'OpenAI GPT models through the Responses API.', providerId: 'openai', baseUrl: 'https://api.openai.com/v1', api: 'openai-responses', defaultModelIds: ['gpt-5.5'] },
    { id: 'mistral', label: 'Mistral', description: 'Mistral models through the OpenAI-compatible endpoint.', providerId: 'mistral', baseUrl: 'https://api.mistral.ai/v1', api: 'openai-completions', defaultModelIds: ['mistral-large-4'] },
    { id: 'kimi', label: 'Kimi (Moonshot)', description: 'Moonshot Kimi models through the OpenAI-compatible endpoint.', providerId: 'moonshot', baseUrl: 'https://api.moonshot.ai/v1', api: 'openai-completions', defaultModelIds: ['kimi-k2.7-code'] },
  ],
  vclawLlm: { baseUrl: 'https://llm.vclawhub.com/v1', modelIds: ['deepseek/deepseek-flash', 'glm/glm-5.3-flash'] },
}

const noop = async () => undefined
let root: Root
let container: HTMLDivElement

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

async function render(node: ReactNode) {
  await act(async () => { root.render(node) })
}

function button(label: string): HTMLButtonElement {
  const match = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(label))
  if (!match) throw new Error(`Button not found: ${label}`)
  return match as HTMLButtonElement
}

async function click(element: HTMLElement) {
  await act(async () => { element.click() })
}

async function enter(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const setupBridge = (overrides: Partial<NonNullable<PrimeWorkApi['providerSetup']>> = {}): NonNullable<PrimeWorkApi['providerSetup']> => ({
  options: vi.fn(async () => options),
  setupVclawLlm: vi.fn(async () => ({ providerId: 'vclaw', modelsYmlPath: '/home/x/.vizmaster/agent/models.yml', keyPath: '/home/x/.vizmaster/config/provider-keys/vclaw.key', modelKeys: ['vclaw/deepseek/deepseek-flash', 'vclaw/glm/glm-5.3-flash'] })),
  setupOwnProvider: vi.fn(async () => ({ providerId: 'deepseek', modelsYmlPath: '/home/x/.vizmaster/agent/models.yml', keyPath: '/home/x/.vizmaster/config/provider-keys/deepseek.key', modelKeys: ['deepseek/deepseek-chat'] })),
  vclawStatus: vi.fn(async (): Promise<VclawDoorStatus> => ({ connected: false, problem: 'No VClaw API key is stored yet' })),
  vclawUsage: vi.fn(async (): Promise<VclawUsageStatus> => ({ status: 'unavailable', reason: 'Wallet reads need an authenticated vpay principal; the LLM key cannot read balances.' })),
  ...overrides,
})

describe('member-only provider setup gating', () => {
  it('renders the setup section for a member profile and offers both options', async () => {
    const setup = setupBridge()
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setup} memberId="vizmaster" onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)

    expect(container.querySelector('.provider-setup')).not.toBeNull()
    expect(container.textContent).toContain('VClaw LLM')
    expect(container.textContent).toContain('Other top LLMs')
    expect(container.textContent).toContain('https://llm.vclawhub.com/v1')
    // All six families are offered.
    for (const family of options.families) expect(container.textContent).toContain(family.label)
    // Usage renders unavailable honestly, never a zero.
    expect(container.textContent).toContain('Usage unavailable')
  })

  it('hides the setup section without a member profile id', async () => {
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setupBridge()} memberId={null} onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)
    expect(container.querySelector('.provider-setup')).toBeNull()
  })

  it('hides the setup section without a setup bridge (generic build)', async () => {
    await render(<ProviderSettings harness="omp" catalog={catalog} onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)
    expect(container.querySelector('.provider-setup')).toBeNull()
  })
})

describe('option 1 — VClaw LLM key entry', () => {
  it('rejects an empty key with a prompt instead of writing', async () => {
    const setup = setupBridge()
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setup} memberId="vizmaster" onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)

    await click(button('Connect VClaw LLM'))
    expect(setup.setupVclawLlm).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Paste your VClaw API key')
  })

  it('rejects a malformed key and reports the write failure of a valid one', async () => {
    const setup = setupBridge({ setupVclawLlm: vi.fn(async () => { throw new Error('provider key write failed') }) })
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setup} memberId="vizmaster" onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)

    const keyInput = container.querySelector<HTMLInputElement>('input[aria-label="VClaw API key"]')!
    await enter(keyInput, 'not-an-sk-token')
    await click(button('Connect VClaw LLM'))
    expect(setup.setupVclawLlm).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('sk-… token')

    await enter(keyInput, 'sk-member-key-12345')
    await click(button('Connect VClaw LLM'))
    expect(setup.setupVclawLlm).toHaveBeenCalledWith('sk-member-key-12345')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('provider key write failed')
  })

  it('clears the key and refreshes the catalogue on success', async () => {
    const onRefresh = vi.fn(async () => undefined)
    const setup = setupBridge()
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setup} memberId="vizmaster" onRefresh={onRefresh} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)

    const keyInput = container.querySelector<HTMLInputElement>('input[aria-label="VClaw API key"]')!
    await enter(keyInput, 'sk-member-key-12345')
    await click(button('Connect VClaw LLM'))
    expect(setup.setupVclawLlm).toHaveBeenCalledWith('sk-member-key-12345')
    expect(onRefresh).toHaveBeenCalled()
    expect(keyInput.value).toBe('')
    expect(container.textContent).toContain('Connected — 2 models added')
  })
})

describe('option 2 — own provider families', () => {
  it('opens a family dialog prefilled with its default model ids and baseUrl', async () => {
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setupBridge()} memberId="vizmaster" onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)

    await click(button('DeepSeek'))
    const dialog = container.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('https://api.deepseek.com')
    const modelInput = container.querySelector<HTMLInputElement>('input[aria-label="DeepSeek model ids"]')!
    expect(modelInput.value).toBe('deepseek-chat')
  })

  it('validates the key and model ids before writing, then refreshes on success', async () => {
    const onRefresh = vi.fn(async () => undefined)
    const setup = setupBridge()
    await render(<ProviderSettings harness="omp" catalog={catalog} setup={setup} memberId="vizmaster" onRefresh={onRefresh} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)

    await click(button('DeepSeek'))
    await click(button('Save provider'))
    expect(setup.setupOwnProvider).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Paste the API key')

    const keyInput = container.querySelector<HTMLInputElement>('input[aria-label="DeepSeek API key"]')!
    await enter(keyInput, 'sk-deepseek-own-key')
    const modelInput = container.querySelector<HTMLInputElement>('input[aria-label="DeepSeek model ids"]')!
    await enter(modelInput, 'deepseek-chat, bad id!')
    await click(button('Save provider'))
    expect(setup.setupOwnProvider).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Model ids may only use')

    await enter(modelInput, 'deepseek-chat, deepseek-reasoner')
    await click(button('Save provider'))
    expect(setup.setupOwnProvider).toHaveBeenCalledWith('deepseek', 'sk-deepseek-own-key', ['deepseek-chat', 'deepseek-reasoner'])
    expect(onRefresh).toHaveBeenCalled()
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('ProvidersSettings page composition', () => {
  it('keeps the header and catalogue for the generic build while the member gets setup on top', async () => {
    await render(<ProvidersSettings harness="omp" catalog={catalog} setup={setupBridge()} memberId="vizmaster" onRefresh={noop} onSaveApiKey={noop} onLogout={noop} onSetEnabled={noop} onSetAllEnabled={noop} onSetAllDisabled={noop} onSetModelEnabled={noop} onStartOAuth={noop} onOpenDocs={() => undefined} />)
    expect(container.querySelector('h1')?.textContent).toBe('Providers')
    const setupIndex = container.textContent?.indexOf('Connect models') ?? -1
    const catalogIndex = container.textContent?.indexOf('catalogue') ?? -1
    expect(setupIndex).toBeGreaterThanOrEqual(0)
    expect(catalogIndex).toBeGreaterThan(setupIndex)
  })
})
