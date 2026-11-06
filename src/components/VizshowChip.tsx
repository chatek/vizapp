import { CircleDot, Play } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { navigateVizshowUrl } from '@/lib/vizshow-open'
import type { VizshowSnapshot } from '@/types/api'

interface VizshowChipProps {
  snapshot: VizshowSnapshot | null
  /** A build arrived that the user has not opened yet. */
  fresh: boolean
  /** A preview spawn is being negotiated. */
  pending: boolean
  onOpenLatest(): void
  /** Asks main to ensure the live project serves 5174; the chip navigates on success. */
  onOpenPreview(): Promise<{ ok: true; url: string } | { ok: false; error: string }>
}

/** `2026-11-07T12-04-31-quadratic-functions-9f2c` → `…-9f2c`: enough to tell two builds apart. */
function shortBuildId(id: string): string {
  return id.length <= 18 ? id : `…${id.slice(-16)}`
}

/**
 * The two preview surfaces, side by side and deliberately not merged:
 *   · VizShow  — an immutable per-prompt artefact served over loopback (`vizshow:` server).
 *   · Preview  — the LIVE project on 5174 (`npm run preview`), spawned on demand.
 * Clicking either navigates the Browser pane; neither opens a new window or steals focus.
 */
export function VizshowChip({ snapshot, fresh, pending, onOpenLatest, onOpenPreview }: VizshowChipProps) {
  const { t } = useI18n()
  const [failed, setFailed] = useState(false)
  const latest = snapshot?.latest ?? null

  const openPreview = async (): Promise<void> => {
    setFailed(false)
    const result = await onOpenPreview()
    if (result.ok) {
      navigateVizshowUrl(result.url)
      return
    }
    // A missing project or npm is a real failure; "already serving" never lands here — main
    // answers `ok` with a note for that case.
    setFailed(true)
  }

  return (
    <div className="vizshow-chip-row">
      {latest ? (
        <button
          type="button"
          className={`vizshow-chip vizshow-chip--build${fresh ? ' is-fresh' : ''}`}
          aria-label={t('vizshow.open')}
          title={latest.prompt ?? latest.id}
          onClick={onOpenLatest}
        >
          <CircleDot size={12} aria-hidden="true" />
          <span className="vizshow-chip__label">{t('vizshow.latest', { id: shortBuildId(latest.id) })}</span>
          {fresh ? <span className="vizshow-chip__fresh">{t('vizshow.new')}</span> : null}
        </button>
      ) : null}
      <button
        type="button"
        className="vizshow-chip vizshow-chip--preview"
        aria-label={t('vizshow.previewLabel')}
        aria-busy={pending || undefined}
        title={snapshot?.baseUrl ?? undefined}
        onClick={() => { void openPreview() }}
      >
        <Play size={11} aria-hidden="true" />
        <span className="vizshow-chip__label">{pending ? t('vizshow.previewStarting') : t('vizshow.preview')}</span>
      </button>
      {failed ? <span className="vizshow-chip__error" role="status">{t('vizshow.previewFailed')}</span> : null}
    </div>
  )
}
