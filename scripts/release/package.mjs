#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertSupportedToolchain, runCommand, validateReleaseCredentials, validateWindowsReleaseCredentials, withoutReleaseCredentials } from './lib.mjs'

const args = new Set(process.argv.slice(2))
const isPublic = args.has('--public')
const isQa = args.has('--qa')
const dryRun = args.has('--dry-run')
// CI release jobs pass --skip-verify because the CI workflow has already run
// the identical typecheck/lint/test suite on the same commit; the release job
// then only builds the bundle, packages, and runs post-package verification.
const skipVerify = args.has('--skip-verify')
const platformIndex = process.argv.indexOf('--platform')
const platform = platformIndex === -1 ? undefined : process.argv[platformIndex + 1]
const archIndex = process.argv.indexOf('--arch')
// A member build bakes a member overlay and must not carry the generic artifact
// name. The member's own payload is integrated BEFORE this script runs (release.yml
// `package-member` job: checkout member @ pin -> bundle -> integrate --vclaw <dir>).
const memberIndex = process.argv.indexOf('--member')
const member = memberIndex === -1 ? undefined : process.argv[memberIndex + 1]
if (member !== undefined && !/^[a-z0-9][a-z0-9-]*$/.test(member)) {
  console.error('Choose a member id matching [a-z0-9][a-z0-9-]* (for example: --member vizmaster)')
  process.exit(2)
}
const profileIndex = process.argv.indexOf('--profile')
const profilePath = profileIndex === -1 ? 'product/profile.json' : process.argv[profileIndex + 1]
const platformHosts = { mac: 'darwin', linux: 'linux', win: 'win32' }
const nativeArchitectures = { arm64: 'arm64', x64: 'x64' }
if (isPublic === isQa) {
  console.error('Choose exactly one release mode: --public or --qa')
  process.exit(2)
}
if (!platform || !(platform in platformHosts)) {
  console.error('Choose a supported platform: --platform mac, linux, or win')
  process.exit(2)
}
// An explicit --arch is authoritative; only its absence falls back to the
// build machine's architecture, so a malformed flag fails instead of silently
// packaging the host arch.
const defaultArch = process.arch === 'arm64' ? 'arm64' : 'x64'
const arch = archIndex === -1 ? defaultArch : process.argv[archIndex + 1]
if (!arch || !(arch in nativeArchitectures)) {
  console.error('Choose a supported architecture: --arch arm64 or x64')
  process.exit(2)
}

function run(command, commandArgs, env = process.env) {
  console.log(`\n> ${command} ${commandArgs.join(' ')}`)
  if (dryRun) return
  runCommand(command, commandArgs, { env })
}

try {
  assertSupportedToolchain()
  if (process.platform !== platformHosts[platform]) throw new Error(`${platform} packaging must run natively on ${platformHosts[platform]}`)
  if (isPublic && platform === 'mac') validateReleaseCredentials(process.env)
  if (isPublic && platform === 'win') validateWindowsReleaseCredentials(process.env)
  
  // The profile decides the product, so validate it BEFORE any work: a profile that cannot
  // start the app must never become an artefact. 'development' is the honest source here —
  // the profile is a file in this checkout, not yet the packaged copy.
  // A checkout without product/ is the pre-profile layout (older pins): fall back to the generic
  // product instead of failing, so a member pinning an older commit still packages. The vocabulary
  // is restated here for the same reason product-profile.ts mirrors it — this runs under plain Node.
  // IMPORTED LAZILY: a member pinning a commit from before product profiles has neither
  // product/ nor product-profile.ts, and must still be able to package. A static import here
  // made every such pin fail with ERR_MODULE_NOT_FOUND.
  const GENERIC_FALLBACK_PROFILE = { profileVersion: 1, id: 'vclaw', harnesses: ['omp', 'prime', 'pi'] }
  let profile = GENERIC_FALLBACK_PROFILE
  if (existsSync(profilePath)) {
    const profileModule = resolve('electron/main/product-profile.ts')
    const { validateProductProfile } = await import(pathToFileURL(profileModule).href)
    profile = validateProductProfile(JSON.parse(readFileSync(profilePath, 'utf8')), 'development', profilePath)
  } else {
    console.warn(`No product profile at ${profilePath}; packaging the generic product`)
  }

  // --member is shorthand for --profile, so the two must agree. Silently preferring one would
  // let an artifact be named for a product whose profile is something else.
  if (member !== undefined && member !== profile.id) {
    console.error(`--member ${member} contradicts profile id "${profile.id}" (${profilePath})`)
    process.exit(2)
  }
  
  const verifyScript = skipVerify ? 'build:bundle' : platform === 'mac' ? 'release:verify' : 'release:verify:package'
  run('npm', ['run', verifyScript], withoutReleaseCredentials(process.env))
  if (!dryRun) rmSync(resolve('release', platform, arch), { recursive: true, force: true })

  const builderArgs = [`--${platform}`, `--${arch}`, '--publish', 'never', `--config.directories.output=release/${platform}/${arch}`]
  // Ship THIS profile as resources/product.json: electron-builder reads a static extraResources
  // entry, so the selection is applied by staging the chosen file. Removed in the finally below,
  // so a failed build does not leave a stale product identity behind for the next one.
  const stagedProfile = resolve('product', 'profile.active.json')
  mkdirSync(resolve('product'), { recursive: true })
  writeFileSync(stagedProfile, `${JSON.stringify(profile, null, 2)}\n`)

  // The artifact name is DERIVED from the profile, never supplied beside it: verify-package
  // asserts the two agree, and this is the one place that makes them agree by construction.
  const artifactName = profile.id === 'vclaw'
    ? 'VClaw-${version}-${arch}.${ext}'
    : `VClaw-\${version}-${profile.id}-\${arch}.\${ext}`
  // Per-platform key, not the top-level one: package.json sets build.mac.artifactName, and a
  // platform artifactName WINS over the generic one — so `--config.artifactName` was silently
  // ignored and every member build kept the plain ${productName}-${version}-${arch} name.
  builderArgs.push(`--config.${platform}.artifactName=${artifactName}`)
  // Identity travels with the profile: a member build that inherited appId com.vclaw.desktop
  // would share the generic product's userData directory and updater channel.
  // Offline / airgapped builds: this host resolves github.com to a fake-ip, so electron-builder's
  // ELECTRON download dies with EADDRNOTAVAIL *after* the .app is packaged. Pointing it at the
  // Electron that npm already unpacked removes the fetch entirely.
  if (process.env.VCLAW_ELECTRON_DIST) {
    builderArgs.push(`--config.electronDist=${resolve(process.env.VCLAW_ELECTRON_DIST)}`)
  }
  if (profile.identity) {
    builderArgs.push(`--config.productName=${profile.identity.productName}`, `--config.appId=${profile.identity.appId}`)
  }
  if (isPublic && platform === 'win') builderArgs.push('--config.forceCodeSigning=true')
  const builderEnv = isQa ? { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' } : process.env
  if (isQa && platform === 'mac') builderArgs.push('--config.mac.identity=null', '--config.mac.notarize=false')
  run('electron-builder', builderArgs, builderEnv)
  if (platform === 'win' && !dryRun) {
    const outputDirectory = resolve('release', platform, arch)
    const appx = readdirSync(outputDirectory).find((name) => name.endsWith('.appx'))
    if (!appx) throw new Error('Windows AppX/MSIX package was not produced')
    copyFileSync(resolve(outputDirectory, appx), resolve(outputDirectory, appx.replace(/\.appx$/, '.msix')))
  }
  if (platform === 'mac') {
    run(
      'node',
      ['scripts/release/verify-package.mjs', '--mode', isPublic ? 'public' : 'qa', '--arch', arch, '--release-directory', resolve('release', platform, arch)],
      withoutReleaseCredentials(process.env, ['RELEASE_SIGNING_TEAM_ID']),
    )
  } else {
    run('node', ['scripts/release/verify-cross-platform-package.mjs', '--platform', platform, '--arch', arch, '--mode', isPublic ? 'public' : 'qa'], withoutReleaseCredentials(process.env))
  }
  if (dryRun) console.log('\nDRY RUN — nothing executed.')
  else console.log(`\n${isPublic ? 'Distribution' : 'Local QA'} ${platform}/${arch} package pipeline passed.`)
} catch (error) {
  console.error(`\nPackaging failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  rmSync(resolve('product', 'profile.active.json'), { force: true })
}
