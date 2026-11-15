/**
 * VizMaster@VClaw — VizShow registry client.
 *
 * Runs in the Electron main process only. The renderer never holds a bearer
 * token and never talks to the registry directly: it hands the broker a
 * declarative payload, and this module performs `POST /api/vizshows` →
 * `PUT /api/vizshows/:id/poster` → `POST /api/vizshows/:id/submit` with the
 * fixed revision chain the server enforces (`W/"1"` → `W/"2"`).
 *
 * `fetch` is injected so the broker can use Electron's `net.fetch` in the app
 * and a stub in tests. The poster is decoded from its data URL and hashed
 * byte-for-byte; the API verifies that hash, then stores a metadata-stripped
 * copy (EXIF/XMP/IPTC are removed server-side).
 */
import { createHash } from 'node:crypto'

export const VIZSHOW_API_BASE = 'https://vizmaster.app'
export const POSTER_BYTES_LIMIT = 512 * 1024
const REQUEST_TIMEOUT_MS = 30_000

export type VizShareFetch = (input: string, init?: RequestInit) => Promise<Response>

export type VizKind = 'elucim' | 'vectorplay' | 'three'
export type VizParam = number | boolean | string

export interface VizProvenanceHuman {
  kind: 'human'
}

export interface VizProvenanceAgent {
  kind: 'agent'
  tool: string
  model?: string
}

export type VizProvenance = VizProvenanceHuman | VizProvenanceAgent

/** The schema's consent union: an adult is never also a guardian and vice versa. */
export interface VizConsentAdult {
  publicListing: boolean
  adult: true
  guardian: false
}

export interface VizConsentMinor {
  publicListing: boolean
  adult: false
  guardian: true
}

export type VizConsent = VizConsentAdult | VizConsentMinor

export interface VizShareSubmission {
  tutorialId: string
  kind: VizKind
  params: Record<string, VizParam>
  frame?: number
  reproducible: boolean
  title: string
  blurb: string
  tags: string[]
  subject: string
  grade?: number
  lang: string
  handle?: string
  provenance: VizProvenance
  promptExcerpt?: string
  consent: VizConsent
  poster: { dataUrl: string }
}

/**
 * The agent-initiated draft body (the `/v1/draft` wire shape, §3.1 of the
 * C1 spec): `parseSubmission` minus consent and poster — neither can come
 * from an agent — plus `buildId`, which joins the record to the local build
 * for poster capture. `promptExcerpt` is desktop-attached, never a tool claim.
 */
export interface VizShowDraft {
  buildId: string
  tutorialId: string
  kind: VizKind
  params: Record<string, VizParam>
  frame?: number
  reproducible: boolean
  title: string
  blurb: string
  tags: string[]
  subject: string
  grade?: number
  lang: string
  promptExcerpt?: string
}

/**
 * Final human edits patched onto a draft at completion (§4.5). Every field is
 * optional; each mirrors the bounds `parseSubmission` enforces. The registry's
 * `mergePatch` pins `id`, `author` and `status`, so none of those ride the
 * wire — and `provenance` is stripped server-side before the merge.
 */
export interface VizDraftEdits {
  title?: string
  blurb?: string
  tags?: string[]
  subject?: string
  grade?: number
  lang?: string
  frame?: number
}

/**
 * The `/v1/drafts/:id/submit` body (§4.5): the consent union the human just
 * granted, optional final edits, and an optional poster — required iff the
 * record still lacks one (the sheet knows from `/v1/mine`).
 */
export interface VizDraftCompletion {
  consent: VizConsent
  edits?: VizDraftEdits
  poster?: { dataUrl: string }
}

export interface VizPoster {
  mime: 'image/png' | 'image/jpeg' | 'image/webp'
  bytes: Buffer
  sha256: string
}

export class VizSharePayloadError extends Error {
  readonly code = 'invalid_payload'

  constructor(message: string) {
    super(message)
    this.name = 'VizSharePayloadError'
  }
}

export class VizShowApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'VizShowApiError'
  }
}

const KINDS: readonly VizKind[] = ['elucim', 'vectorplay', 'three']
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/
const HANDLE = /^[a-z0-9][a-z0-9-]{2,31}$/
const TUTORIAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/

function fail(message: string): never {
  throw new VizSharePayloadError(message)
}

function readString(record: Record<string, unknown>, key: string, min: number, max: number): string {
  const value = record[key]
  if (typeof value !== 'string') fail(`${key} must be a string`)
  if (value.length < min || value.length > max) fail(`${key} must be ${min}-${max} characters`)
  return value
}

function readOptionalString(record: Record<string, unknown>, key: string, max: number): string | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') fail(`${key} must be a string`)
  if (value.length > max) fail(`${key} must be at most ${max} characters`)
  return value
}

function readOptionalHandle(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !HANDLE.test(value)) fail(`${key} must match ^[a-z0-9][a-z0-9-]{2,31}$`)
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') fail(`${key} must be a boolean`)
  return value
}

function readOptionalInteger(record: Record<string, unknown>, key: string, min: number, max: number): number | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) fail(`${key} must be an integer`)
  if (value < min || value > max) fail(`${key} must be between ${min} and ${max}`)
  return value
}

function readParams(value: unknown): Record<string, VizParam> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('params must be an object')
  const params: Record<string, VizParam> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (key.length === 0 || key.length > 64) fail('params keys must be 1-64 characters')
    if (typeof entry === 'string' || typeof entry === 'boolean') {
      params[key] = entry
      continue
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      params[key] = entry
      continue
    }
    fail(`params.${key} must be a number, boolean or string`)
  }
  return params
}

function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) fail('tags must be an array')
  if (value.length === 0 || value.length > 8) fail('tags must contain 1-8 entries')
  return value.map((tag) => {
    if (typeof tag !== 'string' || tag.length === 0 || tag.length > 24) fail('each tag must be 1-24 characters')
    return tag
  })
}

function readProvenance(value: unknown): VizProvenance {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('provenance must be an object')
  const record = value as Record<string, unknown>
  if (record.kind === 'human') return { kind: 'human' }
  if (record.kind === 'agent') {
    const tool = readString(record, 'tool', 1, 64)
    const model = readOptionalString(record, 'model', 96)
    return model === undefined ? { kind: 'agent', tool } : { kind: 'agent', tool, model }
  }
  fail('provenance.kind must be "human" or "agent"')
}

function readConsent(value: unknown): VizConsent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('consent must be an object')
  const record = value as Record<string, unknown>
  const publicListing = readBoolean(record, 'publicListing')
  if (record.adult === true && record.guardian === false) return { publicListing, adult: true, guardian: false }
  if (record.adult === false && record.guardian === true) return { publicListing, adult: false, guardian: true }
  fail('consent must be either adult consent (adult true, guardian false) or guardian consent (adult false, guardian true)')
}

/** Validate the renderer's untrusted submit body. Unknown fields are dropped. */
export function parseSubmission(value: unknown): VizShareSubmission {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('The submit body must be a JSON object')
  const body = value as Record<string, unknown>
  const tutorialId = readString(body, 'tutorialId', 1, 64)
  if (!TUTORIAL_ID.test(tutorialId)) fail('tutorialId contains unsupported characters')
  if (typeof body.kind !== 'string' || !KINDS.includes(body.kind as VizKind)) fail('kind must be elucim, vectorplay or three')
  const kind = body.kind as VizKind
  const params = readParams(body.params)
  const frame = readOptionalInteger(body, 'frame', 0, Number.MAX_SAFE_INTEGER)
  if (kind === 'elucim' && frame === undefined) fail('frame is required for an elucim Viz')
  const reproducible = readBoolean(body, 'reproducible')
  const title = readString(body, 'title', 8, 80)
  const blurb = readString(body, 'blurb', 40, 280)
  const tags = readTags(body.tags)
  const subject = readString(body, 'subject', 1, 64)
  const grade = readOptionalInteger(body, 'grade', 1, 12)
  const lang = readString(body, 'lang', 2, 12)
  if (!LANG.test(lang)) fail('lang must be a language tag such as "en" or "en-GB"')
  const handle = readOptionalHandle(body, 'handle')
  const provenance = readProvenance(body.provenance)
  const promptExcerpt = readOptionalString(body, 'promptExcerpt', 280)
  const consent = readConsent(body.consent)
  const poster = body.poster
  if (typeof poster !== 'object' || poster === null || Array.isArray(poster) || typeof (poster as { dataUrl?: unknown }).dataUrl !== 'string') {
    fail('poster.dataUrl is required')
  }
  const dataUrl = (poster as { dataUrl: string }).dataUrl
  // Decode now so an invalid or oversized poster is a form error, not a
  // half-created draft that can never be submitted.
  decodePoster(dataUrl)

  return {
    tutorialId,
    kind,
    params,
    ...(frame === undefined ? {} : { frame }),
    reproducible,
    title,
    blurb,
    tags,
    subject,
    ...(grade === undefined ? {} : { grade }),
    lang,
    ...(handle === undefined ? {} : { handle }),
    provenance,
    ...(promptExcerpt === undefined ? {} : { promptExcerpt }),
    consent,
    poster: { dataUrl },
  }
}

/**
 * Decode a poster data URL without touching the image bytes. The API hashes
 * exactly these bytes and re-checks `X-Content-SHA256`, so whitespace
 * normalisation or a client re-encode would produce a false mismatch. Metadata
 * stripping happens only after that check.
 */
export function decodePoster(dataUrl: string): VizPoster {
  const match = DATA_URL.exec(dataUrl)
  if (match === null) fail('poster.dataUrl must be a base64 PNG, JPEG or WebP data URL')
  const mime = match[1] as VizPoster['mime']
  const bytes = Buffer.from(match[2] as string, 'base64')
  if (bytes.length === 0) fail('poster.dataUrl decodes to zero bytes')
  if (bytes.length > POSTER_BYTES_LIMIT) fail(`The poster must be at most ${POSTER_BYTES_LIMIT} bytes`)
  return { mime, bytes, sha256: createHash('sha256').update(bytes).digest('hex') }
}

/**
 * Validate the agent's untrusted draft body. Mirrors `parseSubmission` minus
 * consent and poster, plus `buildId`. A body carrying a `consent` or `poster`
 * key is refused — consent cannot be granted by an agent and a poster is a
 * fact of a rendered surface, so the non-delegability is mechanical.
 */
export function parseDraft(value: unknown): VizShowDraft {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('The draft body must be a JSON object')
  const body = value as Record<string, unknown>
  if ('consent' in body) fail('consent cannot be granted by an agent')
  if ('poster' in body) fail('a poster cannot be attached by an agent')
  const buildId = readString(body, 'buildId', 1, 64)
  if (!TUTORIAL_ID.test(buildId)) fail('buildId contains unsupported characters')
  const tutorialId = readString(body, 'tutorialId', 1, 64)
  if (!TUTORIAL_ID.test(tutorialId)) fail('tutorialId contains unsupported characters')
  if (typeof body.kind !== 'string' || !KINDS.includes(body.kind as VizKind)) fail('kind must be elucim, vectorplay or three')
  const kind = body.kind as VizKind
  const params = readParams(body.params)
  const frame = readOptionalInteger(body, 'frame', 0, Number.MAX_SAFE_INTEGER)
  if (kind === 'elucim' && frame === undefined) fail('frame is required for an elucim Viz')
  const reproducible = readBoolean(body, 'reproducible')
  const title = readString(body, 'title', 8, 80)
  const blurb = readString(body, 'blurb', 40, 280)
  const tags = readTags(body.tags)
  const subject = readString(body, 'subject', 1, 64)
  const grade = readOptionalInteger(body, 'grade', 1, 12)
  const lang = readString(body, 'lang', 2, 12)
  if (!LANG.test(lang)) fail('lang must be a language tag such as "en" or "en-GB"')

  return {
    buildId,
    tutorialId,
    kind,
    params,
    ...(frame === undefined ? {} : { frame }),
    reproducible,
    title,
    blurb,
    tags,
    subject,
    ...(grade === undefined ? {} : { grade }),
    lang,
  }
}

function readEdits(value: unknown): VizDraftEdits {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('edits must be an object')
  const record = value as Record<string, unknown>
  const title = 'title' in record && record.title !== undefined ? readString(record, 'title', 8, 80) : undefined
  const blurb = 'blurb' in record && record.blurb !== undefined ? readString(record, 'blurb', 40, 280) : undefined
  const tags = 'tags' in record && record.tags !== undefined ? readTags(record.tags) : undefined
  const subject = 'subject' in record && record.subject !== undefined ? readString(record, 'subject', 1, 64) : undefined
  const grade = readOptionalInteger(record, 'grade', 1, 12)
  const lang = readOptionalString(record, 'lang', 12)
  if (lang !== undefined && !LANG.test(lang)) fail('lang must be a language tag such as "en" or "en-GB"')
  const frame = readOptionalInteger(record, 'frame', 0, Number.MAX_SAFE_INTEGER)
  return {
    ...(title === undefined ? {} : { title }),
    ...(blurb === undefined ? {} : { blurb }),
    ...(tags === undefined ? {} : { tags }),
    ...(subject === undefined ? {} : { subject }),
    ...(grade === undefined ? {} : { grade }),
    ...(lang === undefined ? {} : { lang }),
    ...(frame === undefined ? {} : { frame }),
  }
}

/**
 * Validate the renderer's untrusted draft-completion body (§4.5). The consent
 * union is required — an agent can never supply it — and the poster, when
 * present, is decoded now so an invalid or oversized one is a form error, not
 * a half-completed chain. Unknown fields are dropped. The ShareSheet sends
 * `poster` as `{ dataUrl }`; the vizshare client's wire shape is the bare
 * string — both are accepted, the bytes are validated identically.
 */
export function parseDraftCompletion(value: unknown): VizDraftCompletion {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('The completion body must be a JSON object')
  const body = value as Record<string, unknown>
  const consent = readConsent(body.consent)
  const edits = 'edits' in body && body.edits !== undefined ? readEdits(body.edits) : undefined
  let poster: { dataUrl: string } | undefined
  if ('poster' in body && body.poster !== undefined) {
    const raw = body.poster
    let dataUrl: string
    if (typeof raw === 'string') dataUrl = raw
    else if (typeof raw === 'object' && raw !== null && !Array.isArray(raw) && typeof (raw as { dataUrl?: unknown }).dataUrl === 'string') {
      dataUrl = (raw as { dataUrl: string }).dataUrl
    } else {
      fail('poster must be a data URL or { dataUrl }')
    }
    decodePoster(dataUrl)
    poster = { dataUrl }
  }
  return { consent, ...(edits === undefined ? {} : { edits }), ...(poster === undefined ? {} : { poster }) }
}

function draftBody(submission: VizShareSubmission): Record<string, unknown> {
  return {
    tutorialId: submission.tutorialId,
    kind: submission.kind,
    params: submission.params,
    ...(submission.frame === undefined ? {} : { frame: submission.frame }),
    reproducible: submission.reproducible,
    title: submission.title,
    blurb: submission.blurb,
    tags: submission.tags,
    subject: submission.subject,
    ...(submission.grade === undefined ? {} : { grade: submission.grade }),
    lang: submission.lang,
    ...(submission.handle === undefined ? {} : { handle: submission.handle }),
    provenance: submission.provenance,
    ...(submission.promptExcerpt === undefined ? {} : { promptExcerpt: submission.promptExcerpt }),
    consent: submission.consent,
  }
}

/**
 * The `/v1/draft` body: no consent (granted by the human at submit), no
 * poster (uploaded separately when a rendered surface supplies one), no
 * provenance or handle (server-stamped / registry-derived).
 */
function agentDraftBody(draft: VizShowDraft): Record<string, unknown> {
  return {
    tutorialId: draft.tutorialId,
    kind: draft.kind,
    params: draft.params,
    ...(draft.frame === undefined ? {} : { frame: draft.frame }),
    reproducible: draft.reproducible,
    title: draft.title,
    blurb: draft.blurb,
    tags: draft.tags,
    subject: draft.subject,
    ...(draft.grade === undefined ? {} : { grade: draft.grade }),
    lang: draft.lang,
    ...(draft.promptExcerpt === undefined ? {} : { promptExcerpt: draft.promptExcerpt }),
  }
}

export interface VizShowApiOptions {
  fetch: VizShareFetch
  /** Called per request: the OIDC client refreshes within its 60 s window. */
  getAccessToken: () => Promise<string>
  baseUrl?: string
}

export interface VizShowApi {
  createDraft(submission: VizShareSubmission): Promise<{ id: string; revision: number }>
  createDraftOnly(draft: VizShowDraft): Promise<{ id: string; revision: number }>
  uploadPoster(id: string, poster: VizPoster, ifMatch?: string): Promise<{ revision: number }>
  submit(id: string, ifMatch?: string, consentReceipt?: string): Promise<{ revision: number }>
  listMine(): Promise<unknown>
  withdraw(id: string, revision?: number): Promise<{ revision: number }>
  submitViz(
    submission: VizShareSubmission,
    consentReceipt?: string,
  ): Promise<{ id: string; state: 'submitted'; revision: number }>
  submitDraft(
    id: string,
    completion: VizDraftCompletion,
    consentReceipt?: string,
  ): Promise<{ id: string; state: 'submitted'; revision: number }>
}

export function createVizShowApi(options: VizShowApiOptions): VizShowApi {
  return new VizShowApiClient(options)
}

class VizShowApiClient implements VizShowApi {
  private readonly fetch: VizShareFetch
  private readonly getAccessToken: () => Promise<string>
  private readonly baseUrl: string

  constructor(options: VizShowApiOptions) {
    this.fetch = options.fetch
    this.getAccessToken = options.getAccessToken
    this.baseUrl = (options.baseUrl ?? VIZSHOW_API_BASE).replace(/\/+$/, '')
  }

  async createDraft(submission: VizShareSubmission): Promise<{ id: string; revision: number }> {
    const result = await this.request('/api/vizshows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draftBody(submission)),
    })
    const created = result.body
    const id =
      typeof created === 'object' && created !== null && 'id' in created && typeof created.id === 'string'
        ? created.id
        : undefined
    if (id === undefined) throw new VizShowApiError(502, 'invalid_response', 'The registry did not return a VizShow id')
    return { id, revision: revisionFrom(result.headers, 1) }
  }

  /** C1: the agent's consent-free draft creation; `submitViz` is untouched. */
  async createDraftOnly(draft: VizShowDraft): Promise<{ id: string; revision: number }> {
    const result = await this.request('/api/vizshows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(agentDraftBody(draft)),
    })
    const created = result.body
    const id =
      typeof created === 'object' && created !== null && 'id' in created && typeof created.id === 'string'
        ? created.id
        : undefined
    if (id === undefined) throw new VizShowApiError(502, 'invalid_response', 'The registry did not return a VizShow id')
    return { id, revision: revisionFrom(result.headers, 1) }
  }

  async uploadPoster(id: string, poster: VizPoster, ifMatch = 'W/"1"'): Promise<{ revision: number }> {
    const result = await this.request(`/api/vizshows/${encodeURIComponent(id)}/poster`, {
      method: 'PUT',
      headers: {
        'content-type': poster.mime,
        'x-content-sha256': poster.sha256,
        'if-match': ifMatch,
      },
      // Node's fetch accepts a Buffer; the DOM lib's BodyInit typing does not.
      body: poster.bytes as unknown as BodyInit,
    })
    return { revision: revisionFrom(result.headers, 2) }
  }

  async submit(id: string, ifMatch = 'W/"2"', consentReceipt?: string): Promise<{ revision: number }> {
    const result = await this.request(`/api/vizshows/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
      headers: {
        'if-match': ifMatch,
        ...(consentReceipt === undefined || consentReceipt === '' ? {} : { 'x-consent-receipt': consentReceipt }),
      },
    })
    return { revision: revisionFrom(result.headers, 3) }
  }

  async listMine(): Promise<unknown> {
    return (await this.request('/api/vizshows/mine')).body
  }

  async withdraw(id: string, revision?: number): Promise<{ revision: number }> {
    let expected = revision
    if (expected === undefined) {
      const mine = await this.listMine()
      const records = Array.isArray(mine) ? (mine as Array<{ id?: unknown; revision?: unknown }>) : []
      const current = records.find((record) => record.id === id)?.revision
      if (typeof current !== 'number') throw new VizShowApiError(404, 'not_found', `VizShow ${id} was not found`)
      expected = current
    }
    const result = await this.request(`/api/vizshows/${encodeURIComponent(id)}/withdraw`, {
      method: 'POST',
      headers: { 'if-match': `W/"${expected}"` },
    })
    return { revision: revisionFrom(result.headers, expected + 1) }
  }

  async submitViz(
    submission: VizShareSubmission,
    consentReceipt?: string,
  ): Promise<{ id: string; state: 'submitted'; revision: number }> {
    const poster = decodePoster(submission.poster.dataUrl)
    const { id } = await this.createDraft(submission)
    // The draft is revision 1; each accepted mutation advances the ETag.
    await this.uploadPoster(id, poster, 'W/"1"')
    const { revision } = await this.submit(id, 'W/"2"', consentReceipt)
    return { id, state: 'submitted', revision }
  }

  /**
   * C1 (§4.5): the human completion chain for an agent-created draft.
   * Resolves the current revision from `/v1/mine` (the `withdraw` lookup
   * pattern), PATCHes the consent union plus final edits, uploads the poster
   * when the body still carries one, then submits — each step If-Match'd from
   * the prior response's revision. The receipt rides only the final submit
   * request, exactly as `submitViz` does.
   */
  async submitDraft(
    id: string,
    completion: VizDraftCompletion,
    consentReceipt?: string,
  ): Promise<{ id: string; state: 'submitted'; revision: number }> {
    const mine = await this.listMine()
    const records = Array.isArray(mine) ? (mine as Array<{ id?: unknown; revision?: unknown }>) : []
    const current = records.find((record) => record.id === id)?.revision
    if (typeof current !== 'number') throw new VizShowApiError(404, 'not_found', `VizShow ${id} was not found`)
    const patch = await this.request(`/api/vizshows/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'if-match': `W/"${current}"` },
      body: JSON.stringify({ consent: completion.consent, ...(completion.edits ?? {}) }),
    })
    let revision = revisionFrom(patch.headers, current + 1)
    if (completion.poster !== undefined) {
      const uploaded = await this.uploadPoster(id, decodePoster(completion.poster.dataUrl), `W/"${revision}"`)
      revision = uploaded.revision
    }
    const submitted = await this.submit(id, `W/"${revision}"`, consentReceipt)
    return { id, state: 'submitted', revision: submitted.revision }
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<{ status: number; headers: Headers; body: unknown }> {
    const token = await this.getAccessToken()
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token}`)
    headers.set('accept', 'application/json')
    let response: Response
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      throw new VizShowApiError(502, 'registry_unreachable', `The registry could not be reached: ${describe(error)}`)
    }
    const text = await response.text()
    let body: unknown
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as unknown
      } catch {
        body = text
      }
    }
    if (!response.ok) throw apiError(response.status, body)
    return { status: response.status, headers: response.headers, body }
  }
}

function apiError(status: number, body: unknown): VizShowApiError {
  const payload = typeof body === 'object' && body !== null && 'error' in body ? (body as { error?: unknown }).error : undefined
  if (typeof payload === 'object' && payload !== null) {
    const detail = payload as { code?: unknown; message?: unknown; details?: unknown }
    const code = typeof detail.code === 'string' ? detail.code : 'http_error'
    const message = typeof detail.message === 'string' ? detail.message : `Registry request failed with ${status}`
    return new VizShowApiError(status, code, message, detail.details)
  }
  if (typeof payload === 'string') return new VizShowApiError(status, 'http_error', payload)
  if (typeof body === 'string' && body.trim().length > 0) {
    return new VizShowApiError(status, 'http_error', body.slice(0, 300))
  }
  return new VizShowApiError(status, 'http_error', `Registry request failed with ${status}`)
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function revisionFrom(headers: Headers, fallback: number): number {
  const raw = headers.get('etag')
  if (raw === null) return fallback
  const match = /^(?:W\/)?"?([0-9]+)"?$/.exec(raw.trim())
  return match === null ? fallback : Number(match[1])
}
