/**
 * RAM-only cache for the agent's pushed registry assertion (spec §3.2 A,
 * ruling §8.1). The agent runtime mints short-lived NKey assertions
 * (aud vizmaster-registry-vcc) in its own process — the seed never leaves
 * the agent — and pushes them here. The broker holds the LATEST one so a
 * later cutover (migration step 3) can point getAccessToken at it; the
 * broker itself never validates the JWT (the registry's compound verifier
 * owns that) and NEVER serves it to any renderer: there is no read route,
 * and the value lives only in module memory — no disk, no IPC, no log.
 */

export interface AgentAssertionEntry {
  assertion: string
  receivedAt: number
}

/** A JWT-shaped assertion is hundreds of bytes; 16 KiB is generous. */
export const AGENT_ASSERTION_MAX_BYTES = 16 * 1024

let latest: AgentAssertionEntry | null = null

export type StoreAgentAssertionResult = { ok: true; bytes: number } | { ok: false; error: string }

/** Validates and stores the pushed assertion; returns a typed refusal otherwise. */
export function storeAgentAssertion(assertion: unknown): StoreAgentAssertionResult {
  if (typeof assertion !== 'string' || assertion.trim().length === 0) {
    return { ok: false, error: 'invalid_assertion' }
  }
  const trimmed = assertion.trim()
  const bytes = Buffer.byteLength(trimmed, 'utf8')
  if (bytes > AGENT_ASSERTION_MAX_BYTES) {
    return { ok: false, error: 'assertion_too_large' }
  }
  latest = { assertion: trimmed, receivedAt: Date.now() }
  return { ok: true, bytes }
}

/** The latest pushed assertion, or null when none has arrived (or was cleared). */
export function latestAgentAssertion(): AgentAssertionEntry | null {
  return latest === null ? null : { ...latest }
}

/** Test seam: wipe the module-memory cache. */
export function clearAgentAssertionForTests(): void {
  latest = null
}
