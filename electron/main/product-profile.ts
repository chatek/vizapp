import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, normalize, sep } from 'node:path'
import type { HarnessId, ProductProfileSummary } from '../../src/types/api'

/**
 * Mirrors HARNESS_IDS in src/types/api.ts.
 *
 * Local rather than imported because the release scripts load THIS module under plain Node to
 * validate a profile before packaging, and Node's ESM resolution cannot follow an extensionless
 * import of a runtime value from a .ts file (type-only imports are stripped, which is why the
 * existing extension-manifest precedent works). tests/product-profile.test.ts asserts the two
 * lists are identical, so the mirror cannot drift silently.
 */
export const PRODUCT_HARNESS_IDS = ['omp', 'prime', 'pi'] as const
const HARNESS_VOCABULARY: readonly string[] = PRODUCT_HARNESS_IDS

/**
 * A product profile is the ONLY place a build differs from the generic app.
 *
 * It exists because variant behaviour used to be delivered by anchored text edits
 * (`member-seams.mjs` rewrites `reconcileActiveHarness`, wraps the project list, appends
 * `ensureDefaultProject`). Those edits are untestable in this repo, invisible to the seam
 * verifier, and re-bet on every upstream merge. A product decision belongs in data that a
 * build carries and a user can read — not in a patch that a member repo replays.
 *
 * Invariants (checked in validateProductProfile, refused rather than repaired):
 *   - `harnesses` is the PRODUCT's set; `settings.enabledHarnesses` stays the USER's
 *     preference inside it, so the two intersect instead of one overwriting the other.
 *   - `defaultProject.from` names a directory shipped next to the app; it is resolved at
 *     run time against Resources and may never escape it.
 *   - `defaultProject.to` is a user-visible path (`~/Name`), never a bare home or a root —
 *     `ProjectService.grantProjectFolder` refuses broad roots, so a bad value would fail at
 *     seeding time rather than at build time, which is the wrong place to find out.
 */

export interface ProductIdentity {
  readonly productName: string
  readonly appId: string
}

export interface DefaultProjectSpec {
  /** Display name for the seeded project (also the sidebar label). */
  readonly name: string
  /** Payload directory, relative to Resources (packaged) or the repo root (development). */
  readonly from: string
  /** Destination as the user sees it: `~/Name`. Expanded at run time, never baked absolute. */
  readonly to: string
  /** Release stamp written into the payload's BUILD.json; drives upgrade decisions. */
  readonly version: string
}

export type ProductProjectsMode = 'single' | 'multiple'

export interface ProductProfile {
  readonly profileVersion: 1
  readonly id: string
  readonly identity?: ProductIdentity
  readonly harnesses: readonly HarnessId[]
  /** 'single' = this product presents ONE project (the seeded default) and no other. */
  readonly projects?: ProductProjectsMode
  readonly defaultProject?: DefaultProjectSpec
  /** Where this profile came from — surfaced so a packaging mistake is visible, not silent. */
  readonly source: 'packaged' | 'development' | 'built-in'
  readonly path?: string
}

export interface ProductProfileContext {
  readonly isPackaged: boolean
  readonly resourcesPath: string
  readonly appPath: string
}

export class ProductProfileError extends Error {
  // Field assigned in the body rather than declared as a constructor parameter property:
  // the release scripts import this module under plain Node, whose TypeScript support strips
  // types but cannot transform parameter properties (ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX).
  readonly reason: string

  constructor(reason: string, detail: string) {
    super(`Invalid product profile (${reason}): ${detail}`)
    this.reason = reason
    this.name = 'ProductProfileError'
  }
}

/** The generic product: every harness, no seeded project. Never narrowed by accident. */
export const BUILT_IN_PROFILE: ProductProfile = Object.freeze({
  profileVersion: 1,
  id: 'vclaw',
  harnesses: [...PRODUCT_HARNESS_IDS],
  source: 'built-in',
})

export function productProfilePath(context: ProductProfileContext): string {
  return context.isPackaged
    ? join(context.resourcesPath, 'product.json')
    : join(context.appPath, 'product', 'profile.json')
}

const PROFILE_ID = /^[a-z0-9][a-z0-9-]{0,31}$/
const APP_ID = /^[a-z0-9][a-z0-9.-]{2,127}$/

function requireObject(value: unknown, reason: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ProductProfileError(reason, 'expected an object')
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, reason: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProductProfileError(reason, 'expected a non-empty string')
  }
  return value
}

function validateHarnesses(value: unknown): HarnessId[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ProductProfileError('harnesses', 'expected a non-empty array')
  }
  const seen = new Set<string>()
  return value.map((entry) => {
    if (typeof entry !== 'string' || !HARNESS_VOCABULARY.includes(entry)) {
      throw new ProductProfileError('harnesses', `unknown harness ${JSON.stringify(entry)}; allowed: ${HARNESS_VOCABULARY.join(', ')}`)
    }
    if (seen.has(entry)) throw new ProductProfileError('harnesses', `duplicate harness ${entry}`)
    seen.add(entry)
    return entry as HarnessId
  })
}

function validateDefaultProject(value: unknown, harnesses: readonly HarnessId[]): DefaultProjectSpec {
  const spec = requireObject(value, 'defaultProject')
  const name = requireString(spec.name, 'defaultProject.name')
  const from = requireString(spec.from, 'defaultProject.from')
  const to = requireString(spec.to, 'defaultProject.to')
  const version = requireString(spec.version, 'defaultProject.version')

  // `from` is a Resources-relative directory: absolute paths and `..` would let a profile
  // name anything on disk, which is a build defect (or worse) rather than a variant.
  if (isAbsolute(from)) throw new ProductProfileError('defaultProject.from', `must be relative to Resources, got ${from}`)
  const normalized = normalize(from)
  if (normalized === '.' || normalized.startsWith('..') || normalized.split(sep).includes('..')) {
    throw new ProductProfileError('defaultProject.from', `must stay inside Resources, got ${from}`)
  }

  // `to` must be a home-relative path with a real subdirectory: ProjectService refuses
  // $HOME and volume roots (isBroadProjectRoot), so `~` alone would fail at seeding.
  if (!to.startsWith('~/') || to === '~/' || to.slice(2).trim() === '') {
    throw new ProductProfileError('defaultProject.to', `expected "~/<name>", got ${to}`)
  }

  if (spec.harness !== undefined) {
    const harness = requireString(spec.harness, 'defaultProject.harness')
    if (!(harnesses as readonly string[]).includes(harness)) {
      throw new ProductProfileError('defaultProject.harness', `${harness} is not offered by this profile`)
    }
  }

  return Object.freeze({ name, from: normalized, to, version })
}

function validateIdentity(value: unknown): ProductIdentity {
  const identity = requireObject(value, 'identity')
  const productName = requireString(identity.productName, 'identity.productName')
  const appId = requireString(identity.appId, 'identity.appId')
  if (!APP_ID.test(appId)) throw new ProductProfileError('identity.appId', `not a reverse-DNS identifier: ${appId}`)
  return Object.freeze({ productName, appId })
}

/**
 * Validates parsed JSON. Exported so the build can run the SAME check at packaging time:
 * a profile that cannot start the app must not become an artefact.
 */
export function validateProductProfile(raw: unknown, source: ProductProfile['source'], path?: string): ProductProfile {
  const parsed = requireObject(raw, 'root')
  if (parsed.profileVersion !== 1) {
    throw new ProductProfileError('profileVersion', `expected 1, got ${JSON.stringify(parsed.profileVersion)}`)
  }
  const id = requireString(parsed.id, 'id')
  if (!PROFILE_ID.test(id)) throw new ProductProfileError('id', `must match ${PROFILE_ID}, got ${id}`)
  const harnesses = validateHarnesses(parsed.harnesses)
  const identity = parsed.identity === undefined ? undefined : validateIdentity(parsed.identity)
  if (parsed.projects !== undefined && parsed.projects !== 'single' && parsed.projects !== 'multiple') {
    throw new ProductProfileError('projects', `expected "single" or "multiple", got ${JSON.stringify(parsed.projects)}`)
  }
  // A single-project product with nothing to seed would present an empty app forever.
  if (parsed.projects === 'single' && parsed.defaultProject === undefined) {
    throw new ProductProfileError('projects', '"single" requires a defaultProject')
  }
  const defaultProject = parsed.defaultProject === undefined ? undefined : validateDefaultProject(parsed.defaultProject, harnesses)

  // A seeded project in a product that offers no harness for it would be created and then
  // never shown (records are harness-scoped), so it is a contradiction, not a warning.
  if (defaultProject && harnesses.length === 0) {
    throw new ProductProfileError('defaultProject', 'requires at least one harness')
  }

  return Object.freeze({
    profileVersion: 1 as const,
    id,
    ...(identity ? { identity } : {}),
    harnesses,
    ...(parsed.projects ? { projects: parsed.projects as ProductProjectsMode } : {}),
    ...(defaultProject ? { defaultProject } : {}),
    source,
    ...(path ? { path } : {}),
  })
}

/**
 * Loads the profile a build carries. Absent is legitimate (generic development checkout);
 * malformed is not — it throws so a broken build fails at startup with a named reason
 * instead of quietly behaving like the generic app.
 */
export function loadProductProfile(context: ProductProfileContext, readFile = readFileSync): ProductProfile {
  const path = productProfilePath(context)
  if (!existsSync(path)) return BUILT_IN_PROFILE
  let parsed: unknown
  try {
    parsed = JSON.parse(readFile(path, 'utf8'))
  } catch (error) {
    throw new ProductProfileError('json', `${path}: ${error instanceof Error ? error.message : String(error)}`)
  }
  return validateProductProfile(parsed, context.isPackaged ? 'packaged' : 'development', path)
}

/** Resources-resolved payload directory for the seeded project, or null when unsupported. */
export function defaultProjectPayloadPath(profile: ProductProfile, context: ProductProfileContext): string | null {
  if (!profile.defaultProject) return null
  const root = context.isPackaged ? context.resourcesPath : context.appPath
  return join(root, profile.defaultProject.from)
}

/** `~/Name` → absolute path, using the platform's real home directory. */
export function expandDefaultProjectTarget(profile: ProductProfile, homeDir: string): string | null {
  if (!profile.defaultProject) return null
  return join(homeDir, profile.defaultProject.to.slice(2))
}

/** Renderer-facing view: what to call this product, and what it seeds. No policy, no paths. */
export function describeProductProfile(profile: ProductProfile): ProductProfileSummary {
  return {
    id: profile.id,
    source: profile.source,
    harnesses: [...profile.harnesses],
    ...(profile.defaultProject
      ? { defaultProject: { name: profile.defaultProject.name, version: profile.defaultProject.version } }
      : {}),
  }
}
