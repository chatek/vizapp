import { chmod, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Member-profile provider setup: writes OMP `models.yml` provider stanzas under
 * the profile-isolated agent dir (`~/.<profile-id>/agent/models.yml`, the file
 * the OMP child reads through PI_CONFIG_DIR) so the member's Settings →
 * Providers catalogue populates without touching the fork's built-in catalog.
 *
 * Secrets NEVER land in models.yml: each stanza's `apiKey` uses the fork's
 * `!cmd` form (resolve-config-value.ts) pointing at a 0600 key file under
 * `<vclaw home>/config/provider-keys/<provider>.key`. The command runs at
 * request time inside the OMP child, so rotating a key file is picked up
 * without rewriting the stanza. The member's vclaw identity credentials
 * (`~/.<profile>/config/credentials.json`) are deliberately NEVER read here —
 * that boundary is grep-tested in tests/backend/provider-setup.test.ts.
 */

export const VCLAW_PROVIDER_ID = 'vclaw'
export const VCLAW_LLM_BASE_URL = 'https://llm.vclawhub.com/v1'
export const VPAY_API_BASE_URL = 'https://api.vclawhub.com'

/** Estate failure vocabulary for the LLM door (docs/VCLAW_LLM.md §3.5). */
const DOOR_PROBLEM_BY_STATUS: Record<number, string> = {
  401: 'Vizmaster key invalid or missing',
  402: 'Wallet cap or balance exhausted — check the Vizmaster usage row',
  413: 'Prompt too large (8 MiB door limit)',
}
const DOOR_PROBLEM_UNREACHABLE = 'Vizmaster LLM is unreachable — try again shortly'
const DOOR_PROBLEM_NO_KEY = 'No Vizmaster API key is stored yet'

export interface ProviderStanzaModel {
  readonly id: string
  readonly name?: string
  readonly api: string
  readonly reasoning?: boolean
  readonly input?: readonly string[]
  readonly contextWindow?: number
  readonly maxTokens?: number
}

export interface ProviderStanza {
  readonly id: string
  readonly baseUrl: string
  readonly api: string
  readonly keyCommand: string
  readonly models: readonly ProviderStanzaModel[]
}

/**
 * Option 1 — the Vizmaster LLM door. Model ids are the door's hosted order from
 * kevproxy/config/kevproxy-vclawhub.example.yaml (routing.hostedOrder) and are
 * PROVISIONAL until GET /v1/models is reachable (docs/VCLAW_LLM.md §7).
 */
export const VCLAW_LLM_STANZA_SPEC: Omit<ProviderStanza, 'keyCommand'> = {
  id: VCLAW_PROVIDER_ID,
  baseUrl: VCLAW_LLM_BASE_URL,
  api: 'openai-completions',
  models: [
    { id: 'deepseek/deepseek-flash', name: 'Vizmaster · DeepSeek Flash (door default, provisional)', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 8192 },
    { id: 'glm/glm-5.3-flash', name: 'Vizmaster · GLM-5.3-Flash (provisional)', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 131_072, maxTokens: 8192 },
  ],
}

/** One option-2 family the member can connect with their own API key. */
export interface ProviderFamilySpec {
  readonly id: string
  readonly label: string
  readonly description: string
  /** Stanza id; must be in the renderer's vizmaster allowlist so the catalogue shows it. */
  readonly providerId: string
  readonly baseUrl: string
  readonly api: string
  readonly models: readonly ProviderStanzaModel[]
}

/**
 * Option 2 — the six allowlisted families. BaseUrls and model ids come from
 * measured reference shapes: deepseek/glm from the host's working
 * ~/.omp/agent/models.yml stanzas; claude/gpt/mistral/kimi from the fork's own
 * provider rules (packages/catalog/src/compat/rules/providers/*.kdl seeds).
 */
export const PROVIDER_FAMILIES: Record<string, ProviderFamilySpec> = {
  glm: {
    id: 'glm',
    label: 'GLM (Z.ai / BigModel)',
    description: 'Zhipu GLM models through the BigModel coding endpoint.',
    providerId: 'zai',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    api: 'openai-completions',
    models: [
      { id: 'glm-5.2', name: 'GLM-5.2', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 131_072 },
      { id: 'glm-5.3', name: 'GLM-5.3', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 131_072 },
      { id: 'glm-5.3-flash', name: 'GLM-5.3-Flash', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 131_072 },
    ],
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek chat and reasoner models.',
    providerId: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    api: 'openai-completions',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', api: 'openai-completions', input: ['text'], contextWindow: 131_072, maxTokens: 384_000 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 131_072, maxTokens: 4096 },
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 384_000 },
      { id: 'deepseek-flash', name: 'DeepSeek Flash', api: 'openai-completions', reasoning: true, input: ['text'], contextWindow: 1_048_576, maxTokens: 384_000 },
    ],
  },
  claude: {
    id: 'claude',
    label: 'Claude (Anthropic)',
    description: 'Anthropic Claude models through the Messages API.',
    providerId: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    api: 'anthropic-messages',
    models: [
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', api: 'anthropic-messages', reasoning: true, input: ['text', 'image'], contextWindow: 1_000_000, maxTokens: 128_000 },
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', api: 'anthropic-messages', reasoning: true, input: ['text', 'image'], contextWindow: 1_000_000, maxTokens: 128_000 },
    ],
  },
  gpt: {
    id: 'gpt',
    label: 'GPT (OpenAI)',
    description: 'OpenAI GPT models through the Responses API.',
    providerId: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    api: 'openai-responses',
    models: [
      { id: 'gpt-5.5', name: 'GPT-5.5', api: 'openai-responses', reasoning: true, input: ['text', 'image'] },
    ],
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    description: 'Mistral models through the OpenAI-compatible endpoint.',
    providerId: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    api: 'openai-completions',
    models: [
      { id: 'mistral-large-4', name: 'Mistral Large 4', api: 'openai-completions', reasoning: true, input: ['text', 'image'], contextWindow: 1_000_000 },
    ],
  },
  kimi: {
    id: 'kimi',
    label: 'Kimi (Moonshot)',
    description: 'Moonshot Kimi models through the OpenAI-compatible endpoint.',
    providerId: 'moonshot',
    baseUrl: 'https://api.moonshot.ai/v1',
    api: 'openai-completions',
    models: [
      { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', api: 'openai-completions', reasoning: true, input: ['text', 'image'] },
    ],
  },
}

/** Renderer-facing family catalogue (labels plus the prefilled model ids). */
export interface ProviderSetupFamily {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly providerId: string
  readonly baseUrl: string
  readonly api: string
  readonly defaultModelIds: readonly string[]
}

export function providerSetupFamilies(): ProviderSetupFamily[] {
  return Object.values(PROVIDER_FAMILIES).map((family) => ({
    id: family.id,
    label: family.label,
    description: family.description,
    providerId: family.providerId,
    baseUrl: family.baseUrl,
    api: family.api,
    defaultModelIds: family.models.map((model) => model.id),
  }))
}

export interface ProviderSetupResult {
  readonly providerId: string
  readonly modelsYmlPath: string
  readonly keyPath: string
  readonly modelKeys: readonly string[]
}

export type VclawDoorStatus = { connected: true; modelCount: number } | { connected: false; problem: string }

/** Wallet read from vpay (never the LLM host); 'unavailable' is honest, never a zero. */
export type VclawUsageStatus =
  | { status: 'ok'; balance: string; reserved: string; available: string; unit: string }
  | { status: 'unavailable'; reason: string }

export interface ProviderSetupPaths {
  /** Isolated OMP agent dir (~/.<profile-id>/agent) holding models.yml. */
  readonly agentDir: string
  /** 0600 key store dir (<vclaw home>/config/provider-keys). */
  readonly keyStoreDir: string
}

/**
 * Resolves the member profile's setup paths, or null for the generic app
 * (id 'vclaw'), whose OMP state stays harness-owned and must not be written.
 */
export function memberProviderSetupPaths(homeDir: string, ompStateDir: string, sdkRootDir: string | null): ProviderSetupPaths | null {
  if (!sdkRootDir) return null
  return {
    agentDir: join(homeDir, ompStateDir, 'agent'),
    keyStoreDir: join(homeDir, sdkRootDir, 'config', 'provider-keys'),
  }
}

export interface ProviderSetupOptions {
  /** Injectable for tests; defaults to the LLM door and vpay production hosts. */
  readonly urls?: { llmBaseUrl?: string; vpayBaseUrl?: string }
  /** Injectable fetch; defaults to the global fetch. */
  readonly fetchImpl?: typeof fetch
  /**
   * vpay account principal for wallet reads. Absent today: the desktop holds no
   * credential that vpay accepts (vgate requires an audience-bearing token the
   * IDP lane owns), so usage honestly renders unavailable rather than zero.
   */
  readonly vpayPrincipal?: string
  readonly requestTimeoutMs?: number
}

const VCLAW_KEY_PATTERN = /^sk-[A-Za-z0-9_-]{8,128}$/
const MODEL_ID_PATTERN = /^[a-zA-Z0-9._:/+-]{1,256}$/

export function validateVclawLlmKey(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Vizmaster API key must be a string')
  const key = value.trim()
  if (!VCLAW_KEY_PATTERN.test(key)) throw new TypeError('Vizmaster API key must be an sk-… token (8–128 characters after sk-)')
  return key
}

export function validateOwnProviderKey(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('API key must be a string')
  const key = value.trim()
  if (key.length < 8 || key.length > 512) throw new TypeError('API key must be 8–512 characters')
  if (/\s/.test(key)) throw new TypeError('API key must not contain spaces or line breaks')
  return key
}

export function validateModelIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) throw new TypeError('Provide between 1 and 16 model ids')
  const ids: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string') throw new TypeError('Model ids must be strings')
    const id = entry.trim()
    if (!MODEL_ID_PATTERN.test(id)) throw new TypeError(`“${id.slice(0, 64)}” is not a valid model id`)
    if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

function requireFamily(familyId: unknown): ProviderFamilySpec {
  if (typeof familyId !== 'string' || !Object.hasOwn(PROVIDER_FAMILIES, familyId)) throw new TypeError('Unknown provider family')
  return PROVIDER_FAMILIES[familyId as string]
}

/** The exact YAML block, at OMP's two-space provider indent (renderProviderStanza shape). */
export function renderProviderStanza(stanza: ProviderStanza): string {
  const lines = [
    `  ${stanza.id}:`,
    `    baseUrl: ${stanza.baseUrl}`,
    `    api: ${stanza.api}`,
    `    apiKey: "${stanza.keyCommand}"`,
    '    models:',
  ]
  for (const model of stanza.models) {
    lines.push(`      - id: ${model.id}`)
    if (model.name) lines.push(`        name: ${model.name}`)
    lines.push(`        api: ${model.api}`)
    if (model.reasoning !== undefined) lines.push(`        reasoning: ${model.reasoning}`)
    if (model.input?.length) lines.push(`        input: [${model.input.join(', ')}]`)
    if (model.contextWindow !== undefined) lines.push(`        contextWindow: ${model.contextWindow}`)
    if (model.maxTokens !== undefined) lines.push(`        maxTokens: ${model.maxTokens}`)
  }
  return lines.join('\n')
}

function providerHeaderPattern(id: string): RegExp {
  return new RegExp(`^ {2}${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\s|$)`)
}

/** 0-based [start, end) span of a provider's block in models.yml lines, or null. */
function providerBlockSpan(lines: readonly string[], id: string): { start: number; end: number } | null {
  const pattern = providerHeaderPattern(id)
  const start = lines.findIndex((line) => pattern.test(line))
  if (start < 0) return null
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]!
    if (line.trim() === '') continue
    if (!/^\s{3,}/.test(line)) {
      end = index
      break
    }
  }
  return { start, end }
}

/**
 * Merges one provider stanza into models.yml text: an existing block for the
 * same id is replaced in place (idempotent — re-running is byte-identical),
 * otherwise the stanza is inserted directly under `providers:`, which is
 * created when absent. Every other provider's block is preserved byte-for-byte.
 */
export function mergeProviderStanza(existing: string, stanza: ProviderStanza): string {
  const block = renderProviderStanza(stanza).split('\n')
  const text = existing.replace(/\r?\n$/, '')
  if (!text.trim()) return `providers:\n${block.join('\n')}\n`
  const lines = text.split(/\r?\n/)
  const span = providerBlockSpan(lines, stanza.id)
  if (span) {
    const merged = [...lines.slice(0, span.start), ...block, ...lines.slice(span.end)]
    return `${merged.join('\n')}\n`
  }
  const providersIndex = lines.indexOf('providers:')
  if (providersIndex < 0) return `${lines.join('\n')}\n\nproviders:\n${block.join('\n')}\n`
  const merged = [...lines.slice(0, providersIndex + 1), ...block, ...lines.slice(providersIndex + 1)]
  return `${merged.join('\n')}\n`
}

/** Write-through-temp-then-rename so a crash never leaves a truncated file. */
async function writeFileAtomic(file: string, content: string, mode: number): Promise<void> {
  const temp = `${file}.tmp-${process.pid}`
  try {
    await writeFile(temp, content, { mode })
    await rename(temp, file)
  } catch (error) {
    await unlink(temp).catch(() => undefined)
    throw error
  }
  await chmod(file, mode)
}

export class ProviderSetupService {
  private readonly llmBaseUrl: string
  private readonly vpayBaseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly requestTimeoutMs: number

  constructor(private readonly paths: ProviderSetupPaths, options: ProviderSetupOptions = {}) {
    this.llmBaseUrl = options.urls?.llmBaseUrl ?? VCLAW_LLM_BASE_URL
    this.vpayBaseUrl = options.urls?.vpayBaseUrl ?? VPAY_API_BASE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000
    this.vpayPrincipal = options.vpayPrincipal
  }

  private readonly vpayPrincipal: string | undefined

  private get modelsYmlPath(): string {
    return join(this.paths.agentDir, 'models.yml')
  }

  private async readModelsYml(): Promise<string> {
    try { return await readFile(this.modelsYmlPath, 'utf-8') } catch { return '' }
  }

  private async writeKeyFile(providerId: string, key: string): Promise<string> {
    await mkdir(this.paths.keyStoreDir, { recursive: true, mode: 0o700 })
    const file = join(this.paths.keyStoreDir, `${providerId}.key`)
    await writeFileAtomic(file, `${key}\n`, 0o600)
    const mode = (await stat(file)).mode & 0o777
    if ((mode & 0o077) !== 0) throw new Error(`provider key at ${file} is group/world accessible (mode ${mode.toString(8)})`)
    return file
  }

  private async readStoredKey(providerId: string): Promise<string | null> {
    try {
      const content = await readFile(join(this.paths.keyStoreDir, `${providerId}.key`), 'utf-8')
      const key = content.trim()
      return key || null
    } catch { return null }
  }

  private async applyStanza(spec: Omit<ProviderStanza, 'keyCommand'>, keyPath: string): Promise<ProviderSetupResult> {
    const keyCommand = `!cat ${keyPath}`
    const existing = await this.readModelsYml()
    const merged = mergeProviderStanza(existing, { ...spec, keyCommand })
    await mkdir(this.paths.agentDir, { recursive: true })
    await writeFileAtomic(this.modelsYmlPath, merged, 0o644)
    return {
      providerId: spec.id,
      modelsYmlPath: this.modelsYmlPath,
      keyPath,
      modelKeys: spec.models.map((model) => `${spec.id}/${model.id}`),
    }
  }

  /** Option 1: the estate's credential-gated OpenAI-compatible door. */
  async setupVclawLlm(rawKey: unknown): Promise<ProviderSetupResult> {
    const key = validateVclawLlmKey(rawKey)
    const keyPath = await this.writeKeyFile(VCLAW_PROVIDER_ID, key)
    return this.applyStanza(VCLAW_LLM_STANZA_SPEC, keyPath)
  }

  /** Option 2: one of the six allowlisted families with the user's own key. */
  async setupOwnProvider(rawFamilyId: unknown, rawKey: unknown, rawModelIds: unknown): Promise<ProviderSetupResult> {
    const family = requireFamily(rawFamilyId)
    const key = validateOwnProviderKey(rawKey)
    const modelIds = validateModelIds(rawModelIds)
    const known = new Map(family.models.map((model) => [model.id, model]))
    const models = modelIds.map((id) => known.get(id) ?? { id, api: family.api })
    const keyPath = await this.writeKeyFile(family.providerId, key)
    return this.applyStanza({ id: family.providerId, baseUrl: family.baseUrl, api: family.api, models }, keyPath)
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs)
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Probes the door's model list (model traffic only — GET /v1/models is the
   * one non-completion route the door serves) and maps failures to the
   * estate's vocabulary instead of a generic "failed".
   */
  async vclawDoorStatus(): Promise<VclawDoorStatus> {
    const key = await this.readStoredKey(VCLAW_PROVIDER_ID)
    if (!key) return { connected: false, problem: DOOR_PROBLEM_NO_KEY }
    let response: Response
    try {
      response = await this.request(`${this.llmBaseUrl}/models`, { headers: { authorization: `Bearer ${key}`, accept: 'application/json' } })
    } catch {
      return { connected: false, problem: DOOR_PROBLEM_UNREACHABLE }
    }
    if (response.ok) {
      try {
        const catalog = JSON.parse(await response.text()) as { data?: unknown } | null
        const modelCount = Array.isArray(catalog?.data) ? catalog.data.length : 0
        return { connected: true, modelCount }
      } catch { return { connected: false, problem: DOOR_PROBLEM_UNREACHABLE } }
    }
    return { connected: false, problem: DOOR_PROBLEM_BY_STATUS[response.status] ?? DOOR_PROBLEM_UNREACHABLE }
  }

  /**
   * Wallet read through vpay (api.vclawhub.com — NEVER the LLM host). Honest
   * 'unavailable' while the desktop holds no vpay-accepted credential; the
   * read path itself is complete and exercised by tests against a stub.
   */
  async vclawUsage(): Promise<VclawUsageStatus> {
    const key = await this.readStoredKey(VCLAW_PROVIDER_ID)
    if (!key) return { status: 'unavailable', reason: 'Add your Vizmaster API key to read wallet usage.' }
    const principal = this.vpayPrincipal
    if (!principal) return { status: 'unavailable', reason: 'Wallet reads need an authenticated vpay principal; the LLM key cannot read balances.' }
    let response: Response
    try {
      response = await this.request(`${this.vpayBaseUrl}/v1/vpay/accounts/${encodeURIComponent(principal)}`, { headers: { authorization: `Bearer ${key}`, accept: 'application/json' } })
    } catch {
      return { status: 'unavailable', reason: DOOR_PROBLEM_UNREACHABLE }
    }
    if (response.status === 401 || response.status === 403) return { status: 'unavailable', reason: 'The vpay read was not authenticated for this key.' }
    if (!response.ok) return { status: 'unavailable', reason: DOOR_PROBLEM_UNREACHABLE }
    try {
      const wallet = JSON.parse(await response.text()) as { ok?: unknown; balance?: unknown; reserved?: unknown; available?: unknown; unit?: unknown }
      if (wallet.ok !== true || typeof wallet.balance !== 'string' || typeof wallet.reserved !== 'string' || typeof wallet.available !== 'string' || typeof wallet.unit !== 'string') {
        return { status: 'unavailable', reason: 'vpay returned an unexpected wallet shape.' }
      }
      return { status: 'ok', balance: wallet.balance, reserved: wallet.reserved, available: wallet.available, unit: wallet.unit }
    } catch {
      return { status: 'unavailable', reason: 'vpay returned a malformed wallet response.' }
    }
  }
}
