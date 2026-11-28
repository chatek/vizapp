/**
 * D2 pane presence (ARC R6 read surface, feature-detected).
 *
 * The pane chrome asks the EMBEDDED SITE for the roster presence snapshot:
 * a same-origin `/api/v1/roster` fetch inside the vizmaster.app pane, so the
 * portal session cookie applies and the desktop holds no extra credentials.
 * The registry route does not exist yet (ARC_PRESENCE bucket is target-only),
 * so every failure — 404 pre-flip, non-JSON body, malformed payload, transport
 * error, guest not ready — yields `null` and the indicator stays hidden. This
 * mirrors the site's `fetchRoster` contract (landing `api.ts`): never invent
 * state.
 *
 * Advisory only (docs/lanes/VIZAPP_ARC_CLIENT_UX_2026-11-17.md §2.1):
 * `online` = heartbeat answered within the TTL (~90 s); otherwise
 * `○ last seen <relative>`. Never "offline forever", no idle state; stale
 * entries are hidden upstream (SDK presence snapshot). The dot is advisory
 * and never an identity claim. English-only copy.
 */

/** Presence of one roster row, or `null` when the snapshot hides it (stale). */
export interface PanePresence {
  online: boolean
  /** ISO timestamp of the last observed heartbeat. */
  lastSeen: string
}

interface RosterPayload {
  roster?: Array<{ handle?: unknown; presence?: { online?: unknown; lastSeen?: unknown } | null }>
}

/**
 * Page-side probe. Runs in the pane guest (see BrowserPanel `runInPage`);
 * resolves to a JSON string of roster rows or `null`. Returning `null` —
 * never throwing — keeps the chip hidden on every pre-R6 and error path.
 */
export function panePresenceScript(): string {
  return `(async () => {
  try {
    const res = await fetch('/api/v1/roster', { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !Array.isArray(data.roster)) return null
    return JSON.stringify(data.roster)
  } catch { return null }
})()`
}

/**
 * Parses the probe result into validated rows. Anything malformed (wrong
 * shape, non-string handle, malformed presence) drops that row; a payload
 * that is not usable at all parses to `[]` — the chip stays hidden.
 */
export function parsePaneRoster(raw: string | null): Array<{ handle: string; presence: PanePresence | null }> {
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const rows: Array<{ handle: string; presence: PanePresence | null }> = []
  for (const entry of parsed) {
    if (entry === null || typeof entry !== 'object' || !('handle' in entry)) continue
    const handle = entry.handle
    if (typeof handle !== 'string') continue
    const rawPresence = entry.presence
    if (rawPresence === null || rawPresence === undefined) {
      rows.push({ handle, presence: null })
      continue
    }
    if (typeof rawPresence !== 'object' || !('online' in rawPresence) || !('lastSeen' in rawPresence)) continue
    const { online, lastSeen } = rawPresence
    if (typeof online !== 'boolean' || typeof lastSeen !== 'string') continue
    rows.push({ handle, presence: { online, lastSeen } })
  }
  return rows
}

/** Handle comparison ignores the display-form leading `@` on either side. */
function normalizeHandle(handle: string): string {
  return handle.startsWith('@') ? handle.slice(1) : handle
}

/**
 * The signed-in account's row, or `null` when signed out, absent from the
 * roster, or its presence entry is hidden (stale). A human who owns no
 * running agent still has a roster row — it renders via its presence fields,
 * never an invented offline verdict.
 */
export function selectOwnPresence(raw: string | null, authName: string | null): PanePresence | null {
  if (authName === null) return null
  const wanted = normalizeHandle(authName)
  const row = parsePaneRoster(raw).find((candidate) => normalizeHandle(candidate.handle) === wanted)
  return row?.presence ?? null
}

/** Compact relative time, English-only: `just now`, `5m`, `2h`, `3d`. */
export function formatLastSeen(lastSeen: string, now: number = Date.now()): string {
  const ts = Date.parse(lastSeen)
  if (Number.isNaN(ts)) return 'unknown'
  const seconds = Math.max(0, Math.round((now - ts) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

/**
 * Chip copy. `null` presence (stale/hidden upstream or no row) renders
 * nothing — there is no offline or idle state to show.
 */
export function panePresenceCopy(presence: PanePresence | null, now: number = Date.now()): string | null {
  if (presence === null) return null
  return presence.online ? '● online' : `○ last seen ${formatLastSeen(presence.lastSeen, now)}`
}
