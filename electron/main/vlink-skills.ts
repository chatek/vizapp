import { cp, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

/** The VLink skills shipped under assets/skills (resources/skills when packaged). */
export const VLINK_SKILL_IDS = ['vlink-pets', 'vlink-connect', 'vlink-digest'] as const

export type VlinkSkillSeedResult = { id: (typeof VLINK_SKILL_IDS)[number]; status: 'seeded' | 'existing' | 'absent' }

/**
 * Injectable filesystem so every branch is testable without touching the real home.
 * `cp` is copy-if-absent by construction: it is only called after `stat` finds no target.
 */
export interface VlinkSkillsFilesystem {
  stat(path: string): Promise<{ isFile(): boolean }>
  mkdir(path: string, options: { recursive: true }): Promise<string | undefined>
  cp(source: string, target: string, options: { recursive: boolean; force: boolean }): Promise<void>
}

const defaultFilesystem: VlinkSkillsFilesystem = {
  stat: (path) => stat(path),
  mkdir: (path, options) => mkdir(path, options),
  cp: (source, target, options) => cp(source, target, options),
}

/**
 * Seeds the bundled VLink skills into the user's OMP agent skills directory on first run.
 * Copy-if-absent, never overwrite: after seeding the files are the user's, and a newer app
 * must not clobber their edits. A missing bundled source is reported per-skill ('absent')
 * rather than thrown — the app starts without vlink skills either way.
 */
export async function seedVlinkSkills(options: {
  sourceRoot: string
  targetRoot: string
  filesystem?: VlinkSkillsFilesystem
}): Promise<VlinkSkillSeedResult[]> {
  const filesystem = options.filesystem ?? defaultFilesystem
  const results: VlinkSkillSeedResult[] = []
  for (const id of VLINK_SKILL_IDS) {
    const source = join(options.sourceRoot, id)
    const target = join(options.targetRoot, id)
    try {
      await filesystem.stat(join(target, 'SKILL.md'))
      results.push({ id, status: 'existing' })
      continue
    } catch { /* not seeded yet */ }
    try {
      await filesystem.stat(join(source, 'SKILL.md'))
    } catch {
      results.push({ id, status: 'absent' })
      continue
    }
    await filesystem.mkdir(target, { recursive: true })
    await filesystem.cp(source, target, { recursive: true, force: false })
    results.push({ id, status: 'seeded' })
  }
  return results
}
