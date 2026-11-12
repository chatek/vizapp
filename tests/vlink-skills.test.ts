import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { seedVlinkSkills, VLINK_SKILL_IDS, type VlinkSkillsFilesystem } from '../electron/main/vlink-skills'

const sourceRoot = '/res/skills'
const targetRoot = join('/home', 'user', '.omp', 'agent', 'skills')

interface FakeFs extends VlinkSkillsFilesystem {
  files: Set<string>
  directories: Set<string>
  copies: [string, string][]
}

/** `files` are the paths that exist; the bundled sources exist unless removed via `absent`. */
function fakeFs(options: { existing?: string[]; absent?: string[] } = {}): FakeFs {
  const absent = new Set((options.absent ?? []).map((id) => join(sourceRoot, id, 'SKILL.md')))
  const files = new Set<string>(
    [...VLINK_SKILL_IDS.map((id) => join(sourceRoot, id, 'SKILL.md')), ...(options.existing ?? [])].filter(
      (path) => !absent.has(path),
    ),
  )
  const directories = new Set<string>([sourceRoot, targetRoot])
  const copies: [string, string][] = []
  return {
    files,
    directories,
    copies,
    stat: vi.fn(async (path: string) => {
      if (!files.has(path)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      return { isFile: () => true }
    }),
    mkdir: vi.fn(async (path: string) => {
      directories.add(path)
      return path
    }),
    cp: vi.fn(async (source: string, target: string) => {
      copies.push([source, target])
      files.add(join(target, 'SKILL.md'))
      directories.add(target)
    }),
  }
}

describe('seedVlinkSkills', () => {
  test('seeds every bundled vlink skill into the agent skills directory on first run', async () => {
    const fs = fakeFs()
    const results = await seedVlinkSkills({ sourceRoot, targetRoot, filesystem: fs })
    expect(results).toEqual(VLINK_SKILL_IDS.map((id) => ({ id, status: 'seeded' })))
    expect(fs.copies).toEqual(VLINK_SKILL_IDS.map((id) => [join(sourceRoot, id), join(targetRoot, id)]))
  })

  test('never overwrites: an existing target SKILL.md is left untouched', async () => {
    const existing = VLINK_SKILL_IDS.map((id) => join(targetRoot, id, 'SKILL.md'))
    const fs = fakeFs({ existing })
    const results = await seedVlinkSkills({ sourceRoot, targetRoot, filesystem: fs })
    expect(results).toEqual(VLINK_SKILL_IDS.map((id) => ({ id, status: 'existing' })))
    expect(fs.copies).toEqual([])
    expect(fs.mkdir).not.toHaveBeenCalled()
  })

  test('mixed: only the absent skills are copied', async () => {
    const fs = fakeFs({ existing: [join(targetRoot, 'vlink-pets', 'SKILL.md')] })
    const results = await seedVlinkSkills({ sourceRoot, targetRoot, filesystem: fs })
    expect(results).toEqual([
      { id: 'vlink-pets', status: 'existing' },
      { id: 'vlink-connect', status: 'seeded' },
      { id: 'vlink-digest', status: 'seeded' },
    ])
    expect(fs.copies.map(([source]) => source)).toEqual([
      join(sourceRoot, 'vlink-connect'),
      join(sourceRoot, 'vlink-digest'),
    ])
  })

  test('a missing bundled source is reported absent, not thrown', async () => {
    const fs = fakeFs({ absent: ['vlink-digest'] })
    const results = await seedVlinkSkills({ sourceRoot, targetRoot, filesystem: fs })
    expect(results).toContainEqual({ id: 'vlink-digest', status: 'absent' })
    expect(fs.copies.map(([source]) => source)).not.toContain(join(sourceRoot, 'vlink-digest'))
  })
})
