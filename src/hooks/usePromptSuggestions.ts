import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PromptSuggestion } from '@/types/api'

/** A teacher can push faster than a student reads; the oldest pending rows fall off the top. */
const MAX_PENDING = 5

/** Expired suggestions are never actionable, so a stale push is pruned, not shown. */
const PRUNE_INTERVAL_MS = 10_000

export interface UsePromptSuggestions {
  /** Pending suggestions, oldest first. */
  suggestions: PromptSuggestion[]
  /** Records `accepted` and drops the row (the Composer inserts the text). */
  accept(suggestion: PromptSuggestion): void
  /** Records `rejected` and drops the row. */
  dismiss(suggestion: PromptSuggestion): void
}

/**
 * The renderer's read side of §8: pushes arrive padded by the main process, and every outcome
 * travels back as `feedback`. The hook owns the queue; the Composer owns focus and keys, because
 * only the editor knows whether the student is mid-word (or mid-IME).
 */
export function usePromptSuggestions(): UsePromptSuggestions {
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([])
  const reportedRef = useRef(new Set<string>())

  useEffect(() => {
    const api = window.prime?.suggestions
    if (!api) return
    const unsubscribe = api.subscribe((suggestion) => {
      const expiresAt = suggestion.expiresAt ? Date.parse(suggestion.expiresAt) : Number.NaN
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return
      setSuggestions((current) => current.some((item) => item.suggestionId === suggestion.suggestionId)
        ? current
        : [...current, suggestion].slice(-MAX_PENDING))
    })
    const prune = window.setInterval(() => {
      const now = Date.now()
      setSuggestions((current) => current.filter((item) => {
        const expiresAt = item.expiresAt ? Date.parse(item.expiresAt) : Number.NaN
        return !Number.isFinite(expiresAt) || expiresAt > now
      }))
    }, PRUNE_INTERVAL_MS)
    return () => { unsubscribe(); window.clearInterval(prune) }
  }, [])

  // One outcome per suggestion: a double-click or a raced Esc must not record two transitions.
  const report = useCallback((suggestion: PromptSuggestion, outcome: 'accepted' | 'rejected'): void => {
    if (reportedRef.current.has(suggestion.suggestionId)) return
    reportedRef.current.add(suggestion.suggestionId)
    setSuggestions((current) => current.filter((item) => item.suggestionId !== suggestion.suggestionId))
    const pending = window.prime?.suggestions?.feedback(suggestion.suggestionId, outcome)
    void pending?.catch(() => undefined)
  }, [])

  const accept = useCallback((suggestion: PromptSuggestion) => report(suggestion, 'accepted'), [report])
  const dismiss = useCallback((suggestion: PromptSuggestion) => report(suggestion, 'rejected'), [report])
  return useMemo(() => ({ suggestions, accept, dismiss }), [accept, dismiss, suggestions])
}
