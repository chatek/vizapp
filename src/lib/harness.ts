import type { HarnessId } from '@/types/api'

// VizMaster build: OMP Work is the only harness offered. The menu already filters by
// installed harnesses; restricting the ORDER removes Prime/Pi from the dropdown without
// touching detection, stored settings, or any other consumer of the harness registry.
export const HARNESS_SELECTOR_ORDER: readonly HarnessId[] = ['omp']

/** Product name shown in window chrome and the brand switcher. */
export const HARNESS_PRODUCT_NAMES: Record<HarnessId, string> = { prime: 'Prime Work', omp: 'OMP Work', pi: 'Pi Work' }

/** The agent each harness runs, used in settings and error copy. */
export const HARNESS_AGENT_NAMES: Record<HarnessId, string> = { prime: 'Prime Agent', omp: 'OMP', pi: 'Pi' }

/** Short conversational name ("Prime is working"). */
export const HARNESS_SHORT_NAMES: Record<HarnessId, string> = { prime: 'Prime', omp: 'OMP', pi: 'Pi' }
