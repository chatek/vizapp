import type { PromptSuggestionVizParams } from '@/types/api'

/**
 * Compact, display-only parameter text for a capability chip: numbers to two decimals, booleans
 * only when true (a false flag says nothing the absence of the flag doesn't), strings verbatim.
 * Insertion order is the service's, so the chip matches the intent the teacher wrote.
 */
export function formatVizParams(params: PromptSuggestionVizParams): string {
  return Object.entries(params)
    .flatMap(([key, value]) => {
      if (typeof value === 'number') return [`${key}=${Number(value.toFixed(2))}`]
      if (typeof value === 'boolean') return value ? [`${key}=true`] : []
      return [`${key}=${value}`]
    })
    .join(' ')
}
