import { EventEmitter } from 'node:events'
import type { ChildProcess } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { PREVIEW_URL, ensureProjectPreview } from '../../electron/main/vizmaster-preview'

/**
 * `npm run preview` and `npm run dev` both use `--strictPort`, so a non-zero spawn exit means the
 * port is ALREADY SERVED, not that the preview failed. These cases pin that reading — the whole
 * feature is wrong the day we "fix" it into an error.
 */
function fakeChild(): ChildProcess & { fail(code: number): void; crash(): void } {
  const child = new EventEmitter() as unknown as ChildProcess & { fail(code: number): void; crash(): void }
  ;(child as unknown as { unref: () => void }).unref = () => undefined
  child.fail = (code: number) => { queueMicrotask(() => child.emit('exit', code)) }
  child.crash = () => { queueMicrotask(() => child.emit('error', new Error('EAGAIN'))) }
  return child
}

const project = { projectExists: () => true }
const noProject = { projectExists: () => false }

describe('live project preview (5174)', () => {
  it('navigates without spawning when something already serves the port', async () => {
    const spawnPreview = vi.fn()
    await expect(ensureProjectPreview({ ...project, probe: async () => true, spawnPreview })).resolves.toEqual({
      ok: true, url: PREVIEW_URL, started: false, note: 'already_serving',
    })
    expect(spawnPreview).not.toHaveBeenCalled()
    expect(PREVIEW_URL).toBe('http://localhost:5174/')
  })

  it('spawns once and answers the port when it comes up', async () => {
    let probes = 0
    const child = fakeChild()
    const spawnPreview = vi.fn(() => child)
    const result = await ensureProjectPreview({
      ...project,
      pollIntervalMs: 1,
      probe: async () => { probes += 1; return probes > 1 },
      spawnPreview,
    })
    expect(spawnPreview).toHaveBeenCalledWith({ mode: 'preview', cwd: expect.any(String) })
    expect(result).toEqual({ ok: true, url: PREVIEW_URL, started: true, note: 'started' })
  })

  it('treats a non-zero strictPort exit as already served and navigates anyway', async () => {
    const child = fakeChild()
    let probes = 0
    const result = await ensureProjectPreview({
      ...project,
      pollIntervalMs: 1,
      spawnPreview: () => { child.fail(1); return child },
      probe: async () => { probes += 1; return probes > 2 },
    })
    expect(result).toEqual({ ok: true, url: PREVIEW_URL, started: true, note: 'already_serving' })
  })

  it('answers the URL when the port is still coming up instead of reporting failure', async () => {
    const child = fakeChild()
    const result = await ensureProjectPreview({
      ...project,
      timeoutMs: 5,
      pollIntervalMs: 1,
      probe: async () => false,
      spawnPreview: () => child,
    })
    expect(result).toEqual({ ok: true, url: PREVIEW_URL, started: true, note: 'not_ready' })
  })

  it('refuses only when nothing could even be started', async () => {
    await expect(ensureProjectPreview({ ...noProject, probe: async () => false, spawnPreview: vi.fn() })).resolves.toEqual({
      ok: false, url: PREVIEW_URL, started: false, error: 'no_project',
    })

    const enoent = Object.assign(new Error('spawn npm ENOENT'), { code: 'ENOENT' })
    await expect(ensureProjectPreview({
      ...project,
      probe: async () => false,
      spawnPreview: () => { throw enoent },
    })).resolves.toEqual({ ok: false, url: PREVIEW_URL, started: false, error: 'npm_missing' })
  })

  it('honours the dev mode request', async () => {
    const child = fakeChild()
    const spawnPreview = vi.fn(() => child)
    await ensureProjectPreview({ ...project, pollIntervalMs: 1, probe: async () => true, spawnPreview })
    expect(spawnPreview).toHaveBeenCalledTimes(0)

    let probes = 0
    await ensureProjectPreview({ ...project, mode: 'dev', pollIntervalMs: 1, probe: async () => { probes += 1; return probes > 1 }, spawnPreview })
    expect(spawnPreview).toHaveBeenLastCalledWith({ mode: 'dev', cwd: expect.any(String) })
  })
})
