import { existsSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import type { AppSettings, HarnessId, HarnessStatus } from '../../src/types/api'
import { reconcileActiveHarness } from './harness-discovery'
import type { JsonStateStore } from './store'

/**
 * VizMaster@VClaw — first-launch defaults for the bundled tutorial project.
 *
 * Three build-specific behaviours, all keyed off the bundled payload
 * (`<resources>/vizmaster/package.json`), so an ordinary VClaw build is
 * untouched:
 *
 * 1. the payload is materialised under the user's home; an existing install is
 *    upgraded when the shipped BUILD.json release differs, preserving
 *    `src/lessons/`, `node_modules/` and `.git/` and keeping a timestamped
 *    backup of the previous tree. `VCLAW_DEFAULT_PROJECT` is used in place;
 * 2. the project is registered as a pinned OMP project;
 * 3. this build is OMP-only and shows only that project — `ensureHarness`
 *    replaces harness reconciliation, and `singleProjectFilter` hides the
 *    persisted/inferred rows the projector would otherwise add.
 *
 * Idempotent: an install already at the shipped release is left untouched, and
 * an existing project entry for the same path is never duplicated.
 */
const DEFAULT_PROJECT_ID = 'vizmaster-default'
const DEFAULT_PROJECT_NAME = 'VizMaster'

// Electron adds `process.resourcesPath`; @types/node does not declare it.
const electronProcess = process as NodeJS.Process & { resourcesPath?: string }

/** True for the VizMaster@VClaw build: the bundled payload is the marker. */
export function isBundledVizMaster(resourcesPath: string = electronProcess.resourcesPath ?? ''): boolean {
  return resourcesPath.length > 0 && existsSync(join(resourcesPath, 'vizmaster', 'package.json'))
}

/** The release id recorded inside a project tree, or null when absent/invalid. */
async function readRelease(dir: string): Promise<string | null> {
  try {
    const raw = JSON.parse(await readFile(join(dir, 'BUILD.json'), 'utf8')) as { release?: unknown }
    return typeof raw.release === 'string' ? raw.release : null
  } catch {
    return null
  }
}

/**
 * Copy the bundled payload over an existing install **in place**, preserving
 * learner work and the directory identity.
 *
 * VClaw authorizes a project by its folder identity (dev/ino/birthtime), so the
 * top-level directory must not be replaced — a rename would silently lock the
 * project out with "folder identity changed". The previous tree is copied to a
 * timestamped backup first (excluding `node_modules`, which is reproducible),
 * then the payload is copied over it and stale top-level entries are removed.
 */
async function installOrUpgrade(bundled: string, target: string): Promise<void> {
  if (!existsSync(join(target, 'package.json'))) {
    await mkdir(target, { recursive: true })
    await cp(bundled, target, { recursive: true })
    return
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${target}.bak-${stamp}`
  const keep = new Set(['src/lessons', 'node_modules', '.git'])

  await cp(target, backup, {
    recursive: true,
    filter: (source) => !source.includes(`${join(target, 'node_modules')}`),
  })
  await cp(bundled, target, { recursive: true, force: true })

  const shipped = new Set(await readdir(bundled))
  for (const name of await readdir(target)) {
    if (shipped.has(name) || keep.has(name)) continue
    await rm(join(target, name), { recursive: true, force: true })
  }
  console.info(`[vizmaster] installed ${target}; previous tree kept at ${backup}`)
}

/** Current folder identity in the shape VClaw stores and verifies. */
async function currentIdentity(dir: string): Promise<{ dev: string; ino: string; birthtimeNs?: string } | null> {
  try {
    const info = await stat(dir, { bigint: true })
    return {
      dev: String(info.dev),
      ino: String(info.ino),
      birthtimeNs: String(info.birthtimeNs),
    }
  } catch {
    return null
  }
}

function defaultProjectPath(homeDir: string): string {
  const override = process.env.VCLAW_DEFAULT_PROJECT?.trim()
  return override && override.length > 0 ? override : join(homeDir, DEFAULT_PROJECT_NAME)
}

export async function ensureDefaultProject(store: JsonStateStore, homeDir: string, resourcesPath: string): Promise<void> {
  const bundled = join(resourcesPath, 'vizmaster')
  if (!existsSync(join(bundled, 'package.json'))) return

  const projectPath = defaultProjectPath(homeDir)
  const inPlace = projectPath !== join(homeDir, DEFAULT_PROJECT_NAME)
  if (!inPlace) {
    const bundledRelease = await readRelease(bundled)
    const installedRelease = existsSync(projectPath) ? await readRelease(projectPath) : null
    const needsInstall =
      !existsSync(join(projectPath, 'package.json')) ||
      (bundledRelease !== null && installedRelease !== bundledRelease)
    if (needsInstall) await installOrUpgrade(bundled, projectPath)
  }
  if (!existsSync(join(projectPath, 'package.json'))) return
  // The installer owns this project's folder. Keep the stored identity aligned
  // with the directory it just wrote, or VClaw refuses every project request
  // after an in-place upgrade (and after the earlier rename-based one).
  const identity = inPlace ? null : await currentIdentity(projectPath)

  await store.update((draft) => {
    const now = new Date().toISOString()
    const existing = draft.projects.find((project) => project.id === DEFAULT_PROJECT_ID || project.path === projectPath)
    if (existing) {
      // The same entry follows the resolved path (a dev override can move it).
      existing.path = projectPath
      existing.folders = [projectPath]
      existing.primaryFolder = projectPath
      existing.pinned = true
      existing.lastOpenedAt = now
      if (identity) {
        existing.folderIdentities = { ...(existing.folderIdentities ?? {}), [projectPath]: identity }
      }
      return
    }
    draft.projects.push({
      id: DEFAULT_PROJECT_ID,
      harness: 'omp',
      name: DEFAULT_PROJECT_NAME,
      path: projectPath,
      folders: [projectPath],
      primaryFolder: projectPath,
      folderIdentities: identity ? { [projectPath]: identity } : undefined,
      pinned: true,
      createdAt: now,
      lastOpenedAt: now,
    })
  })
}

/**
 * OMP-only harness selection for this build.
 *
 * `reconcileActiveHarness` switches to the first *detected* harness when the
 * persisted one is missing, and OMP ships no executable — on a machine without
 * `omp` on PATH that silently selects Prime instead. This build skips that
 * reconciliation and persists OMP as the only enabled harness.
 */
export async function ensureHarness(
  store: JsonStateStore,
  statuses: Record<HarnessId, HarnessStatus>,
  allowed?: readonly HarnessId[],
): Promise<AppSettings> {
  // The 3-arg form matches reconcileActiveHarness's product-profile signature, which the
  // integrated index.ts calls; the v1 integrator's 2-arg rewrite predates it.
  if (!isBundledVizMaster()) return reconcileActiveHarness(store, statuses, allowed)

  return store.update((draft) => {
    draft.settings.enabledHarnesses = ['omp']
    draft.settings.activeHarness = 'omp'
    return structuredClone(draft.settings)
  })
}

/**
 * Single-project mode. `ProjectService.list()` merges persisted records with
 * inferred session roots, so an "only one project" build has to filter the
 * result rather than just seed one row.
 */
export function singleProjectFilter<T extends { id: string }>(records: T[]): T[] {
  if (!isBundledVizMaster()) return records
  const only = records.filter((record) => record.id === DEFAULT_PROJECT_ID)
  return only.length > 0 ? only : records
}
