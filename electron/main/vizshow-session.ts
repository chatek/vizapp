import { createReadStream, existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import type { VizshowScanEntry } from './vizshow-service'

/**
 * Best-effort mapping from a chat session to the VizShow it produced, including builds that are
 * not servable yet.
 *
 * A build directory carries no session id: `BUILD.json` records the prompt verbatim, the
 * creation time, and the lesson. So the association is inferred, in order:
 *
 *   1. PROMPT — exact string equality with the session's latest user message (the same rule the
 *      composer chip uses). A finished build wins over an unfinished one.
 *   2. WINDOW — the newest entry created between the session's first entry and its last message
 *      (+1 min), finished preferred. This catches prompts the agent quoted or trimmed.
 *
 * No match is a valid answer: the caller shows the "no build for this session" status page
 * rather than guessing.
 */
export interface SessionVizShowMatch {
  buildId: string
  status: VizshowScanEntry['status']
  matchedBy: 'prompt' | 'window'
  prompt?: string
  createdAt?: string
  detail?: string
}

export interface SessionTimeline {
  startedAt: string | null
  lastMessageAt: string | null
  /** Every user-authored text block, oldest → newest. */
  userPrompts: string[]
}

const WINDOW_GRACE_MS = 60_000

/** Read the session JSONL: start stamp, last message stamp, and user prompts in order. */
export async function readSessionTimeline(sessionFile: string): Promise<SessionTimeline> {
  const timeline: SessionTimeline = { startedAt: null, lastMessageAt: null, userPrompts: [] }
  if (!existsSync(sessionFile)) return timeline
  const reader = createInterface({ input: createReadStream(sessionFile), crlfDelay: Infinity })
  for await (const line of reader) {
    if (!line.trim()) continue
    let entry: unknown
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as { type?: unknown; timestamp?: unknown; message?: unknown }
    if (record.type === 'session' && typeof record.timestamp === 'string') {
      timeline.startedAt ??= record.timestamp
      continue
    }
    if (record.type !== 'message') continue
    const message = record.message as { role?: unknown; content?: unknown; timestamp?: unknown } | undefined
    if (!message) continue
    if (typeof message.timestamp === 'number' && Number.isFinite(message.timestamp)) {
      timeline.lastMessageAt = new Date(message.timestamp).toISOString()
    } else if (typeof record.timestamp === 'string') {
      timeline.lastMessageAt = record.timestamp
    }
    if (message.role !== 'user' || !Array.isArray(message.content)) continue
    for (const block of message.content) {
      if (typeof block !== 'object' || block === null) continue
      const part = block as { type?: unknown; text?: unknown }
      if (part.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
        timeline.userPrompts.push(part.text)
      }
    }
  }
  return timeline
}

function toMatch(entry: VizshowScanEntry, matchedBy: SessionVizShowMatch['matchedBy']): SessionVizShowMatch {
  return {
    buildId: entry.id,
    status: entry.status,
    matchedBy,
    prompt: entry.prompt,
    createdAt: entry.createdAt,
    detail: entry.detail,
  }
}

/** Pick the entry that belongs to a session, or null when nothing is defensible. */
export function matchBuildToSession(
  timeline: SessionTimeline,
  entries: readonly VizshowScanEntry[],
): SessionVizShowMatch | null {
  // Newest first: callers pass the scan order, but sort defensively.
  const sorted = [...entries].sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''))
  const latestPrompt = timeline.userPrompts.at(-1)?.trim()
  if (latestPrompt) {
    const finished = sorted.find((entry) => entry.status === 'done' && entry.prompt?.trim() === latestPrompt)
    if (finished) return toMatch(finished, 'prompt')
    const unfinished = sorted.find((entry) => entry.prompt?.trim() === latestPrompt)
    if (unfinished) return toMatch(unfinished, 'prompt')
  }
  if (!timeline.startedAt || timeline.userPrompts.length === 0) return null
  const started = Date.parse(timeline.startedAt)
  if (!Number.isFinite(started)) return null
  const ended = timeline.lastMessageAt ? Date.parse(timeline.lastMessageAt) + WINDOW_GRACE_MS : Number.POSITIVE_INFINITY
  const within = (entry: VizshowScanEntry): boolean => {
    const created = Date.parse(entry.createdAt ?? '')
    return Number.isFinite(created) && created >= started && created <= ended
  }
  const finished = sorted.find((entry) => entry.status === 'done' && within(entry))
  if (finished) return toMatch(finished, 'window')
  const unfinished = sorted.find(within)
  return unfinished ? toMatch(unfinished, 'window') : null
}

export interface FindVizShowOptions {
  sessionFile: string
  entries: readonly VizshowScanEntry[]
}

/** Async convenience wrapper used by the IPC handler. */
export async function findVizShowForSession(options: FindVizShowOptions): Promise<SessionVizShowMatch | null> {
  const timeline = await readSessionTimeline(options.sessionFile)
  return matchBuildToSession(timeline, options.entries)
}
