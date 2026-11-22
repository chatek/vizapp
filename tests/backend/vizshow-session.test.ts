import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { VizshowScanEntry } from '../../electron/main/vizshow-service'
import { renderStatusPage, VizshowService } from '../../electron/main/vizshow-service'
import { matchBuildToSession, readSessionTimeline } from '../../electron/main/vizshow-session'

const paths: string[] = []
afterEach(() => {
  for (const path of paths.splice(0)) rmSync(path, { recursive: true, force: true })
})

function sessionFile(lines: Array<Record<string, unknown>>): string {
  const dir = mkdtempSync(join(tmpdir(), 'vizshow-session-'))
  paths.push(dir)
  const file = join(dir, 'session.jsonl')
  writeFileSync(file, `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`)
  return file
}

function userPrompt(text: string, at: string): Record<string, unknown> {
  return {
    type: 'message',
    timestamp: at,
    message: { role: 'user', content: [{ type: 'text', text }], timestamp: Date.parse(at) },
  }
}

function entry(overrides: Partial<VizshowScanEntry> & { id: string }): VizshowScanEntry {
  return { status: 'done', createdAt: '2026-11-22T10:00:00.000Z', ...overrides }
}

describe('matchBuildToSession', () => {
  const startedAt = '2026-11-22T09:59:00.000Z'
  const timeline = {
    startedAt,
    lastMessageAt: '2026-11-22T10:05:00.000Z',
    userPrompts: ['build a tetrahedron'],
  }

  it('matches a finished build by exact prompt', () => {
    const match = matchBuildToSession(timeline, [
      entry({ id: 'b1', prompt: 'build a tetrahedron', createdAt: '2026-11-22T10:01:00.000Z' }),
      entry({ id: 'b0', prompt: 'other', createdAt: '2026-11-22T10:02:00.000Z' }),
    ])
    expect(match).toMatchObject({ buildId: 'b1', status: 'done', matchedBy: 'prompt' })
  })

  it('reports an unfinished build that matches the prompt instead of hiding it', () => {
    const match = matchBuildToSession(timeline, [
      entry({ id: 'staging', status: 'incomplete', prompt: 'build a tetrahedron', detail: 'build in progress' }),
    ])
    expect(match).toMatchObject({ buildId: 'staging', status: 'incomplete', matchedBy: 'prompt' })
  })

  it('prefers a finished build over an unfinished one with the same prompt', () => {
    const match = matchBuildToSession(timeline, [
      entry({ id: 'unfinished', status: 'broken', prompt: 'build a tetrahedron', createdAt: '2026-11-22T10:04:00.000Z' }),
      entry({ id: 'finished', status: 'done', prompt: 'build a tetrahedron', createdAt: '2026-11-22T10:01:00.000Z' }),
    ])
    expect(match?.buildId).toBe('finished')
  })

  it('falls back to the newest build inside the session window', () => {
    const match = matchBuildToSession(timeline, [
      entry({ id: 'before', prompt: 'earlier work', createdAt: '2026-11-22T08:00:00.000Z' }),
      entry({ id: 'inside', prompt: 'a reworded prompt', createdAt: '2026-11-22T10:03:00.000Z' }),
    ])
    expect(match).toMatchObject({ buildId: 'inside', matchedBy: 'window' })
  })

  it('returns null when nothing belongs to the session', () => {
    const match = matchBuildToSession(timeline, [entry({ id: 'before', createdAt: '2026-11-22T08:00:00.000Z' })])
    expect(match).toBeNull()
  })
})

describe('readSessionTimeline', () => {
  it('collects the start stamp, last message stamp and user prompts in order', async () => {
    const file = sessionFile([
      { type: 'session', version: 3, id: 's1', timestamp: '2026-11-22T09:00:00.000Z' },
      userPrompt('first', '2026-11-22T09:01:00.000Z'),
      { type: 'message', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] } },
      userPrompt('second', '2026-11-22T09:05:00.000Z'),
    ])
    const timeline = await readSessionTimeline(file)
    expect(timeline.startedAt).toBe('2026-11-22T09:00:00.000Z')
    expect(timeline.lastMessageAt).toBe('2026-11-22T09:05:00.000Z')
    expect(timeline.userPrompts).toEqual(['first', 'second'])
  })
})

describe('renderStatusPage', () => {
  it('states the status and escapes untrusted prompt text', () => {
    const html = renderStatusPage(
      { id: 'b1', status: 'broken', prompt: '<script>alert(1)</script>', detail: 'BUILD.json missing' },
      'b1',
    )
    expect(html).toContain('broken')
    expect(html).toContain('BUILD.json missing')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders the empty state when a session has no build', () => {
    const html = renderStatusPage(null, null)
    expect(html).toContain('No VizShow build for this session')
  })
})

describe('VizshowService status route', () => {
  it('serves the status page for a broken build directory over loopback', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vizshow-root-'))
    paths.push(root)
    const id = '20261122T100000Z-broken-aaaa'
    mkdirSync(join(root, id))
    writeFileSync(join(root, id, 'BUILD.json'), '{ not json')
    const service = new VizshowService({ root, port: 0 })
    try {
      const resolved = await service.statusUrl(id)
      expect(resolved.ok).toBe(true)
      if (!resolved.ok) return
      const response = await fetch(resolved.url)
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      const body = await response.text()
      expect(body).toContain('Build is broken')
      expect(body).toContain(id)
    } finally {
      await service.stop()
    }
  })
})
