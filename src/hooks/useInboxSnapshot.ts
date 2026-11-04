import { useEffect, useState } from 'react'
import type { VclawInboxSnapshot } from '@/types/api'
import { INBOX_FIXTURES, isFixtureId, type InboxFixtureId } from '@/lib/inbox-fixtures'
import { errorMessage } from '@/lib/errors'

/**
 * The pane's single data source: the frozen spool via preload, or — in dev only — a
 * fixture selected in localStorage. Extracted from InboxPanel so the UI/UX can be
 * iterated against every WORLD state (live/cached/unavailable, loss line, warning)
 * without needing a live spool or a session to produce them.
 *
 * The dev override never touches `window.prime` while a fixture is selected, so the
 * prototype path cannot leak into a real read; `import.meta.env.DEV` is statically
 * replaced, so the fixture branch is dead-code-eliminated from production builds.
 */
const FIXTURE_KEY = 'vclaw.inbox.fixture'

export function selectedInboxFixture(): InboxFixtureId | null {
  if (!import.meta.env.DEV) return null
  const value = window.localStorage?.getItem(FIXTURE_KEY)
  return value && isFixtureId(value) ? value : null
}

export function selectInboxFixture(id: InboxFixtureId | null): void {
  if (!import.meta.env.DEV) return
  if (id === null) window.localStorage?.removeItem(FIXTURE_KEY)
  else window.localStorage?.setItem(FIXTURE_KEY, id)
}

export interface UseInboxSnapshot {
  snapshot: VclawInboxSnapshot | null
  error: string
  /** Dev only: the active fixture id, or null when reading the real spool. */
  fixture: InboxFixtureId | null
  /** Dev only: select a fixture (null = the real spool). No-op in production builds. */
  choose(id: InboxFixtureId | null): void
  refresh(): void
}

export function useInboxSnapshot(): UseInboxSnapshot {
  const [snapshot, setSnapshot] = useState<VclawInboxSnapshot | null>(null)
  const [error, setError] = useState('')
  const [fixture, setFixture] = useState<InboxFixtureId | null>(() => selectedInboxFixture())
  // The fixture id doubles as the effect's identity: switching fixtures re-reads, exactly
  // like the spool watcher firing, so the panel's loading state is exercised too.
  const effectKey = fixture ?? 'spool'

  useEffect(() => {
    let live = true
    if (fixture) {
      setSnapshot(INBOX_FIXTURES[fixture])
      setError('')
      return () => { live = false }
    }
    setSnapshot(null)
    window.prime.inbox.read()
      .then((value) => { if (live) { setSnapshot(value); setError('') } })
      .catch((reason: unknown) => { if (live) setError(errorMessage(reason)) })
    const unsubscribe = window.prime.inbox.onChanged((value) => { if (live) { setSnapshot(value); setError('') } })
    return () => { live = false; unsubscribe() }
  }, [effectKey])

  const refresh = (): void => {
    if (fixture) { setSnapshot(INBOX_FIXTURES[fixture]); setError(''); return }
    window.prime.inbox.read()
      .then((value) => { setSnapshot(value); setError('') })
      .catch((reason: unknown) => setError(errorMessage(reason)))
  }

  const choose = (id: InboxFixtureId | null): void => {
    selectInboxFixture(id)
    setFixture(id)
  }

  return { snapshot, error, fixture, refresh, choose }
}
