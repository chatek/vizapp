import { describe, expect, test } from 'vitest'
import { reconcileActiveHarness } from '../electron/main/harness-discovery'
import { offeredHarnesses } from '../electron/main/harness-offering'
import type { HarnessId, HarnessStatus } from '../src/types/api'
import { HARNESS_IDS } from '../src/types/api'
import type { JsonStateStore } from '../electron/main/store'

const installed = (harnesses: HarnessId[]): Record<HarnessId, HarnessStatus> => {
  const statuses = {} as Record<HarnessId, HarnessStatus>
  for (const harness of HARNESS_IDS) {
    statuses[harness] = harnesses.includes(harness) ? { path: `/usr/local/bin/${harness}`, version: '1.0.0' } : { path: null, version: null }
  }
  return statuses
}

// Test double: only `settings.activeHarness` is read/replaced by the reconciler, and the real
// AppSettings carries dozens of fields that are irrelevant here. The cast is the seam.
function settingsStore(activeHarness: HarnessId) {
  const state = { settings: { activeHarness } }
  const store = {
    update: async <T>(mutator: (draft: typeof state) => T): Promise<T> => mutator(state),
  }
  return { store: store as unknown as Pick<JsonStateStore, 'update'>, state }
}

describe('offeredHarnesses', () => {
  test('a product offering one harness reports the others as unavailable, without dropping keys', () => {
    const offered = offeredHarnesses(installed(['omp', 'prime', 'pi']), ['omp'])
    expect(Object.keys(offered).sort()).toEqual([...HARNESS_IDS].sort())
    expect(offered.omp.path).not.toBeNull()
    expect(offered.prime.path).toBeNull()
    expect(offered.pi.path).toBeNull()
  })

  test('offering everything changes nothing', () => {
    const discovered = installed(['omp', 'pi'])
    expect(offeredHarnesses(discovered, [...HARNESS_IDS])).toEqual(discovered)
  })

  test('a harness the product offers but the machine lacks stays unavailable', () => {
    // The product's set is a permission, not a promise: the selector still filters by path.
    expect(offeredHarnesses(installed([]), ['omp']).omp.path).toBeNull()
  })
})

describe('reconcileActiveHarness with a product set', () => {
  test('moves off a stored harness the product does not offer', async () => {
    const { store, state } = settingsStore('pi')
    await reconcileActiveHarness(store, offeredHarnesses(installed(['omp']), ['omp']), ['omp'])
    expect(state.settings.activeHarness).toBe('omp')
  })

  test('falls back to the product set even when nothing is detected', async () => {
    // Nothing installed: without this, a user upgrading from a generic build would keep
    // activeHarness=prime in a product that cannot show it.
    const { store, state } = settingsStore('prime')
    await reconcileActiveHarness(store, offeredHarnesses(installed([]), ['omp']), ['omp'])
    expect(state.settings.activeHarness).toBe('omp')
  })

  test('keeps a valid stored harness when the product offers it', async () => {
    const { store, state } = settingsStore('omp')
    await reconcileActiveHarness(store, offeredHarnesses(installed(['omp']), ['omp']), ['omp'])
    expect(state.settings.activeHarness).toBe('omp')
  })

  test('without a product set, behaviour is unchanged', async () => {
    const { store, state } = settingsStore('prime')
    await reconcileActiveHarness(store, installed(['omp', 'prime']))
    expect(state.settings.activeHarness).toBe('prime')
  })
})
