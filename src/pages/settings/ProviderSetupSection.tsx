import { Building2, CheckCircle2, KeyRound, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage } from '@/lib/errors'
import type { PrimeWorkApi, ProviderSetupFamily, ProviderSetupOptions, VclawDoorStatus, VclawUsageStatus } from '@/types/api'
import { Modal } from '@/components/ui'

type ProviderSetupBridge = NonNullable<PrimeWorkApi['providerSetup']>

interface ProviderSetupSectionProps {
  setup: ProviderSetupBridge
  /** Refreshes the OMP catalogue so Models populates live after a write. */
  onCatalogRefresh(): Promise<void>
}

interface OwnFamilyDraft {
  family: ProviderSetupFamily
  apiKey: string
  modelIds: string
}

const VCLAW_KEY_PATTERN = /^sk-[A-Za-z0-9_-]{8,128}$/
const MODEL_ID_PATTERN = /^[a-zA-Z0-9._:/+-]{1,256}$/

/**
 * Member-only provider setup (vizmaster): option 1 connects the estate's
 * metered LLM door with a pasted spending credential; option 2 guides
 * connecting the six allowlisted families with the member's own API keys.
 * Keys are validated before progressing and every outcome is surfaced —
 * nothing is silently accepted (docs/UI_INPUT_VALIDATION.md posture).
 */
export function ProviderSetupSection({ setup, onCatalogRefresh }: ProviderSetupSectionProps) {
  const [options, setOptions] = useState<ProviderSetupOptions | null>(null)
  const [optionsError, setOptionsError] = useState('')
  const [vclawKey, setVclawKey] = useState('')
  const [vclawBusy, setVclawBusy] = useState(false)
  const [vclawError, setVclawError] = useState('')
  const [vclawDone, setVclawDone] = useState('')
  const [doorStatus, setDoorStatus] = useState<VclawDoorStatus | null>(null)
  const [usage, setUsage] = useState<VclawUsageStatus | null>(null)
  const [draft, setDraft] = useState<OwnFamilyDraft | null>(null)
  const [draftBusy, setDraftBusy] = useState(false)
  const [draftError, setDraftError] = useState('')

  useEffect(() => {
    let cancelled = false
    setup.options()
      .then((value) => { if (!cancelled) setOptions(value) })
      .catch((error) => { if (!cancelled) setOptionsError(errorMessage(error)) })
    return () => { cancelled = true }
  }, [setup])

  useEffect(() => {
    let cancelled = false
    setup.vclawStatus().then((value) => { if (!cancelled) setDoorStatus(value) }).catch(() => undefined)
    setup.vclawUsage().then((value) => { if (!cancelled) setUsage(value) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [setup, vclawDone])

  const connectVclaw = async () => {
    const key = vclawKey.trim()
    if (!key) {
      setVclawError('Paste your VClaw API key (sk-…) first.')
      return
    }
    if (!VCLAW_KEY_PATTERN.test(key)) {
      setVclawError('The key must be an sk-… token of 8–128 characters after “sk-”.')
      return
    }
    setVclawBusy(true)
    setVclawError('')
    setVclawDone('')
    try {
      const result = await setup.setupVclawLlm(key)
      setVclawKey('')
      setVclawDone(`Connected — ${result.modelKeys.length} model${result.modelKeys.length === 1 ? '' : 's'} added to the catalogue.`)
      await onCatalogRefresh()
    } catch (failure) {
      setVclawError(errorMessage(failure))
    } finally {
      setVclawBusy(false)
    }
  }

  const saveOwnProvider = async () => {
    if (!draft) return
    const key = draft.apiKey.trim()
    if (!key) {
      setDraftError('Paste the API key for this provider first.')
      return
    }
    if (key.length < 8 || key.length > 512 || /\s/.test(key)) {
      setDraftError('The key must be 8–512 characters without spaces or line breaks.')
      return
    }
    const modelIds = draft.modelIds.split(',').map((entry) => entry.trim()).filter(Boolean)
    if (!modelIds.length) {
      setDraftError('Name at least one model id this provider serves.')
      return
    }
    if (modelIds.some((id) => !MODEL_ID_PATTERN.test(id))) {
      setDraftError('Model ids may only use letters, digits, dots, dashes, underscores, slashes, colons and plus signs.')
      return
    }
    setDraftBusy(true)
    setDraftError('')
    try {
      await setup.setupOwnProvider(draft.family.id, key, modelIds)
      setDraft(null)
      await onCatalogRefresh()
    } catch (failure) {
      setDraftError(errorMessage(failure))
    } finally {
      setDraftBusy(false)
    }
  }

  const usageText = usage === null
    ? 'Reading wallet…'
    : usage.status === 'ok'
      ? `Balance ${usage.balance} ${usage.unit} · reserved ${usage.reserved} · available ${usage.available}`
      : 'Usage unavailable'
  const doorText = doorStatus === null ? 'Checking the VClaw LLM door…' : doorStatus.connected
    ? `Door reachable · ${doorStatus.modelCount} model${doorStatus.modelCount === 1 ? '' : 's'}`
    : doorStatus.problem

  return (
    <section className="settings-group provider-setup" aria-label="Provider setup">
      <div className="settings-group__heading"><h2>Connect models</h2></div>
      {optionsError ? <p className="settings-error" role="alert">{optionsError}</p> : null}
      <div className="provider-setup__options">
        <div className="provider-setup__option">
          <div className="provider-setup__identity"><Sparkles size={14} aria-hidden="true" /><strong>VClaw LLM</strong><small>{options?.vclawLlm.baseUrl ?? 'https://llm.vclawhub.com/v1'} · the estate’s own door, metered per request in tiko</small></div>
          <p className="provider-setup__hint" role="status">{doorText} · {usageText}{usage && usage.status === 'unavailable' ? ` (${usage.reason})` : ''}</p>
          {vclawError ? <p className="settings-error" role="alert">{vclawError}</p> : null}
          {vclawDone ? <p className="provider-setup__done" role="status"><CheckCircle2 size={12} aria-hidden="true" /> {vclawDone}</p> : null}
          <label className="field">
            <span>VClaw API key (sk-…)</span>
            <input type="password" value={vclawKey} autoComplete="off" spellCheck={false} placeholder="sk-…" aria-label="VClaw API key" disabled={vclawBusy} onChange={(event) => setVclawKey(event.target.value)} />
          </label>
          <button type="button" className="button button--primary" disabled={vclawBusy} onClick={() => void connectVclaw()}>
            {vclawBusy ? 'Connecting…' : 'Connect VClaw LLM'}
          </button>
          <p className="provider-setup__note">The key is a spending credential with its own wallet cap. Model ids are provisional until the door’s catalogue is live.</p>
        </div>
        <div className="provider-setup__option">
          <div className="provider-setup__identity"><KeyRound size={14} aria-hidden="true" /><strong>Other top LLMs</strong><small>use your own API keys</small></div>
          <ul className="provider-setup__families">
            {(options?.families ?? []).map((family) => (
              <li key={family.id}>
                <button type="button" className="button" onClick={() => { setDraftError(''); setDraft({ family, apiKey: '', modelIds: family.defaultModelIds.join(', ') }) }}>
                  <Building2 size={13} aria-hidden="true" /> {family.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {draft ? (
        <Modal
          title={`Connect ${draft.family.label}`}
          onClose={() => { if (!draftBusy) setDraft(null) }}
          footer={(
            <>
              <button type="button" className="button" disabled={draftBusy} onClick={() => setDraft(null)}>Cancel</button>
              <button type="button" className="button button--primary" disabled={draftBusy} onClick={() => void saveOwnProvider()}>{draftBusy ? 'Saving…' : 'Save provider'}</button>
            </>
          )}
        >
          <p className="modal-intro">{draft.family.description} Requests go to <code>{draft.family.baseUrl}</code>.</p>
          {draftError ? <p className="settings-error" role="alert">{draftError}</p> : null}
          <label className="field">
            <span>API key</span>
            <input autoFocus type="password" value={draft.apiKey} autoComplete="off" spellCheck={false} aria-label={`${draft.family.label} API key`} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} />
          </label>
          <label className="field">
            <span>Model ids (comma-separated)</span>
            <input value={draft.modelIds} spellCheck={false} aria-label={`${draft.family.label} model ids`} onChange={(event) => setDraft({ ...draft, modelIds: event.target.value })} />
          </label>
          <p className="modal-note">The key is stored in a 0600 file the agent reads at request time; it never appears in models.yml.</p>
        </Modal>
      ) : null}
    </section>
  )
}
