import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import type { ProductProfile, ProductProfileContext } from './product-profile'
import { defaultProjectPayloadPath, expandDefaultProjectTarget } from './product-profile'

/**
 * Directories inside a seeded project that belong to the USER once it exists.
 *
 * They are filtered out of the payload copy rather than backed up and restored: the earlier
 * shape of this idea read them as text and then removed the target, which on a real VizMaster
 * tree would have destroyed `node_modules` (hundreds of MB), `.git` (user history) and
 * `lessons` (user content). A copy that never deletes cannot lose them.
 */
const USER_OWNED_SUBTREES: Record<string, true> = {
  lessons: true,
  node_modules: true,
  '.git': true,
}

/** The slice of ProjectService seeding needs; a real ProjectService satisfies it structurally. */
export interface DefaultProjectStore {
  seedStatus(folder: string): Promise<'dismissed' | 'existing' | 'absent'>
  touchByFolder(folder: string): Promise<void>
  ensureProject(folder: string): Promise<unknown>
}

/** Injectable filesystem so every branch is testable without touching the real home. */
export interface DefaultProjectFilesystem {
  stat(path: string): Promise<{ isDirectory(): boolean }>
  mkdir(path: string, options: { recursive: boolean }): Promise<unknown>
  cp(source: string, target: string, options: { recursive: boolean; force: boolean; filter(source: string): boolean }): Promise<void>
  readFile(path: string, encoding: 'utf8'): Promise<string>
  writeFile(path: string, contents: string, encoding: 'utf8'): Promise<void>
  rm(path: string, options: { recursive: boolean; force: boolean }): Promise<void>
}

export type DefaultProjectResult =
  | { status: 'skipped'; reason: 'no-default-project' | 'payload-absent' | 'target-exists' }
  | { status: 'suppressed'; reason: 'dismissed' }
  | { status: 'existing' }
  | { status: 'seeded' }

export interface DefaultProjectOptions {
  profile: ProductProfile
  context: ProductProfileContext
  homeDir: string
  projects: DefaultProjectStore
  filesystem?: DefaultProjectFilesystem
}

const defaultFilesystem: DefaultProjectFilesystem = {
  stat: (path) => stat(path),
  mkdir: (path, options) => mkdir(path, options),
  cp: (source, target, options) => cp(source, target, options),
  readFile: (path, encoding) => readFile(path, encoding),
  writeFile: (path, contents, encoding) => writeFile(path, contents, encoding),
  rm: (path, options) => rm(path, options),
}

async function exists(path: string, filesystem: DefaultProjectFilesystem): Promise<boolean> {
  try {
    await filesystem.stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Seeds the product's default project on first run.
 *
 * Every branch is a state the app will actually meet, and the order is the contract:
 * no profile -> nothing; no payload -> nothing; user deleted it before -> never resurrect;
 * already there -> just touch; a directory that already exists -> never copy into it;
 * otherwise grant FIRST and only then copy (a refused grant removes the directory we
 * created, and the copy never overwrites an existing file).
 *
 * Returns rather than throws for those states: a missing payload is a configuration fact, not
 * a failure, and a startup crash over it would be worse than starting without the project.
 */
export async function seedDefaultProject(options: DefaultProjectOptions): Promise<DefaultProjectResult> {
  const { profile, context, homeDir, projects } = options
  const filesystem = options.filesystem ?? defaultFilesystem
  const spec = profile.defaultProject
  if (!spec) return { status: 'skipped', reason: 'no-default-project' }

  const payloadPath = defaultProjectPayloadPath(profile, context)
  const target = expandDefaultProjectTarget(profile, homeDir)
  if (!payloadPath || !target) return { status: 'skipped', reason: 'no-default-project' }
  // The target check outranks the payload check: a directory that already exists is the
  // user-data fact, and it must be reported even if the payload were missing.
  if (await exists(target, filesystem)) return { status: 'skipped', reason: 'target-exists' }
  if (!(await exists(payloadPath, filesystem))) return { status: 'skipped', reason: 'payload-absent' }

  const state = await projects.seedStatus(target)
  if (state === 'dismissed') return { status: 'suppressed', reason: 'dismissed' }
  if (state === 'existing') {
    await projects.touchByFolder(target)
    return { status: 'existing' }
  }

  // A directory that already exists is the USER'S even without a project record: copying
  // into it with force would overwrite same-named files — the exact loss the subtree
  // filter cannot cover, because the filter only guards the three USER_OWNED names.
  if (await exists(target, filesystem)) return { status: 'skipped', reason: 'target-exists' }

  await filesystem.mkdir(target, { recursive: true })
  try {
    // GRANT BEFORE COPY: a refused grant (broad root, symlinked target, ownership
    // mismatch) must leave no populated directory behind — `force: true` into a
    // directory we just created would look like success to the user while the store
    // holds no record of it.
    await projects.ensureProject(target)
  } catch (error) {
    // We created this directory and nothing has been written into it yet, so
    // removing it cannot lose user data. A pre-existing directory is left alone.
    await filesystem.rm(target, { recursive: true, force: true })
    throw error
  }

  await filesystem.cp(payloadPath, target, {
    recursive: true,
    // A collision would mean the target gained files between the exists check and
    // now; erroring beats overwriting.
    force: false,
    filter: (source) => {
      const entry = relative(payloadPath, source)
      if (entry === '') return true
      return USER_OWNED_SUBTREES[entry.split(sep)[0]] !== true
    },
  })
  await writeBuildJson(target, spec, filesystem)
  return { status: 'seeded' }
}

/**
 * Writes the release stamp the app and the member's own tooling read. Existing keys are kept:
 * a member payload may already carry facts (a commit id, a build number) we do not know.
 */
async function writeBuildJson(
  target: string,
  spec: NonNullable<ProductProfile['defaultProject']>,
  filesystem: DefaultProjectFilesystem,
): Promise<void> {
  const path = join(target, 'BUILD.json')
  let existing: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(await filesystem.readFile(path, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) existing = parsed as Record<string, unknown>
  } catch {
    // No readable BUILD.json is normal for a first seed and for payloads that do not ship one.
  }
  if (existing.release === spec.version) return
  await filesystem.writeFile(path, `${JSON.stringify({ ...existing, release: spec.version, name: spec.name, seededAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
}
