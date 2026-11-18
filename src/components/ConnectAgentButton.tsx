import type { MessageKey } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'

interface ConnectAgentButtonProps {
  busy: boolean
  onConnect(): void
}

/**
 * The un-linked shell affordance (operator ruling 2026-11-19): one click runs
 * the vendored CLI's login/signup verbs and the printed auth link opens in the
 * Browser pane — never the system browser, and deliberately NOT a sign-in
 * form: the agent NKey is the desktop's only identity, the human just approves
 * the binding once.
 */
export function ConnectAgentButton({ busy, onConnect }: ConnectAgentButtonProps) {
  const { t } = useI18n()
  const label: MessageKey = busy ? 'identity.connect.busy' : 'identity.connect'
  return (
    <button type="button" className="button button--primary" disabled={busy} aria-label={t('identity.connect.label')} onClick={onConnect}>
      {t(label)}
    </button>
  )
}
