import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

// ── Toolchain gate for the tests that spawn the release scripts ────────────────
// package.mjs and preflight.mjs refuse to run below the pinned toolchain, so a test
// that spawns them is measuring the SHELL, not the code, on an old machine. Neither a
// red nor a silent green is honest there: a red meaning "your shell is old" trains
// people to ignore the suite (that is how five real defects survived review), and a
// pass would claim coverage we do not have. So: SKIP with a reason that NAMES BOTH
// numbers, and a meta-test below fails if the reason loses one.
const requiredNode = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim()
const requiredNpm = String((JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { engines?: { npm?: string } }).engines?.npm ?? '').replace(/^>=/, '')
// Resolve npm the way the release scripts do — through npm_execpath when present —
// so the gate measures the same npm the spawned script will.
function detectNpmVersion(): string {
  const execpath = process.env.npm_execpath
  if (execpath) {
    const viaExecpath = spawnSync(process.execPath, [execpath, '--version'], { encoding: 'utf8' })
    const reported = (viaExecpath.stdout ?? '').trim()
    if (reported) return reported
  }
  const viaPath = spawnSync('npm', ['--version'], { encoding: 'utf8' })
  return (viaPath.stdout ?? '').trim() || 'unknown'
}
const currentNpmVersion = detectNpmVersion()
function atLeastVersion(actual: string, required: string): boolean {
  const a = actual.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const r = required.split('.').map((part) => Number.parseInt(part, 10) || 0)
  for (let index = 0; index < Math.max(a.length, r.length); index += 1) {
    const left = a[index] ?? 0
    const right = r[index] ?? 0
    if (left !== right) return left > right
  }
  return true
}
const toolchainReady = atLeastVersion(process.versions.node, requiredNode) && atLeastVersion(currentNpmVersion, requiredNpm)
const TOOLCHAIN_SKIP_REASON = `requires Node >=${requiredNode} and npm >=${requiredNpm} (.nvmrc + package.json engines; supply them with npm run toolchain:bootstrap) — this shell has v${process.versions.node}/${currentNpmVersion}`

/**
 * Registers a test that EXECUTES the pinned toolchain (spawns a release script, runs
 * npm, or calls bootstrapNpm/installAppDependencies). Below the pin it SKIPS with the
 * reason naming both numbers, so an old shell is never reported as a product defect —
 * and the meta-test at the top of this file fails if a toolchain-executing test is
 * registered any other way.
 */
function toolchainTest(name: string, body: () => void | Promise<void>, timeoutMs?: number): void {
  test.skipIf(!toolchainReady)(toolchainTestName(name), body, timeoutMs)
}

/** Names the pin in the skipped test's title so the reason cannot rot into 'skipped'. */
function toolchainTestName(name: string): string {
  return toolchainReady ? name : `${name} [${TOOLCHAIN_SKIP_REASON}]`
}

import {
  bootstrapNpm,
  parsePinnedNpmArtifact,
  persistNpmCliPath,
  persistNpmShimDirectory,
  readPinnedNpmArtifact,
  resolveNpmGlobalLayout,
  verifyPinnedNpmArtifact,
} from '../scripts/release/bootstrap-npm.mjs'
import { installAppDependencies } from '../scripts/release/install-app-deps.mjs'
import {
  artifactArchitectures,
  assertArchitectureCoverage,
  assertAsarLayout,
  assertExactArchitectures,
  assertPackagedExtensionContent,
  assertPackagedExtensions,
  assertSupportedNpm,
  assertSupportedNode,
  assertSupportedToolchain,
  assertUnpackedNativeLayout,
  expectedUnpackedNativeLayout,
  renderStagedProfile,
  parseToolchainMetadata,
  parseArchitectures,
  parseTeamIdentifier,
  readNpmOutput,
  readNpmVersion,
  readRepositoryToolchain,
  readShippedAgentPin,
  requireReleaseArtifacts,
  resolveCommandInvocation,
  validateReleaseCredentials,
  validateWindowsReleaseCredentials,
  withoutReleaseCredentials,
} from '../scripts/release/lib.mjs'
import { SHIPPED_EXTENSION_FILENAMES } from '../electron/main/extension-manifest'
import { producedReleaseArtifactNames, readElectronBuilderConfig, RELEASE_BUILD_MATRIX } from '../scripts/release/artifact-names.mjs'
import {
  expectedDownloadedReleaseAssets,
  expectedGitHubReleaseAssets,
  mergeUpdateMetadata,
  parseReleasePlatforms,
  prepareGitHubRelease,
  releaseAssetNames,
} from '../scripts/release/prepare-github-release.mjs'
import { parseDraftAssetNames, staleDraftReleaseAssets } from '../scripts/release/prune-draft-release-assets.mjs'
import { assertBundleSizeBudgets, assertPackageSizeBudgets, BUNDLE_SIZE_BUDGETS, collectBundleSizeMetrics, collectPackageSizeMetrics, PACKAGE_SIZE_BUDGETS } from '../scripts/release/size-budgets.mjs'
import { assertReleaseTag } from '../scripts/release/validate-release-tag.mjs'
import { assertCleanBuild, handoffManifest, handoffTuple, runStaging, stagingPrefix } from '../scripts/release/publish-member-staging.mjs'
import { tagMoveVerdict } from '../scripts/release/assert-tag-move.mjs'
// after-pack.cjs is CommonJS; the interop layer exposes module.exports properties as named exports.
import { executablePath, verifyDashboardPayload } from '../scripts/release/after-pack.cjs'
import { collectAuditAdvisories, describeAuditEvaluation, evaluateAuditReport, parseAuditExceptions, readAuditExceptions } from '../scripts/release/audit-exceptions.mjs'
import {
  assertValidAuthenticode,
  assertUnpackedNativeLayout as assertCrossPlatformUnpackedNativeLayout,
  expectedArtifactExtensions,
  expectedAuthenticodeSigner,
  expectedNativeFiles,
  nativeRuntimeDirectory,
  zeroMqAddonPattern,
} from '../scripts/release/verify-cross-platform-package.mjs'

// js-yaml ships no type declarations, so it is required rather than imported.
const load = createRequire(import.meta.url)('js-yaml').load as (source: string) => unknown

const baseEnvironment = {
  RELEASE_SIGNING_TEAM_ID: 'TEAM123',
  CSC_LINK: 'base64-certificate',
  CSC_KEY_PASSWORD: 'certificate-password',
  APPLE_ID: 'release@example.com',
  APPLE_APP_SPECIFIC_PASSWORD: 'app-password',
  APPLE_TEAM_ID: 'TEAM123',
}

const FIXTURE_ZEROMQ_DIRECTORIES = new Map([
  ['arm64', 'arm64'],
  ['x86_64', 'x64'],
])

function fixtureAddonPath(architecture: string, runtime = 'libc-115-Release') {
  return `node_modules/zeromq/build/darwin/${FIXTURE_ZEROMQ_DIRECTORIES.get(architecture)}/node/${runtime}/addon.node`
}

function createUnpackedFixture(architectures = new Set(['arm64'])) {
  const directory = mkdtempSync(join(tmpdir(), 'prime-work-unpacked-'))
  const relativePaths = [...expectedUnpackedNativeLayout(architectures).files, ...[...architectures].map((architecture) => fixtureAddonPath(architecture))]
  for (const relativePath of relativePaths) {
    const path = join(directory, relativePath)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'fixture')
  }
  return directory
}

function writeSizedFile(path: string, bytes: number) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, '')
  truncateSync(path, bytes)
}

function writeUpdateManifest(directory: string, name: string, url: string, sha512: string, releaseDate: string) {
  const path = join(directory, name, 'latest-mac.yml')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `version: 0.2.0\nreleaseDate: '${releaseDate}'\nfiles:\n  - url: ${url}\n    sha512: ${sha512}\n    size: 42\npath: ${url}\nsha512: ${sha512}\n`)
  return path
}

/** A complete downloaded macOS release artifact tree, optionally missing one produced artifact. */
function writeMacReleaseFixture(directory: string, { omit }: { omit?: string } = {}) {
  const projectDirectory = join(directory, 'project')
  const inputDirectory = join(directory, 'downloaded')
  mkdirSync(projectDirectory, { recursive: true })
  mkdirSync(inputDirectory, { recursive: true })
  writeFileSync(join(projectDirectory, 'package.json'), JSON.stringify({ version: '0.2.0' }))
  writeFileSync(join(projectDirectory, 'package-lock.json'), JSON.stringify({ version: '0.2.0', packages: { '': { version: '0.2.0' } } }))
  for (const [index, name] of expectedDownloadedReleaseAssets('0.2.0', ['mac']).entries()) {
    if (name === omit) continue
    const artifactDirectory = join(inputDirectory, `artifact-${index}`)
    mkdirSync(artifactDirectory, { recursive: true })
    const content = name.endsWith('.yml')
      ? 'version: 0.2.0\nfiles:\n  - url: VizMaster-0.2.0-x64.zip\n    sha512: x64-digest\n    size: 42\npath: VizMaster-0.2.0-x64.zip\nsha512: x64-digest\n'
      : `asset ${index}`
    writeFileSync(join(artifactDirectory, name), content)
  }
  return { projectDirectory, inputDirectory }
}

function createBundleSizeFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'prime-work-bundle-size-'))
  writeSizedFile(join(directory, 'main/index.js'), 101)
  writeSizedFile(join(directory, 'preload/index.js'), 102)
  writeSizedFile(join(directory, 'renderer/assets/entry.js'), 103)
  writeSizedFile(join(directory, 'renderer/assets/vendor.js'), 104)
  writeSizedFile(join(directory, 'renderer/assets/lazy.js'), 105)
  writeSizedFile(join(directory, 'renderer/assets/app.css'), 106)
  writeFileSync(
    join(directory, 'renderer/index.html'),
    '<script type="module" src="./assets/entry.js"></script><link rel="modulepreload" href="./assets/vendor.js"><link rel="stylesheet" href="./assets/app.css">',
  )
  return directory
}

const PINNED_NPM_INTEGRITY = 'sha512-uIXokLlBj6FpNUTQX1PmT5pz7BlIN9QlixX+zdaSNHsd0qUXsbDLr50xzY6Sw7cJVr0uzHKDOle0swmPW/p5Qw=='

function npmArtifactManifest(size: number, overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    artifacts: {
      npm: {
        version: '12.0.2',
        path: 'vendor/npm-12.0.2.tgz',
        source: 'https://registry.npmjs.org/npm/-/npm-12.0.2.tgz',
        integrity: PINNED_NPM_INTEGRITY,
        size,
        license: 'Artistic-2.0',
        ...overrides,
      },
    },
  })
}

function createPinnedNpmArtifactFixture(contents = Buffer.from('verified npm archive fixture')) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'vclaw npm artifact & '))
  const repositoryRoot = join(temporaryDirectory, 'repository with spaces & metacharacters')
  const artifactPath = join(repositoryRoot, 'vendor', 'npm-12.0.2.tgz')
  mkdirSync(dirname(artifactPath), { recursive: true })
  writeFileSync(artifactPath, contents)
  const integrity = `sha512-${createHash('sha512').update(contents).digest('base64')}`
  const manifest = npmArtifactManifest(contents.length, { integrity })
  const artifact = parsePinnedNpmArtifact(manifest, { node: '24.15.0', npm: '12.0.2' }, repositoryRoot)
  return { temporaryDirectory, repositoryRoot, artifactPath, artifact, manifest, contents, integrity }
}

describe('release preflight', () => {
  test('every test that executes the toolchain is registered through toolchainTest', () => {
    // The class guarantee lives here, not in each author's memory: adding a test that
    // REALLY runs the toolchain (spawns a release script or npm, or calls bootstrapNpm
    // without an injected runner) and does not register through toolchainTest is a RED.
    // Tests that inject a fake runner/readOutput call nothing and are correctly not gated.
    //
    // SCANNED BY OFFSET, NOT BY PHYSICAL LINE. The first version matched one line at a
    // time, so it saw a call only when the formatter happened to keep the call on one
    // line: reformatting this file hid four known executions from the scan (the "must
    // find >= 4" assertion went red) while, in the other direction, calls that had been
    // split across lines became visible. A gate whose verdict depends on line wrapping
    // is not a gate, so both the detector and the self-exclusion work on the whole text.
    const source = readFileSync(new URL('./release-scripts.test.ts', import.meta.url), 'utf8')
    const lineOf = (offset: number) => source.slice(0, offset).split('\n').length

    // This test's own body: from its declaration to the NEXT top-level test. Offsets,
    // so no closing-brace shape can move the window.
    const selfStart = source.indexOf("test('every test that executes the toolchain")
    const nextTest = source.indexOf('\n  test(', selfStart + 1)
    const selfEnd = nextTest === -1 ? source.length : nextTest
    const inSelf = (offset: number) => offset >= selfStart && offset <= selfEnd

    const unguarded: string[] = []
    const realExecutions: number[] = []

    // Direct execution: a spawned release script, or a spawned npm. Whitespace between
    // the call and its arguments is irrelevant — that is the point.
    const direct = /spawnSync\(\s*(?:process\.execPath\s*,\s*\[\s*['"]scripts\/release\/|['"]npm['"])/g
    for (const match of source.matchAll(direct)) {
      const offset = match.index ?? 0
      if (inSelf(offset)) continue
      realExecutions.push(offset)
    }
    // Indirect execution: a real bootstrap/install call WITHOUT an injected runner. The
    // exclusion is whitespace-tolerant too, so `installAppDependencies(\n  run` counts as
    // injected rather than slipping into the scan.
    const indirect = /\b(?:bootstrapNpm|installAppDependencies)\(/g
    for (const match of source.matchAll(indirect)) {
      const offset = match.index ?? 0
      if (inSelf(offset)) continue
      if (/^installAppDependencies\(\s*run\b/.test(source.slice(offset))) continue
      if (/readOutput:/.test(source.slice(offset, offset + 800))) continue
      realExecutions.push(offset)
    }

    // Nearest preceding registration at the start of a line: toolchainTest(...) is the
    // only registration that may execute the toolchain.
    const openers = [...source.matchAll(/^[ \t]*(toolchainTest|test)(?:\.skipIf\([^)]*\))?\(/gm)].map((match) => ({
      offset: match.index ?? 0,
      name: match[1],
    }))
    for (const offset of realExecutions) {
      const owner = openers.filter((opener) => opener.offset < offset).at(-1)
      if (!owner) {
        // MODULE-LEVEL SETUP has no registration to own it, and needs none: the one
        // instance is detecting the npm version at import time, which is tolerant by
        // construction (`(stdout ?? '') || 'unknown'`) — that tolerance is exactly what
        // keeps this file loadable on the wrong toolchain, i.e. what makes the skip
        // class work. The count assertion below still fails if the detector goes blind.
        continue
      }
      if (owner.name !== 'toolchainTest') {
        const near = source.slice(offset, offset + 90).split('\n')[0]
        unguarded.push(`line ${lineOf(offset)} under: test — ${near.trim().slice(0, 70)}`)
      }
    }

    expect(unguarded, 'toolchain-executing tests must register through toolchainTest').toEqual([])
    expect(realExecutions.length, 'the scan must find the known toolchain-executing tests').toBeGreaterThanOrEqual(4)
  })

  test('the toolchain skip reason names both pinned numbers and the shell versions', () => {
    // If this fails, a skipped release test just became an unexplained hole.
    expect(TOOLCHAIN_SKIP_REASON).toContain(`Node >=${requiredNode}`)
    expect(TOOLCHAIN_SKIP_REASON).toContain(`npm >=${requiredNpm}`)
    expect(TOOLCHAIN_SKIP_REASON).toContain(process.versions.node)
    expect(TOOLCHAIN_SKIP_REASON).toContain(currentNpmVersion)
  })

  toolchainTest('package.mjs --dry-run says nothing executed instead of claiming success', () => {
    const platform = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux'
    const result = spawnSync(process.execPath, ['scripts/release/package.mjs', '--qa', '--platform', platform, '--dry-run'], { encoding: 'utf8' })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('DRY RUN — nothing executed.')
    expect(result.stdout).not.toContain('pipeline passed')
  })

  toolchainTest('package.mjs --member refuses an un-integrated payload before electron-builder', () => {
    // The generic checkout ships product/payload/README.md only, and a member build without a
    // prior integrate used to package that placeholder with every gate green. product/payload/dist
    // is absent here independently of any real member bundle.
    const platform = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux'
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-member-preflight-'))
    const profile = join(directory, 'profile.json')
    writeFileSync(profile, JSON.stringify({ profileVersion: 1, id: 'preflight-test', harnesses: ['omp'] }))
    try {
      // cwd ISOLATED on purpose: the refusal must come from THIS profile/payload pair,
      // not from whatever the shared checkout happens to carry — since the 6f144322
      // rebrand the checkout's default profile is itself a member with an integrated
      // payload, and a shared cwd makes the gate pass (exit 0) or fail for reasons the
      // fixture does not control.
      // The script path stays ABSOLUTE (the module's real location); only the cwd moves.
      const packageMjs = fileURLToPath(new URL('../scripts/release/package.mjs', import.meta.url))
      // package.mjs lazily imports electron/main/product-profile.ts relative to its CWD:
      // give the isolated checkout that one module as a re-export of the REAL validator,
      // so the gate runs the production logic without a second electron/ tree.
      mkdirSync(join(directory, 'electron', 'main'), { recursive: true })
      writeFileSync(
        join(directory, 'electron', 'main', 'product-profile.ts'),
        `export { validateProductProfile } from ${JSON.stringify(fileURLToPath(new URL('../electron/main/product-profile.ts', import.meta.url)))}\n`,
      )
      const spawn = (args: string[]): SpawnSyncReturns<string> => spawnSync(process.execPath, [packageMjs, ...args.slice(1)], { encoding: 'utf8', cwd: directory })
      const result = spawn(['scripts/release/package.mjs', '--qa', '--platform', platform, '--member', 'preflight-test', '--profile', profile, '--dry-run'])
      expect(result.status, result.stderr).toBe(2)
      expect(result.stderr).toContain('product/payload/dist does not exist')

      // A profile carrying defaultProject is a member build even without --member (the
      // documented `--profile product/<member>.json` invocation). It must fail the same way.
      const memberProfile = join(directory, 'member-profile.json')
      writeFileSync(
        memberProfile,
        JSON.stringify({
          profileVersion: 1,
          id: 'preflight-member',
          harnesses: ['omp'],
          projects: 'single',
          defaultProject: { name: 'X', from: 'product/payload', to: '~/X', version: '0.0.0+unrendered' },
        }),
      )
      const profileOnly = spawn(['scripts/release/package.mjs', '--qa', '--platform', platform, '--profile', memberProfile, '--dry-run'])
      expect(profileOnly.status, profileOnly.stderr).toBe(2)
      expect(profileOnly.stderr).toContain('profile preflight-member but product/payload/dist does not exist')

      // The retired layout fails with the coupling named, rather than seeding an empty project.
      const legacyProfile = join(directory, 'legacy-profile.json')
      writeFileSync(
        legacyProfile,
        JSON.stringify({
          profileVersion: 1,
          id: 'preflight-legacy',
          harnesses: ['omp'],
          projects: 'single',
          defaultProject: { name: 'X', from: 'vizmaster', to: '~/X', version: '0.0.0+unrendered' },
        }),
      )
      const legacy = spawn(['scripts/release/package.mjs', '--qa', '--platform', platform, '--profile', legacyProfile, '--dry-run'])
      expect(legacy.status, legacy.stderr).toBe(2)
      expect(legacy.stderr).toContain('the v2 convention is defaultProject.from = "product/payload"')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('the member job emits provenance, selects its profile, and guards the payload', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
    // Without --profile, package.mjs defaults to product/profile.json (id vclaw) and rejects
    // --member; the member's integrated profile is product/<member>.json.
    expect(workflow).toContain('--member "$MEMBER_ID" --profile "product/$MEMBER_ID.json"')

    // build-info reads the vclaw checkout's tracked state. Integrate deliberately dirties that
    // checkout, so the emitter must run after deps and BEFORE bundle/integrate, or the payload
    // records vclawDirty: true and the mounted-dmg assert rejects it.
    const dependencies = workflow.indexOf('name: Install member dependencies')
    const emitter = workflow.indexOf('name: Emit member provenance for the payload')
    const bundle = workflow.indexOf('name: Bundle the member payload at the pinned sha')
    const integrate = workflow.indexOf('name: Integrate the overlay into this checkout')
    expect(dependencies).toBeGreaterThan(-1)
    expect(emitter).toBeGreaterThan(dependencies)
    expect(bundle).toBeGreaterThan(emitter)
    expect(integrate).toBeGreaterThan(bundle)
    expect(workflow).toContain('run: VCLAW_SRC="$GITHUB_WORKSPACE" node scripts/build-info.mjs --out app/build')

    const packageScript = readFileSync('scripts/release/package.mjs', 'utf8')
    expect(packageScript).toContain("resolve('product', 'payload')")
    expect(packageScript).toContain("resolve(payloadDirectory, 'dist')")
    expect(packageScript).toContain('renderStagedProfile(profile, memberRelease)')
    expect(packageScript).toContain("resolve(payloadDirectory, 'BUILD.json')")
    expect(packageScript).toContain('the v2 convention is defaultProject.from = "product/payload"')
    expect(packageScript).toContain('carries no member content (README.md only)')

    // One payload location: the static extraResources entry ships product/payload, the profile
    // seeds from it, and the mounted-dmg assert reads the same v2 path. The checked-in version is
    // a placeholder because the packaged profile is rendered from BUILD.json.
    const profile = JSON.parse(readFileSync('product/vizmaster.json', 'utf8'))
    expect(profile.defaultProject.from).toBe('product/payload')
    expect(profile.defaultProject.version).toBe('0.0.0+unrendered')
    expect(profile.defaultProject.version).not.toBe('1.0.0+20261101')
    expect(workflow).toContain('Resources/product/payload/BUILD.json')

    // The handoff directory gets the payload provenance beside the dmg (vclawCommit/vclawVersion
    // named explicitly), and SHA256SUMS covers it.
    expect(workflow).toContain('cp "$BUILD" "release/mac/${{ matrix.arch }}/BUILD.json"')
    expect(workflow).toContain('shasum -a 256 ./*.dmg ./*.zip ./BUILD.json > SHA256SUMS')
    expect(workflow).toContain('release/mac/${{ matrix.arch }}/BUILD.json')

    // The public staging upload runs after the digest claim is written and before the Actions
    // artifact, uses the committed sha as the key, and carries the tuple.
    const checksums = workflow.indexOf('name: Checksums')
    const staging = workflow.indexOf('name: Publish the immutable staging prefix for the handoff')
    const upload = workflow.indexOf('name: vclaw-member-${{ inputs.member }}-macos-${{ matrix.arch }}')
    expect(checksums).toBeGreaterThan(-1)
    expect(staging).toBeGreaterThan(checksums)
    expect(upload).toBeGreaterThan(staging)
    expect(workflow).toContain('--vclaw-sha "$GITHUB_SHA"')
    expect(workflow).toContain('R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}')
    expect(workflow).toContain('release/mac/${{ matrix.arch }}/tuple.json')
    expect(workflow).toContain('release/mac/${{ matrix.arch }}/handoff.json')
  })

  test('staging keys are release- and commit-scoped and append-only by construction', () => {
    const sha = 'a'.repeat(40)
    expect(stagingPrefix({ member: 'vizmaster', release: '1.0.0+20261105.abc1234', vclawSha: sha, arch: 'arm64' })).toBe(`staging/member/vizmaster/1.0.0+20261105.abc1234/${sha}/arm64`)
    expect(() => stagingPrefix({ member: 'vizmaster', release: '../x', vclawSha: sha, arch: 'arm64' })).toThrow(/release/)
    expect(() => stagingPrefix({ member: 'vizmaster', release: '1.0.0', vclawSha: 'abc', arch: 'arm64' })).toThrow(/40-character/)
    expect(() => stagingPrefix({ member: 'VizMaster', release: '1.0.0', vclawSha: sha, arch: 'arm64' })).toThrow(/member/)
  })

  test('staging refuses a dirty build instead of recording dirty in the tuple', () => {
    expect(handoffTuple({ sha: 'b'.repeat(40), branch: 'main' })).toEqual({ sha: 'b'.repeat(40), branch: 'main', dirty: false })
    expect(assertCleanBuild({ dirty: false, vclawDirty: false, release: '1.0.0+x', vclawCommit: 'abc1234' })).toEqual({
      release: '1.0.0+x',
      vclawCommit: 'abc1234',
    })
    expect(() => assertCleanBuild({ dirty: true, vclawDirty: false, release: '1.0.0+x' })).toThrow(/dirty/)
    expect(() => assertCleanBuild({ dirty: 'false', vclawDirty: false, release: '1.0.0+x' })).toThrow(/dirty/)
    expect(() => assertCleanBuild({ dirty: false, vclawDirty: true, release: '1.0.0+x' })).toThrow(/vclawDirty/)
  })

  test('handoff manifest prefers full shas and refuses a missing builtAt', () => {
    const sha = 'e'.repeat(40)
    const full = `abc1234${'e'.repeat(33)}`
    expect(
      handoffManifest({
        buildInfo: { vizmasterCommit: 'abc1234', vizmasterCommitFull: full, builtAt: '2026-11-05T00:00:00.000Z' },
        vclawSha: sha,
        arch: 'arm64',
      }),
    ).toEqual({ vizmasterSha: full, vclawSha: sha, arch: 'arm64', dirty: false, builtAt: '2026-11-05T00:00:00.000Z' })
    expect(
      handoffManifest({
        buildInfo: { vizmasterCommit: 'abc1234', builtAt: '2026-11-05T00:00:00.000Z' },
        vclawSha: sha,
        arch: 'x64',
      }).vizmasterSha,
    ).toBe('abc1234')
    expect(() => handoffManifest({ buildInfo: { vizmasterCommit: 'abc1234' }, vclawSha: sha, arch: 'arm64' })).toThrow(/builtAt/)
  })

  test('staging dry-run prints the immutable prefix and writes the clean tuple', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-staging-'))
    const sha = 'c'.repeat(40)
    const dmg = 'VizMaster-1.1.17-vizmaster-arm64.dmg'
    const zip = 'VizMaster-1.1.17-vizmaster-arm64.zip'
    writeFileSync(
      join(directory, 'BUILD.json'),
      JSON.stringify({
        release: '1.0.0+20261105.abc1234',
        vizmasterVersion: '1.0.0',
        vizmasterCommit: 'abc1234',
        vizmasterCommitFull: `abc1234${'d'.repeat(33)}`,
        vclawVersion: '1.1.17',
        vclawCommit: 'c'.repeat(7),
        vclawCommitFull: sha,
        vclawDirty: false,
        builtAt: '2026-11-05T00:00:00.000Z',
        dirty: false,
      }),
    )
    writeFileSync(join(directory, dmg), 'dmg bytes')
    writeFileSync(join(directory, zip), 'zip bytes')
    // The updater feed must never leave the build host through the staging uploader: a member
    // stage that carried latest*.yml would change every user's update channel.
    writeFileSync(join(directory, 'latest-mac.yml'), 'version: 1.1.17\n')
    const sums = [dmg, zip, 'BUILD.json']
      .map(
        (name) =>
          `${createHash('sha256')
            .update(readFileSync(join(directory, name)))
            .digest('hex')}  ./${name}`,
      )
      .join('\n')
    writeFileSync(join(directory, 'SHA256SUMS'), `${sums}\n`)
    const lines: string[] = []
    try {
      await runStaging(['--dir', directory, '--member', 'vizmaster', '--arch', 'arm64', '--vclaw-sha', sha, '--branch', 'main', '--dry-run'], {}, (line: string) => lines.push(line))
      expect(lines.join('\n')).toContain(`staging/member/vizmaster/1.0.0+20261105.abc1234/${sha}/arm64`)
      expect(lines.join('\n')).not.toContain('latest-mac.yml')
      expect(JSON.parse(readFileSync(join(directory, 'tuple.json'), 'utf8'))).toEqual({ sha, branch: 'main', dirty: false })
      expect(JSON.parse(readFileSync(join(directory, 'handoff.json'), 'utf8'))).toEqual({
        vizmasterSha: `abc1234${'d'.repeat(33)}`,
        vclawSha: sha,
        arch: 'arm64',
        dirty: false,
        builtAt: '2026-11-05T00:00:00.000Z',
      })
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('renders a member profile from the payload release without changing its seed source', () => {
    const profile = {
      profileVersion: 1,
      id: 'vizmaster',
      identity: { productName: 'VizMaster', appId: 'com.vclaw.desktop' },
      harnesses: ['omp'],
      projects: 'single',
      defaultProject: { name: 'VizMaster', from: 'product/payload', to: '~/VizMaster', version: '0.0.0+unrendered' },
      source: 'development',
    }
    const rendered = renderStagedProfile(profile, ' 1.0.0+20261105.abc1234 ')
    expect(rendered.defaultProject?.version).toBe('1.0.0+20261105.abc1234')
    expect(rendered.defaultProject?.from).toBe('product/payload')
    expect(rendered.id).toBe('vizmaster')
    expect(rendered.identity).toEqual({ productName: 'VizMaster', appId: 'com.vclaw.desktop' })
    expect(profile.defaultProject.version).toBe('0.0.0+unrendered')
    expect(() => renderStagedProfile(profile, '')).toThrow(/payload release id/)
    const generic = { profileVersion: 1, id: 'vclaw', harnesses: ['omp'], source: 'development' }
    expect(renderStagedProfile(generic, '')).toBe(generic)
  })

  test('verify-package runs when invoked as a script and fails closed on a missing entrypoint', async () => {
    const { invokedAsScript } = await import('../scripts/release/verify-package.mjs')
    const original = process.argv[1]
    try {
      process.argv[1] = fileURLToPath(new URL('../scripts/release/verify-package.mjs', import.meta.url))
      expect(invokedAsScript()).toBe(true)
      process.argv[1] = join(tmpdir(), 'another-entrypoint.mjs')
      expect(invokedAsScript()).toBe(false)
      process.argv[1] = undefined as unknown as string
      expect(invokedAsScript()).toBe(true)
    } finally {
      process.argv[1] = original
    }
  })

  test('binds the requested target architecture to the produced mac artifacts', async () => {
    const { assertBooleanEntitlement, assertRequestedArchitecture } = await import('../scripts/release/verify-package.mjs')
    const artifacts = { dmg: 'release/mac/arm64/Prime Work-1.0.0-arm64.dmg', zip: 'release/mac/arm64/Prime Work-1.0.0-arm64.zip' }
    expect(() => assertRequestedArchitecture(artifacts, 'arm64')).not.toThrow()
    expect(() => assertRequestedArchitecture(artifacts, undefined)).not.toThrow()
    expect(() => assertRequestedArchitecture(artifacts, 'x64')).toThrow(/declares architecture arm64, but --arch x64 was requested/)
    expect(() => assertRequestedArchitecture({ ...artifacts, zip: 'release/mac/x64/Prime Work-1.0.0-x64.zip' }, 'arm64')).toThrow(/declares architecture x64/)
    expect(() => assertRequestedArchitecture(artifacts, 'universal')).toThrow(/must be arm64 or x64/)
    expect(() => assertRequestedArchitecture(artifacts, '')).toThrow(/must be arm64 or x64/)
    // package.mjs forwards the authoritative arch into mac post-package verification.
    expect(readFileSync('scripts/release/package.mjs', 'utf8')).toContain("'--arch', arch, '--release-directory'")

    const entitlement = 'com.apple.security.device.audio-input'
    expect(() => assertBooleanEntitlement(`<key>${entitlement}</key><true/>`, entitlement, 'fixture')).not.toThrow()
    expect(() => assertBooleanEntitlement(`[Key] ${entitlement}\n[Value]\n[Bool] true`, entitlement, 'fixture')).not.toThrow()
    expect(() => assertBooleanEntitlement(`<key>${entitlement}</key><false/>`, entitlement, 'fixture')).toThrow(/missing required true entitlement/)
  })

  test('enforces the repository Node and npm boundaries from checked-in metadata', () => {
    expect(readRepositoryToolchain()).toEqual({ node: '24.15.0', npm: '12.0.2' })
    expect(() => assertSupportedNode('v24.14.99')).toThrow(/Node\.js >=24\.15\.0 is required/)
    expect(() => assertSupportedNode('v24.15.0')).not.toThrow()
    expect(() => assertSupportedNode('v25.0.0')).not.toThrow()
    expect(() => assertSupportedNpm('12.0.1')).toThrow(/npm >=12\.0\.2 is required/)
    expect(() => assertSupportedNpm('12.0.2')).not.toThrow()
    expect(() => assertSupportedNpm('13.0.0')).not.toThrow()
    expect(() => assertSupportedToolchain({ nodeVersion: 'v24.15.0', npmVersion: '12.0.2' })).not.toThrow()
  })

  test('rejects malformed and prerelease tool versions', () => {
    for (const version of ['24.15', 'v24.15.0 trailing', 'not-node']) {
      expect(() => assertSupportedNode(version)).toThrow(/Cannot parse Node\.js version/)
    }
    expect(() => assertSupportedNode('v24.15.0-rc.1')).toThrow(/stable Node\.js release/)
    for (const version of ['12.0', '12.0.2 trailing', 'not-npm']) {
      expect(() => assertSupportedNpm(version)).toThrow(/Cannot parse npm version/)
    }
    expect(() => assertSupportedNpm('12.0.2-beta.1')).toThrow(/stable npm release/)
  })

  test('fails closed when checked-in toolchain metadata disagrees', () => {
    const packageMetadata = {
      engines: { node: '>=24.15.0', npm: '>=12.0.2' },
      packageManager: 'npm@12.0.2',
    }
    expect(parseToolchainMetadata(JSON.stringify(packageMetadata), '24.15.0\n')).toEqual({ node: '24.15.0', npm: '12.0.2' })
    expect(() => parseToolchainMetadata(JSON.stringify(packageMetadata), '24.14.0\n')).toThrow(/\.nvmrc.*engines\.node/)
    expect(() => parseToolchainMetadata(JSON.stringify({ ...packageMetadata, packageManager: 'npm@12.0.1' }), '24.15.0\n')).toThrow(/packageManager.*engines\.npm/)
    expect(() => parseToolchainMetadata(JSON.stringify({ ...packageMetadata, engines: { ...packageMetadata.engines, node: '^24.15.0' } }), '24.15.0\n')).toThrow(/engines\.node must use/)
    expect(() => parseToolchainMetadata(JSON.stringify(packageMetadata), '24.15.0-rc.1\n')).toThrow(/stable \.nvmrc release/)
    expect(() => parseToolchainMetadata('{', '24.15.0\n')).toThrow(/Cannot parse package\.json/)

    for (const path of ['scripts/release/lib.mjs', 'scripts/release/bootstrap-npm.mjs', 'scripts/release/package.mjs', 'scripts/release/preflight.mjs']) {
      const source = readFileSync(path, 'utf8')
      expect(source).not.toContain('24.15.0')
      expect(source).not.toContain('12.0.2')
    }
  })

  test('binds the npm bootstrap artifact to the packageManager version and canonical registry provenance', () => {
    const fixture = createPinnedNpmArtifactFixture()
    try {
      expect(fixture.artifact).toMatchObject({
        version: '12.0.2',
        relativePath: 'vendor/npm-12.0.2.tgz',
        path: fixture.artifactPath,
        source: 'https://registry.npmjs.org/npm/-/npm-12.0.2.tgz',
        integrity: fixture.integrity,
        size: fixture.contents.length,
        license: 'Artistic-2.0',
      })

      const invalidPins = [
        npmArtifactManifest(fixture.contents.length, { version: '12.0.1' }),
        npmArtifactManifest(fixture.contents.length, { path: 'vendor/npm-elsewhere.tgz' }),
        npmArtifactManifest(fixture.contents.length, { path: '../npm-12.0.2.tgz' }),
        npmArtifactManifest(fixture.contents.length, { source: 'https://example.invalid/npm-12.0.2.tgz' }),
        npmArtifactManifest(fixture.contents.length, { integrity: 'sha256-not-strong-enough' }),
        npmArtifactManifest(fixture.contents.length, { size: 0 }),
        npmArtifactManifest(fixture.contents.length, { size: 1.5 }),
        npmArtifactManifest(fixture.contents.length, { license: 'MIT' }),
        JSON.stringify({ artifacts: {} }),
        '{',
      ]
      for (const source of invalidPins) {
        expect(() => parsePinnedNpmArtifact(source, { node: '24.15.0', npm: '12.0.2' }, fixture.repositoryRoot)).toThrow(/npm bootstrap artifact|dependency-pins\.json/)
      }
    } finally {
      rmSync(fixture.temporaryDirectory, { recursive: true, force: true })
    }
  })

  test('verifies the npm archive before any npm invocation and rejects unsafe artifact state', () => {
    const fixture = createPinnedNpmArtifactFixture()
    try {
      expect(verifyPinnedNpmArtifact(fixture.artifact)).toEqual(fixture.artifact)

      writeFileSync(fixture.artifactPath, Buffer.alloc(fixture.contents.length, 0x78))
      let npmInvocations = 0
      expect(() =>
        bootstrapNpm({
          artifact: fixture.artifact,
          nodeVersion: 'v24.15.0',
          toolchain: { node: '24.15.0', npm: '12.0.2' },
          readOutput: () => {
            npmInvocations += 1
            return 'unexpected'
          },
          run: () => {
            npmInvocations += 1
          },
          persist: () => {
            throw new Error('GITHUB_PATH must not be updated after verification failure')
          },
        }),
      ).toThrow(/integrity does not match/)
      expect(npmInvocations).toBe(0)

      writeFileSync(fixture.artifactPath, fixture.contents.subarray(0, fixture.contents.length - 1))
      expect(() => verifyPinnedNpmArtifact(fixture.artifact)).toThrow(/size does not match/)
      rmSync(fixture.artifactPath)
      expect(() => verifyPinnedNpmArtifact(fixture.artifact)).toThrow(/does not exist/)
      expect(() =>
        verifyPinnedNpmArtifact(fixture.artifact, {
          lstat: () => ({ isFile: () => false, isSymbolicLink: () => true, size: fixture.contents.length }),
          readFile: () => fixture.contents,
        }),
      ).toThrow(/regular non-symlink file/)
    } finally {
      rmSync(fixture.temporaryDirectory, { recursive: true, force: true })
    }
  })

  toolchainTest('probes npm through its JavaScript CLI and both release entry points reject an old npm', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-npm-version-'))
    const npmCli = join(directory, 'npm-cli.mjs')
    writeFileSync(npmCli, "process.stdout.write('12.0.1\\n')\n")
    const env = { ...process.env, npm_execpath: npmCli }
    try {
      expect(readNpmVersion({ env })).toBe('12.0.1')
      const preflight = spawnSync(process.execPath, ['scripts/release/preflight.mjs', '--toolchain-only'], { encoding: 'utf8', env })
      expect(preflight.status).toBe(1)
      expect(preflight.stderr).toContain('npm >=12.0.2 is required')

      const platform = process.platform === 'darwin' ? 'mac' : process.platform === 'win32' ? 'win' : 'linux'
      const packaging = spawnSync(process.execPath, ['scripts/release/package.mjs', '--qa', '--platform', platform, '--dry-run'], { encoding: 'utf8', env })
      expect(packaging.status).toBe(1)
      expect(packaging.stderr).toContain('npm >=12.0.2 is required')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('derives the exact npm CLI and shim from POSIX and Windows global layouts', () => {
    expect(resolveNpmGlobalLayout('/opt/npm', '/opt/npm/lib/node_modules', 'linux')).toEqual({
      prefix: '/opt/npm',
      root: '/opt/npm/lib/node_modules',
      cliPath: '/opt/npm/lib/node_modules/npm/bin/npm-cli.js',
      shimDirectory: '/opt/npm/bin',
      shimPath: '/opt/npm/bin/npm',
    })
    expect(resolveNpmGlobalLayout('C:\\npm\\prefix', 'C:\\npm\\prefix\\node_modules', 'win32')).toEqual({
      prefix: 'C:\\npm\\prefix',
      root: 'C:\\npm\\prefix\\node_modules',
      cliPath: 'C:\\npm\\prefix\\node_modules\\npm\\bin\\npm-cli.js',
      shimDirectory: 'C:\\npm\\prefix',
      shimPath: 'C:\\npm\\prefix\\npm.cmd',
    })
  })

  test('rejects unsafe or inconsistent npm global layout metadata', () => {
    expect(() => resolveNpmGlobalLayout('relative', '/opt/npm/lib/node_modules', 'linux')).toThrow(/absolute single-line path/)
    expect(() => resolveNpmGlobalLayout('/opt/npm\n/injected', '/opt/npm/lib/node_modules', 'linux')).toThrow(/absolute single-line path/)
    expect(() => resolveNpmGlobalLayout('/opt/npm', '/elsewhere/node_modules', 'linux')).toThrow(/does not match.*prefix/)
    expect(() => resolveNpmGlobalLayout('C:\\npm\\prefix', 'D:\\other\\node_modules', 'win32')).toThrow(/does not match.*prefix/)
  })

  test('exact npm CLI verification ignores a stale lifecycle npm_execpath', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw exact npm & version-'))
    const staleCli = join(directory, 'stale-npm-cli.mjs')
    const installedCli = join(directory, 'installed-npm-cli.mjs')
    writeFileSync(staleCli, "process.stdout.write('11.12.1\\n')\n")
    writeFileSync(installedCli, "process.stdout.write('12.0.2\\n')\n")
    const env = { ...process.env, npm_execpath: staleCli }
    try {
      expect(readNpmOutput(['--version'], { env })).toBe('11.12.1')
      expect(readNpmOutput(['--version'], { env, npmCliPath: installedCli })).toBe('12.0.2')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('always installs the verified archive and verifies the installed CLI, even when invoked npm reports the pinned version', () => {
    const fixture = createPinnedNpmArtifactFixture()
    const staleCli = '/runner/node/lib/node_modules/npm/bin/npm-cli.js'
    const githubPath = '/runner/github-path'
    const calls: Array<{ args: string[]; npmCliPath: string | undefined }> = []
    const runs: Array<{ command: string; args: string[]; shell: boolean }> = []
    const persisted: Array<{ shimDirectory: string; destination: string | undefined }> = []
    let installed = false
    try {
      const result = bootstrapNpm({
        artifact: fixture.artifact,
        env: { npm_execpath: staleCli, GITHUB_PATH: githubPath },
        nodeVersion: 'v24.15.0',
        platform: 'linux',
        toolchain: { node: '24.15.0', npm: '12.0.2' },
        readOutput: (args: string[], options: { npmCliPath?: string }) => {
          calls.push({ args, npmCliPath: options.npmCliPath })
          if (args[0] === 'prefix') return '/runner/npm-global'
          if (args[0] === 'root') return '/runner/npm-global/lib/node_modules'
          if (!options.npmCliPath) return '12.0.2'
          return options.npmCliPath && installed ? '12.0.2' : '11.12.1'
        },
        run: (command: string, args: string[], options: { shell?: boolean }) => {
          installed = true
          return runs.push({ command, args, shell: options.shell ?? false })
        },
        fileExists: () => true,
        persist: (shimDirectory: string, destination: string | undefined) => {
          persisted.push({ shimDirectory, destination })
          return true
        },
      })

      expect(runs).toEqual([
        {
          command: 'npm',
          args: ['install', '--global', '--prefix', '/runner/npm-global', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', fixture.artifactPath],
          shell: false,
        },
      ])
      expect(runs[0]?.args.join(' ')).not.toContain('npm@12.0.2')
      expect(runs[0]?.args.some((argument) => argument.startsWith('https://'))).toBe(false)
      expect(calls.at(-1)).toEqual({
        args: ['--version'],
        npmCliPath: '/runner/npm-global/lib/node_modules/npm/bin/npm-cli.js',
      })
      expect(persisted).toEqual([{ shimDirectory: '/runner/npm-global/bin', destination: githubPath }])
      expect(result).toMatchObject({ current: '12.0.2', installed: '12.0.2', shimDirectory: '/runner/npm-global/bin', githubPathUpdated: true })
    } finally {
      rmSync(fixture.temporaryDirectory, { recursive: true, force: true })
    }
  })

  toolchainTest('executes the installed npm CLI and selects its shim for the next workflow step', () => {
    const fixture = createPinnedNpmArtifactFixture()
    const directory = mkdtempSync(join(tmpdir(), 'vclaw stale npm & bootstrap-'))
    const prefix = join(directory, 'configured global')
    const root = process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib', 'node_modules')
    const layout = resolveNpmGlobalLayout(prefix, root)
    const staleCli = join(directory, 'stale npm-cli.mjs')
    const githubPath = join(directory, 'github-path')
    const expectedInstallArgs = ['install', '--global', '--prefix', prefix, '--offline', '--ignore-scripts', '--no-audit', '--no-fund', fixture.artifactPath]
    mkdirSync(dirname(staleCli), { recursive: true })
    writeFileSync(githubPath, '')
    writeFileSync(
      staleCli,
      `import { mkdirSync, writeFileSync } from 'node:fs'
const args = process.argv.slice(2)
if (args[0] === '--version') process.stdout.write('11.12.1\\n')
else if (args[0] === 'prefix') process.stdout.write(${JSON.stringify(`${prefix}\n`)})
else if (args[0] === 'root') process.stdout.write(${JSON.stringify(`${root}\n`)})
else if (JSON.stringify(args) === ${JSON.stringify(JSON.stringify(expectedInstallArgs))}) {
  mkdirSync(${JSON.stringify(dirname(layout.cliPath))}, { recursive: true })
  mkdirSync(${JSON.stringify(layout.shimDirectory)}, { recursive: true })
  writeFileSync(${JSON.stringify(layout.cliPath)}, "process.stdout.write('12.0.2\\\\n')\\n")
  writeFileSync(${JSON.stringify(layout.shimPath)}, 'npm shim')
} else {
  process.stderr.write(\`unexpected fake npm arguments: \${JSON.stringify(args)}\`)
  process.exitCode = 2
}
`,
    )

    try {
      const result = bootstrapNpm({ artifact: fixture.artifact, env: { ...process.env, GITHUB_PATH: githubPath, npm_execpath: staleCli } })
      expect(result).toMatchObject({ current: '11.12.1', installed: '12.0.2', ...layout, githubPathUpdated: true })
      expect(readFileSync(githubPath, 'utf8')).toBe(`${layout.shimDirectory}\n`)
    } finally {
      rmSync(directory, { recursive: true, force: true })
      rmSync(fixture.temporaryDirectory, { recursive: true, force: true })
    }
  })

  toolchainTest(
    'installs the checked-in npm archive into a fresh prefix without network access',
    () => {
      const directory = mkdtempSync(join(tmpdir(), 'vclaw real npm bootstrap & '))
      const prefix = join(directory, 'fresh global prefix')
      const githubPath = join(directory, 'github-path')
      const cache = join(directory, 'npm cache')
      writeFileSync(githubPath, '')
      try {
        const result = bootstrapNpm({
          env: {
            ...process.env,
            GITHUB_PATH: githubPath,
            npm_config_cache: cache,
            npm_config_prefix: prefix,
          },
        })
        expect(result).toMatchObject({ installed: '12.0.2', prefix, githubPathUpdated: true })
        expect(readFileSync(githubPath, 'utf8')).toBe(`${result.shimDirectory}\n`)
        expect(readNpmOutput(['--version'], { npmCliPath: result.cliPath })).toBe('12.0.2')
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    },
    30_000,
  )

  test('persists only a validated npm shim directory for the next GitHub Actions step', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-github-path-'))
    const githubPath = join(directory, 'github-path')
    writeFileSync(githubPath, '/existing/tool\n')
    try {
      expect(persistNpmShimDirectory('/opt/repository-npm/bin', githubPath, 'linux')).toBe(true)
      const entries = readFileSync(githubPath, 'utf8').trimEnd().split('\n')
      expect(entries).toEqual(['/existing/tool', '/opt/repository-npm/bin'])
      // GitHub prepends GITHUB_PATH entries to PATH for subsequent steps, so
      // the persisted entry becomes the npm selected by the next npm command.
      expect(entries.at(-1)).toBe('/opt/repository-npm/bin')
      expect(() => persistNpmShimDirectory('/opt/npm\n/injected', githubPath, 'linux')).toThrow(/absolute single-line path/)
      expect(() => persistNpmShimDirectory('/opt/npm/bin', 'relative/github-path', 'linux')).toThrow(/absolute single-line path/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('persists the bootstrapped npm CLI for direct Node release entry points', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-github-env-'))
    const githubEnv = join(directory, 'github-env')
    writeFileSync(githubEnv, '')
    try {
      expect(persistNpmCliPath('/opt/repository-npm/lib/node_modules/npm/bin/npm-cli.js', githubEnv, 'linux')).toBe(true)
      expect(readFileSync(githubEnv, 'utf8')).toBe('npm_execpath=/opt/repository-npm/lib/node_modules/npm/bin/npm-cli.js\n')
      expect(() => persistNpmCliPath('/opt/npm\n/injected', githubEnv, 'linux')).toThrow(/absolute single-line path/)
      expect(() => persistNpmCliPath('/opt/npm/bin/npm-cli.js', 'relative/github-env', 'linux')).toThrow(/absolute single-line path/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('keeps contributor instructions aligned with the enforced engines', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const toolchain = readRepositoryToolchain()
    expect(packageJson.engines).toEqual({ node: `>=${toolchain.node}`, npm: `>=${toolchain.npm}` })
    expect(packageJson.packageManager).toBe(`npm@${toolchain.npm}`)
    expect(readFileSync('.nvmrc', 'utf8').trim()).toBe(toolchain.node)
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toContain(`Node.js ${toolchain.node} or newer and npm ${toolchain.npm} or newer`)
    expect(readme).toContain('npm run toolchain:bootstrap')
    expect(readme).toContain("invoked npm's configured global prefix")
    expect(readme).toContain('install-time lifecycle scripts disabled')
    expect(readme).not.toContain('into the active Node installation')
    expect(readFileSync('scripts/release/package.mjs', 'utf8')).toContain('assertSupportedToolchain()')
    expect(readFileSync('scripts/release/preflight.mjs', 'utf8')).toContain('assertSupportedToolchain()')
  })

  test('fails closed without Developer ID credentials', () => {
    expect(() => validateReleaseCredentials({}, { checkApiKeyFile: false })).toThrow(/RELEASE_SIGNING_TEAM_ID/)
    expect(() => validateReleaseCredentials({ ...baseEnvironment, CSC_LINK: '' }, { checkApiKeyFile: false })).toThrow(/CSC_LINK/)
  })

  test('accepts exactly one complete notarization credential set', () => {
    expect(() => validateReleaseCredentials(baseEnvironment, { checkApiKeyFile: false })).not.toThrow()
    const apiEnvironment = {
      RELEASE_SIGNING_TEAM_ID: 'TEAM123',
      CSC_LINK: 'certificate',
      CSC_KEY_PASSWORD: 'password',
      APPLE_API_KEY: '/tmp/AuthKey.p8',
      APPLE_API_KEY_ID: 'KEY123',
      APPLE_API_ISSUER: 'issuer-id',
    }
    expect(() => validateReleaseCredentials(apiEnvironment, { checkApiKeyFile: false })).not.toThrow()
    expect(() => validateReleaseCredentials({ ...baseEnvironment, ...apiEnvironment }, { checkApiKeyFile: false })).toThrow(/exactly one/)
  })

  test('binds Apple ID notarization to the signing Team ID', () => {
    expect(() => validateReleaseCredentials({ ...baseEnvironment, APPLE_TEAM_ID: 'OTHER' }, { checkApiKeyFile: false })).toThrow(/must match/)
  })

  test('fails closed without Windows Authenticode credentials', () => {
    expect(() => validateWindowsReleaseCredentials({})).toThrow(/WIN_CSC_LINK, WIN_CSC_KEY_PASSWORD/)
    expect(() => validateWindowsReleaseCredentials({ WIN_CSC_LINK: 'certificate', WIN_CSC_KEY_PASSWORD: 'password' })).not.toThrow()
    const packaging = readFileSync('scripts/release/package.mjs', 'utf8')
    expect(packaging).toContain("builderArgs.push('--config.forceCodeSigning=true')")
    expect(packaging).toContain("'--mode', isPublic ? 'public' : 'qa'")
  })

  test('removes release credentials from untrusted verification commands', () => {
    const environment = { PATH: '/usr/bin', ...baseEnvironment, APPLE_API_KEY: '/tmp/private-key' }
    expect(withoutReleaseCredentials(environment)).toEqual({ PATH: '/usr/bin' })
    expect(withoutReleaseCredentials(environment, ['RELEASE_SIGNING_TEAM_ID'])).toEqual({
      PATH: '/usr/bin',
      RELEASE_SIGNING_TEAM_ID: 'TEAM123',
    })
    expect(withoutReleaseCredentials({ PATH: '/usr/bin', WIN_CSC_LINK: 'certificate', WIN_CSC_KEY_PASSWORD: 'password' })).toEqual({ PATH: '/usr/bin' })
  })

  interface WorkflowStep {
    job: string
    name: string | undefined
    uses: string | undefined
    secretLines: string[]
    lines: string[]
  }

  /** Minimal structural read of a GitHub workflow: jobs and their step blocks. */
  function parseWorkflowSteps(source: string): WorkflowStep[] {
    const steps: WorkflowStep[] = []
    let job = ''
    let inJobs = false
    let current: WorkflowStep | undefined
    for (const line of source.split('\n')) {
      if (/^jobs:\s*$/.test(line)) {
        inJobs = true
        continue
      }
      if (!inJobs) continue
      const jobMatch = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/)
      if (jobMatch) {
        job = jobMatch[1]
        current = undefined
        continue
      }
      if (/^ {6}- /.test(line)) {
        current = { job, name: undefined, uses: undefined, secretLines: [], lines: [] }
        steps.push(current)
      }
      if (!current) continue
      current.lines.push(line)
      const name = line.match(/^\s*(?:- )?name:\s*(.+?)\s*$/)
      if (name && current.name === undefined) current.name = name[1]
      const uses = line.match(/^\s*(?:- )?uses:\s*(\S+)/)
      if (uses && current.uses === undefined) current.uses = uses[1]
      if (line.includes('secrets.')) current.secretLines.push(line)
    }
    return steps
  }

  test('pins every workflow action, including third-party owners, to a full commit SHA', () => {
    for (const path of ['.github/workflows/release.yml', '.github/workflows/ci.yml']) {
      const steps = parseWorkflowSteps(readFileSync(path, 'utf8'))
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        if (step.uses === undefined) continue
        // Every `uses:` reference must be `owner/repo[/path]@<40-hex sha>`,
        // regardless of owner - tags and branches are movable for actions/*
        // and third-party owners alike.
        expect(step.uses, `${path} ${step.job}: ${step.uses}`).toMatch(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+@[0-9a-f]{40}$/)
      }
    }
  })

  test('confines workflow secrets to the signing/notarization and member-staging steps', () => {
    const releaseSteps = parseWorkflowSteps(readFileSync('.github/workflows/release.yml', 'utf8'))
    const secretSteps = releaseSteps.filter((step) => step.secretLines.length > 0)
    expect(secretSteps.map((step) => `${step.job}: ${step.name}`).sort()).toEqual([
      'package-member: Build, sign, notarize the member package',
      'package-member: Fail closed on an incomplete member request',
      'package-member: Fail closed unless every release credential is configured',
      'package-member: Fetch the member repo at the pinned sha',
      'package-member: Fetch the pinned omp binary for this arch',
      'package-member: Publish the immutable staging prefix for the handoff',
      'package-windows: Build, Authenticode-sign, and verify Windows packages',
      'package: Build, sign, notarize, and verify release packages',
      'package: Fail closed unless every release credential is configured',
      'package: Fetch the pinned omp binary for this arch',
    ])
    for (const step of secretSteps) {
      // Secrets may only be consumed as env-var assignments inside the step's
      // env block - never interpolated into run commands or action inputs.
      expect(step.lines.some((line) => /^\s*env:\s*$/.test(line))).toBe(true)
      for (const line of step.secretLines) {
        expect(line).toMatch(/^\s+[A-Z][A-Z0-9_]*: \$\{\{ secrets\.[A-Z][A-Z0-9_]* \}\}$/)
      }
      expect(step.lines.join('\n')).not.toMatch(/run:.*secrets\./)
    }

    const ciSteps = parseWorkflowSteps(readFileSync('.github/workflows/ci.yml', 'utf8'))
    expect(ciSteps.filter((step) => step.secretLines.length > 0)).toEqual([])
  })

  test('cancels superseded PR runs without cancelling validation for pushed SHAs', () => {
    const workflow = load(readFileSync('.github/workflows/ci.yml', 'utf8')) as {
      concurrency: { group: string; 'cancel-in-progress': string }
    }
    expect(workflow.concurrency.group).toBe(
      "ci-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || github.event_name == 'push' && format('push-{0}', github.sha) || format('dispatch-{0}', github.run_id) }}",
    )
    expect(workflow.concurrency['cancel-in-progress']).toBe("${{ github.event_name == 'pull_request' }}")
  })

  test('gates packaging regressions on every pull request', () => {
    const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')
    expect(ciWorkflow).toMatch(/on:\n {2}push:\n {4}branches:\n {6}- main/)
    expect(ciWorkflow).toMatch(/packaging-smoke:\n {4}if: github\.event_name == 'pull_request'/)
    for (const runner of ['macos-14', 'ubuntu-22.04', 'windows-2022']) expect(ciWorkflow).toContain(`runner: ${runner}`)
    expect(ciWorkflow).toContain('node node_modules/electron-builder/cli.js --dir')
    expect(ciWorkflow).toContain('--publish=never')
    expect(ciWorkflow).not.toContain('--publish never')
    expect(ciWorkflow).toContain('verify-cross-platform-package.mjs --platform ${{ matrix.target }} --arch ${{ matrix.arch }} --unpacked-only')
  })

  test('gates every pull-request head and pinned release SHA on the named production audit', () => {
    type WorkflowJob = {
      name?: string
      needs?: string | string[]
      if?: string
      steps?: Array<{ name?: string; uses?: string; run?: string; if?: string; with?: Record<string, unknown> }>
    }
    type Workflow = { on: Record<string, unknown>; jobs: Record<string, WorkflowJob> }
    const ci = load(readFileSync('.github/workflows/ci.yml', 'utf8')) as Workflow
    const release = load(readFileSync('.github/workflows/release.yml', 'utf8')) as Workflow

    expect(ci.on).toHaveProperty('pull_request')
    const ciAudit = ci.jobs['production-audit']
    expect(ciAudit.name).toBe('Production dependency audit')
    expect(ciAudit.if).toBeUndefined()
    expect(ciAudit.steps?.find((step) => step.uses?.startsWith('actions/checkout@'))?.with?.ref).toBe('${{ github.event.pull_request.head.sha || github.sha }}')
    const ciAuditSteps = ciAudit.steps?.filter((step) => step.run === 'npm run audit:production') ?? []
    expect(ciAuditSteps).toHaveLength(1)
    expect(ciAuditSteps[0].name).toBe('Apply named production dependency audit exceptions')

    const releaseAudit = release.jobs['production-audit']
    expect(releaseAudit.name).toBe(ciAudit.name)
    expect(releaseAudit.needs).toBe('validate')
    expect(releaseAudit.steps?.find((step) => step.uses?.startsWith('actions/checkout@'))?.with?.ref).toBe('${{ needs.validate.outputs.sha }}')
    const releaseAuditSteps = releaseAudit.steps?.filter((step) => step.run === 'npm run audit:production') ?? []
    expect(releaseAuditSteps).toHaveLength(1)
    expect(releaseAuditSteps[0].name).toBe(ciAuditSteps[0].name)

    for (const jobName of ['package', 'package-linux', 'package-windows']) {
      expect(release.jobs[jobName].needs, `${jobName} must wait for the pinned production audit`).toEqual(['validate', 'production-audit', 'quality', 'hermetic-e2e'])
    }
    expect(release.jobs['release-packages'].needs).toEqual(['validate', 'production-audit', 'package', 'package-linux', 'package-windows'])
    expect(release.jobs['release-packages'].steps?.find((step) => step.name === 'Fail if a release prerequisite did not succeed')?.if).toContain("needs.production-audit.result != 'success'")
  })

  test('keeps the weekly and manual disclosure audit on the same exception-aware evaluator', () => {
    type Workflow = {
      on: { schedule?: Array<{ cron?: string }>; workflow_dispatch?: unknown }
      jobs: Record<string, { steps?: Array<{ run?: string }> }>
    }
    const audit = load(readFileSync('.github/workflows/audit.yml', 'utf8')) as Workflow

    expect(audit.on.schedule).toEqual([{ cron: '17 6 * * 1' }])
    expect(audit.on).toHaveProperty('workflow_dispatch')
    expect(audit.jobs.audit.steps?.filter((step) => step.run === 'npm run audit:production')).toHaveLength(1)
  })

  test('reads the Node version from .nvmrc and hard-fails empty artifact uploads', () => {
    const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8')
    const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')
    const auditWorkflow = readFileSync('.github/workflows/audit.yml', 'utf8')
    const workflows = [
      { path: '.github/workflows/release.yml', source: releaseWorkflow },
      { path: '.github/workflows/ci.yml', source: ciWorkflow },
      { path: '.github/workflows/audit.yml', source: auditWorkflow },
    ]
    for (const { path, source } of workflows) {
      const workflow = source
      expect(workflow).not.toMatch(/node-version:/)
      const steps = parseWorkflowSteps(workflow)
      const setupSteps = steps.filter((step) => step.uses?.startsWith('actions/setup-node@'))
      expect(setupSteps.length).toBeGreaterThan(0)
      for (const setup of setupSteps) {
        const setupIndex = steps.indexOf(setup)
        const bootstrapIndexes = steps.flatMap((step, index) => (step.job === setup.job && step.lines.some((line) => line.includes('run: npm run toolchain:bootstrap')) ? [index] : []))
        const preflightIndexes = steps.flatMap((step, index) => (step.job === setup.job && step.lines.some((line) => line.includes('run: npm run release:preflight:toolchain')) ? [index] : []))
        expect(bootstrapIndexes, `${path} ${setup.job} bootstrap steps`).toHaveLength(1)
        expect(preflightIndexes, `${path} ${setup.job} toolchain preflight steps`).toHaveLength(1)
        const bootstrapIndex = bootstrapIndexes[0]
        const preflightIndex = preflightIndexes[0]
        const installIndex = steps.findIndex((step, index) => index > setupIndex && step.job === setup.job && step.lines.some((line) => /run: npm ci(?:\s|$)/.test(line)))
        expect(bootstrapIndex).toBeGreaterThan(setupIndex)
        expect(preflightIndex).toBeGreaterThan(bootstrapIndex)
        if (installIndex >= 0) {
          expect(bootstrapIndex).toBeLessThan(installIndex)
          expect(preflightIndex).toBeGreaterThan(installIndex)
          const firstRunAfterInstall = steps.findIndex((step, index) => index > installIndex && step.job === setup.job && step.lines.some((line) => /^\s*(?:-\s*)?run:/.test(line)))
          expect(firstRunAfterInstall, `${path} ${setup.job} first command after npm ci`).toBe(preflightIndex)
        }
      }
      expect(workflow).not.toContain('npm run release:preflight -- --toolchain-only')
    }
    for (const workflow of [releaseWorkflow, ciWorkflow]) {
      const uploads = workflow.match(/uses: actions\/upload-artifact@/g) ?? []
      expect(workflow.match(/if-no-files-found: error/g)).toHaveLength(uploads.length)
      expect(workflow).toContain('actions/cache@')
    }
    // Release jobs skip the CI-duplicated verification suite and never upload
    // an unpacked application directory; every platform publishes its update feed.
    // package, package-windows (two legs) and package-member each skip the suite CI already ran.
    expect(releaseWorkflow.match(/-- --skip-verify/g)).toHaveLength(3)
    expect(releaseWorkflow.match(/node scripts\/release\/package\.mjs --(?:public|qa) --platform win --skip-verify/g)).toHaveLength(2)
    expect(releaseWorkflow).toContain('release/mac/${{ matrix.arch }}/latest*.yml')
    expect(releaseWorkflow).toContain('release/linux/${{ matrix.arch }}/latest*.yml')
    expect(releaseWorkflow).toContain('release/win/**/latest*.yml')
    expect(releaseWorkflow).toMatch(/needs: \[validate, production-audit, package, package-linux, package-windows\]/)
    expect(releaseWorkflow).toContain("needs.package-windows.result != 'skipped'")
    expect(releaseWorkflow).toContain('--platforms "$platforms"')
    expect(releaseWorkflow).toContain('release/linux/${{ matrix.arch }}/*.pacman')
    expect(releaseWorkflow).toContain('sudo apt-get install --yes libarchive-tools')
    expect(ciWorkflow).not.toMatch(/path: release\/(mac|linux|win)\/\s*$/m)
  })

  test('publishes one verified GitHub Release from an existing version tag', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
    expect(workflow).toMatch(/push:\n {4}tags:\n {6}- 'v\*\.\*\.\*'/)
    expect(workflow).toContain('node scripts/release/validate-release-tag.mjs --tag "$RELEASE_TAG"')
    expect(workflow).toContain('git merge-base --is-ancestor HEAD refs/remotes/origin/main')
    expect(workflow).toContain('node scripts/release/prepare-github-release.mjs')
    // The privileged publishing job installs only the runtime dependency tree
    // the release script needs, never the full dev toolchain.
    expect(workflow).toMatch(/release-packages:[\s\S]*?npm ci --omit=dev --ignore-scripts[\s\S]*?node scripts\/release\/prepare-github-release\.mjs/)
    expect(workflow).not.toContain('npm ci --ignore-scripts\n')
    expect(workflow).toContain('actions/download-artifact@')
    expect(workflow).toContain('actions/attest-build-provenance@')
    expect(workflow).toContain('gh release create "$RELEASE_TAG" release-assets/*')
    expect(workflow).toContain('gh release upload "$RELEASE_TAG" release-assets/* --clobber')
    expect(workflow).toContain('gh release edit "$RELEASE_TAG" --verify-tag --draft=false --latest')
    expect(workflow).toContain('is already published and will not be replaced')
    expect(workflow).toContain('--verify-tag')
    expect(workflow).toContain('--fail-on-no-commits')
    expect(workflow).toContain('--generate-notes')
    // always() keeps the aggregate job from being skipped; the first step
    // fails explicitly when a prerequisite failed or was cancelled.
    expect(workflow).toMatch(/release-packages:\n {4}needs: \[validate, production-audit, package, package-linux, package-windows\]\n(?: {4}#.*\n)* {4}if: always\(\)\n {4}runs-on: ubuntu-22\.04/)
    expect(workflow).toContain('Fail if a release prerequisite did not succeed')
    expect(workflow).toContain("needs.validate.result != 'success'")
    expect(workflow).toContain('exit 1')
  })

  test('pins every release job to one commit SHA resolved by validate', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
    const parsed = load(workflow) as { jobs: Record<string, { outputs?: Record<string, string>; steps?: Array<{ id?: string; run?: string; with?: Record<string, unknown> }> }> }
    expect(parsed.jobs.validate.outputs).toEqual({ sha: '${{ steps.resolve.outputs.sha }}' })
    expect(parsed.jobs.validate.steps?.find((step) => step.id === 'resolve')?.run).toContain('git rev-parse HEAD^{commit}')
    // validate resolves the movable tag once; every other job checks out that
    // SHA so a tag moved mid-run cannot make two jobs build different commits.
    for (const [name, job] of Object.entries(parsed.jobs)) {
      const checkouts = (job.steps ?? []).filter((step) => step.with && 'ref' in step.with)
      expect(checkouts.length, name).toBeGreaterThan(0)
      for (const step of checkouts) expect(step.with?.ref, name).toBe(name === 'validate' ? '${{ env.RELEASE_REF }}' : '${{ needs.validate.outputs.sha }}')
    }
    // The ancestry check depends on the full history fetched above.
    expect(workflow).toContain('# fetch-depth: 0 above is what populates refs/remotes/origin/*')
    expect(workflow).toMatch(/fetch-depth: 0\n[\s\S]*?git merge-base --is-ancestor HEAD refs\/remotes\/origin\/main/)
  })

  test('deletes stale draft assets before publishing a resumed release', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
    expect(workflow).toContain('gh release view "$RELEASE_TAG" --json assets > draft-release.json')
    expect(workflow).toContain('node scripts/release/prune-draft-release-assets.mjs --assets draft-release.json --expected release-assets')
    expect(workflow).toContain('gh release delete-asset "$RELEASE_TAG" "$stale" --yes')
    expect(workflow).toMatch(/delete-asset[\s\S]*?gh release upload "\$RELEASE_TAG" release-assets\/\* --clobber[\s\S]*?--draft=false/)
  })

  test('passes the expected Authenticode signer to Windows packaging', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
    expect(workflow).toContain('VCLAW_WINDOWS_CERT_SUBJECT: ${{ vars.VCLAW_WINDOWS_CERT_SUBJECT }}')
    expect(workflow).toContain('VCLAW_WINDOWS_CERT_THUMBPRINT: ${{ vars.VCLAW_WINDOWS_CERT_THUMBPRINT }}')
    const security = readFileSync('docs/security.md', 'utf8')
    expect(security).toContain('`VCLAW_WINDOWS_CERT_SUBJECT`')
    expect(security).toContain('`VCLAW_WINDOWS_CERT_THUMBPRINT`')
    expect(security).toContain('when neither is configured, public Windows packaging fails closed')
  })

  test('ships both mac architectures as separate builds from native-arch runners', () => {
    const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8')
    // Two matrix legs, each on a runner whose native architecture matches the
    // target (arm64 on macos-15, x64 on macos-15-intel) so node-pty/zeromq never
    // cross-compile, and one leg's failure never cancels the other's build.
    expect(releaseWorkflow).toContain('fail-fast: false')
    expect(releaseWorkflow).toMatch(/- arch: arm64\n {12}runner: macos-15/)
    expect(releaseWorkflow).toMatch(/- arch: x64\n {12}runner: macos-15-intel/)
    expect(releaseWorkflow).toContain('runs-on: ${{ matrix.runner }}')
    // The explicit target arch drives packaging, and each leg uploads only its
    // own arch directory under a per-arch artifact name and cache key.
    expect(releaseWorkflow).toContain('npm run package:mac -- --skip-verify --arch ${{ matrix.arch }}')
    expect(releaseWorkflow).toContain('name: vclaw-public-macos-${{ matrix.arch }}')
    expect(releaseWorkflow).toContain('release/mac/${{ matrix.arch }}/*.dmg')
    expect(releaseWorkflow).toContain('release/mac/${{ matrix.arch }}/*.zip')
    expect(releaseWorkflow).toContain('electron-${{ runner.os }}-${{ matrix.arch }}-${{ hashFiles(')
    // Universal binaries are excluded by design: the release ships two builds.
    expect(releaseWorkflow).not.toContain('--universal')
  })

  test('ships both Linux architectures as separately labeled native builds', () => {
    const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8')
    expect(releaseWorkflow).toMatch(/package-linux:\n {4}needs: \[validate, production-audit, quality, hermetic-e2e\]\n {4}strategy:/)
    expect(releaseWorkflow).toMatch(/- arch: arm64\n {12}runner: ubuntu-24\.04-arm/)
    expect(releaseWorkflow).toMatch(/- arch: x64\n {12}runner: ubuntu-22\.04/)
    expect(releaseWorkflow).toContain('runs-on: ${{ matrix.runner }}')
    expect(releaseWorkflow).toContain('npm run package:linux -- --skip-verify --arch ${{ matrix.arch }}')
    expect(releaseWorkflow).toContain('name: vclaw-public-linux-${{ matrix.arch }}')
    expect(releaseWorkflow).toContain('release/linux/${{ matrix.arch }}/*.AppImage')
    expect(releaseWorkflow).toContain('release/linux/${{ matrix.arch }}/latest*.yml')
    expect(releaseWorkflow).toContain('electron-${{ runner.os }}-${{ matrix.arch }}-${{ hashFiles(')
  })
})

describe('GitHub Release publication', () => {
  test('selects an exact enabled platform set', () => {
    expect(parseReleasePlatforms('mac,linux')).toEqual(['mac', 'linux'])
    expect(expectedGitHubReleaseAssets('0.2.0', ['mac', 'linux'])).not.toContain('VizMaster-0.2.0-win-x64.exe')
    expect(expectedGitHubReleaseAssets('0.2.0', ['mac'])).toEqual(['VizMaster-0.2.0-arm64.zip', 'VizMaster-0.2.0-intel-chip.dmg', 'VizMaster-0.2.0-m-chip.dmg', 'VizMaster-0.2.0-x64.zip', 'latest-mac.yml'])
    expect(expectedDownloadedReleaseAssets('0.2.0', ['mac'])).toEqual(['VizMaster-0.2.0-arm64.zip', 'VizMaster-0.2.0-x64.dmg', 'VizMaster-0.2.0-arm64.dmg', 'VizMaster-0.2.0-x64.zip', 'latest-mac.yml'])
    expect(expectedGitHubReleaseAssets('0.2.0', ['linux'])).toEqual([
      'VizMaster-0.2.0-linux-aarch64.pacman',
      'VizMaster-0.2.0-linux-aarch64.rpm',
      'VizMaster-0.2.0-linux-amd64.deb',
      'VizMaster-0.2.0-linux-arm64.AppImage',
      'VizMaster-0.2.0-linux-arm64.deb',
      'VizMaster-0.2.0-linux-x64.pacman',
      'VizMaster-0.2.0-linux-x86_64.AppImage',
      'VizMaster-0.2.0-linux-x86_64.rpm',
      'latest-linux-arm64.yml',
      'latest-linux.yml',
    ])
    expect(() => parseReleasePlatforms('mac,mac')).toThrow(/duplicates/)
    expect(() => parseReleasePlatforms('mac,android')).toThrow(/Unsupported/)
  })

  test('keeps every release asset name in exact correspondence with electron-builder artifacts', () => {
    // Derived from the same package.json build config and builder-util `${arch}`
    // rules the packaging step uses, so renaming a target or adding an
    // architecture fails here instead of during a real tag push.
    const config = readElectronBuilderConfig()
    const produced = producedReleaseArtifactNames(config, '0.2.0')
    const names = releaseAssetNames('0.2.0')
    const feeds = [...names.keys()].filter((name) => name.endsWith('.yml'))
    expect(feeds).toEqual(['latest-linux-arm64.yml', 'latest-linux.yml', 'latest-mac.yml', 'latest.yml'])
    // Every produced artifact is published and every published asset (other than
    // the updater feeds) is produced - both directions, no index coupling.
    expect([...names.values()].filter((name) => !name.endsWith('.yml')).sort()).toEqual(produced)
    const targetCount = Object.entries(RELEASE_BUILD_MATRIX).reduce((total, [platform, architectures]) => total + architectures.length * config[platform].target.length, 0)
    expect(produced).toHaveLength(targetCount)
    // Only the two macOS DMGs are renamed for the public download page.
    expect([...names].filter(([published, downloaded]) => published !== downloaded)).toEqual([
      ['VizMaster-0.2.0-intel-chip.dmg', 'VizMaster-0.2.0-x64.dmg'],
      ['VizMaster-0.2.0-m-chip.dmg', 'VizMaster-0.2.0-arm64.dmg'],
      ['VizMaster-0.2.0-win-x64.msix', 'VizMaster-0.2.0-win-x64.appx'],
    ])
  })

  test('covers exactly the platform and architecture legs the release workflow builds', () => {
    const workflow = load(readFileSync('.github/workflows/release.yml', 'utf8')) as {
      jobs: Record<string, { strategy?: { matrix?: { include?: Array<{ arch: string }> } }; steps?: Array<{ run?: string }> }>
    }
    const architectures = (job: string) => (workflow.jobs[job].strategy?.matrix?.include ?? []).map((leg) => leg.arch).sort()
    expect(architectures('package')).toEqual([...RELEASE_BUILD_MATRIX.mac].sort())
    expect(architectures('package-linux')).toEqual([...RELEASE_BUILD_MATRIX.linux].sort())
    // The Windows leg is a single non-matrix job.
    expect(workflow.jobs['package-windows'].strategy).toBeUndefined()
    expect(RELEASE_BUILD_MATRIX.win).toEqual(['x64'])
  })

  test('reports the published name of a missing artifact through the rename map', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-github-release-missing-'))
    try {
      const { projectDirectory, inputDirectory } = writeMacReleaseFixture(directory, { omit: 'VizMaster-0.2.0-arm64.dmg' })
      // The arm64 DMG publishes as m-chip.dmg: the report must name the missing
      // published asset, not whichever entry happens to share its sort index.
      await expect(prepareGitHubRelease({ inputDirectory, outputDirectory: join(directory, 'out'), projectDirectory, platforms: ['mac'], tag: 'v0.2.0' })).rejects.toThrow(
        /incomplete; missing VizMaster-0\.2\.0-m-chip\.dmg$/,
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('takes legacy updater fields from the primary architecture manifest, not the first sorted path', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-update-metadata-'))
    try {
      const arm64 = writeUpdateManifest(directory, 'a-arm64', 'VizMaster-0.2.0-arm64.zip', 'arm64-digest', '2026-01-01T00:00:00.000Z')
      const x64 = writeUpdateManifest(directory, 'z-x64', 'VizMaster-0.2.0-x64.zip', 'x64-digest', '2026-02-02T00:00:00.000Z')
      const merged = mergeUpdateMetadata([arm64, x64], '0.2.0')
      expect(merged.path).toBe('VizMaster-0.2.0-x64.zip')
      expect(merged.sha512).toBe('x64-digest')
      expect(merged.releaseDate).toBe('2026-02-02T00:00:00.000Z')
      expect(merged.files.map((file: { url: string }) => file.url)).toEqual(['VizMaster-0.2.0-arm64.zip', 'VizMaster-0.2.0-x64.zip'])
      // Renaming the artifact directories reverses the path sort order without
      // changing which manifest supplies the legacy fields.
      const swappedArm64 = writeUpdateManifest(directory, 'z-arm', 'VizMaster-0.2.0-arm64.zip', 'arm64-digest', '2026-01-01T00:00:00.000Z')
      const swappedX64 = writeUpdateManifest(directory, 'a-intel', 'VizMaster-0.2.0-x64.zip', 'x64-digest', '2026-02-02T00:00:00.000Z')
      expect(mergeUpdateMetadata([swappedArm64, swappedX64], '0.2.0')).toEqual(merged)
      expect(mergeUpdateMetadata([swappedX64, swappedArm64], '0.2.0')).toEqual(merged)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('rejects updater metadata without a usable size or digest', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-update-metadata-invalid-'))
    try {
      const write = (name: string, file: string) => {
        const path = join(directory, name)
        writeFileSync(path, `version: 0.2.0\nfiles:\n${file}`)
        return path
      }
      const sized = (size: string) => `  - url: VizMaster-0.2.0-x64.zip\n    sha512: digest\n    size: ${size}\n`
      expect(() => mergeUpdateMetadata([write('missing-size.yml', '  - url: VizMaster-0.2.0-x64.zip\n    sha512: digest\n')], '0.2.0')).toThrow(/invalid size/)
      expect(() => mergeUpdateMetadata([write('zero-size.yml', sized('0'))], '0.2.0')).toThrow(/invalid size/)
      expect(() => mergeUpdateMetadata([write('negative-size.yml', sized('-1'))], '0.2.0')).toThrow(/invalid size/)
      expect(() => mergeUpdateMetadata([write('text-size.yml', sized("'42'"))], '0.2.0')).toThrow(/invalid size/)
      expect(() => mergeUpdateMetadata([write('empty-digest.yml', "  - url: VizMaster-0.2.0-x64.zip\n    sha512: ''\n    size: 42\n")], '0.2.0')).toThrow(/no sha512/)
      expect(() => mergeUpdateMetadata([write('valid.yml', sized('42'))], '0.2.0')).not.toThrow()
      expect(() => mergeUpdateMetadata([write('a.yml', sized('42')), write('b.yml', sized('43'))], '0.2.0')).toThrow(/disagrees/)
      expect(() => mergeUpdateMetadata([], '0.2.0')).toThrow(/missing/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('deletes only unexpected assets from a resumed draft release', () => {
    const assets = ['VizMaster-0.2.0-m-chip.dmg', 'VizMaster-0.1.9-arm64.dmg', 'latest-mac.yml', 'SHA256SUMS.txt']
    const expected = ['VizMaster-0.2.0-m-chip.dmg', 'latest-mac.yml', 'SHA256SUMS.txt']
    expect(staleDraftReleaseAssets(assets, expected)).toEqual(['VizMaster-0.1.9-arm64.dmg'])
    expect(staleDraftReleaseAssets(expected, expected)).toEqual([])
    // An empty expected set would delete the whole draft, so it fails instead.
    expect(() => staleDraftReleaseAssets(assets, [])).toThrow(/expected release asset set is empty/)
    expect(parseDraftAssetNames(JSON.stringify({ assets: [{ name: 'a.dmg' }, { name: 'b.zip' }] }))).toEqual(['a.dmg', 'b.zip'])
    expect(() => parseDraftAssetNames(JSON.stringify({ assets: [{ label: 'a.dmg' }] }))).toThrow(/without a name/)
    expect(() => parseDraftAssetNames(JSON.stringify({}))).toThrow(/not an array/)
  })

  test('prints the stale draft assets when run as a script', () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-draft-prune-'))
    try {
      mkdirSync(join(directory, 'release-assets'))
      for (const name of ['VizMaster-0.2.0-m-chip.dmg', 'SHA256SUMS.txt']) writeFileSync(join(directory, 'release-assets', name), 'asset')
      writeFileSync(join(directory, 'draft.json'), JSON.stringify({ assets: [{ name: 'VizMaster-0.2.0-m-chip.dmg' }, { name: 'VizMaster-0.1.9-arm64.dmg' }] }))
      const args = ['scripts/release/prune-draft-release-assets.mjs', '--assets', join(directory, 'draft.json'), '--expected', join(directory, 'release-assets')]
      const result = spawnSync(process.execPath, args, { encoding: 'utf8' })
      expect(result.status).toBe(0)
      expect(result.stdout.trim().split('\n')).toEqual(['VizMaster-0.1.9-arm64.dmg'])
      const failed = spawnSync(process.execPath, args.slice(0, 3), { encoding: 'utf8' })
      expect(failed.status).toBe(1)
      expect(failed.stderr).toMatch(/Draft release asset pruning failed/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('requires the tag and both package manifests to agree exactly', () => {
    expect(assertReleaseTag('v0.2.0', '0.2.0', '0.2.0')).toEqual({ tag: 'v0.2.0', version: '0.2.0' })
    expect(() => assertReleaseTag('0.2.0', '0.2.0', '0.2.0')).toThrow(/must exactly match/)
    expect(() => assertReleaseTag('v0.2.1', '0.2.0', '0.2.0')).toThrow(/v0\.2\.0/)
    expect(() => assertReleaseTag('v0.2.0', '0.2.0', '0.1.9')).toThrow(/does not match/)
    expect(() => assertReleaseTag('v0.2.0', '0.2.0', '0.2.0', '0.1.9')).toThrow(/root package version/)
    expect(() => assertReleaseTag('v01.2.3', '01.2.3', '01.2.3')).toThrow(/not a supported semantic version/)
  })

  test('selects the exact cross-platform asset set and writes reproducible checksums', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-github-release-'))
    const projectDirectory = join(directory, 'project')
    const inputDirectory = join(directory, 'downloaded')
    const outputDirectory = join(directory, 'release-assets')
    mkdirSync(projectDirectory, { recursive: true })
    mkdirSync(inputDirectory, { recursive: true })
    writeFileSync(join(projectDirectory, 'package.json'), JSON.stringify({ version: '0.2.0' }))
    writeFileSync(join(projectDirectory, 'package-lock.json'), JSON.stringify({ version: '0.2.0', packages: { '': { version: '0.2.0' } } }))
    const expected = expectedGitHubReleaseAssets('0.2.0')
    const downloaded = expectedDownloadedReleaseAssets('0.2.0')
    for (const [index, name] of downloaded.entries()) {
      const artifactDirectory = join(inputDirectory, `artifact-${index}`)
      mkdirSync(artifactDirectory)
      const updateTarget =
        name === 'latest-mac.yml'
          ? 'VizMaster-0.2.0-arm64.zip'
          : name === 'latest-linux.yml'
            ? 'VizMaster-0.2.0-linux-x86_64.AppImage'
            : name === 'latest-linux-arm64.yml'
              ? 'VizMaster-0.2.0-linux-arm64.AppImage'
              : 'VizMaster-0.2.0-win-x64.exe'
      const content = name.startsWith('latest')
        ? `version: 0.2.0\nfiles:\n  - url: ${updateTarget}\n    sha512: checksum-${index}\n    size: ${index + 1}\n${name === 'latest-mac.yml' ? '  - url: VizMaster-0.2.0-arm64.dmg\n    sha512: checksum-arm64-dmg\n    size: 44\n' : ''}path: ${updateTarget}\nsha512: checksum-${index}\n`
        : `asset ${index}`
      writeFileSync(join(artifactDirectory, name), content)
    }
    const secondMacManifest = join(inputDirectory, 'macos-x64')
    mkdirSync(secondMacManifest)
    writeFileSync(join(secondMacManifest, 'latest-mac.yml'), 'version: 0.2.0\nfiles:\n  - url: VizMaster-0.2.0-x64.zip\n    sha512: checksum-x64\n    size: 42\n')
    try {
      const result = await prepareGitHubRelease({ inputDirectory, outputDirectory, projectDirectory, tag: 'v0.2.0' })
      expect(result.assets).toEqual(expected)
      expect(readdirSync(outputDirectory).sort()).toEqual([...expected, 'SHA256SUMS.txt'].sort())
      const checksums = readFileSync(join(outputDirectory, 'SHA256SUMS.txt'), 'utf8').trim().split('\n')
      expect(checksums).toHaveLength(expected.length)
      for (const name of expected) {
        const digest = createHash('sha256')
          .update(readFileSync(join(outputDirectory, name)))
          .digest('hex')
        expect(checksums).toContain(`${digest}  ${name}`)
      }
      const macFeed = readFileSync(join(outputDirectory, 'latest-mac.yml'), 'utf8')
      expect(macFeed).toContain('VizMaster-0.2.0-arm64.zip')
      expect(macFeed).toContain('VizMaster-0.2.0-x64.zip')
      expect(macFeed).toContain('VizMaster-0.2.0-m-chip.dmg')
      expect(macFeed).not.toContain('VizMaster-0.2.0-arm64.dmg')
      const linuxFeed = readFileSync(join(outputDirectory, 'latest-linux.yml'), 'utf8')
      expect(linuxFeed).toContain('VizMaster-0.2.0-linux-x86_64.AppImage')
      expect(linuxFeed).not.toContain('VizMaster-0.2.0-linux-arm64.AppImage')
      const linuxArmFeed = readFileSync(join(outputDirectory, 'latest-linux-arm64.yml'), 'utf8')
      expect(linuxArmFeed).toContain('VizMaster-0.2.0-linux-arm64.AppImage')
      expect(linuxArmFeed).not.toContain('VizMaster-0.2.0-linux-x86_64.AppImage')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('rejects incomplete and duplicate downloaded release assets', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-github-release-invalid-'))
    const projectDirectory = join(directory, 'project')
    const inputDirectory = join(directory, 'downloaded')
    mkdirSync(projectDirectory, { recursive: true })
    mkdirSync(inputDirectory, { recursive: true })
    writeFileSync(join(projectDirectory, 'package.json'), JSON.stringify({ version: '0.2.0' }))
    writeFileSync(join(projectDirectory, 'package-lock.json'), JSON.stringify({ version: '0.2.0', packages: { '': { version: '0.2.0' } } }))

    try {
      await expect(prepareGitHubRelease({ inputDirectory, outputDirectory: join(directory, 'missing-output'), projectDirectory, tag: 'v0.2.0' })).rejects.toThrow(/incomplete/)
      const expected = expectedDownloadedReleaseAssets('0.2.0')
      for (const [index, name] of expected.entries()) {
        const artifactDirectory = join(inputDirectory, `artifact-${index}`)
        mkdirSync(artifactDirectory)
        const updateTarget =
          name === 'latest-mac.yml'
            ? 'VizMaster-0.2.0-arm64.zip'
            : name === 'latest-linux.yml'
              ? 'VizMaster-0.2.0-linux-x86_64.AppImage'
              : name === 'latest-linux-arm64.yml'
                ? 'VizMaster-0.2.0-linux-arm64.AppImage'
                : 'VizMaster-0.2.0-win-x64.exe'
        writeFileSync(join(artifactDirectory, name), name.startsWith('latest') ? `version: 0.2.0\nfiles:\n  - url: ${updateTarget}\n    sha512: checksum-${index}\n` : `asset ${index}`)
      }
      const duplicateDirectory = join(inputDirectory, 'duplicate')
      mkdirSync(duplicateDirectory)
      writeFileSync(join(duplicateDirectory, expected[0]), 'duplicate')
      await expect(prepareGitHubRelease({ inputDirectory, outputDirectory: join(directory, 'duplicate-output'), projectDirectory, tag: 'v0.2.0' })).rejects.toThrow(/duplicate/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('fuse hardening configuration', () => {
  test('uses only the configured canonical afterPack hook', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    expect(packageJson.build.afterPack).toBe('scripts/release/after-pack.cjs')
    expect(() => readFileSync('scripts/afterPack.cjs', 'utf8')).toThrow()
    expect(readFileSync(packageJson.build.afterPack, 'utf8')).toContain('FuseV1Options.OnlyLoadAppFromAsar')
  })
})

describe('tag-move assert', () => {
  // v1.1.18's move was safe only because billing left no in-flight runs and no
  // published assets; the assert makes both properties REQUIRED, measured.
  test('allows a move with no in-flight runs and no published assets', () => {
    expect(tagMoveVerdict({ runs: [{ status: 'completed', conclusion: 'failure' }] })).toEqual({ ok: true })
    expect(tagMoveVerdict({ runs: [], release: { assets: [] } })).toEqual({ ok: true })
  })

  test('refuses a move while any run is in flight — artifacts may publish for the old target', () => {
    const verdict = tagMoveVerdict({ runs: [{ status: 'queued' }, { status: 'in_progress' }, { status: 'completed' }] })
    if (verdict.ok) throw new Error('expected a refusal for in-flight runs')
    expect(verdict.reason).toMatch(/2 workflow run\(s\).*in flight/)
  })

  test('refuses a move once release assets are published — consumed bytes stop matching the target', () => {
    const verdict = tagMoveVerdict({ runs: [], release: { assets: [{ name: 'a.dmg' }, { name: 'b.dmg' }] } })
    if (verdict.ok) throw new Error('expected a refusal for published assets')
    expect(verdict.reason).toMatch(/2 published asset\(s\)/)
  })
})

describe('after-pack vizshow payload gate', () => {
  // The payload is seeded to ~/.vizmaster/default and npm-ci'd on the user's machine,
  // where @vizmaster/* workspace packages do not exist — such a row 404s against the
  // public registry and breaks the seeded project on first launch (measured 2026-11-07).
  // The linux candidate path is <appOutDir>/app/resources/product/payload; the fixture
  // builds exactly that, and the gate finds it via its BUILD.json probe.
  const makeContext = (root: string) => {
    const payload = join(root, 'app', 'resources', 'product', 'payload')
    const writePayload = (packageJson: Record<string, unknown>, handoff?: Record<string, unknown>) => {
      mkdirSync(payload, { recursive: true })
      writeFileSync(join(payload, 'BUILD.json'), '{}')
      writeFileSync(join(payload, 'package.json'), JSON.stringify(packageJson))
      mkdirSync(join(payload, '.omp', 'tools'), { recursive: true })
      writeFileSync(join(payload, '.omp', 'tools', 'math-renderer.ts'), '')
      mkdirSync(join(payload, 'src'), { recursive: true })
      // The gate now requires the member's handoff beside the payload and verifies its
      // bytes against the dependency-pins.json row; the default fixture uses the REAL
      // product/handoff.json (so the pin leg is exercised) with its markers materialized.
      const handoffJson = handoff ?? JSON.parse(readFileSync('product/handoff.json', 'utf8'))
      // Default: copy the REAL file so its bytes match the dependency-pins row (the gate
      // pins bytes, not structure). Custom handoffs are re-serialized deliberately — the
      // pin-mismatch test depends on that difference.
      if (handoff === undefined) copyFileSync('product/handoff.json', join(payload, '..', 'handoff.json'))
      else writeFileSync(join(payload, '..', 'handoff.json'), JSON.stringify(handoff))
      for (const marker of handoffJson.markers ?? []) {
        // Materialize file markers the payload write did not create; directory
        // markers (src) and already-written files (package.json) are skipped.
        if (typeof marker === 'string' && marker !== '' && !existsSync(join(payload, marker))) {
          mkdirSync(dirname(join(payload, marker)), { recursive: true })
          writeFileSync(join(payload, marker), '')
        }
      }
    }
    return {
      context: {
        appOutDir: root,
        electronPlatformName: 'linux',
        packager: { appInfo: { productFilename: 'app', sanitizedName: 'app' } },
      },
      payloadPath: payload,
      writePayload,
      writeHandoffOnly: (handoff: Record<string, unknown>) => {
        writeFileSync(join(payload, '..', 'handoff.json'), JSON.stringify(handoff))
      },
    }
  }

  test('accepts a payload whose dependencies all resolve publicly', () => {
    const root = mkdtempSync(join(tmpdir(), 'afterpack-payload-'))
    try {
      const { context, writePayload } = makeContext(root)
      writePayload({ name: 'default', dependencies: { '@earendil-works/pi-ai': '^1.0.0' } })
      expect(() => verifyDashboardPayload(context)).not.toThrow()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('refuses an @vizmaster/* dependency — it cannot resolve on the user machine', () => {
    const root = mkdtempSync(join(tmpdir(), 'afterpack-payload-'))
    try {
      const { context, writePayload } = makeContext(root)
      writePayload({ name: 'default', dependencies: { '@vizmaster/vizshow-contract': 'file:vendor/x.tgz' } })
      expect(() => verifyDashboardPayload(context)).toThrow(/@vizmaster\/vizshow-contract.*npm ci resolves them against the public registry and 404s/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('refuses a workspace: protocol in any dependency section', () => {
    const root = mkdtempSync(join(tmpdir(), 'afterpack-payload-'))
    try {
      const { context, writePayload } = makeContext(root)
      writePayload({ name: 'default', devDependencies: { foo: 'workspace:*' } })
      expect(() => verifyDashboardPayload(context)).toThrow(/workspace: protocols cannot resolve outside the member repo/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('refuses a missing handoff — a pack must never default to lenient expectations', () => {
    const root = mkdtempSync(join(tmpdir(), 'afterpack-payload-'))
    try {
      const { context, writePayload } = makeContext(root)
      writePayload({ name: 'default', dependencies: {} })
      rmSync(join(root, 'app', 'resources', 'product', 'handoff.json'))
      expect(() => verifyDashboardPayload(context)).toThrow(/handoff\.json.*is missing/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('derives markers from the handoff and refuses a marker it does not carry', () => {
    const root = mkdtempSync(join(tmpdir(), 'afterpack-payload-'))
    try {
      const { context, writePayload, payloadPath } = makeContext(root)
      const handoff = JSON.parse(readFileSync('product/handoff.json', 'utf8'))
      handoff.markers = ['package.json', 'src', 'index.html', '.omp/tools/math-renderer.ts', '.omp/tools/build-vizshow.ts', 'absent-marker.js']
      writePayload({ name: 'default', dependencies: {} }, handoff)
      rmSync(join(payloadPath, 'absent-marker.js')) // materialized by the fixture; the point is its absence
      expect(() => verifyDashboardPayload(context)).toThrow(/absent-marker\.js missing/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('refuses handoff bytes that do not match the dependency-pins row', () => {
    const root = mkdtempSync(join(tmpdir(), 'afterpack-payload-'))
    try {
      const { context, writePayload, writeHandoffOnly } = makeContext(root)
      writePayload({ name: 'default', dependencies: {} })
      const handoff = JSON.parse(readFileSync('product/handoff.json', 'utf8'))
      delete handoff.$comment // same markers, different bytes — the pin must catch it
      writeHandoffOnly(handoff)
      expect(() => verifyDashboardPayload(context)).toThrow(/product\/handoff\.json bytes do not match the pin/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('coverage configuration', () => {
  test('loads the fail-closed inventory without weakening thresholds', () => {
    const config = readFileSync('vitest.config.ts', 'utf8')
    expect(config).toContain("from './scripts/release/coverage-inventory'")
    expect(config).toContain('include: coverageInventory.includePatterns')
    expect(config).toContain('statements: 65')
    expect(config).toContain('branches: 50')
    expect(config).toContain('functions: 70')
    expect(config).toContain('lines: 75')
  })
})

describe('post-package verification helpers', () => {
  test('parses Team IDs and architecture lists', () => {
    expect(parseTeamIdentifier('Authority=Developer ID\nTeamIdentifier=TEAM123\n')).toBe('TEAM123')
    expect(parseArchitectures('arm64 x86_64\n')).toEqual(new Set(['arm64', 'x86_64']))
  })

  test('requires exactly one DMG and ZIP and binds their declared architecture', () => {
    expect(requireReleaseArtifacts(['/release/Prime Work-0.1.0-arm64.dmg', '/release/Prime Work-0.1.0-arm64.zip'])).toEqual({
      dmg: '/release/Prime Work-0.1.0-arm64.dmg',
      zip: '/release/Prime Work-0.1.0-arm64.zip',
    })
    expect(() => requireReleaseArtifacts(['/release/Prime Work-0.1.0-arm64.dmg'])).toThrow(/ZIP/)
    expect(artifactArchitectures('Prime Work-0.1.0-universal.zip')).toEqual(new Set(['arm64', 'x86_64']))
    expect(() => assertExactArchitectures(new Set(['arm64']), artifactArchitectures('Prime Work-0.1.0-arm64.dmg'), 'DMG')).not.toThrow()
    expect(() => assertExactArchitectures(new Set(['x86_64']), artifactArchitectures('Prime Work-0.1.0-arm64.dmg'), 'DMG')).toThrow(/do not match/)
  })

  test('requires native modules to cover every application architecture', () => {
    expect(() => assertArchitectureCoverage(new Set(['arm64']), new Set(['arm64']), 'pty.node')).not.toThrow()
    expect(() => assertArchitectureCoverage(new Set(['arm64', 'x86_64']), new Set(['arm64']), 'pty.node')).toThrow(/x86_64/)
  })

  test('requires the ASAR and rejects duplicated renderer dependencies', () => {
    const entries = [
      '/out/main/index.js',
      '/out/preload/index.js',
      '/out/renderer/index.html',
      '/node_modules/node-pty/lib/index.js',
      '/node_modules/zeromq/lib/index.js',
      '/node_modules/zeromq/build/manifest.json',
    ]
    expect(() => assertAsarLayout(entries)).not.toThrow()
    expect(() => assertAsarLayout([...entries, '/node_modules/react/index.js'])).toThrow(/duplicated/)
    expect(() => assertAsarLayout(entries.filter((entry) => !entry.includes('node-pty')))).toThrow(/missing required/)
    expect(() => assertAsarLayout(entries.map((entry) => entry.replaceAll('/', '\\')))).not.toThrow()
  })

  test('keeps every platform native unpack allowlist exact and architecture-specific', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    expect(packageJson.author).toEqual({ name: 'GooeyPi contributors', email: '42459108+am-will@users.noreply.github.com' })
    expect(packageJson.description).toBe('A desktop workspace for Pi, OMP, and Prime Agent')
    expect(packageJson.homepage).toBe('https://github.com/am-will/gooey-pi')
    expect(packageJson.build.productName).toBe('VizMaster')
    expect(packageJson.build.appId).toBe('com.vclaw.desktop')
    expect(packageJson.desktopName).toBe('vclaw.desktop')
    expect(packageJson.build.linux.synopsis).toBe(packageJson.description)
    expect(packageJson.build.linux.syncDesktopName).toBe(true)
    expect(packageJson.build.mac.icon).toBe('assets/icon.icns')
    expect(packageJson.build.mac.extendInfo.LSUIElement).toBe(true)
    expect(packageJson.build.linux.icon).toBe('assets/icon.png')
    expect(packageJson.build.win.icon).toBe('assets/icon.png')
    const macIcon = readFileSync('assets/icon.icns')
    expect(macIcon.subarray(0, 4).toString('ascii')).toBe('icns')
    const macIconChunks = new Map<string, Buffer>()
    for (let offset = 8; offset < macIcon.length; ) {
      const type = macIcon.subarray(offset, offset + 4).toString('ascii')
      const size = macIcon.readUInt32BE(offset + 4)
      expect(size).toBeGreaterThanOrEqual(8)
      macIconChunks.set(type, macIcon.subarray(offset + 8, offset + size))
      offset += size
    }
    // The previous checked-in ICNS silently contained Prime artwork. Anchor
    // its full-size layer to VClaw's canonical PNG and retain small layers.
    expect(macIconChunks.get('ic10')).toEqual(readFileSync('assets/icon.png'))
    expect(macIconChunks.has('ic04')).toBe(true)
    expect(macIconChunks.has('ic11')).toBe(true)
    expect(packageJson.build.asarUnpack).toBeUndefined()
    expect(packageJson.build.mac.asarUnpack).toEqual([
      '**/node_modules/node-pty/build/Release/pty.node',
      '**/node_modules/node-pty/build/Release/spawn-helper',
      '**/node_modules/zeromq/build/darwin/${arch}/node/*-Release/addon.node',
    ])
    expect(packageJson.build.linux.asarUnpack).toEqual(['**/node_modules/node-pty/build/Release/pty.node', '**/node_modules/zeromq/build/linux/${arch}/node/*-Release/addon.node'])
    expect(packageJson.build.win.asarUnpack).toEqual([
      '**/node_modules/node-pty/prebuilds/win32-${arch}/pty.node',
      '**/node_modules/node-pty/prebuilds/win32-${arch}/conpty.node',
      '**/node_modules/node-pty/prebuilds/win32-${arch}/conpty_console_list.node',
      '**/node_modules/node-pty/prebuilds/win32-${arch}/winpty-agent.exe',
      '**/node_modules/node-pty/prebuilds/win32-${arch}/winpty.dll',
      '**/node_modules/node-pty/prebuilds/win32-${arch}/conpty/OpenConsole.exe',
      '**/node_modules/node-pty/prebuilds/win32-${arch}/conpty/conpty.dll',
      '**/node_modules/zeromq/build/win32/${arch}/node/*-Release/addon.node',
    ])
    expect(packageJson.build.linux.target).toEqual(['AppImage', 'deb', 'rpm', 'pacman'])
    expect(packageJson.build.win.target).toEqual(['nsis', 'zip', 'appx'])
    expect(packageJson.build.directories.output).toBe('release')
  })

  test('verifies and uploads every configured Linux installer format', () => {
    expect(expectedArtifactExtensions('linux')).toEqual(['.AppImage', '.deb', '.rpm', '.pacman'])
    expect(expectedArtifactExtensions('win')).toEqual(['.exe', '.zip', '.appx'])
    const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')
    const releaseWorkflow = readFileSync('.github/workflows/release.yml', 'utf8')
    expect(ciWorkflow).toContain('release/linux/**/*.pacman')
    expect(releaseWorkflow).toContain('release/linux/${{ matrix.arch }}/*.pacman')
  })

  test('fails closed when Windows Authenticode verification is not valid', () => {
    const signerEnvironment = { VCLAW_WINDOWS_CERT_SUBJECT: 'CN=Example Ltd' }
    const calls: Array<{ file: string; args: string[]; path: string | undefined }> = []
    const validSpawn = (file: string, args: string[], options: { env?: NodeJS.ProcessEnv }) => {
      calls.push({ file, args, path: options.env?.VCLAW_SIGNED_FILE })
      return { status: 0, stdout: '', stderr: '' }
    }
    const spawn = validSpawn as unknown as Parameters<typeof assertValidAuthenticode>[1]
    expect(() => assertValidAuthenticode('C:\\release\\VClaw.exe', spawn, signerEnvironment)).not.toThrow()
    expect(calls).toEqual([
      {
        file: 'powershell.exe',
        args: expect.arrayContaining(['-NoProfile', '-NonInteractive', '-Command']),
        path: 'C:\\release\\VClaw.exe',
      },
    ])
    const invalidSpawn = () => ({ status: 1, stdout: '', stderr: 'NotSigned' })
    expect(() => assertValidAuthenticode('C:\\release\\VClaw.exe', invalidSpawn as unknown as Parameters<typeof assertValidAuthenticode>[1], signerEnvironment)).toThrow(/NotSigned/)
  })

  test('asserts the expected Authenticode signer instead of any trusted certificate', () => {
    expect(expectedAuthenticodeSigner({ VCLAW_WINDOWS_CERT_SUBJECT: '  CN=Example Ltd, C=GB  ' })).toEqual({ subject: 'CN=Example Ltd, C=GB', thumbprint: '' })
    expect(expectedAuthenticodeSigner({ VCLAW_WINDOWS_CERT_THUMBPRINT: 'a1:b2 c3d4e5f60718293a4b5c6d7e8f901a2b3c4d' })).toEqual({
      subject: '',
      thumbprint: 'A1B2C3D4E5F60718293A4B5C6D7E8F901A2B3C4D',
    })
    expect(() => expectedAuthenticodeSigner({ VCLAW_WINDOWS_CERT_THUMBPRINT: 'not-a-thumbprint' })).toThrow(/40-character SHA-1 certificate thumbprint/)
    // Unconfigured fails closed rather than accepting whoever the runner trusts.
    expect(() => expectedAuthenticodeSigner({})).toThrow(/VCLAW_WINDOWS_CERT_SUBJECT and\/or VCLAW_WINDOWS_CERT_THUMBPRINT/)

    const calls: Array<{ args: string[]; env: NodeJS.ProcessEnv | undefined }> = []
    const spawn = (_file: string, args: string[], options: { env?: NodeJS.ProcessEnv }) => {
      calls.push({ args, env: options.env })
      return { status: 0, stdout: '', stderr: '' }
    }
    assertValidAuthenticode('C:\\release\\VClaw.exe', spawn as unknown as Parameters<typeof assertValidAuthenticode>[1], {
      VCLAW_WINDOWS_CERT_SUBJECT: 'CN=Example Ltd',
      VCLAW_WINDOWS_CERT_THUMBPRINT: 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d',
    })
    // The file path and expected signer are passed as environment variables, never
    // interpolated into the script, and a terminating error exits non-zero.
    expect(calls[0].env).toMatchObject({
      VCLAW_SIGNED_FILE: 'C:\\release\\VClaw.exe',
      VCLAW_WINDOWS_CERT_SUBJECT: 'CN=Example Ltd',
      VCLAW_WINDOWS_CERT_THUMBPRINT: 'A1B2C3D4E5F60718293A4B5C6D7E8F901A2B3C4D',
    })
    const script = calls[0].args.at(-1) as string
    expect(script).not.toContain('C:\\release\\VClaw.exe')
    expect(script).toContain("$ErrorActionPreference = 'Stop'")
    expect(script).toContain('try {')
    expect(script).toContain('} catch {')
    expect(script).toContain('exit 1')
    expect(script).toContain('$certificate.Subject -ne $env:VCLAW_WINDOWS_CERT_SUBJECT')
    expect(script).toContain('$certificate.Thumbprint.ToUpperInvariant() -ne $env:VCLAW_WINDOWS_CERT_THUMBPRINT')
  })

  test('excludes other platform native build trees and declares zeromq directly', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    const optimizedAgentExclusions = [
      '!**/node_modules/prime-agent/docs/**',
      '!**/node_modules/prime-agent/dist/bundle/**',
      '!**/node_modules/prime-agent/dist/modes/**',
      '!**/node_modules/prime-agent/**/*.map',
      '!**/node_modules/prime-agent/**/*.d.ts',
      '!**/node_modules/@earendil-works/pi-tui/**',
      '!**/node_modules/koffi/**',
    ]
    expect(packageJson.build.mac.files).toEqual([
      'out/**/*',
      'package.json',
      ...optimizedAgentExclusions,
      '!**/node_modules/zeromq/build/linux/**',
      '!**/node_modules/zeromq/build/win32/**',
      '!**/node_modules/extract-zip/index.linux-*.node',
      '!**/node_modules/extract-zip/index.win32-*.node',
    ])
    expect(packageJson.build.linux.files).toEqual([
      'out/**/*',
      'package.json',
      ...optimizedAgentExclusions,
      '!**/node_modules/zeromq/build/darwin/**',
      '!**/node_modules/zeromq/build/win32/**',
      '!**/node_modules/extract-zip/index.darwin-*.node',
      '!**/node_modules/extract-zip/index.win32-*.node',
    ])
    expect(packageJson.build.win.files).toEqual([
      'out/**/*',
      'package.json',
      ...optimizedAgentExclusions,
      '!**/node_modules/zeromq/build/darwin/**',
      '!**/node_modules/zeromq/build/linux/**',
      '!**/node_modules/extract-zip/index.darwin-*.node',
      '!**/node_modules/extract-zip/index.linux-*.node',
    ])
    // Pin the app to the zeromq range prime-agent uses so the packaged addon
    // and the agent's runtime expectations cannot drift apart silently.
    const primeAgent = JSON.parse(readFileSync(new URL('../node_modules/prime-agent/package.json', import.meta.url), 'utf8'))
    expect(packageJson.dependencies.zeromq).toBe(primeAgent.dependencies.zeromq)
  })

  test('accepts bounded ZeroMQ ABI fallbacks per architecture', () => {
    const architectures = new Set(['arm64'])
    const fallbackDirectory = createUnpackedFixture(architectures)
    const fallback = join(fallbackDirectory, fixtureAddonPath('arm64', 'libc-999-Release'))
    mkdirSync(dirname(fallback), { recursive: true })
    writeFileSync(fallback, 'fixture')
    try {
      expect(() => assertUnpackedNativeLayout(fallbackDirectory, architectures, () => architectures)).not.toThrow()
    } finally {
      rmSync(fallbackDirectory, { recursive: true, force: true })
    }

    const futureDirectory = mkdtempSync(join(tmpdir(), 'prime-work-unpacked-'))
    for (const relativePath of [...expectedUnpackedNativeLayout(architectures).files, fixtureAddonPath('arm64', 'libc-999-Release')]) {
      const path = join(futureDirectory, relativePath)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, 'fixture')
    }
    try {
      // A future runtime-library name still matches the bounded wildcard.
      expect(() => assertUnpackedNativeLayout(futureDirectory, architectures, () => architectures)).not.toThrow()
    } finally {
      rmSync(futureDirectory, { recursive: true, force: true })
    }
  })

  test('accepts the exact unpacked native fixture with complete architecture coverage', () => {
    const architectures = new Set(['arm64'])
    const directory = createUnpackedFixture(architectures)
    try {
      expect(() => assertUnpackedNativeLayout(directory, architectures, () => new Set(['arm64']))).not.toThrow()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('rejects missing and extra unpacked fixture files', () => {
    const architectures = new Set(['arm64'])
    const missingDirectory = createUnpackedFixture(architectures)
    rmSync(join(missingDirectory, expectedUnpackedNativeLayout(architectures).files.at(-1)!))
    try {
      expect(() => assertUnpackedNativeLayout(missingDirectory, architectures, () => architectures)).toThrow(/Missing unpacked/)
    } finally {
      rmSync(missingDirectory, { recursive: true, force: true })
    }

    const extraDirectory = createUnpackedFixture(architectures)
    const extraPath = join(extraDirectory, 'node_modules/extra/native.node')
    mkdirSync(dirname(extraPath), { recursive: true })
    writeFileSync(extraPath, 'fixture')
    try {
      expect(() => assertUnpackedNativeLayout(extraDirectory, architectures, () => architectures)).toThrow(/Unexpected unpacked.*extra/)
    } finally {
      rmSync(extraDirectory, { recursive: true, force: true })
    }

    const extraPrefixDirectory = createUnpackedFixture(architectures)
    mkdirSync(join(extraPrefixDirectory, 'empty-prefix'))
    try {
      expect(() => assertUnpackedNativeLayout(extraPrefixDirectory, architectures, () => architectures)).toThrow(/Unexpected unpacked.*empty-prefix/)
    } finally {
      rmSync(extraPrefixDirectory, { recursive: true, force: true })
    }
  })

  test('checks every allowed native fixture file against the application architecture', () => {
    const architectures = new Set(['arm64'])
    const directory = createUnpackedFixture(architectures)
    try {
      expect(() => assertUnpackedNativeLayout(directory, architectures, (path: string) => (path.endsWith('addon.node') ? new Set(['x86_64']) : new Set(['arm64'])))).toThrow(
        /addon\.node is missing app architecture.*arm64/,
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('cross-platform packaging repair', () => {
  const fixtureContext = {
    appOutDir: join('/tmp', 'app-out'),
    packager: { appInfo: { productFilename: 'Prime Work', sanitizedName: 'Prime-Work' } },
  }

  test('computes the hardened executable path per platform', () => {
    expect(executablePath(fixtureContext, 'darwin')).toBe(join('/tmp', 'app-out', 'Prime Work.app', 'Contents', 'MacOS', 'Prime Work'))
    expect(executablePath(fixtureContext, 'win32')).toBe(join('/tmp', 'app-out', 'Prime Work.exe'))
    expect(executablePath(fixtureContext, 'linux')).toBe(join('/tmp', 'app-out', 'prime-work'))
  })

  function globMatchExists(directory: string, segments: string[]): boolean {
    if (!existsSync(directory) || !statSync(directory).isDirectory()) return false
    const [head, ...rest] = segments
    if (head === undefined) return false
    if (head === '**') {
      if (globMatchExists(directory, rest)) return true
      return readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .some((entry) => globMatchExists(join(directory, entry.name), segments))
    }
    if (head.includes('*')) {
      const pattern = new RegExp(
        `^${head
          .split('*')
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('[^/]*')}$`,
      )
      const entries = readdirSync(directory, { withFileTypes: true })
      if (rest.length === 0) return entries.some((entry) => entry.isFile() && pattern.test(entry.name))
      return entries.filter((entry) => entry.isDirectory() && pattern.test(entry.name)).some((entry) => globMatchExists(join(directory, entry.name), rest))
    }
    const next = join(directory, head)
    if (rest.length === 0) return existsSync(next) && statSync(next).isFile()
    return globMatchExists(next, rest)
  }

  test('every asarUnpack glob matches at least one real file for platforms present in node_modules', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    const root = new URL('..', import.meta.url).pathname
    const localArchitecture = process.arch === 'arm64' ? 'arm64' : 'x64'
    const localTarget = process.platform === 'darwin' ? 'mac' : process.platform
    const architecturesFor = (glob: string) => (glob.includes('node-pty/build/Release') ? [localArchitecture] : ['arm64', 'x64'])
    for (const target of ['mac', 'linux', 'win']) {
      for (const glob of packageJson.build[target].asarUnpack as string[]) {
        if (glob.includes('node-pty/build/Release') && target !== localTarget) continue
        const covered = architecturesFor(glob).some((architecture) => {
          const relativeGlob = glob.replace(/^\*\*\//, '').replaceAll('${arch}', architecture)
          const platformRoot = relativeGlob.split('/').slice(0, 4).join('/')
          if (!existsSync(join(root, platformRoot))) return false
          return globMatchExists(root, relativeGlob.split('/'))
        })
        expect(covered, `asarUnpack glob matches no file in node_modules: ${glob}`).toBe(true)
      }
    }
  })

  test('the verifier and package.json agree on native directory naming', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    for (const [target, architecture] of [
      ['win', 'x64'],
      ['win', 'arm64'],
      ['linux', 'x64'],
      ['linux', 'arm64'],
    ] as const) {
      const globs = (packageJson.build[target].asarUnpack as string[]).map((glob) => glob.replace(/^\*\*\//, '').replaceAll('${arch}', architecture))
      for (const file of expectedNativeFiles(target, architecture)) {
        expect(globs, `verifier requires ${file} but no ${target} asarUnpack glob produces it`).toContain(file)
      }
      const zeroMqGlob = globs.find((glob) => glob.includes('zeromq'))
      expect(zeroMqGlob).toBe(`node_modules/zeromq/build/${nativeRuntimeDirectory(target)}/${architecture}/node/*-Release/addon.node`)
      const sampleAddon = `node_modules/zeromq/build/${nativeRuntimeDirectory(target)}/${architecture}/node/glibc-x64-115-Release/addon.node`
      expect(zeroMqAddonPattern(target, architecture).test(sampleAddon)).toBe(true)
    }
    expect(nativeRuntimeDirectory('win')).toBe('win32')
    expect(nativeRuntimeDirectory('linux')).toBe('linux')
  })

  test('accepts ZeroMQ ABI and libc fallbacks only within the target architecture', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prime-work-cross-platform-unpacked-'))
    const nativeFiles = [
      ...expectedNativeFiles('linux', 'x64'),
      'node_modules/zeromq/build/linux/x64/node/glibc-127-Release/addon.node',
      'node_modules/zeromq/build/linux/x64/node/musl-127-Release/addon.node',
    ]
    for (const relativePath of nativeFiles) {
      const path = join(directory, relativePath)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, 'fixture')
    }
    try {
      expect(() => assertCrossPlatformUnpackedNativeLayout(directory, 'linux', 'x64')).not.toThrow()
      rmSync(join(directory, 'node_modules/zeromq'), { recursive: true, force: true })
      expect(() => assertCrossPlatformUnpackedNativeLayout(directory, 'linux', 'x64')).toThrow(/expected at least 1/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('resolves release-script commands to Windows-safe spawns', () => {
    expect(resolveCommandInvocation('node', ['scripts/release/verify.mjs'])).toEqual({ file: process.execPath, args: ['scripts/release/verify.mjs'], shell: false })
    const electronInstaller = resolveCommandInvocation('install-electron', [])
    expect(electronInstaller.file).toBe(process.execPath)
    expect(electronInstaller.args).toHaveLength(1)
    expect(electronInstaller.args[0]).toMatch(/node_modules[\\/]electron[\\/]install\.js$/)
    expect(electronInstaller.shell).toBe(false)
    const builder = resolveCommandInvocation('electron-builder', ['install-app-deps'])
    expect(builder.file).toBe(process.execPath)
    expect(builder.shell).toBe(false)
    expect(builder.args[0]).toMatch(/electron-builder[\\/]cli\.js$/)
    expect(builder.args.at(-1)).toBe('install-app-deps')
    const packageScript = readFileSync('scripts/release/package.mjs', 'utf8')
    expect(packageScript).toContain("run('electron-builder', builderArgs, builderEnv)")
    expect(packageScript).not.toContain("['exec', '--', 'electron-builder'")
    const npmViaLifecycle = resolveCommandInvocation('npm', ['run', 'release:verify'], 'win32', { npm_execpath: 'C:/npm/npm-cli.js' })
    expect(npmViaLifecycle).toEqual({ file: process.execPath, args: ['C:/npm/npm-cli.js', 'run', 'release:verify'], shell: false })
    expect(() => resolveCommandInvocation('npm', ['ci'], 'win32', { npm_execpath: 'C:/npm/npm.cmd' })).toThrow(/JavaScript npm CLI/)
    expect(resolveCommandInvocation('npm', ['ci'], 'darwin', {})).toEqual({ file: 'npm', args: ['ci'], shell: false })
  })

  test('installs Electron before rebuilding native app dependencies', () => {
    const calls: Array<{ command: string; args: string[]; env: NodeJS.ProcessEnv }> = []
    const run = (command: string, args: string[], options: { env?: NodeJS.ProcessEnv } = {}) => {
      calls.push({ command, args, env: options.env ?? {} })
    }

    installAppDependencies(run, { TASK_MARKER: 'kept' }, 'darwin')

    expect(calls.map(({ command, args }) => ({ command, args }))).toEqual([
      { command: 'install-electron', args: [] },
      { command: 'electron-builder', args: ['install-app-deps'] },
    ])
    expect(calls[0].env).toBe(calls[1].env)
    expect(calls[0].env).toMatchObject({ TASK_MARKER: 'kept', PYTHON: '/usr/bin/python3' })
  })
})

describe('DMG verification cleanup', () => {
  test('detach failures are logged instead of masking the original error and cleanup always runs', () => {
    const source = readFileSync('scripts/release/verify-package.mjs', 'utf8')
    const verifyDmg = source.slice(source.indexOf('async function verifyDmg'), source.indexOf('export async function verifyPackage'))
    // hdiutil detach runs inside its own try/catch that only logs.
    expect(verifyDmg).toMatch(/try\s*\{\s*run\('hdiutil', \['detach', mountPoint\]\)\s*\}\s*catch \(detachError\)\s*\{\s*console\.error/)
    // The rmSync cleanup is attempted unconditionally after the detach attempt.
    const finallyIndex = verifyDmg.indexOf('} finally {')
    const cleanupIndex = verifyDmg.indexOf('rmSync(mountPoint, { recursive: true, force: true })')
    expect(finallyIndex).toBeGreaterThan(-1)
    expect(cleanupIndex).toBeGreaterThan(finallyIndex)
    expect(verifyDmg.slice(cleanupIndex)).not.toContain('detach')
  })
})

describe('release size budgets', () => {
  test('measures deterministic build-output fixtures', () => {
    const directory = createBundleSizeFixture()
    try {
      const metrics = collectBundleSizeMetrics(directory)
      expect(metrics).toEqual({
        mainBytes: 101,
        preloadBytes: 102,
        initialRendererBytes: 207,
        largestRendererChunkBytes: 106,
        rendererJsCssBytes: 418,
      })
      expect(() => assertBundleSizeBudgets(metrics)).not.toThrow()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test.each(Object.keys(BUNDLE_SIZE_BUDGETS))('rejects a %s bundle regression above its exact budget', (name) => {
    const metrics = { ...BUNDLE_SIZE_BUDGETS, [name]: BUNDLE_SIZE_BUDGETS[name as keyof typeof BUNDLE_SIZE_BUDGETS] + 1 }
    expect(() => assertBundleSizeBudgets(metrics)).toThrow(/exceeds its size budget/)
    expect(() => assertBundleSizeBudgets(BUNDLE_SIZE_BUDGETS)).not.toThrow()
  })

  test('measures deterministic package fixtures and enforces every artifact budget', () => {
    const directory = mkdtempSync(join(tmpdir(), 'prime-work-package-size-'))
    const paths = {
      app: join(directory, 'Prime Work.app'),
      asar: join(directory, 'Prime Work.app/Contents/Resources/app.asar'),
      dmg: join(directory, 'Prime Work.dmg'),
      zip: join(directory, 'Prime Work.zip'),
    }
    writeSizedFile(paths.asar, 201)
    writeSizedFile(join(paths.app, 'Contents/MacOS/Prime Work'), 202)
    writeSizedFile(paths.dmg, 203)
    writeSizedFile(paths.zip, 204)
    try {
      const metrics = collectPackageSizeMetrics(paths)
      expect(metrics).toEqual({ asarBytes: 201, appBytes: 403, dmgBytes: 203, zipBytes: 204 })
      expect(() => assertPackageSizeBudgets(metrics)).not.toThrow()
      for (const name of Object.keys(PACKAGE_SIZE_BUDGETS)) {
        expect(() =>
          assertPackageSizeBudgets({
            ...PACKAGE_SIZE_BUDGETS,
            [name]: PACKAGE_SIZE_BUDGETS[name as keyof typeof PACKAGE_SIZE_BUDGETS] + 1,
          }),
        ).toThrow(/exceeds its size budget/)
      }
      expect(() => assertPackageSizeBudgets(PACKAGE_SIZE_BUDGETS)).not.toThrow()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('vendored supply-chain pins', () => {
  test('every non-registry dependency in the lockfile matches its recorded pin exactly', () => {
    const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8'))
    const pins = JSON.parse(readFileSync('scripts/release/dependency-pins.json', 'utf8')).packages
    const nonRegistry = (Object.entries(lockfile.packages ?? {}) as Array<[string, { resolved?: string; integrity?: string }]>).filter(
      ([, entry]) => typeof entry.resolved === 'string' && entry.resolved.length > 0 && !entry.resolved.startsWith('https://registry.npmjs.org'),
    )

    // The lockfile sha512 hashes are the supply-chain integrity boundary for
    // the vendored Prime Agent tarballs. A regenerated lockfile silently
    // re-anchors them to whatever bytes are present; this pin file makes that
    // a deliberate, reviewed change. To upgrade Prime Agent on purpose:
    // verify the new tarballs, replace them in vendor/, update the lockfile,
    // then mirror the new resolved/integrity values here in the same commit.
    expect(nonRegistry.length).toBeGreaterThan(0)
    for (const [name, entry] of nonRegistry) {
      const pin = pins[name]
      expect(pin, `unpinned non-registry dependency: ${name}`).toBeDefined()
      expect(entry.resolved, `resolved location drifted for ${name}`).toBe(pin.resolved)
      expect(entry.integrity, `integrity drifted for ${name}`).toBe(pin.integrity)
      expect(entry.integrity, `weak integrity algorithm for ${name}`).toMatch(/^sha512-/)
    }
    for (const name of Object.keys(pins)) {
      expect(
        nonRegistry.some(([lockName]) => lockName === name),
        `stale pin for removed dependency: ${name}`,
      ).toBe(true)
    }
  })

  test('the vendored tarballs on disk hash to their pinned integrity', () => {
    const pins = JSON.parse(readFileSync('scripts/release/dependency-pins.json', 'utf8')).packages as Record<string, { resolved: string; integrity: string }>
    const vendored = [
      ...new Set(
        Object.values(pins)
          .filter((pin) => pin.resolved.startsWith('file:vendor/'))
          .map((pin) => ({ path: pin.resolved.slice('file:'.length), integrity: pin.integrity }))
          .map((entry) => JSON.stringify(entry)),
      ),
    ].map((entry) => JSON.parse(entry) as { path: string; integrity: string })

    expect(vendored.length).toBeGreaterThan(0)
    for (const { path, integrity } of vendored) {
      const digest = `sha512-${createHash('sha512').update(readFileSync(path)).digest('base64')}`
      expect(digest, `vendored tarball bytes drifted from pin: ${path}`).toBe(integrity)
    }
  })

  test('every vendored tarball is pinned and reference artifacts hash to their pins', () => {
    const manifest = JSON.parse(readFileSync('scripts/release/dependency-pins.json', 'utf8'))
    const reference = manifest['reference-artifacts'] as Record<string, { path: string; integrity: string }> | undefined
    // Reference artifacts are not installed (no lockfile entry binds them), but
    // they document the upstream base releases the patched tarballs derive
    // from; unpinned bytes in vendor/ would drift silently.
    expect(reference, 'reference-artifacts section missing from dependency-pins.json').toBeDefined()

    const pinned = new Set<string>()
    for (const pin of Object.values(manifest.packages as Record<string, { resolved: string }>)) {
      if (pin.resolved.startsWith('file:vendor/')) pinned.add(pin.resolved.slice('file:'.length))
    }
    pinned.add(readPinnedNpmArtifact().relativePath)
    for (const entry of Object.values(reference ?? {})) pinned.add(entry.path)
    // `artifacts` is the third pin registry: locally built archives have no lockfile entry
    // and no upstream reference release, so their pin lives there (and is proven by
    // tests/release-vendor-agent.test.ts, which also checks the archive member).
    for (const entry of Object.values((manifest.artifacts ?? {}) as Record<string, { path?: string }>)) {
      if (entry?.path) pinned.add(entry.path)
    }

    for (const [name, entry] of Object.entries(reference ?? {})) {
      expect(entry.path, `reference artifact outside vendor/: ${name}`).toMatch(/^vendor\/[^/]+\.tgz$/)
      expect(entry.integrity, `weak integrity algorithm for ${name}`).toMatch(/^sha512-/)
      const digest = `sha512-${createHash('sha512').update(readFileSync(entry.path)).digest('base64')}`
      expect(digest, `reference tarball bytes drifted from pin: ${entry.path}`).toBe(entry.integrity)
    }

    const unpinned = readdirSync('vendor').filter((name) => name.endsWith('.tgz') && !pinned.has(`vendor/${name}`))
    expect(unpinned, 'vendored tarballs without any pin').toEqual([])
  })

  test('the checked-in npm bootstrap archive matches its strict artifact pin and provenance record', () => {
    const pinManifest = JSON.parse(readFileSync('scripts/release/dependency-pins.json', 'utf8'))
    const artifact = readPinnedNpmArtifact()
    expect(pinManifest.artifacts.npm).toEqual({
      version: '12.0.2',
      path: 'vendor/npm-12.0.2.tgz',
      source: 'https://registry.npmjs.org/npm/-/npm-12.0.2.tgz',
      integrity: PINNED_NPM_INTEGRITY,
      size: artifact.size,
      license: 'Artistic-2.0',
    })
    // Other registry rows are allowed (the agent SDK ships pre-packaged), but none may
    // arrive without naming the bytes it pins.
    for (const [name, entry] of Object.entries(pinManifest.artifacts as Record<string, { path?: string; integrity?: string; sha256?: string }>)) {
      expect(entry.path, `artifact without a vendor path: ${name}`).toMatch(/^vendor\/[^/]+\.tgz$/)
      expect(entry.integrity ?? entry.sha256 ?? '', `artifact without a digest: ${name}`).toMatch(/^(?:sha512-[A-Za-z0-9+/=]+|[0-9a-f]{64})$/)
    }
    expect(verifyPinnedNpmArtifact(artifact)).toEqual(artifact)
    expect(readdirSync('vendor').filter((name) => /^npm-\d+\.\d+\.\d+\.tgz$/.test(name))).toEqual(['npm-12.0.2.tgz'])

    const provenance = readFileSync('vendor/npm-12.0.2.md', 'utf8')
    expect(provenance).toContain('https://registry.npmjs.org/npm/-/npm-12.0.2.tgz')
    expect(provenance).toContain(PINNED_NPM_INTEGRITY)
    expect(provenance).toContain('Artistic-2.0')
    expect(provenance).toContain('unmodified')
    expect(provenance).toMatch(/before\s+invoking npm's installer/)

    const security = readFileSync('docs/security.md', 'utf8')
    expect(security).toContain("Before invoking npm's installer")
    expect(security).not.toContain('Before invoking npm,')
    expect(security).not.toContain('lifecycle scripts, extensions')
  })

  test('keeps the bootstrap archive out of the packaged desktop application', () => {
    const build = JSON.parse(readFileSync('package.json', 'utf8')).build
    const packagedInputs = JSON.stringify({ files: build.files, extraResources: build.extraResources, mac: build.mac?.files, linux: build.linux?.files, win: build.win?.files })
    expect(packagedInputs).not.toContain('vendor/npm-')
    expect(packagedInputs).not.toContain('vendor/**')
    expect(build.files).toEqual([
      'out/**/*',
      'package.json',
      '!**/node_modules/prime-agent/docs/**',
      '!**/node_modules/prime-agent/dist/bundle/**',
      '!**/node_modules/prime-agent/dist/modes/**',
      '!**/node_modules/prime-agent/**/*.map',
      '!**/node_modules/prime-agent/**/*.d.ts',
      '!**/node_modules/@earendil-works/pi-tui/**',
      '!**/node_modules/koffi/**',
    ])
  })
})

const AUDIT_EXCEPTION_REASON = 'no patched release exists upstream yet'
const auditReport = (advisories: Array<{ package: string; advisory: string; severity: string }>) => ({
  vulnerabilities: Object.fromEntries(
    advisories.map((entry) => [
      entry.package,
      {
        name: entry.package,
        severity: entry.severity,
        via: [{ source: 1, name: entry.package, title: `${entry.package} flaw`, url: `https://github.com/advisories/${entry.advisory}`, severity: entry.severity }],
      },
    ]),
  ),
})

describe('production dependency audit', () => {
  const advisory = { package: 'extract-zip', advisory: 'GHSA-jmr9-qjv8-65gv', severity: 'high' }
  const exception = parseAuditExceptions(JSON.stringify({ exceptions: [{ ...advisory, expires: '2099-01-01', reason: AUDIT_EXCEPTION_REASON }] }))
  const now = Date.parse('2026-08-14T00:00:00Z')

  test('reports only high and critical advisories, ignoring back-references to other packages', () => {
    const report = {
      vulnerabilities: {
        ...auditReport([advisory, { package: 'left-pad', advisory: 'GHSA-2222-2222-2222', severity: 'moderate' }]).vulnerabilities,
        'prime-agent': { name: 'prime-agent', severity: 'high', via: ['extract-zip'] },
      },
    }

    expect(collectAuditAdvisories(report)).toEqual([{ advisory: advisory.advisory, package: 'extract-zip', severity: 'high', title: 'extract-zip flaw' }])
  })

  test('fails closed on malformed vulnerability entries and via arrays', () => {
    expect(() => collectAuditAdvisories({ vulnerabilities: { broken: null } })).toThrow(/broken/)
    expect(() => collectAuditAdvisories({ vulnerabilities: { broken: { name: 'broken', via: 'oops' } } })).toThrow(/via/)
  })

  test('fails closed on malformed via entries', () => {
    expect(() => collectAuditAdvisories({ vulnerabilities: { broken: { name: 'broken', via: [42, null] } } })).toThrow(/via/)
  })

  test('fails closed when a via severity is missing or unknown', () => {
    const missingSeverity = { url: `https://github.com/advisories/${advisory.advisory}`, title: 'missing severity' }
    expect(() => collectAuditAdvisories({ vulnerabilities: { [advisory.package]: { name: advisory.package, via: [missingSeverity] } } })).toThrow(/severity/)
    expect(() => collectAuditAdvisories({ vulnerabilities: { [advisory.package]: { name: advisory.package, via: [{ ...missingSeverity, severity: 'urgent' }] } } })).toThrow(/severity/)
  })

  test('fails closed when a high or critical via has no parseable advisory ID', () => {
    const via = { name: advisory.package, severity: 'critical', title: 'unresolvable advisory', url: 'not-an-advisory-url' }

    expect(() => collectAuditAdvisories({ vulnerabilities: { [advisory.package]: { name: advisory.package, via: [via] } } })).toThrow(/advisory ID/)
  })

  test('fails closed when a high or critical via has no package name', () => {
    const via = { severity: 'high', title: 'unnamed advisory', url: `https://github.com/advisories/${advisory.advisory}` }

    expect(() => collectAuditAdvisories({ vulnerabilities: { unknown: { via: [via] } } })).toThrow(/package name/)
  })

  test('accepts a listed advisory while still failing on an unlisted one', () => {
    const unlisted = { package: 'tar-fs', advisory: 'GHSA-3333-3333-3333', severity: 'critical' }
    const evaluation = evaluateAuditReport(auditReport([advisory, unlisted]), exception, now)

    expect(evaluation.accepted).toHaveLength(1)
    expect(evaluation.unexpected).toMatchObject([{ advisory: unlisted.advisory, package: 'tar-fs' }])
    expect(describeAuditEvaluation(evaluation)).toMatchObject({ ok: false })
    expect(describeAuditEvaluation(evaluation).message).toContain(unlisted.advisory)
  })

  test('fails once an accepted advisory passes its expiry so it cannot become permanent', () => {
    const expiring = parseAuditExceptions(JSON.stringify({ exceptions: [{ ...advisory, expires: '2026-08-13', reason: AUDIT_EXCEPTION_REASON }] }))
    const evaluation = evaluateAuditReport(auditReport([advisory]), expiring, now)
    const described = describeAuditEvaluation(evaluation)

    expect(evaluation.expired).toMatchObject([{ advisory: advisory.advisory }])
    expect(described.ok).toBe(false)
    expect(described.message).toContain('expired on 2026-08-13')
  })

  test('fails on a stale exception so a fixed advisory stops being suppressed', () => {
    const evaluation = evaluateAuditReport({ vulnerabilities: {} }, exception, now)
    const described = describeAuditEvaluation(evaluation)

    expect(evaluation.stale).toHaveLength(1)
    expect(described.ok).toBe(false)
    expect(described.message).toContain('no longer matches any advisory')
  })

  test('passes with a clean report and names every accepted advisory in the summary', () => {
    const evaluation = describeAuditEvaluation(evaluateAuditReport(auditReport([advisory]), exception, now))

    expect(evaluation.ok).toBe(true)
    expect(evaluation.message).toContain(`${advisory.advisory} in extract-zip until 2099-01-01`)
  })

  test('rejects an exception that lacks a reason or a parseable expiry', () => {
    expect(() => parseAuditExceptions(JSON.stringify({ exceptions: [{ ...advisory, expires: '2099-01-01', reason: 'nope' }] }))).toThrow(/reason/)
    expect(() => parseAuditExceptions(JSON.stringify({ exceptions: [{ ...advisory, expires: 'someday', reason: AUDIT_EXCEPTION_REASON }] }))).toThrow(/expires/)
    expect(() => parseAuditExceptions(JSON.stringify({ exceptions: [{ ...advisory, advisory: 'CVE-2024-1', expires: '2099-01-01', reason: AUDIT_EXCEPTION_REASON }] }))).toThrow(/GHSA/)
  })

  test('the checked-in exception list is valid and every entry still expires in the future', () => {
    const exceptions = readAuditExceptions()

    expect(exceptions).toEqual([])
    for (const entry of exceptions) {
      expect(entry.expiresAt, `audit exception for ${entry.advisory} has expired; re-check for a fix`).toBeGreaterThan(Date.now())
    }
  })
})

describe('packaged extension resources', () => {
  function createFixture() {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-packaged-extensions-'))
    const resources = join(directory, 'resources')
    const extensions = join(resources, 'extensions')
    mkdirSync(extensions, { recursive: true })
    for (const filename of SHIPPED_EXTENSION_FILENAMES) writeFileSync(join(extensions, filename), 'fixture')
    return { directory, resources, extensions }
  }

  test('accepts exactly the manifest extension files and rejects missing, extra, and non-file entries', () => {
    const exact = createFixture()
    const missing = createFixture()
    const extra = createFixture()
    const nonFile = createFixture()
    try {
      expect(() => assertPackagedExtensions(exact.resources)).not.toThrow()
      rmSync(join(missing.extensions, SHIPPED_EXTENSION_FILENAMES[0]))
      expect(() => assertPackagedExtensions(missing.resources)).toThrow(/missing:/)
      writeFileSync(join(extra.extensions, 'unexpected.ts'), 'fixture')
      expect(() => assertPackagedExtensions(extra.resources)).toThrow(/extra:/)
      mkdirSync(join(nonFile.extensions, 'nested'))
      expect(() => assertPackagedExtensions(nonFile.resources)).toThrow(/non-file:/)
    } finally {
      for (const fixture of [exact, missing, extra, nonFile]) rmSync(fixture.directory, { recursive: true, force: true })
    }
  })
})

describe('shipped extension pin', () => {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const shipped = readShippedAgentPin()
  const realBytes = readFileSync(join(root, shipped.path))

  // The layout check demands every shipped extension, so the fixture is the real
  // directory with only the pinned bundle swapped. That keeps this test about CONTENT.
  const realExtensions = join(root, 'assets', 'extensions')
  function resourcesWith(content: Buffer | null): string {
    const directory = mkdtempSync(join(tmpdir(), 'vclaw-ext-pin-'))
    const extensions = join(directory, 'extensions')
    mkdirSync(extensions, { recursive: true })
    for (const name of readdirSync(realExtensions)) {
      if (name !== basename(shipped.path)) writeFileSync(join(extensions, name), readFileSync(join(realExtensions, name)))
    }
    if (content) writeFileSync(join(extensions, basename(shipped.path)), content)
    return directory
  }

  test('accepts the extension byte-identical to the pin', () => {
    const directory = resourcesWith(realBytes)
    try {
      expect(() => assertPackagedExtensionContent(directory, shipped)).not.toThrow()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('rejects a stale bundle under the correct filename, which the layout check cannot see', () => {
    // Same length, one flipped byte: assertPackagedExtensions passes this file, because
    // it only inspects names. That was the gap until the digest check existed.
    const tampered = Buffer.from(realBytes)
    tampered[tampered.length - 1] ^= 0xff
    const directory = resourcesWith(tampered)
    try {
      expect(() => assertPackagedExtensions(directory)).not.toThrow()
      expect(() => assertPackagedExtensionContent(directory, shipped)).toThrow(/does not match pinned/)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('rejects a wrong byte count and an absent extension', () => {
    const shortDirectory = resourcesWith(realBytes.subarray(0, 8))
    const emptyDirectory = resourcesWith(null)
    try {
      expect(() => assertPackagedExtensionContent(shortDirectory, shipped)).toThrow(/bytes; pinned/)
      expect(() => assertPackagedExtensionContent(emptyDirectory, shipped)).toThrow(/missing the pinned extension/)
    } finally {
      rmSync(shortDirectory, { recursive: true, force: true })
      rmSync(emptyDirectory, { recursive: true, force: true })
    }
  })
})
