import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShowsService, newestShowBuild, parseShowManifest, showsRoot } from '../../electron/main/shows-service'
import type { VizshowBuild, VizshowShow } from '../../src/types/api'

/**
 * The show contract agreed with the proposal lane: a show is announced when its SHOW.json
 * CHANGES, never because a file appeared inside its directory. Everything here is a fake
 * filesystem, so the rule is tested rather than the OS watcher's timing.
 */

const root = '/home/user/.vizmaster/shows'

function harness(files: Record<string, { show: unknown; mtime: number } | { raw: string; mtime: number }>) {
  const state = new Map(Object.entries(files))
  const service = new ShowsService({
    root,
    readdir: () => [...new Set([...state.keys()].map((path) => path.split('/')[0]))],
    readFile: (path) => {
      const key = path.slice(`${root}/`.length).split('/')[0]
      const entry = state.get(key)
      if (!entry) throw new Error('missing')
      return 'raw' in entry ? entry.raw : JSON.stringify(entry.show)
    },
    mtime: (path) => {
      const key = path.slice(`${root}/`.length).split('/')[0]
      const entry = state.get(key)
      if (!entry) throw new Error('missing')
      return entry.mtime
    },
  })
  const touch = (id: string, show: unknown, mtime: number): void => { state.set(id, { show, mtime }) }
  return { service, touch, state }
}

const show = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Show ${id}`,
  slug: id,
  prompt: 'make me a lesson',
  createdAt: '2026-11-07T00:00:00.000Z',
  updatedAt: '2026-11-07T01:00:00.000Z',
  builds: ['build-a', 'build-b'],
  ...overrides,
})

afterEach(() => { vi.restoreAllMocks() })

describe('show manifest', () => {
  it('accepts a well-formed show whose id matches its directory', () => {
    expect(parseShowManifest(show('quadratic'), 'quadratic')).toEqual({
      id: 'quadratic',
      name: 'Show quadratic',
      slug: 'quadratic',
      prompt: 'make me a lesson',
      createdAt: '2026-11-07T00:00:00.000Z',
      updatedAt: '2026-11-07T01:00:00.000Z',
      builds: ['build-a', 'build-b'],
    })
  })

  it('drops an id that disagrees with the directory, and every unprovable field', () => {
    expect(parseShowManifest(show('quadratic'), 'other'), 'copied directory').toBeNull()
    expect(parseShowManifest(show('../escape'), '../escape')).toBeNull()
    expect(parseShowManifest(show('a', { name: '' }), 'a')).toBeNull()
    expect(parseShowManifest(show('a', { slug: 42 }), 'a')).toBeNull()
    expect(parseShowManifest([], 'a')).toBeNull()
    expect(parseShowManifest(null, 'a')).toBeNull()
  })

  it('keeps only build ids and preserves the creator order', () => {
    const parsed = parseShowManifest(show('a', { builds: ['b-2', '../x', 'b-1', 'b-2', 7, ''] }), 'a')
    expect(parsed?.builds).toEqual(['b-2', 'b-1'])
    expect(parseShowManifest(show('a', { builds: 'nope' }), 'a')?.builds).toEqual([])
  })

  it('resolves the root from the shared layout, overridable by env', () => {
    expect(showsRoot({ VIZMASTER_HOME: '/tmp/vm' })).toBe('/tmp/vm/shows')
    expect(showsRoot({ VIZMASTER_SHOWS_DIR: '/tmp/shows' })).toBe('/tmp/shows')
  })
})

describe('shows watcher', () => {
  it('announces once per SHOW.json change and not for an unchanged file', () => {
    const { service, touch } = harness({ alpha: { show: show('alpha'), mtime: 1_000 } })
    const seen: string[][] = []
    service.onChanged((snapshot) => seen.push(snapshot.shows.map((entry) => entry.id)))
    try {
      service.start()
      expect(seen).toEqual([['alpha']])

      // Same mtime ⇒ same manifest ⇒ silence.
      service.refresh()
      expect(seen).toEqual([['alpha']])

      // A real edit: one announcement, exactly.
      touch('alpha', show('alpha', { updatedAt: '2026-11-07T02:00:00.000Z' }), 2_000)
      service.refresh()
      expect(seen).toEqual([['alpha'], ['alpha']])
      expect(service.snapshot().latest?.updatedAt).toBe('2026-11-07T02:00:00.000Z')
    } finally { service.stop() }
  })

  it('drops a malformed SHOW.json without affecting the others', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { service } = harness({
      good: { show: show('good'), mtime: 1 },
      broken: { raw: '{ not json', mtime: 1 },
      mismatched: { show: show('other'), mtime: 1 },
      noName: { show: show('noName', { name: 42 }), mtime: 1 },
    })
    try {
      service.start()
      expect(service.snapshot().shows.map((entry) => entry.id)).toEqual(['good'])
      expect(warn).not.toHaveBeenCalled()
    } finally { service.stop() }
  })

  it('is inert for a missing or empty root', () => {
    const missing = new ShowsService({ root, readdir: () => { throw new Error('ENOENT') } })
    expect(() => missing.start()).not.toThrow()
    expect(missing.snapshot()).toEqual({ shows: [], latest: null })
    missing.stop()

    const empty = new ShowsService({ root, readdir: () => [] })
    empty.start()
    expect(empty.snapshot()).toEqual({ shows: [], latest: null })
    empty.stop()
  })

  it('orders the snapshot by updatedAt and exposes the latest', () => {
    const { service } = harness({
      older: { show: show('older', { updatedAt: '2026-11-07T00:00:00.000Z' }), mtime: 1 },
      newer: { show: show('newer', { updatedAt: '2026-11-08T00:00:00.000Z' }), mtime: 1 },
    })
    try {
      service.start()
      expect(service.snapshot().shows.map((entry) => entry.id)).toEqual(['newer', 'older'])
      expect(service.snapshot().latest?.id).toBe('newer')
    } finally { service.stop() }
  })
})

describe('show build resolution', () => {
  const builds: VizshowBuild[] = [
    { id: 'build-c', status: 'done', entry: 'index.html', createdAt: '2026-11-07T03:00:00.000Z' },
    { id: 'build-b', status: 'done', entry: 'index.html', createdAt: '2026-11-07T02:00:00.000Z' },
    { id: 'build-a', status: 'done', entry: 'index.html', createdAt: '2026-11-07T01:00:00.000Z' },
  ]
  const listed: VizshowShow = { id: 's', name: 'S', slug: 's', builds: ['build-a', 'build-b'] }

  it('picks the newest build the show actually lists', () => {
    expect(newestShowBuild(listed, builds)?.id).toBe('build-b')
  })

  it('returns nothing when the show lists no build the desktop knows', () => {
    expect(newestShowBuild({ ...listed, builds: ['gone'] }, builds)).toBeNull()
    expect(newestShowBuild({ ...listed, builds: [] }, builds)).toBeNull()
  })

  it('serves the show root path used by the watcher', () => {
    expect(join(root, 'alpha', 'SHOW.json')).toBe('/home/user/.vizmaster/shows/alpha/SHOW.json')
  })
})
