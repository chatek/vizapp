#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertSupportedToolchain, productArtifactPrefix, renderStagedProfile, runCommand, validateReleaseCredentials, validateWindowsReleaseCredentials, withoutReleaseCredentials } from './lib.mjs'

const args = new Set(process.argv.slice(2))
const isPublic = args.has('--public')
const isQa = args.has('--qa')
const dryRun = args.has('--dry-run')
// CI release jobs pass --skip-verify because the CI workflow has already run
// the identical typecheck/lint/test suite on the same commit; the release job
// then only builds the bundle, packages, and runs post-package verification.
const skipVerify = args.has('--skip-verify')
// Explicit, reported alternative to a silent target drop: on hosts without the
// Windows SDK the appx target cannot run (electron-builder needs makeappx).
const withoutAppx = args.has('--without-appx')
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

/**
 * True when `directory` holds at least one file that is member content. The generic checkout
 * ships `product/payload/README.md` alone; an integrated member build replaces it with the
 * member's bundle, so README-only is the signature of a missing (or early) integrate.
 */
function hasMemberContent(directory) {
  if (!existsSync(directory)) return false
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (hasMemberContent(resolve(directory, entry.name))) return true
    } else if (entry.name !== 'README.md' && entry.name !== '.DS_Store') {
      return true
    }
  }
  return false
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
  } else if (profileIndex !== -1) {
    // The caller ASKED for this profile by path: silently packaging the generic product
    // under an explicit profile request is how a member ships an unnamed generic app with
    // every gate green. A checkout with no product/ directory at all stays on the fallback
    // (older pins have neither product/ nor product-profile.ts and must still package).
    console.error(`--profile ${profilePath} does not exist; refusing to package the generic product under an explicit profile request`)
    process.exit(2)
  } else {
    console.warn(`No product profile at ${profilePath}; packaging the generic product`)
  }

  // --member is shorthand for --profile, so the two must agree. Silently preferring one would
  // let an artifact be named for a product whose profile is something else.
  if (member !== undefined && member !== profile.id) {
    console.error(`--member ${member} contradicts profile id "${profile.id}" (${profilePath})`)
    process.exit(2)
  }

  // Contract v2: ONE payload location, `product/payload`, shipped by the static extraResources
  // entry and named by `defaultProject.from`. The legacy integrator copied to `vendor/<member>` and
  // appended its own extraResources row; that layout seeds an empty ~/VizMaster under this profile
  // and is retired (decision 1+3 land together). The mount assert in release.yml reads the v2 path.
  //
  // A missing or early integrate packages NO member content and raises NO error: the seeded
  // directory exists but is empty, and electron-builder happily packages it. This check runs before
  // electron-builder and names both the missing path and the release the profile must stamp.
  // A member build is `--member` OR a profile carrying `defaultProject` (the documented
  // `--profile product/<member>.json` invocation has no --member).
  const memberBuildId = member ?? (profile.defaultProject ? profile.id : undefined)
  let memberRelease = ''
  if (memberBuildId !== undefined) {
    const label = member !== undefined ? `--member ${member}` : `profile ${profile.id}`
    // profile.json is hand-edited and may carry Windows separators ("product\\payload");
    // compare normalized paths so the same profile passes on every host.
    const seedsFrom = profile.defaultProject ? profile.defaultProject.from.replace(/\\/g, '/') : undefined
    if (profile.defaultProject && seedsFrom !== 'product/payload') {
      console.error(`${label} seeds from "${profile.defaultProject.from}", but a member build ships its payload at product/payload; the v2 convention is defaultProject.from = "product/payload"`)
      process.exit(2)
    }
    const payloadDirectory = resolve('product', 'payload')
    if (!existsSync(resolve(payloadDirectory, 'dist'))) {
      console.error(`${label} but product/payload/dist does not exist; the v2 integrator must copy the member payload into product/payload (the legacy vendor/<member> layout is not supported)`)
      process.exit(2)
    }
    if (!hasMemberContent(payloadDirectory)) {
      console.error(`${label} but product/payload carries no member content (README.md only); the member payload was not integrated`)
      process.exit(2)
    }
    // The emitted tuple is the single source of the release id: the profile's checked-in
    // defaultProject.version is a placeholder, and the packaged profile is rendered from this file.
    const buildInfoPath = resolve(payloadDirectory, 'BUILD.json')
    try {
      const buildInfo = JSON.parse(readFileSync(buildInfoPath, 'utf8'))
      memberRelease = typeof buildInfo.release === 'string' ? buildInfo.release.trim() : ''
    } catch (error) {
      console.error(`${label} but ${buildInfoPath} is unreadable (${error instanceof Error ? error.message : String(error)}); the payload's release identity is required`)
      process.exit(2)
    }
    if (memberRelease === '') {
      console.error(`${label} but ${buildInfoPath} has no release id; refusing to stage a placeholder defaultProject.version`)
      process.exit(2)
    }
  }

  const verifyScript = skipVerify ? 'build:bundle' : platform === 'mac' ? 'release:verify' : 'release:verify:package'
  run('npm', ['run', verifyScript], withoutReleaseCredentials(process.env))
  if (!dryRun) rmSync(resolve('release', platform, arch), { recursive: true, force: true })

  const builderArgs = [`--${platform}`, `--${arch}`, '--publish', 'never', `--config.directories.output=release/${platform}/${arch}`]
  // Ship THIS profile as resources/product.json: electron-builder reads a static extraResources
  // entry, so the selection is applied by staging the chosen file. Removed in the finally below,
  // so a failed build does not leave a stale product identity behind for the next one. A member
  // profile is rendered with the payload's release id so the seed and the artifact share one tuple.
  const stagedProfile = resolve('product', 'profile.active.json')
  mkdirSync(resolve('product'), { recursive: true })
  writeFileSync(stagedProfile, `${JSON.stringify(renderStagedProfile(profile, memberRelease), null, 2)}\n`)

  // The artifact name is DERIVED from the profile, never supplied beside it: verify-package
  // asserts the two agree, and this is the one place that makes them agree by construction.
  // The prefix is the product identity (member profile's identity.productName, else the
  // package's build.productName — the same value electron-builder's ${productName} macro
  // resolves to), so a rebrand cannot stale this line against the config it mirrors.
  // Windows carries an explicit platform segment (<prefix>-<version>-win-<arch>) so it cannot be
  // confused with a future linux x64 artifact of the same version; mac needs none (it is the
  // only dmg/zip-app producer). This matches package.json's build.win.artifactName and the
  // asset lists prepare-github-release.mjs expects.
  const platformSegment = platform === 'win' ? '-win' : ''
  const productPrefix = profile.identity?.productName ?? productArtifactPrefix()
  const artifactName = profile.id === 'vclaw' ? `${productPrefix}-\${version}${platformSegment}-\${arch}.\${ext}` : `${productPrefix}-\${version}-${profile.id}${platformSegment}-\${arch}.\${ext}`
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
  // QA Windows builds ship node-pty/zeromq win32-x64 PREBUILDS (asarUnpack lists them);
  // the ct18 guest has no MSVC and no Python on the SYSTEM PATH, so @electron/rebuild's
  // node-gyp attempt cannot succeed and is not needed. Public builds keep the default.
  if (isQa && platform === 'win') builderArgs.push('--config.npmRebuild=false')
  if (platform === 'win' && withoutAppx) {
    builderArgs.push(`--config.win.target=${JSON.stringify(['nsis', 'zip'])}`)
    console.warn('note: --without-appx — the appx target is SKIPPED (no Windows SDK on this host); nsis + zip only')
  }
  run('electron-builder', builderArgs, builderEnv)
  if (platform === 'win' && !dryRun && !withoutAppx) {
    const outputDirectory = resolve('release', platform, arch)
    const appx = readdirSync(outputDirectory).find((name) => name.endsWith('.appx'))
    if (!appx) throw new Error('Windows AppX/MSIX package was not produced (pass --without-appx to build nsis+zip only)')
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
  // Operator-visible artifact mirror: every packaged file is also copied under
  // build/<platform>-<arch>/ (git-ignored binaries), so the build output is one
  // place to look instead of release/<platform>/<arch>.
  if (!dryRun) {
    const from = resolve('release', platform, arch)
    const to = resolve('build', `${platform}-${arch}`)
    mkdirSync(to, { recursive: true })
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      copyFileSync(resolve(from, entry.name), resolve(to, entry.name))
    }
    console.log(`artifacts also copied to build/${platform}-${arch}/`)
  }
  if (dryRun) console.log('\nDRY RUN — nothing executed.')
  else console.log(`\n${isPublic ? 'Distribution' : 'Local QA'} ${platform}/${arch} package pipeline passed.`)
} catch (error) {
  console.error(`\nPackaging failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  rmSync(resolve('product', 'profile.active.json'), { force: true })
}
