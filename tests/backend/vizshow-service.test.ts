import { mkdtempSync, rmSync, symlinkSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_VIZSHOW_PORT,
  VizshowService,
  isBuildId,
  mimeTypeFor,
  parseBuildManifest,
  vizshowRoot,
} from '../../electron/main/vizshow-service'

const dirs: string[] = []
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'vclaw-vizshow-'))
  dirs.push(dir)
  return dir
}

function writeBuild(root: string, id: string, manifest: Record<string, unknown>, files: Record<string, string> = {}): string {
  const directory = join(root, id)
  mkdirSync(join(directory, 'assets'), { recursive: true })
  writeFileSync(join(directory, 'BUILD.json'), JSON.stringify(manifest))
  writeFileSync(join(directory, 'index.html'), '<!doctype html><title>show</title>')
  for (const [name, contents] of Object.entries(files)) writeFileSync(join(directory, name), contents)
  return directory
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('build manifests', () => {
  it('accepts only ids that are safe directory names', () => {
    for (const id of ['2026-11-07T12-04-31-quadratic-9f2c', 'a', 'build_1.2']) expect(isBuildId(id), id).toBe(true)
    for (const id of ['', '..', '../escape', 'a/b', '.hidden', 'x'.repeat(129), 'id with space']) expect(isBuildId(id), id).toBe(false)
  })

  it('reads the manifest fields it can prove and drops the rest', () => {
    expect(parseBuildManifest({ id: 'b1', status: 'Done', prompt: '  solve it  ', createdAt: '2026-11-07T00:00:00Z' }, 'b1')).toEqual({
      id: 'b1', status: 'done', entry: 'index.html', prompt: 'solve it', createdAt: '2026-11-07T00:00:00Z',
    })
    expect(parseBuildManifest({ status: 'done', entry: 'app/index.html' }, 'fallback')).toEqual({ id: 'fallback', status: 'done', entry: 'app/index.html' })
    expect(parseBuildManifest({ status: 'done', id: '../escape' }, 'dir-name')).toEqual({ id: 'dir-name', status: 'done', entry: 'index.html' })
    expect(parseBuildManifest({ id: 'b1' }, 'b1')).toBeNull()
    expect(parseBuildManifest([], 'b1')).toBeNull()
    expect(parseBuildManifest('done', 'b1')).toBeNull()
  })

  it('maps the extensions a build actually ships', () => {
    expect(mimeTypeFor('index.html')).toContain('text/html')
    expect(mimeTypeFor('assets/app.js')).toContain('text/javascript')
    expect(mimeTypeFor('assets/app.css')).toContain('text/css')
    expect(mimeTypeFor('data/scene.glb')).toBe('model/gltf-binary')
    expect(mimeTypeFor('fonts/x.woff2')).toBe('font/woff2')
    expect(mimeTypeFor('weird.bin')).toBe('application/octet-stream')
  })

  it('resolves the output root from the shared layout, overridable by env', () => {
    expect(vizshowRoot({ VIZMASTER_HOME: '/tmp/vm' })).toBe('/tmp/vm/vizshow')
    expect(vizshowRoot({ VIZMASTER_VIZSHOW_DIR: '/tmp/shows' })).toBe('/tmp/shows')
  })
})

describe('build watch', () => {
  it('offers only finished builds and reports the newest one', () => {
    const root = tempRoot()
    writeBuild(root, 'a-older', { id: 'a-older', status: 'done', createdAt: '2026-11-07T00:00:00Z' })
    writeBuild(root, 'b-newer', { id: 'b-newer', status: 'done', createdAt: '2026-11-07T01:00:00Z' })
    writeBuild(root, 'c-pending', { id: 'c-pending', status: 'running', createdAt: '2026-11-07T02:00:00Z' })
    mkdirSync(join(root, 'd-no-manifest'), { recursive: true })

    const service = new VizshowService({ root })
    service.start()
    try {
      expect(service.snapshot()).toEqual({ latest: expect.objectContaining({ id: 'b-newer' }), builds: 2, port: null, baseUrl: null })
      expect(service.builds.map((build) => build.id).sort()).toEqual(['a-older', 'b-newer'])
    } finally { void service.stop() }
  })

  it('announces a new build to listeners exactly once per change', () => {
    const root = tempRoot()
    writeBuild(root, 'first', { id: 'first', status: 'done', createdAt: '2026-11-07T00:00:00Z' })
    const seen: Array<string | null> = []
    const service = new VizshowService({ root })
    service.onChanged((snapshot) => seen.push(snapshot.latest?.id ?? null))
    service.start()
    try {
      expect(seen).toEqual(['first'])
    } finally { void service.stop() }
  })
})

describe('loopback server', () => {
  it('binds lazily on the first URL request and serves the build', async () => {
    const root = tempRoot()
    writeBuild(root, 'show-1', { id: 'show-1', status: 'done' }, { 'assets/app.js': 'console.log(1)' })
    const service = new VizshowService({ root, port: 0 })

    expect(service.port).toBeNull()
    const resolved = await service.urlFor()
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return
    expect(resolved.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/show-1\/$/)

    const page = await fetch(resolved.url)
    expect(page.status).toBe(200)
    expect(page.headers.get('content-type')).toContain('text/html')
    expect(await page.text()).toContain('<title>show</title>')

    const asset = await fetch(`${resolved.url}assets/app.js`)
    expect(asset.headers.get('content-type')).toContain('text/javascript')

    const head = await fetch(`${resolved.url}assets/app.js`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
    await service.stop()
  })

  it('refuses traversal, encoded traversal and symlinks out of the root', async () => {
    const root = tempRoot()
    writeBuild(root, 'show-1', { id: 'show-1', status: 'done' })
    const secret = join(tempRoot(), 'secret.txt')
    writeFileSync(secret, 'TOP-SECRET')
    symlinkSync(secret, join(root, 'show-1', 'leak.txt'))

    const service = new VizshowService({ root, port: 0 })
    const resolved = await service.urlFor('show-1')
    if (!resolved.ok) throw new Error(resolved.error)
    const base = resolved.url.replace(/show-1\/$/, '')

    for (const path of ['../secret.txt', 'show-1/%2e%2e/%2e%2e/secret.txt', 'show-1/../../../etc/passwd', 'show-1/leak.txt']) {
      const response = await fetch(`${base}${path}`)
      const body = await response.text()
      expect(response.status, path).toBeGreaterThanOrEqual(400)
      expect(body, path).not.toContain('TOP-SECRET')
      expect(body, path).not.toContain('root:')
    }

    const post = await fetch(resolved.url, { method: 'POST' })
    expect(post.status).toBe(405)
    await service.stop()
  })

  it('answers unknown builds and unknown ids without inventing a URL', async () => {
    const root = tempRoot()
    const service = new VizshowService({ root, port: 0 })
    await expect(service.urlFor()).resolves.toEqual({ ok: false, error: 'no_build' })
    await expect(service.urlFor('missing')).resolves.toEqual({ ok: false, error: 'unknown_build' })
    await service.stop()
  })

  it('falls back to an ephemeral port when the preferred one is held', async () => {
    const root = tempRoot()
    writeBuild(root, 'show-1', { id: 'show-1', status: 'done' })
    const squatter = new VizshowService({ root, port: DEFAULT_VIZSHOW_PORT })
    const squatterUrl = await squatter.urlFor('show-1')
    if (!squatterUrl.ok) throw new Error('squatter failed to bind')

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const service = new VizshowService({ root, port: DEFAULT_VIZSHOW_PORT })
    const resolved = await service.urlFor('show-1')
    expect(resolved.ok).toBe(true)
    if (resolved.ok) expect(resolved.url).not.toBe(squatterUrl.url)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('preferred port'))
    warn.mockRestore()

    await Promise.all([service.stop(), squatter.stop()])
  })
})
