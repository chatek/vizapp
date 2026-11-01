import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { seedDefaultProject, type DefaultProjectFilesystem, type DefaultProjectStore } from '../electron/main/default-project'
import { validateProductProfile } from '../electron/main/product-profile'

const context = { isPackaged: true, resourcesPath: '/res', appPath: '/app' }
const homeDir = '/home/user'
const payloadPath = join('/res', 'vendor', 'vizmaster')
const target = join(homeDir, 'VizMaster')

const memberProfile = validateProductProfile(
  {
    profileVersion: 1,
    id: 'vizmaster',
    harnesses: ['omp'],
    defaultProject: { name: 'VizMaster', from: 'vendor/vizmaster', to: '~/VizMaster', version: '1.0.0+20261029.7263596' },
  },
  'packaged',
)

const genericProfile = validateProductProfile({ profileVersion: 1, id: 'vclaw', harnesses: ['omp'] }, 'built-in')

function fakeStore(status: 'dismissed' | 'existing' | 'absent' = 'absent'): DefaultProjectStore & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    seedStatus: vi.fn(async () => {
      calls.push('seedStatus')
      return status
    }),
    touchByFolder: vi.fn(async () => {
      calls.push('touchByFolder')
    }),
    ensureProject: vi.fn(async () => {
      calls.push('ensureProject')
      return {}
    }),
  }
}

interface FakeFs extends DefaultProjectFilesystem {
  directories: Set<string>
  files: Map<string, string>
  copied: string[]
  writes: [string, string][]
}

function fakeFs(options: { directories?: string[]; files?: Record<string, string>; payloadEntries?: string[] } = {}): FakeFs {
  const directories = new Set(options.directories ?? [payloadPath])
  const files = new Map(Object.entries(options.files ?? {}))
  const copied: string[] = []
  const writes: [string, string][] = []
  const payloadEntries = options.payloadEntries ?? ['index.js']
  return {
    directories,
    files,
    copied,
    writes,
    stat: async (path) => {
      if (!directories.has(path)) throw new Error(`ENOENT ${path}`)
      return { isDirectory: () => true }
    },
    mkdir: async (path) => {
      directories.add(path)
    },
    cp: async (source, destination, cpOptions) => {
      expect(source).toBe(payloadPath)
      expect(destination).toBe(target)
      for (const entry of payloadEntries) {
        // The real fs.cp calls filter(sourcePath) for every entry it walks.
        if (cpOptions.filter(join(source, entry))) copied.push(entry)
      }
    },
    readFile: async (path) => {
      const contents = files.get(path)
      if (contents === undefined) throw new Error(`ENOENT ${path}`)
      return contents
    },
    writeFile: async (path, contents) => {
      writes.push([path, contents])
      files.set(path, contents)
    },
  }
}

describe('seedDefaultProject', () => {
  test('does nothing for a product without a default project', async () => {
    const projects = fakeStore()
    const filesystem = fakeFs()
    await expect(seedDefaultProject({ profile: genericProfile, context, homeDir, projects, filesystem })).resolves.toEqual({
      status: 'skipped',
      reason: 'no-default-project',
    })
    expect(projects.calls).toEqual([])
    expect(filesystem.copied).toEqual([])
  })

  test('a build without the payload skips without touching the store', async () => {
    const projects = fakeStore()
    const filesystem = fakeFs({ directories: [] })
    await expect(seedDefaultProject({ profile: memberProfile, context, homeDir, projects, filesystem })).resolves.toEqual({
      status: 'skipped',
      reason: 'payload-absent',
    })
    expect(projects.calls).toEqual([])
  })

  test('never resurrects a project the user deleted', async () => {
    const projects = fakeStore('dismissed')
    const filesystem = fakeFs()
    const options = { profile: memberProfile, context, homeDir, projects, filesystem }
    await expect(seedDefaultProject(options)).resolves.toEqual({ status: 'suppressed', reason: 'dismissed' })
    // A second launch must reach the same verdict, not "try again and succeed".
    await expect(seedDefaultProject(options)).resolves.toEqual({ status: 'suppressed', reason: 'dismissed' })
    expect(projects.calls).not.toContain('ensureProject')
    expect(filesystem.copied).toEqual([])
  })

  test('an existing project is touched, not re-seeded', async () => {
    const projects = fakeStore('existing')
    const filesystem = fakeFs()
    await expect(seedDefaultProject({ profile: memberProfile, context, homeDir, projects, filesystem })).resolves.toEqual({ status: 'existing' })
    expect(projects.calls).toEqual(['seedStatus', 'touchByFolder'])
    expect(filesystem.copied).toEqual([])
    expect(filesystem.writes).toEqual([])
  })

  test('seeds the payload, stamps BUILD.json and grants the project', async () => {
    const projects = fakeStore()
    const filesystem = fakeFs()
    await expect(seedDefaultProject({ profile: memberProfile, context, homeDir, projects, filesystem })).resolves.toEqual({ status: 'seeded' })
    expect(filesystem.copied).toEqual(['index.js'])
    expect(projects.calls).toEqual(['seedStatus', 'ensureProject'])
    const [path, contents] = filesystem.writes[0]
    expect(path).toBe(join(target, 'BUILD.json'))
    expect(JSON.parse(contents)).toMatchObject({ release: '1.0.0+20261029.7263596', name: 'VizMaster' })
  })

  test('excludes user-owned subtrees from the payload copy', async () => {
    const projects = fakeStore()
    const filesystem = fakeFs({
      payloadEntries: ['index.js', 'lessons/one.md', 'node_modules/pkg/index.js', '.git/config', 'src/app.js'],
    })
    await seedDefaultProject({ profile: memberProfile, context, homeDir, projects, filesystem })
    // Copying over them would replace user content; deleting them would destroy it. Skip them.
    expect(filesystem.copied).toEqual(['index.js', 'src/app.js'])
  })

  test('keeps facts an existing BUILD.json already carries, and does not rewrite an unchanged release', async () => {
    const buildJson = join(target, 'BUILD.json')
    const projects = fakeStore()
    const carried = fakeFs({ files: { [buildJson]: JSON.stringify({ release: '0.9.0', commit: 'abc1234' }) } })
    await seedDefaultProject({ profile: memberProfile, context, homeDir, projects, filesystem: carried })
    expect(JSON.parse(carried.files.get(buildJson) ?? '{}')).toMatchObject({ release: '1.0.0+20261029.7263596', commit: 'abc1234' })

    const current = fakeFs({ files: { [buildJson]: JSON.stringify({ release: '1.0.0+20261029.7263596' }) } })
    await seedDefaultProject({ profile: memberProfile, context, homeDir, projects: fakeStore(), filesystem: current })
    expect(current.writes).toEqual([])
  })
})
