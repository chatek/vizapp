import { spawn as spawnProcess, type ChildProcess } from 'node:child_process'
import { statSync } from 'node:fs'
import { vizmasterProjectRoot } from './vizshow-service'
import type { VizmasterPreviewResult } from '../../src/types/api'

/**
 * The LIVE project preview: `npm run preview` (dist, zero-toolchain) or `npm run dev` (HMR) in
 * `~/.vizmaster/default`, served on 5174.
 *
 * Both scripts use `--strictPort`, which is load-bearing and counter-intuitive: a second spawn
 * ABORTS with EADDRINUSE instead of drifting to 5175. So a non-zero spawn exit is NOT an error —
 * it is the strongest available signal that something is already serving 5174, and the desktop
 * must navigate anyway. Reporting "failed" there would strand a working preview.
 *
 * The invariant this module keeps: the returned URL is always `http://localhost:5174/`, and the
 * only hard failure is "nothing responded AND the process could not even start".
 */

export const PREVIEW_PORT = 5174

export const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}/`

export type PreviewMode = 'preview' | 'dev'

export interface PreviewSpawnRequest {
  mode: PreviewMode
  cwd: string
}

export type PreviewSpawner = (request: PreviewSpawnRequest) => ChildProcess

export interface EnsureProjectPreviewOptions {
  projectRoot?: string
  mode?: PreviewMode
  /** How long to wait for the port before answering anyway. */
  timeoutMs?: number
  pollIntervalMs?: number
  /** Injected in tests: neither a real port nor a real process. */
  probe?: (url: string) => Promise<boolean>
  spawnPreview?: PreviewSpawner
  /** True when the project directory is missing — a spawn there fails with ENOENT, not EADDRINUSE. */
  projectExists?: (path: string) => boolean
}

const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_POLL_MS = 250

async function portAnswers(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(1_500) })
    // Any HTTP answer means a server owns the port; the status itself is the project's business.
    return response.status > 0
  } catch {
    return false
  }
}

function spawnNpm(request: PreviewSpawnRequest): ChildProcess {
  // Detached + unref: the preview must outlive this call (the user keeps browsing), and its
  // output is the shell's, not ours.
  return spawnProcess('npm', ['run', request.mode], {
    cwd: request.cwd,
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
}

/**
 * Ensures something serves `http://localhost:5174/` and answers with the URL to navigate to,
 * whatever happened:
 *   · already serving           → `{ ok, started: false }`
 *   · spawned, port answered    → `{ ok, started: true }`
 *   · spawned, exited non-zero  → EADDRINUSE ⇒ `{ ok, started: true, note: 'already_serving' }`
 *   · spawned, still not ready  → `{ ok, started: true, note: 'not_ready' }` (the pane opens and
 *                                  the dev server catches up; the alternative is refusing a URL
 *                                  that is about to work)
 *   · nothing started at all    → `{ ok: false, error }` (missing project, npm not runnable)
 */
export async function ensureProjectPreview(options: EnsureProjectPreviewOptions = {}): Promise<VizmasterPreviewResult> {
  const projectRoot = options.projectRoot ?? vizmasterProjectRoot()
  const mode = options.mode ?? 'preview'
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const pollMs = options.pollIntervalMs ?? DEFAULT_POLL_MS
  const probe = options.probe ?? portAnswers
  const spawnPreview = options.spawnPreview ?? spawnNpm

  const already = async (): Promise<VizmasterPreviewResult> => ({
    ok: true,
    url: PREVIEW_URL,
    started: false,
    note: 'already_serving',
  })

  if (await probe(PREVIEW_URL)) return already()

  const exists = options.projectExists ?? ((path: string) => {
    try { return statSync(path).isDirectory() } catch { return false }
  })
  if (!exists(projectRoot)) return { ok: false, url: PREVIEW_URL, started: false, error: 'no_project' }

  let child: ChildProcess
  try {
    child = spawnPreview({ mode, cwd: projectRoot })
  } catch (error) {
    // Even a broken spawn is only fatal if nothing answers the port.
    if (await probe(PREVIEW_URL)) return already()
    return { ok: false, url: PREVIEW_URL, started: false, error: error instanceof Error && 'code' in error && error.code === 'ENOENT' ? 'npm_missing' : 'spawn_failed' }
  }
  child.unref?.()

  let exitCode: number | null | undefined
  child.once('exit', (code) => { exitCode = code })
  child.once('error', () => { exitCode = -1 })

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await probe(PREVIEW_URL)) return { ok: true, url: PREVIEW_URL, started: true, note: 'started' }
    if (exitCode !== undefined) {
      // strictPort: an abort means the port is taken. Confirm it really answers before claiming
      // so, then navigate regardless — refusing here would break a preview that already works.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (await probe(PREVIEW_URL)) return { ok: true, url: PREVIEW_URL, started: true, note: 'already_serving' }
        await new Promise((resolve) => setTimeout(resolve, pollMs))
      }
      return exitCode === -1
        ? { ok: false, url: PREVIEW_URL, started: false, error: 'npm_missing' }
        : { ok: true, url: PREVIEW_URL, started: true, note: 'already_serving' }
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }
  // The port has not answered yet but a process was started: the pane may open into a build in
  // progress, which is better than telling the user their preview failed.
  return { ok: true, url: PREVIEW_URL, started: true, note: 'not_ready' }
}
