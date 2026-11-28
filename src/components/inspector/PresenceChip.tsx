import { useEffect, useState } from 'react'
import { subscribeFabricPresence, type FabricPresenceEntry } from '@/lib/events'

/**
 * D2 pane presence chip (ARC R6, feature-detected). Subscribes to the
 * `fabric:presence` typed event; with no data plane (no publisher) nothing
 * ever arrives and the chip renders nothing. Advisory only (§2.1): online
 * entries show `● <handle ?? shortNodeId>`, others show `○ last seen <relative>`
 * — there is no offline or idle state, and the dot is never an identity claim.
 */
export function PresenceChip({ className }: { className?: string }) {
  const [entries, setEntries] = useState<FabricPresenceEntry[]>([])
  useEffect(() => subscribeFabricPresence(setEntries), [])
  const rendered = entries.map((entry) => renderEntry(entry)).filter((copy): copy is string => copy !== null)
  if (rendered.length === 0) return null
  return (
    <span className={className === undefined ? 'presence-chips' : `presence-chips ${className}`}>
      {rendered.map((copy, index) => (
        <span key={`${copy}-${index}`} className={copy.startsWith('●') ? 'presence-chip presence-online' : 'presence-chip'}>
          {copy}
        </span>
      ))}
    </span>
  )
}

/** Short display form of a bare node id — first 8 characters. */
function shortNodeId(nodeId: string): string {
  return nodeId.slice(0, 8)
}

/** Compact relative time from epoch ms: `2h ago`; anything unparseable is `recently`. */
function relativeLastSeen(lastSeenMs: number | null, now: number = Date.now()): string {
  if (lastSeenMs === null || !Number.isFinite(lastSeenMs)) return 'recently'
  const seconds = Math.round((now - lastSeenMs) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function renderEntry(entry: FabricPresenceEntry): string | null {
  if (entry.online) return `● ${entry.handle ?? shortNodeId(entry.nodeId)}`
  if (entry.lastSeenMs !== null) return `○ last seen ${relativeLastSeen(entry.lastSeenMs)}`
  // No heartbeat age and not online: the contract renders nothing for this
  // entry (no offline verdict, no idle state).
  return null
}
