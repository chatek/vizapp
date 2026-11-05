import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  buildPosterSplashShell,
  OFFICIAL_VIZSHOW_FEATURED_URL,
  officialAttribution,
  refreshOfficialSplashScene,
  selectSplashScene,
  shouldShowSplash,
  type SplashFetch,
  type SplashFilesystem,
} from '../electron/main/splash'

const homeDir = '/home/user'
const profileId = 'vizmaster'
const showsDir = join(homeDir, '.vizmaster', 'shows')
const cacheDir = join(homeDir, '.vizmaster', 'cache', 'splash')
const bundledDir = join('/res', 'splash')
const sceneHtml = '<!doctype html><html><body>scene</body></html>'

const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex')

interface FakeSplashFs extends SplashFilesystem {
  directories: Map<string, string[]>
  files: Map<string, string | Uint8Array>
  writes: [string, string | Uint8Array][]
  renames: [string, string][]
}

function fakeFs(options: { directories?: Record<string, string[]>, files?: Record<string, string | Uint8Array> } = {}): FakeSplashFs {
  const directories = new Map(Object.entries(options.directories ?? {}))
  const files = new Map(Object.entries(options.files ?? {}))
  const writes: [string, string | Uint8Array][] = []
  const renames: [string, string][] = []
  return {
    directories,
    files,
    writes,
    renames,
    readdir: async (path) => {
      const entries = directories.get(path)
      if (!entries) throw new Error(`ENOENT: ${path}`)
      return [...entries]
    },
    readFile: async (path) => {
      const contents = files.get(path)
      if (typeof contents !== 'string') throw new Error(`ENOENT: ${path}`)
      return contents
    },
    readBinary: async (path) => {
      const contents = files.get(path)
      if (contents === undefined) throw new Error(`ENOENT: ${path}`)
      return typeof contents === 'string' ? new TextEncoder().encode(contents) : contents
    },
    writeFile: async (path, contents) => {
      writes.push([path, contents])
      files.set(path, contents)
    },
    writeBinary: async (path, contents) => {
      writes.push([path, contents])
      files.set(path, contents)
    },
    mkdir: async (path) => {
      directories.set(path, directories.get(path) ?? [])
      return undefined
    },
    rename: async (from, to) => {
      renames.push([from, to])
      const contents = files.get(from)
      if (contents === undefined) throw new Error(`ENOENT: ${from}`)
      files.delete(from)
      files.set(to, contents)
    },
  }
}

interface CachedPoster {
  id: string
  title: string
  authorHandle: string
  posterBytes: Uint8Array
  fileName?: string
  fetchedAt?: number
  license?: string
}

function cachedState(poster: CachedPoster): string {
  const fileName = poster.fileName ?? 'poster.jpg'
  return JSON.stringify({
    version: 1,
    lastAttemptAt: poster.fetchedAt ?? 1_000,
    poster: {
      id: poster.id,
      title: poster.title,
      authorHandle: poster.authorHandle,
      sha256: sha256(poster.posterBytes),
      fileName,
      fetchedAt: poster.fetchedAt ?? 1_000,
      ...(poster.license ? { license: poster.license } : {}),
    },
  })
}

describe('shouldShowSplash', () => {
  const gate = { startInBackground: false, hiddenForTests: false, smokeRun: false }

  test('member profile shows the splash', () => {
    expect(shouldShowSplash('vizmaster', gate)).toBe(true)
  })

  test('generic profile never shows the splash', () => {
    expect(shouldShowSplash('vclaw', gate)).toBe(false)
  })

  test('background, hidden-test, and smoke launches never show the splash', () => {
    expect(shouldShowSplash('vizmaster', { ...gate, startInBackground: true })).toBe(false)
    expect(shouldShowSplash('vizmaster', { ...gate, hiddenForTests: true })).toBe(false)
    expect(shouldShowSplash('vizmaster', { ...gate, smokeRun: true })).toBe(false)
  })
})

describe('selectSplashScene', () => {
  test('a local user show wins over the cached official poster and bundled scenes', async () => {
    const poster = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
    const filesystem = fakeFs({
      directories: {
        [showsDir]: ['b.html', 'a.html'],
        [bundledDir]: ['bundled.html'],
      },
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 's1', title: 'Official', authorHandle: 'author', posterBytes: poster }),
        [join(cacheDir, 'poster.jpg')]: poster,
      },
    })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem, random: () => 0.99 })
    expect(choice).toEqual({ mode: 'html', source: 'user', htmlPath: join(showsDir, 'b.html') })
  })

  test('user shows are picked uniformly at random', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: ['one.html', 'two.html', 'three.html'] } })
    const picks = new Set<string>()
    for (const random of [() => 0, () => 0.34, () => 0.67, () => 0.999]) {
      const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem, random })
      picks.add(choice?.mode === 'html' ? choice.htmlPath : 'non-html')
    }
    expect([...picks].sort()).toEqual([join(showsDir, 'one.html'), join(showsDir, 'three.html'), join(showsDir, 'two.html')])
  })

  test('empty shows dir falls back to the cached official poster (poster mode, content-derived extension)', async () => {
    const poster = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9, 9, 9])
    const filesystem = fakeFs({
      directories: { [showsDir]: [] },
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 's1', title: 'Stream Lines', authorHandle: 'vizmaster', posterBytes: poster, fileName: 'poster.jpeg' }),
        [join(cacheDir, 'poster.jpeg')]: poster,
      },
    })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toEqual({
      mode: 'poster',
      source: 'official',
      posterPath: join(cacheDir, 'poster.jpeg'),
      posterFileName: 'poster.jpeg',
      title: 'Stream Lines',
      authorHandle: 'vizmaster',
      license: null,
    })
  })

  test('no cache falls back to a bundled scene', async () => {
    const filesystem = fakeFs({
      directories: { [showsDir]: [], [bundledDir]: ['orbit.html'] },
    })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem, random: () => 0.5 })
    expect(choice).toEqual({ mode: 'html', source: 'bundled', htmlPath: join(bundledDir, 'orbit.html') })
  })

  test('a cached poster whose bytes no longer match the recorded sha256 falls back to bundled', async () => {
    const recorded = new Uint8Array([1, 2, 3, 4])
    const onDisk = new Uint8Array([9, 9, 9, 9])
    const filesystem = fakeFs({
      directories: { [showsDir]: [], [bundledDir]: ['orbit.html'] },
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 's1', title: 'Tampered', authorHandle: 'nobody', posterBytes: recorded }),
        [join(cacheDir, 'poster.jpg')]: onDisk,
      },
    })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toEqual({ mode: 'html', source: 'bundled', htmlPath: join(bundledDir, 'orbit.html') })
  })

  test('a corrupt cache state (bad JSON, missing poster file) falls back to bundled', async () => {
    const filesystem = fakeFs({
      directories: { [showsDir]: [], [bundledDir]: ['orbit.html'] },
      files: { [join(cacheDir, 'state.json')]: '{not json' },
    })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice?.source).toBe('bundled')
  })

  test('nothing anywhere yields null so the caller shows the branded fallback', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: [] } })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toBeNull()
  })

  test('generic profile selects nothing', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: ['show.html'] } })
    const choice = await selectSplashScene({ homeDir, profileId: 'vclaw', bundledDir, filesystem })
    expect(choice).toBeNull()
  })

  test('non-html files in the shows dir are ignored (case-insensitive match)', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: ['notes.txt', 'scene.HTML'] } })
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice?.mode === 'html' ? choice.source : 'non-html').toBe('user')
    expect(choice?.mode === 'html' ? choice.htmlPath : 'non-html').toBe(join(showsDir, 'scene.HTML'))
  })
})

describe('refreshOfficialSplashScene', () => {
  const posterBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8])
  const posterUrl = 'https://vizmaster.app/posters/stream-lines.jpg'

  /** The live endpoint's wrapper shape: { show, rotatedAt }. */
  const splashPayload = {
    show: {
      id: 'show-42',
      title: 'Stream Lines',
      authorHandle: 'vizmaster',
      license: 'CC-BY-4.4',
      tutorialId: 'tut-stream-lines',
      kind: 'line-chart',
      params: { series: 3 },
      posterUrl,
      posterSha256: sha256(posterBytes),
      subject: 'visualization',
      lang: 'en',
      publishedAt: '2026-11-01T00:00:00Z',
    },
    rotatedAt: '2026-11-05T09:00:00Z',
  }

  function officialFetch(options: { poster?: Uint8Array, contentType?: string, splashFails?: boolean, show?: Record<string, unknown> } = {}): SplashFetch & { calls: string[] } {
    const calls: string[] = []
    const impl: SplashFetch = async (url) => {
      calls.push(url)
      if (url === OFFICIAL_VIZSHOW_FEATURED_URL) {
        if (options.splashFails) throw new Error('DNS is down')
        return {
          ok: true,
          status: 200,
          json: async () => (options.show ? { ...splashPayload, show: options.show } : splashPayload),
          arrayBuffer: async () => new ArrayBuffer(0),
          headers: { get: () => 'application/json' },
        }
      }
      const poster = options.poster ?? posterBytes
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        arrayBuffer: async () => poster.slice().buffer,
        headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? options.contentType ?? 'image/jpeg' : null) },
      }
    }
    return Object.assign(impl, { calls })
  }

  test('a successful refresh caches the poster with a content-derived extension and selectable metadata', async () => {
    const filesystem = fakeFs()
    const fetch = officialFetch()
    const refreshed = await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch })
    expect(refreshed).toBe(true)
    expect(fetch.calls).toEqual([OFFICIAL_VIZSHOW_FEATURED_URL, posterUrl])
    // The live endpoint serves image/jpeg, so the cached file is poster.jpg — not a hardcoded .png.
    const cached = filesystem.files.get(join(cacheDir, 'poster.jpg'))
    expect(cached).toBeInstanceOf(Uint8Array)
    expect(filesystem.renames).toEqual([[join(cacheDir, 'poster.partial.jpg'), join(cacheDir, 'poster.jpg')]])
    const state = JSON.parse(filesystem.files.get(join(cacheDir, 'state.json')) as string)
    expect(state.poster).toEqual({
      id: 'show-42',
      title: 'Stream Lines',
      authorHandle: 'vizmaster',
      sha256: sha256(posterBytes),
      fileName: 'poster.jpg',
      fetchedAt: 10_000,
      license: 'CC-BY-4.4',
      passthrough: { tutorialId: 'tut-stream-lines', kind: 'line-chart', params: { series: 3 }, subject: 'visualization', lang: 'en' },
    })
    // The refreshed cache is now selectable in poster mode with attribution data.
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toEqual({
      mode: 'poster',
      source: 'official',
      posterPath: join(cacheDir, 'poster.jpg'),
      posterFileName: 'poster.jpg',
      title: 'Stream Lines',
      authorHandle: 'vizmaster',
      license: 'CC-BY-4.4',
    })
  })

  test('a loopback posterUrl is rebuilt onto the public API origin before fetching', async () => {
    // Measured live 2026-11-05: /featured served posterUrl pointing at the
    // registry's internal Fastify bind. The client must dial the public origin.
    const filesystem = fakeFs()
    const fetch = officialFetch({ show: { ...splashPayload.show, posterUrl: 'http://127.0.0.1:8089/api/vizshows/show-42/poster' } })
    const refreshed = await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch })
    expect(refreshed).toBe(true)
    expect(fetch.calls).toEqual([
      OFFICIAL_VIZSHOW_FEATURED_URL,
      'https://vizmaster.app/api/vizshows/show-42/poster',
    ])
    // The bytes still had to pass sha256 verification to be cached.
    expect(filesystem.files.has(join(cacheDir, 'poster.jpg'))).toBe(true)
  })

  test('a private-range posterUrl is rebuilt onto the public API origin', async () => {
    const filesystem = fakeFs()
    const fetch = officialFetch({ show: { ...splashPayload.show, posterUrl: 'http://192.168.1.5:8089/api/vizshows/show-42/poster?x=1' } })
    await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch })
    expect(fetch.calls[1]).toBe('https://vizmaster.app/api/vizshows/show-42/poster?x=1')
  })

  test('a png content-type caches as poster.png', async () => {
    const filesystem = fakeFs()
    await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch: officialFetch({ contentType: 'image/png; charset=binary' }) })
    expect(filesystem.files.has(join(cacheDir, 'poster.png'))).toBe(true)
    expect(filesystem.files.has(join(cacheDir, 'poster.jpg'))).toBe(false)
  })

  test('a non-image poster content-type fails soft and keeps the previous good cache entry', async () => {
    const goodPoster = new Uint8Array([1, 1, 1, 1])
    const filesystem = fakeFs({
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 'old', title: 'Old Show', authorHandle: 'old-author', posterBytes: goodPoster, fetchedAt: 1_000 }),
        [join(cacheDir, 'poster.jpg')]: goodPoster,
      },
    })
    const refreshed = await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch: officialFetch({ contentType: 'text/html' }) })
    expect(refreshed).toBe(false)
    expect(filesystem.files.get(join(cacheDir, 'poster.jpg'))).toBe(goodPoster)
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toMatchObject({ mode: 'poster', title: 'Old Show', authorHandle: 'old-author' })
  })

  test('the 24h throttle skips the fetch entirely', async () => {
    const filesystem = fakeFs({
      files: { [join(cacheDir, 'state.json')]: JSON.stringify({ version: 1, lastAttemptAt: 90_000 }) },
    })
    const fetch = officialFetch()
    const refreshed = await refreshOfficialSplashScene({ homeDir, profileId, now: () => 100_000, filesystem, fetch })
    expect(refreshed).toBe(false)
    expect(fetch.calls).toEqual([])
    expect(filesystem.writes).toEqual([])
  })

  test('a throttled refresh keeps the last good poster selectable', async () => {
    const goodPoster = new Uint8Array([2, 2, 2, 2])
    const filesystem = fakeFs({
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 'old', title: 'Old Scene', authorHandle: 'Old Author', posterBytes: goodPoster, fetchedAt: 90_000 }),
        [join(cacheDir, 'poster.jpg')]: goodPoster,
      },
    })
    expect(await refreshOfficialSplashScene({ homeDir, profileId, now: () => 100_000, filesystem, fetch: officialFetch() })).toBe(false)
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toMatchObject({ mode: 'poster', title: 'Old Scene', authorHandle: 'Old Author' })
  })

  test('an expired throttle performs at most one fetch attempt per 24h even when it fails', async () => {
    const filesystem = fakeFs()
    const failing = officialFetch({ splashFails: true })
    expect(await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch: failing })).toBe(false)
    expect(await refreshOfficialSplashScene({ homeDir, profileId, now: () => 11_000, filesystem, fetch: officialFetch() })).toBe(false)
    // The failed attempt was stamped, so the second call within the window never dialed out.
    expect(failing.calls).toEqual([OFFICIAL_VIZSHOW_FEATURED_URL])
    expect(filesystem.files.has(join(cacheDir, 'poster.jpg'))).toBe(false)
  })

  test('a poster sha mismatch is rejected and keeps the previous good cache entry', async () => {
    const goodPoster = new Uint8Array([3, 3, 3, 3])
    const filesystem = fakeFs({
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 'old', title: 'Previous', authorHandle: 'Author', posterBytes: goodPoster, fetchedAt: 1_000 }),
        [join(cacheDir, 'poster.jpg')]: goodPoster,
      },
    })
    const tampered = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 7, 7, 7])
    const mismatchedFetch: SplashFetch = async (url) => {
      if (url === OFFICIAL_VIZSHOW_FEATURED_URL) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...splashPayload, show: { ...splashPayload.show, posterSha256: sha256(tampered) } }),
          arrayBuffer: async () => new ArrayBuffer(0),
          headers: { get: () => 'application/json' },
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        arrayBuffer: async () => tampered.slice().buffer,
        headers: { get: () => 'image/jpeg' },
      }
    }
    expect(await refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch: mismatchedFetch })).toBe(false)
    expect(filesystem.files.get(join(cacheDir, 'poster.jpg'))).toBe(goodPoster)
    const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
    expect(choice).toMatchObject({ title: 'Previous', authorHandle: 'Author' })
  })

  // The joint fail-soft matrix (vizmaster#1): every offline shape must fall
  // back to bundled, cache nothing, and surface no error state.
  test('the five-case fail-soft matrix falls back to bundled with no cached poster and no thrown error', async () => {
    const refusal: SplashFetch = async () => {
      const error = new Error('connect ECONNREFUSED') as NodeJS.ErrnoException
      error.code = 'ECONNREFUSED'
      throw error
    }
    const serverError: SplashFetch = async () => ({ ok: false, status: 503, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0), headers: { get: () => 'application/json' } })
    // The registry's only typed error: UP but nothing to feature. Treated exactly like offline.
    const noPublishedShows: SplashFetch = async () => ({ ok: false, status: 404, json: async () => ({ code: 'no_published_shows' }), arrayBuffer: async () => new ArrayBuffer(0), headers: { get: () => 'application/json' } })
    const missingFields: SplashFetch = async () => ({ ok: true, status: 200, json: async () => ({ show: { title: 'No Author' } }), arrayBuffer: async () => new ArrayBuffer(0), headers: { get: () => 'application/json' } })
    const unwrapped: SplashFetch = async () => ({ ok: true, status: 200, json: async () => ({ title: 'Missing Wrapper' }), arrayBuffer: async () => new ArrayBuffer(0), headers: { get: () => 'application/json' } })
    const badJson: SplashFetch = async () => { throw new Error('bad JSON') }
    const cases: Array<[string, SplashFetch]> = [
      ['dns failure', officialFetch({ splashFails: true })],
      ['connection refused', refusal],
      ['http 5xx', serverError],
      ['http 404 no_published_shows', noPublishedShows],
      ['malformed payload', missingFields],
      ['unwrapped body', unwrapped],
      ['bad json', badJson],
    ]
    for (const [label, fetch] of cases) {
      const filesystem = fakeFs({ directories: { [showsDir]: [], [bundledDir]: ['orbit.html'] } })
      await expect(refreshOfficialSplashScene({ homeDir, profileId, now: () => 10_000, filesystem, fetch }), label).resolves.toBe(false)
      expect(filesystem.files.has(join(cacheDir, 'poster.jpg'))).toBe(false)
      // The splash still has something to show: the bundled default.
      const choice = await selectSplashScene({ homeDir, profileId, bundledDir, filesystem })
      expect(choice, label).toEqual({ mode: 'html', source: 'bundled', htmlPath: join(bundledDir, 'orbit.html') })
    }
  })

  test('generic profile never refreshes', async () => {
    const fetch = officialFetch()
    expect(await refreshOfficialSplashScene({ homeDir, profileId: 'vclaw', now: () => 10_000, filesystem: fakeFs(), fetch })).toBe(false)
    expect(fetch.calls).toEqual([])
  })
})

describe('poster splash shell', () => {
  test('attribution line is `title — authorHandle`, with the license appended when present', () => {
    expect(officialAttribution('Stream Lines', 'vizmaster', null)).toBe('Stream Lines — vizmaster')
    expect(officialAttribution('Stream Lines', 'vizmaster', 'CC-BY-4.4')).toBe('Stream Lines — vizmaster · CC-BY-4.4')
  })

  test('the shell renders the poster, Ken-Burns motion, and the escaped attribution corner', () => {
    const shell = buildPosterSplashShell('poster.jpg', officialAttribution('Stream Lines', 'vizmaster', 'CC-BY-4.4'))
    expect(shell).toContain('<img src="poster.jpg"')
    expect(shell).toContain('@keyframes kenburns')
    expect(shell).toContain('animation: kenburns')
    expect(shell).toContain('Stream Lines — vizmaster · CC-BY-4.4')
    expect(shell).toContain('>VClaw<')
    // Self-contained: no network references.
    expect(shell).not.toMatch(/https?:\/\//i)
  })

  test('attribution text is HTML-escaped', () => {
    const shell = buildPosterSplashShell('poster.jpg', officialAttribution('<script>', 'a&b', null))
    expect(shell).not.toContain('<script>')
    expect(shell).toContain('&lt;script&gt; — a&amp;b')
  })
})

describe('bundled splash scenes', () => {
  const splashDir = fileURLToPath(new URL('../assets/splash', import.meta.url))

  test('the bundle ships at least two scenes', async () => {
    const sceneNames = (await readdir(splashDir)).filter((name) => name.toLowerCase().endsWith('.html'))
    expect(sceneNames.length).toBeGreaterThanOrEqual(2)
  })

  test.each(['aurora-bars.html', 'orbit-scatter.html', 'stream-lines.html'])(
    '%s exists, is <=30KB, self-contained, and animated',
    async (name) => {
      const path = join(splashDir, name)
      const info = await stat(path)
      expect(info.size).toBeLessThanOrEqual(30 * 1024)
      const html = await readFile(path, 'utf8')
      expect(html).toMatch(/@keyframes|<animate/)
      expect(html).not.toMatch(/https?:\/\//i)
      expect(html).not.toMatch(/src\s*=/i)
      expect(html).not.toMatch(/@import|url\(/i)
    },
  )
})
