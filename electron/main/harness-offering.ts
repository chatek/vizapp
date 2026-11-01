import type { HarnessId, HarnessStatus } from '../../src/types/api'
import { HARNESS_IDS } from '../../src/types/api'

/**
 * The set of harnesses a PRODUCT offers, applied to what is installed on this machine.
 *
 * This is the seam the operator's report was about: the selector used to be pure detection, so
 * every build offered whatever happened to be installed. Downstream code (`Sidebar.tsx`
 * filters `harnesses[h].path`) already renders "discovered ∩ non-null", so stating the product's
 * set here narrows the UI with no renderer change and no second source of truth.
 *
 * Keys are NULLED, never removed: `AppMeta.harnesses` is a full `Record<HarnessId, HarnessStatus>`,
 * so a missing key would make `harnesses?.[h]?.path` read `undefined` — a type hole that happens
 * to work in the selector and would break anything else that indexes the record directly.
 */
export function offeredHarnesses(
  statuses: Record<HarnessId, HarnessStatus>,
  allowed: readonly HarnessId[],
): Record<HarnessId, HarnessStatus> {
  const allowedSet = new Set<HarnessId>(allowed)
  const offered = {} as Record<HarnessId, HarnessStatus>
  for (const harness of HARNESS_IDS) {
    offered[harness] = allowedSet.has(harness) ? statuses[harness] : { path: null, version: null }
  }
  return offered
}

/** First harness this product offers, in profile order — the seeding/active-harness fallback. */
export function firstOfferedHarness(allowed: readonly HarnessId[]): HarnessId | undefined {
  return allowed[0]
}
