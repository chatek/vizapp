import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { seedDefaultProject, type DefaultProjectStore } from '../../electron/main/default-project'
import { validateProductProfile } from '../../electron/main/product-profile'

/**
 * One seeder, one rule: an existing tree is re-copied when the SHIPPED release differs from the
 * one stamped inside it, and never otherwise. These tests use a real tmp HOME and a real
 * payload, because the property under test is which bytes survive a copy — a fake filesystem
 * would restate the filter instead of exercising it.
 */

const dirs: string[] = []

function tmp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function profile(version: string) {
  return validateProductProfile(
    {
      profileVersion: 1,
      id: 'vizmaster',
      harnesses: ['omp'],
      defaultProject: { name: 'VizMaster', from: 'vendor/vizmaster', to: '~/.vizmaster/default', version },
    },
    'packaged',
  )
}

/** The payload must sit at `<resources>/vendor/vizmaster`: that is what the profile's `from` means. */
function payload(release: string, marker: string): { resources: string; payloadPath: string } {
  const resources = tmp('vclaw-res-')
  const dir = join(resources, 'vendor', 'vizmaster')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'vizmaster' }))
  writeFileSync(join(dir, 'BUILD.json'), JSON.stringify({ release }))
  writeFileSync(join(dir, 'index.html'), `<!doctype html><title>${marker}</title>`)
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'src', 'lesson.js'), marker)
  // Payload-side names that collide with the KEEP SET: these must never be copied.
  mkdirSync(join(dir, 'lessons'), { recursive: true })
  writeFileSync(join(dir, 'lessons', 'shipped.md'), 'payload lesson')
  mkdirSync(join(dir, 'node_modules', 'dep'), { recursive: true })
  writeFileSync(join(dir, 'node_modules', 'dep', 'index.js'), 'payload dep')
  mkdirSync(join(dir, '.git'), { recursive: true })
  writeFileSync(join(dir, '.git', 'HEAD'), 'payload git')
  return { resources, payloadPath: dir }
}

function store(status: 'absent' | 'existing' | 'dismissed' = 'absent'): DefaultProjectStore & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    seedStatus: vi.fn(async () => { calls.push('seedStatus'); return status }),
    touchByFolder: vi.fn(async () => { calls.push('touchByFolder') }),
    ensureProject: vi.fn(async () => { calls.push('ensureProject'); return {} }),
  }
}

function seed(homeDir: string, resources: string, version: string, projects = store()) {
  const context = { isPackaged: true, resourcesPath: resources, appPath: '/app' }
  return {
    projects,
    run: () => seedDefaultProject({ profile: profile(version), context, homeDir, projects }),
  }
}

describe('default project re-seed on release change', () => {
  it('seeds on first run and stamps the release', async () => {
    const home = tmp('vclaw-home-')
    const { resources } = payload('1.0.0+a', 'first')
    const { run, projects } = seed(home, resources, '1.0.0+a')

    await expect(run()).resolves.toEqual({ status: 'seeded' })
    const target = join(home, '.vizmaster', 'default')
    expect(readFileSync(join(target, 'index.html'), 'utf8')).toContain('first')
    expect(JSON.parse(readFileSync(join(target, 'BUILD.json'), 'utf8')).release).toBe('1.0.0+a')
    expect(projects.calls).toContain('ensureProject')
  })

  it('re-seeds when the release changed, preserving lessons/, node_modules/ and .git/', async () => {
    const home = tmp('vclaw-home-')
    const target = join(home, '.vizmaster', 'default')
    const first = payload('1.0.0+a', 'first')
    await seed(home, first.resources, '1.0.0+a').run()

    // The user's work, planted where a re-seed could destroy it.
    mkdirSync(join(target, 'lessons'), { recursive: true })
    writeFileSync(join(target, 'lessons', 'mine.md'), 'MY LESSON')
    mkdirSync(join(target, 'node_modules', 'dep'), { recursive: true })
    writeFileSync(join(target, 'node_modules', 'dep', 'index.js'), 'MY DEP')
    mkdirSync(join(target, '.git'), { recursive: true })
    writeFileSync(join(target, '.git', 'HEAD'), 'MY GIT')
    writeFileSync(join(target, 'index.html'), 'edited by the user')

    const second = payload('1.0.0+b', 'second')
    await expect(seed(home, second.resources, '1.0.0+b').run()).resolves.toEqual({ status: 'upgraded', from: '1.0.0+a', to: '1.0.0+b' })

    expect(readFileSync(join(target, 'lessons', 'mine.md'), 'utf8')).toBe('MY LESSON')
    expect(readFileSync(join(target, 'node_modules', 'dep', 'index.js'), 'utf8')).toBe('MY DEP')
    expect(readFileSync(join(target, '.git', 'HEAD'), 'utf8')).toBe('MY GIT')
    // Payload-owned files DO move: that is what a release change means.
    expect(readFileSync(join(target, 'index.html'), 'utf8')).toContain('second')
    expect(JSON.parse(readFileSync(join(target, 'BUILD.json'), 'utf8')).release).toBe('1.0.0+b')
  })

  it('is a no-op when the installed release already matches', async () => {
    const home = tmp('vclaw-home-')
    const target = join(home, '.vizmaster', 'default')
    const first = payload('1.0.0+a', 'first')
    await seed(home, first.resources, '1.0.0+a').run()
    writeFileSync(join(target, 'index.html'), 'hand edited')

    const { run } = seed(home, first.resources, '1.0.0+a')
    await expect(run()).resolves.toEqual({ status: 'skipped', reason: 'target-exists' })
    expect(readFileSync(join(target, 'index.html'), 'utf8')).toBe('hand edited')
  })

  it('never copies the KEEP SET out of the payload, on first run or on re-seed', async () => {
    const home = tmp('vclaw-home-')
    const target = join(home, '.vizmaster', 'default')
    const first = payload('1.0.0+a', 'first')
    await seed(home, first.resources, '1.0.0+a').run()

    // The payload's own lessons/.git/node_modules are NOT copied on the first run either.
    expect(existsSync(join(target, 'lessons', 'shipped.md'))).toBe(false)
    expect(existsSync(join(target, '.git', 'HEAD'))).toBe(false)
    expect(existsSync(join(target, 'node_modules', 'dep', 'index.js'))).toBe(false)

    const second = payload('1.0.0+b', 'second')
    await seed(home, second.resources, '1.0.0+b').run()
    // And a re-seed cannot introduce them: the keep set is one filter, used by both paths.
    expect(existsSync(join(target, 'lessons', 'shipped.md'))).toBe(false)
    expect(existsSync(join(target, '.git', 'HEAD'))).toBe(false)
    expect(existsSync(join(target, 'node_modules', 'dep', 'index.js'))).toBe(false)
  })

  it('re-seeds a tree that carries no readable BUILD.json', async () => {
    const home = tmp('vclaw-home-')
    const target = join(home, '.vizmaster', 'default')
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'package.json'), '{"name":"old"}')

    const { run } = seed(home, payload('1.0.0+a', 'first').resources, '1.0.0+a')
    await expect(run()).resolves.toEqual({ status: 'upgraded', from: null, to: '1.0.0+a' })
    expect(existsSync(join(target, 'index.html'))).toBe(true)
  })

  it('never resurrects a tree the user dismissed', async () => {
    const home = tmp('vclaw-home-')
    const target = join(home, '.vizmaster', 'default')
    mkdirSync(target, { recursive: true })
    writeFileSync(join(target, 'BUILD.json'), JSON.stringify({ release: '0.9.0' }))
    writeFileSync(join(target, 'index.html'), 'untouched')

    const { run } = seed(home, payload('1.0.0+a', 'first').resources, '1.0.0+a', store('dismissed'))
    await expect(run()).resolves.toEqual({ status: 'skipped', reason: 'target-exists' })
    expect(readFileSync(join(target, 'index.html'), 'utf8')).toBe('untouched')
  })
})
