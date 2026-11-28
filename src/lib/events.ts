/**
 * Thin re-export so existing imports keep working. The implementation lives in
 * `events/parse.ts` (record coercion), `events/compaction.ts` (compaction
 * policy), `events/reduce.ts` (the reducers), and `events/ids.ts` (transcript
 * identity).
 */
export {
  applyPrimeEvent,
  createSteerAcceptedEvent,
  createSteerPickupEvent,
  createPrimeEventBuffer,
  replayPrimeEvents,
  type PrimeEventBuffer,
  type PrimeEventReplayStats,
} from './events/reduce'
export { resetTranscriptIdsForTests } from './events/ids'

/**
 * One roster entry's advisory presence from the `fabric:presence` typed event.
 * `online` = heartbeat answered within the TTL (~90 s); `lastSeenMs` is the
 * epoch ms of the last observed heartbeat, null when unknown. Advisory only:
 * the chip says `last seen`, never an offline verdict, and the dot is never
 * an identity claim (docs/lanes/VIZAPP_ARC_CLIENT_UX_2026-11-17.md §2.1).
 */
export interface FabricPresenceEntry {
  nodeId: string
  handle: string | null
  online: boolean
  lastSeenMs: number | null
}

/**
 * `fabric:presence` — renderer-subscribed typed event only for now.
 * Publisher lands with the fabric-service (ARC R6); until then no event is
 * ever emitted, so the PresenceChip renders nothing (stale hidden).
 */
type FabricPresenceListener = (entries: FabricPresenceEntry[]) => void

const fabricPresenceListeners = new Set<FabricPresenceListener>()

/** Subscribe to `fabric:presence`; returns the unsubscribe function. */
export function subscribeFabricPresence(listener: FabricPresenceListener): () => void {
  fabricPresenceListeners.add(listener)
  return () => {
    fabricPresenceListeners.delete(listener)
  }
}

/**
 * Delivery seam for the future fabric-service publisher (and tests): routes a
 * `fabric:presence` payload to every current subscriber. No-op with no
 * subscribers.
 */
export function publishFabricPresence(entries: FabricPresenceEntry[]): void {
  for (const listener of [...fabricPresenceListeners]) listener(entries)
}
