import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi } from 'vitest'
import {
  ambientFieldSpec,
  ambientPalette,
  beginSplash,
  officialAttribution,
  showSeed,
  specEchoLine,
  OFFICIAL_VIZSHOW_FEATURED_URL,
  refreshOfficialSplashScene,
  selectSplashScene,
  shouldPresentMainWindow,
  shouldShowSplash,
  splashOverlaySceneScript,
  SPLASH_OVERLAY_ID,
  SPLASH_OVERLAY_REMOVE_SCRIPT,
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
  passthrough?: Record<string, unknown>
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
      ...(poster.passthrough ? { passthrough: poster.passthrough } : {}),
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
      showId: 's1',
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

describe('refreshOfficialSplashScene', () => {
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
      showId: 'show-42',
      passthrough: { tutorialId: 'tut-stream-lines', kind: 'line-chart', params: { series: 3 }, subject: 'visualization', lang: 'en' },
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

describe('splash overlay delivery', () => {
  test('attribution line is `title — authorHandle`, with the license appended when present', () => {
    expect(officialAttribution('Stream Lines', 'vizmaster', null)).toBe('Stream Lines — vizmaster')
    expect(officialAttribution('Stream Lines', 'vizmaster', 'CC-BY-4.4')).toBe('Stream Lines — vizmaster · CC-BY-4.4')
  })

  test('the html scene script embeds a sandboxed srcdoc iframe and flips the overlay to scene mode', () => {
    const script = splashOverlaySceneScript({ mode: 'html', html: sceneHtml })
    expect(script).toContain(`document.getElementById("vclaw-splash")`)
    expect(script).toContain("frame.setAttribute('sandbox', '')")
    expect(script).toContain(`frame.srcdoc = ${JSON.stringify(sceneHtml)}`)
    expect(script).toContain("overlay.classList.add('vclaw-splash--scene')")
    // No URL fetch, no scripts inside the scene document: sandboxed and inert.
    expect(script).not.toMatch(/https?:\/\//i)
  })

  test('the poster script embeds a data-URL image and the escaped attribution corner', () => {
    const script = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/jpeg;base64,QUJD', attribution: 'Stream Lines — vizmaster · CC-BY-4.4' })
    expect(script).toContain(`image.src = "data:image/jpeg;base64,QUJD"`)
    expect(script).toContain("credit.textContent = \"Stream Lines — vizmaster · CC-BY-4.4\"")
    expect(script).toContain("overlay.classList.add('vclaw-splash--scene')")
    // Attribution text is JSON-escaped, never raw markup.
    const hostile = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/png;base64,QUJD', attribution: '<script>' })
    expect(hostile).toContain('credit.textContent = "<script>"')
    expect(hostile).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/)
  })

  test('the overlay remove script strips the element without a fade', () => {
    expect(SPLASH_OVERLAY_REMOVE_SCRIPT).toContain(`document.getElementById("vclaw-splash")?.remove()`)
  })
})

describe('splash overlay presentation', () => {
  const htmlScene = '<!doctype html><body>scene</body>'

  function fakeTarget(): { scripts: string[], executeJavaScript: (script: string) => Promise<unknown>, isDestroyed: () => boolean } {
    const scripts: string[] = []
    return {
      scripts,
      executeJavaScript: (script: string) => {
        scripts.push(script)
        // Deterministically observable via microtask flush; no real timers.
        return Promise.resolve(true)
      },
      isDestroyed: () => false,
    }
  }

  test('a bundled scene is delivered into the overlay via executeJavaScript', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: [], [bundledDir]: ['aurora-bars.html'] }, files: { [join(bundledDir, 'aurora-bars.html')]: htmlScene } })
    const presentation = beginSplash({ homeDir, profileId, bundledDir, filesystem, fetch: officialFetch() })
    const target = fakeTarget()
    presentation.deliverTo(target)
    // Selection + read + delivery settle on microtasks against the in-memory fs.
    await vi.waitFor(() => expect(target.scripts).toHaveLength(1))
    expect(target.scripts[0]).toContain(`frame.srcdoc = ${JSON.stringify(htmlScene)}`)
  })

  test('a cached official poster is delivered as a base64 data URL with its attribution', async () => {
    const poster = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
    const filesystem = fakeFs({
      directories: { [showsDir]: [] },
      files: {
        [join(cacheDir, 'state.json')]: cachedState({ id: 's1', title: 'Stream Lines', authorHandle: 'vizmaster', posterBytes: poster, license: 'CC-BY-4.0' }),
        [join(cacheDir, 'poster.jpg')]: poster,
      },
    })
    const presentation = beginSplash({ homeDir, profileId, bundledDir, filesystem, fetch: officialFetch() })
    const target = fakeTarget()
    presentation.deliverTo(target)
    await vi.waitFor(() => expect(target.scripts).toHaveLength(1))
    expect(target.scripts[0]).toContain(`image.src = "data:image/jpeg;base64,${Buffer.from(poster).toString('base64')}"`)
    expect(target.scripts[0]).toContain('Stream Lines — vizmaster · CC-BY-4.0')
  })

  test('a null or destroyed target presents nothing and never throws', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: [], [bundledDir]: ['aurora-bars.html'] }, files: { [join(bundledDir, 'aurora-bars.html')]: htmlScene } })
    const presentation = beginSplash({ homeDir, profileId, bundledDir, filesystem, fetch: officialFetch() })
    expect(() => presentation.deliverTo(null)).not.toThrow()
    const destroyed = { scripts: [] as string[], executeJavaScript: async (script: string) => { destroyed.scripts.push(script); return true }, isDestroyed: () => true }
    expect(() => presentation.deliverTo(destroyed)).not.toThrow()
    // Give the (dropped) selection chain a microtask turn, then assert nothing ran.
    await Promise.resolve()
    await Promise.resolve()
    expect(destroyed.scripts).toEqual([])
  })

  test('a scene that cannot be read fails soft: the shimmer fallback just continues', async () => {
    const filesystem = fakeFs({ directories: { [showsDir]: ['broken.html'] }, files: {} })
    const presentation = beginSplash({ homeDir, profileId, bundledDir, filesystem, fetch: officialFetch() })
    const target = fakeTarget()
    expect(() => presentation.deliverTo(target)).not.toThrow()
    await vi.waitFor(() => expect(filesystem.directories.get(showsDir)).toBeDefined())
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(target.scripts).toEqual([])
  })

  test('a selection that misses the 2s swap deadline never swaps (shimmer holds)', async () => {
    vi.useFakeTimers()
    try {
      const filesystem = fakeFs({ directories: { [showsDir]: [], [bundledDir]: ['aurora-bars.html'] }, files: { [join(bundledDir, 'aurora-bars.html')]: htmlScene } })
      const presentation = beginSplash({ homeDir, profileId, bundledDir, filesystem, fetch: officialFetch(), sceneSwapDeadlineMs: 10 })
      const target = fakeTarget()
      await vi.advanceTimersByTimeAsync(11)
      presentation.deliverTo(target)
      await vi.advanceTimersByTimeAsync(20)
      expect(target.scripts).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('index.html splash overlay', () => {
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')

  test('carries the overlay with the id every module agrees on', () => {
    expect(html).toContain(`id="${SPLASH_OVERLAY_ID}"`)
    // The renderer-side dismissal module must target the same element id;
    // compared as source text so this node-environment suite never imports
    // the web bundle's module graph.
    const dismissalSource = readFileSync(fileURLToPath(new URL('../src/lib/splash-overlay.ts', import.meta.url)), 'utf8')
    expect(dismissalSource).toContain(`export const SPLASH_OVERLAY_ID = '${SPLASH_OVERLAY_ID}'`)
  })

  test('overlay structure: scene host, vignette, wordmark, progress bar, attribution slot', () => {
    for (const className of ['vclaw-splash__scene', 'vclaw-splash__vignette', 'vclaw-splash__wordmark', 'vclaw-splash__bar', 'vclaw-splash__mark', 'vclaw-splash__attribution']) {
      expect(html).toContain(className)
    }
    expect(html).toContain('@keyframes vclaw-splash-pet-blink')
    expect(html).toContain('@keyframes vclaw-splash-kenburns')
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain('VizMaster')
    expect(html).toContain('Powered by VClaw Networks')
  })

  test('the overlay paints without scripts: only the bundle script tag exists', () => {
    // Inline scripts are CSP-forbidden (script-src 'self'); everything behavioral
    // arrives via main-process executeJavaScript.
    const scriptTags = html.match(/<script\b[^>]*>/g) ?? []
    expect(scriptTags).toEqual(['<script type="module" src="/src/main.tsx">'])
  })

  test('the overlay is self-contained: no network references', () => {
    const overlay = html.slice(html.indexOf('id="vclaw-splash"'), html.indexOf('id="root"'))
    expect(overlay).not.toMatch(/https?:\/\//i)
    expect(overlay).not.toMatch(/src\s*=/i)
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

describe('main window presentation', () => {
  test('a member window presents at first paint: ready-to-show is enough when the splash overlay paints', () => {
    expect(shouldPresentMainWindow({ splashOverlay: true, readyToShow: true, rendererLoaded: false, overlayCleared: false })).toBe(true)
    expect(shouldPresentMainWindow({ splashOverlay: true, readyToShow: true, rendererLoaded: true, overlayCleared: false })).toBe(true)
  })

  test('never presents before ready-to-show, whatever the mode', () => {
    expect(shouldPresentMainWindow({ splashOverlay: true, readyToShow: false, rendererLoaded: false, overlayCleared: false })).toBe(false)
    expect(shouldPresentMainWindow({ splashOverlay: false, readyToShow: false, rendererLoaded: true, overlayCleared: true })).toBe(false)
  })

  test('the generic build keeps its historical gate: load complete AND its overlay copy stripped', () => {
    expect(shouldPresentMainWindow({ splashOverlay: false, readyToShow: true, rendererLoaded: false, overlayCleared: false })).toBe(false)
    expect(shouldPresentMainWindow({ splashOverlay: false, readyToShow: true, rendererLoaded: true, overlayCleared: false })).toBe(false)
    expect(shouldPresentMainWindow({ splashOverlay: false, readyToShow: true, rendererLoaded: false, overlayCleared: true })).toBe(false)
    expect(shouldPresentMainWindow({ splashOverlay: false, readyToShow: true, rendererLoaded: true, overlayCleared: true })).toBe(true)
  })
})

describe('splash wiring shape', () => {
  const mainSource = readFileSync(fileURLToPath(new URL('../electron/main/index.ts', import.meta.url)), 'utf8')

  test('the splash is in-frame only: no second BrowserWindow is created for it', () => {
    // The splash module must no longer own a window; index.ts must not open one.
    const splashSource = readFileSync(fileURLToPath(new URL('../electron/main/splash.ts', import.meta.url)), 'utf8')
    expect(splashSource).not.toMatch(/new BrowserWindow/)
    expect(mainSource).toContain('beginSplash(')
    expect(mainSource).not.toContain('openSplash(')
    expect(mainSource).not.toContain('followMainWindow(')
    expect(mainSource).not.toContain('dismissActiveSplash(')
  })

  test('the overlay scene is delivered to the main window, not loaded into one', () => {
    expect(mainSource).toContain('splash?.deliverTo(')
  })
})

describe('ambient presentation derivations', () => {
  test('the same show id always derives the same field spec (determinism)', () => {
    const first = ambientFieldSpec('01M5KWV79Y5AYN0YDYH2NHRYFS')
    const second = ambientFieldSpec('01M5KWV79Y5AYN0YDYH2NHRYFS')
    expect(first).toEqual(second)
    expect(showSeed('01M5KWV79Y5AYN0YDYH2NHRYFS')).toBe(showSeed('01M5KWV79Y5AYN0YDYH2NHRYFS'))
  })

  test('field specs stay inside their documented ranges', () => {
    for (const id of ['a', 'ulid-0001', '01M5KWV79Y5AYN0YDYH2NHRYFS', 'zzzz']) {
      const spec = ambientFieldSpec(id)
      expect(spec.particles).toBeGreaterThanOrEqual(14)
      expect(spec.particles).toBeLessThanOrEqual(40)
      expect(spec.driftDegrees).toBeGreaterThanOrEqual(0)
      expect(spec.driftDegrees).toBeLessThan(360)
      expect(spec.driftDegrees % 45).toBe(0)
      expect(spec.speed).toBeGreaterThanOrEqual(0.4)
      expect(spec.speed).toBeLessThanOrEqual(1.2)
      expect(Number.isInteger(spec.seed)).toBe(true)
    }
  })

  test('different ids derive different compositions (the surprise)', () => {
    const specs = ['show-one', 'show-two', 'show-three', 'show-four'].map((id) => ambientFieldSpec(id))
    const distinct = new Set(specs.map((spec) => `${spec.particles}/${spec.driftDegrees}/${spec.speed}`))
    expect(distinct.size).toBeGreaterThan(1)
  })

  test('the subject hash maps onto the cool palette range, deterministically', () => {
    const first = ambientPalette('mathematics')
    expect(first).toEqual(ambientPalette('mathematics'))
    expect(first.hue).toBeGreaterThanOrEqual(160)
    expect(first.hue).toBeLessThanOrEqual(300)
    expect(first.secondaryHue).toBeGreaterThanOrEqual(0)
    expect(first.secondaryHue).toBeLessThan(360)
    // A missing subject still yields a valid palette.
    expect(ambientPalette(undefined).hue).toBeGreaterThanOrEqual(160)
  })

  test('the spec echo renders kind + params compactly', () => {
    expect(specEchoLine('elucim', { a: 1, b: -2, c: -3 })).toBe('elucim · a=1 b=-2 c=-3')
    expect(specEchoLine(undefined, undefined)).toBe('vizshow')
    expect(specEchoLine('vectorplay', {})).toBe('vectorplay')
    expect(specEchoLine('three', { size: [1, 2] })).toBe('three · size=[1,2]')
  })
})

describe('poster presentation choreography', () => {
  const presentation = {
    title: 'Quadratic Functions, Live',
    authorLine: 'Quadratic Functions, Live — vizmaster · CC-BY-4.0',
    specEcho: 'elucim · a=1 b=-2 c=-3',
    field: ambientFieldSpec('01M5KWV79Y5AYN0YDYH2NHRYFS'),
    palette: ambientPalette('mathematics'),
  }

  test('the script builds the ambient SVG field from the seeded spec', () => {
    const script = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/jpeg;base64,QUJD', attribution: null, presentation })
    expect(script).toContain("createElementNS('http://www.w3.org/2000/svg', 'svg')")
    expect(script).toContain(`const spec = ${JSON.stringify(presentation)}`)
    expect(script).toContain('spec.field.particles')
    expect(script).toContain("overlay.classList.add('vclaw-splash--ambient')")
    // The page-side PRNG is seeded from the derived show seed, so the same
    // show paints the same constellation.
    expect(script).toContain('spec.field.seed')
  })

  test('the script stages the typography and the typewriter spec echo', () => {
    const script = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/jpeg;base64,QUJD', attribution: null, presentation })
    expect(script).toContain("querySelector('.vclaw-splash__title')")
    expect(script).toContain('vclaw-splash__title-word')
    expect(script).toContain("authorEl.textContent = spec.authorLine")
    expect(script).toContain("querySelector('.vclaw-splash__spec')")
    expect(script).toContain("echoEl.textContent = spec.specEcho")
    expect(script).toContain("overlay.classList.add('vclaw-splash--presented')")
  })

  test('reduced motion is honored: the script checks the media query and skips animation setup', () => {
    const script = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/jpeg;base64,QUJD', attribution: null, presentation })
    expect(script).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(script).toContain('if (reduced) {')
    expect(script).toContain('if (!reduced) {')
  })

  test('all show text lands via textContent, never markup sinks', () => {
    const hostile = { ...presentation, title: '<script>', authorLine: '<img onerror=1>', specEcho: '</style>' }
    const script = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/jpeg;base64,QUJD', attribution: null, presentation: hostile })
    expect(script).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/)
    // Text values are JSON-escaped string literals.
    expect(script).toContain('span.textContent = word')
    expect(script).toContain('authorEl.textContent = spec.authorLine')
    expect(script).toContain('echoEl.textContent = spec.specEcho')
  })

  test('the hold jitter rides along as a dataset attribute', () => {
    const script = splashOverlaySceneScript({ mode: 'poster', dataUrl: 'data:image/jpeg;base64,QUJD', attribution: null, presentation }, 1_234)
    expect(script).toContain(`overlay.dataset.vclawHoldJitter = ${JSON.stringify('1234')}`)
    const plain = splashOverlaySceneScript({ mode: 'html', html: sceneHtml })
    expect(plain).toContain(`overlay.dataset.vclawHoldJitter = ${JSON.stringify('0')}`)
  })

  test('beginSplash delivers a full presentation from the cached passthrough', async () => {
    const poster = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
    const filesystem = fakeFs({
      directories: { [showsDir]: [] },
      files: {
        [join(cacheDir, 'state.json')]: cachedState({
          id: '01M5KWV79Y5AYN0YDYH2NHRYFS',
          title: 'Quadratic Functions, Live',
          authorHandle: 'vizmaster',
          posterBytes: poster,
          license: 'CC-BY-4.0',
          fileName: 'poster.jpg',
          passthrough: { tutorialId: 'quadratic-functions', kind: 'elucim', params: { a: 1, b: -2, c: -3 }, subject: 'mathematics', lang: 'en' },
        }),
        [join(cacheDir, 'poster.jpg')]: poster,
      },
    })
    const presentation = beginSplash({ homeDir, profileId, bundledDir, filesystem, fetch: officialFetch(), holdJitter: () => 1_500 })
    const scripts: string[] = []
    const target = { executeJavaScript: async (script: string) => { scripts.push(script); return true }, isDestroyed: () => false }
    presentation.deliverTo(target)
    await vi.waitFor(() => expect(scripts).toHaveLength(1))
    const script = scripts[0]
    expect(script).toContain(`overlay.dataset.vclawHoldJitter = "1500"`)
    expect(script).toContain('Quadratic Functions, Live — vizmaster · CC-BY-4.0')
    expect(script).toContain('elucim · a=1 b=-2 c=-3')
    expect(script).toContain(String(ambientFieldSpec('01M5KWV79Y5AYN0YDYH2NHRYFS').particles))
  })
})
