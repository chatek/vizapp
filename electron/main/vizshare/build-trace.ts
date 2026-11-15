/**
 * VizMaster@VClaw — build traceability (BUILD.json → registry record).
 *
 * The share bridge's traceability channel. `buildVizShow` writes the prompt
 * verbatim plus `toolsUsed` into `~/.vizmaster/vizshow/<build-id>/BUILD.json`;
 * the renderer cannot read that file (it must never need file access), so the
 * DESKTOP side of the broker reads it here and attaches it to submissions:
 *
 * - `GET /v1/build-trace?tutorialId=<lesson id>` lets the ShareSheet SHOW the
 *   author what will be recorded (prompt excerpt + tools) before submitting;
 * - `POST /v1/submit` overrides the submission's `promptExcerpt` with the
 *   matching build's excerpt, so the recorded value is a desktop-verified fact
 *   rather than a renderer claim. `toolsUsed` has no record field (the VizShow
 *   schema is `additionalProperties: false`), so it stops at the display
 *   channel — BUILD.json remains its durable home.
 *
 * The join key is the lesson: `BUILD.json.lesson` is the project-relative
 * source path whose filename stem equals the app's tutorial id. When several
 * builds exist for the same lesson, latest `createdAt` wins — the same
 * "latest build wins" rule the desktop's chip matching uses. This is display
 * metadata only; provenance stays server-stamped from the verified principal.
 *
 * Lookup is best-effort by contract: an unreadable or missing build root
 * resolves to `null` and never fails a submission.
 */
import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** The record schema's `promptExcerpt` cap (`vizshow.ts`); the build prompt may be 500. */
export const PROMPT_EXCERPT_MAX = 280

/** Mirrors `buildVizShow`'s root resolution (`VIZMASTER_VIZSHOW_DIR` override). */
const VIZSHOW_DIR_ENV = 'VIZMASTER_VIZSHOW_DIR'

/** The desktop's vizshow server serves only `status === 'done'` builds; so do we. */
const BUILD_STATUS_DONE = 'done'

export interface VizBuildTrace {
  buildId: string
  /** The build prompt, already truncated to PROMPT_EXCERPT_MAX. */
  promptExcerpt: string
  toolsUsed: string[]
}

/** The subset of BUILD.json this module consumes; unknown fields are ignored. */
interface BuildRecord {
  id: unknown
  prompt: unknown
  createdAt: unknown
  toolsUsed: unknown
  lesson: unknown
  status: unknown
}

function vizshowRoot(): string {
  const override = process.env[VIZSHOW_DIR_ENV]
  return override !== undefined && override.trim() !== ''
    ? resolve(override)
    : join(homedir(), '.vizmaster', 'vizshow')
}

/** Filename stem of a project-relative lesson path, e.g. "src/lessons/x.tsx" → "x". */
function lessonStem(lesson: unknown): string {
  if (typeof lesson !== 'string') return ''
  const base = lesson.split('/').pop() ?? lesson
  return base.endsWith('.tsx') ? base.slice(0, -'.tsx'.length) : base
}

function asTrace(dirName: string, record: BuildRecord): VizBuildTrace | null {
  if (record.id !== dirName || record.status !== BUILD_STATUS_DONE) return null
  if (typeof record.prompt !== 'string' || record.prompt.length === 0) return null
  const toolsUsed = Array.isArray(record.toolsUsed)
    ? record.toolsUsed.filter((tool): tool is string => typeof tool === 'string')
    : []
  return {
    buildId: dirName,
    promptExcerpt: record.prompt.slice(0, PROMPT_EXCERPT_MAX),
    toolsUsed,
  }
}

/**
 * Latest done build for `tutorialId`, or null when none matches. Never throws:
 * a broken staging directory or a missing root means "no trace", and the
 * submission proceeds without traceability rather than failing.
 */
export async function latestBuildTrace(tutorialId: string): Promise<VizBuildTrace | null> {
  if (tutorialId.length === 0) return null
  const root = vizshowRoot()
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return null
  }

  let best: { trace: VizBuildTrace; createdAt: string } | null = null
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.staging-')) continue
    let raw: string
    try {
      raw = await readFile(join(root, entry.name, 'BUILD.json'), 'utf8')
    } catch {
      continue
    }
    let record: BuildRecord
    try {
      record = JSON.parse(raw) as BuildRecord
    } catch {
      continue
    }
    if (lessonStem(record.lesson) !== tutorialId) continue
    const trace = asTrace(entry.name, record)
    if (trace === null) continue
    const createdAt = typeof record.createdAt === 'string' ? record.createdAt : ''
    // Latest createdAt wins; the build id (UTC stamp prefix) breaks a tie,
    // the same ordering the desktop's build listing uses.
    if (
      best === null ||
      createdAt > best.createdAt ||
      (createdAt === best.createdAt && entry.name > best.trace.buildId)
    ) {
      best = { trace, createdAt }
    }
  }
  return best === null ? null : best.trace
}
