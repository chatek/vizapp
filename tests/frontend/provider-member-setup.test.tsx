// @vitest-environment jsdom
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderSettings } from '../../src/pages/settings/ProviderSettings'
import type { PrimeModelCatalog, PrimeWorkApi } from '../../src/types/api'

// Member key entry: the seeded Providers list is visible but keyless, so the rows
// must offer the in-app setup the backend already supports (0600 key files +
// models.yml `!cat` stanzas) instead of only linking to the vendor's website.

vi.mock('../../src/components/ui', () => ({
  Modal: ({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) => (
    <div role="dialog" aria-label={title}>{children}{footer}</div>
  ),
}))

const catalog: PrimeModelCatalog = {
  primeVersion: '18.16.0',
  refreshedAt: '2026-11-19T00:00:00.000Z',
  models: [
    { key: 'deepseek/deepseek-flash', provider: 'deepseek', id: 'deepseek-flash', name: 'DeepSeek Flash', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 384_000, availableThinkingLevels: [], fastModeSupported: false, available: true, enabled: true },
    { key: 'deepseek/deepseek-chat', provider: 'deepseek', id: 'deepseek-chat', name: 'DeepSeek Chat', reasoning: false, input: ['text'], contextWindow: 131_072, maxTokens: 384_000, availableThinkingLevels: [], fastModeSupported: false, available: true, enabled: true },
    { key: 'vclaw/deepseek/deepseek-flash', provider: 'vclaw', id: 'deepseek/deepseek-flash', name: 'VizMaster · DeepSeek Flash', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 8_192, availableThinkingLevels: [], fastModeSupported: false, available: false, enabled: true },
  ],
  providers: [
    { id: 'deepseek', name: 'deepseek', authMethod: 'external', configured: false, modelCount: 2, availableModelCount: 2, enabled: true, authLabel: 'Credentials managed by the omp CLI' },
    { id: 'vclaw', name: 'vclaw', authMethod: 'external', configured: false, modelCount: 1, availableModelCount: 0, enabled: true, authLabel: 'Credentials managed by the omp CLI' },
  ],
}

function providerSetupStub() {
  return {
    options: vi.fn(async () => ({ families: [], vclawLlm: { baseUrl: 'https://llm.vclawhub.example/v1', modelIds: [] } })),
    setupVclawLlm: vi.fn(async (_key: string) => ({ providerId: 'vclaw', modelsYmlPath: '/x/models.yml', keyPath: '/x/vclaw.key', modelKeys: [] })),
    setupOwnProvider: vi.fn(async (_familyId: string, _key: string, _modelIds: string[]) => ({ providerId: 'deepseek', modelsYmlPath: '/x/models.yml', keyPath: '/x/deepseek.key', modelKeys: [] })),
    vclawStatus: vi.fn(async () => ({ configured: false })),
    vclawUsage: vi.fn(async () => ({ state: 'unavailable' })),
  } as unknown as PrimeWorkApi['providerSetup']
}

let root: Root
let container: HTMLDivElement

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

const noop = async () => undefined

function renderWith(setup: PrimeWorkApi['providerSetup']) {
  return act(async () => {
    root.render(
      <ProviderSettings
        harness="omp"
        catalog={catalog}
        providerSetup={setup}
        onRefresh={noop}
        onSaveApiKey={noop}
        onLogout={noop}
        onSetEnabled={noop}
        onSetAllEnabled={noop}
        onSetAllDisabled={noop}
        onSetModelEnabled={noop}
        onStartOAuth={noop}
        onOpenDocs={() => undefined}
      />,
    )
  })
}

function buttonsWith(label: string): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')].filter((item) => item.textContent?.includes(label))
}

async function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('member provider key entry', () => {
  it('offers Add API key on a seeded family row and saves the key with the row’s models', async () => {
    const setup = providerSetupStub()
    await renderWith(setup)
    const [addKey] = buttonsWith('Add API key')
    expect(addKey).toBeDefined()
    await act(async () => { addKey!.click() })
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Connect DeepSeek')
    const input = dialog!.querySelector('input[type="password"]') as HTMLInputElement
    await typeInto(input, 'sk-member-test-12345678')
    const [save] = buttonsWith('Save API key')
    await act(async () => { save!.click() })
    expect(setup!.setupOwnProvider).toHaveBeenCalledWith('deepseek', 'sk-member-test-12345678', ['deepseek-flash', 'deepseek-chat'])
    // The key never rides into renderer state after the save.
    expect(container.querySelector('input[type="password"]')).toBeNull()
  })

  it('offers Connect VizMaster key on the door row and calls the door setup', async () => {
    const setup = providerSetupStub()
    await renderWith(setup)
    const [connect] = buttonsWith('Connect VizMaster key')
    expect(connect).toBeDefined()
    await act(async () => { connect!.click() })
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog?.getAttribute('aria-label')).toBe('Connect VizMaster LLM (estate door)')
    const input = dialog!.querySelector('input[type="password"]') as HTMLInputElement
    await typeInto(input, 'sk-door-test-12345678')
    const [save] = buttonsWith('Save API key')
    await act(async () => { save!.click() })
    expect(setup!.setupVclawLlm).toHaveBeenCalledWith('sk-door-test-12345678')
    expect(setup!.setupOwnProvider).not.toHaveBeenCalled()
  })

  it('shows no in-app key buttons when the member service is absent (generic app)', async () => {
    await renderWith(undefined)
    expect(buttonsWith('Add API key')).toHaveLength(0)
    expect(buttonsWith('Connect VizMaster key')).toHaveLength(0)
    expect(buttonsWith('Subscribe this LLM').length).toBeGreaterThan(0)
  })
})
