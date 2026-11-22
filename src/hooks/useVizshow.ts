import { useCallback, useEffect, useRef, useState } from 'react'
import type { VizshowSnapshot } from '@/types/api'
import { navigateVizshowUrl, openVizshow } from '@/lib/vizshow-open'

export interface UseVizshow {
  snapshot: VizshowSnapshot | null
  /** True when a build arrived that the user has not opened or dismissed yet. */
  fresh: boolean
  /** True while a preview spawn is being negotiated (the port can take seconds). */
  pending: boolean
  /** Resolves the latest build and hands its URL to the App's pane navigator. */
  openLatest(): void
  /**
   * Resolves the SELECTED session's build (finished, unfinished, broken or missing) and
   * navigates; falls back to the latest build when no session is selected.
   */
  openSession(): void
  /**
   * Asks main for the live project preview and returns its URL (or a typed failure). Main owns
   * the spawn and the "failed spawn means the port is already held" rule, so the renderer never
   * decides whether 5174 is up.
   */
  openPreview(mode?: 'preview' | 'dev'): Promise<{ ok: true; url: string } | { ok: false; error: string }>
  dismiss(): void
}

/**
 * The vizshow surface as the renderer sees it: the latest ready build (pushed by main's watch),
 * the loopback server's port, and the two navigation actions. A build that arrives while the app
 * is open marks itself `fresh` so the chip can announce it without stealing focus.
 */
export function useVizshow(sessionFile?: string | null): UseVizshow {
  const [snapshot, setSnapshot] = useState<VizshowSnapshot | null>(null)
  const [fresh, setFresh] = useState(false)
  const [pending, setPending] = useState(false)
  const lastSeenRef = useRef<string | null>(null)

  useEffect(() => {
    const api = window.prime?.vizshow
    if (!api) return
    let live = true
    void api.state().then((value) => {
      if (!live) return
      lastSeenRef.current = value.latest?.id ?? null
      setSnapshot(value)
    }).catch(() => undefined)
    const unsubscribe = api.onChanged((value) => {
      if (!live) return
      const id = value.latest?.id ?? null
      if (id !== null && id !== lastSeenRef.current) setFresh(true)
      lastSeenRef.current = id
      setSnapshot(value)
    })
    return () => { live = false; unsubscribe() }
  }, [])

  const openLatest = useCallback(() => {
    const id = snapshot?.latest?.id
    if (!id) return
    setFresh(false)
    void openVizshow(id).then((opened) => {
      if (!opened) console.error('Opening the latest VizShow failed:', id)
    })
  }, [snapshot])

  const openPreview = useCallback(async (mode: 'preview' | 'dev' = 'preview') => {
    const api = window.prime?.vizshow
    if (!api) return { ok: false as const, error: 'unavailable' }
    setPending(true)
    try {
      const result = await api.preview(mode)
      return result.ok ? { ok: true as const, url: result.url } : { ok: false as const, error: result.error ?? 'unavailable' }
    } catch {
      return { ok: false as const, error: 'unavailable' }
    } finally {
      setPending(false)
    }
  }, [])

  const dismiss = useCallback(() => setFresh(false), [])

  const openSession = useCallback(() => {
    const api = window.prime?.vizshow
    if (!sessionFile || !api?.forSession) {
      openLatest()
      return
    }
    void api.forSession(sessionFile).then((result) => {
      // A status page is a valid destination: the pane explains an unfinished/broken build.
      if (result.ok) navigateVizshowUrl(result.url)
    }).catch(() => undefined)
  }, [sessionFile, openLatest])

  // Selecting a session shows ITS VizShow in the Browser — or the local status page when the
  // build is not ready. Runs once per session identity; a re-render never re-navigates.
  const lastSessionRef = useRef<string | null>(null)
  useEffect(() => {
    const api = window.prime?.vizshow
    const file = sessionFile ?? null
    if (!file) {
      lastSessionRef.current = null
      return
    }
    if (!api?.forSession || file === lastSessionRef.current) return
    lastSessionRef.current = file
    let live = true
    void api.forSession(file).then((result) => {
      if (live && result.ok) navigateVizshowUrl(result.url)
    }).catch(() => undefined)
    return () => { live = false }
  }, [sessionFile])

  return { snapshot, fresh, pending, openLatest, openSession, openPreview, dismiss }
}
