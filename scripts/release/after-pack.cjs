const { join } = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

// electron-builder passes `context.arch` as its numeric Arch enum (ia32=0, x64=1,
// armv7l=2, arm64=3, universal=4) — older builders passed the name. Normalise both.
const ARCH_NAMES = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64', 4: 'universal' }
function archName(arch) {
  if (typeof arch === 'string') return arch
  return ARCH_NAMES[arch] || `unknown(${arch})`
}

// VClaw bundles OMP (resources/harness/bin/omp, wired through the platform
// extraResources from ../vendors/oh-my-pi/releases/<pin>/: omp-darwin-${arch} on mac,
// omp-windows-${arch}.exe on win). Verify, before fuses are flipped: the binary is
// present, its sha256 matches the release set's SHA256SUMS.txt, and (mac only) its
// Mach-O slice matches the build arch. A wrong or stale binary here would be launched
// by discovery order #3 ahead of any host OMP.
function verifyBundledOmp(context) {
  const platform = context.electronPlatformName
  if (platform !== 'darwin' && platform !== 'win32') return
  const arch = archName(context.arch)
  if (arch === 'universal') {
    throw new Error('bundled omp: universal mac builds are not supported — build --arm64 and --x64 separately')
  }
  const isMac = platform === 'darwin'
  const productFilename = context.packager.appInfo.productFilename
  // Windows appOutDir is the unpacked root (resources/ sits directly inside it);
  // mac nests under <name>.app/Contents. Both candidates are checked, mirroring
  // verifyDashboardPayload's defensive layout probing.
  const candidates = isMac
    ? [join(context.appOutDir, `${productFilename}.app`, 'Contents', 'Resources', 'harness', 'bin', 'omp')]
    : [join(context.appOutDir, 'resources', 'harness', 'bin', 'omp.exe'), join(context.appOutDir, productFilename, 'resources', 'harness', 'bin', 'omp.exe')]
  const bundled = candidates.find((p) => fs.existsSync(p))
  if (!bundled) {
    throw new Error(`bundled omp: resources/harness/bin/${isMac ? 'omp' : 'omp.exe'} is missing — was ${isMac ? 'mac' : 'win'}.extraResources applied?`)
  }
  const ompName = isMac ? `omp-darwin-${arch}` : `omp-windows-${arch}.exe`
  const releaseDir = join(__dirname, '..', '..', '..', 'vendors', 'oh-my-pi', 'releases', 'v18.16.0')
  const sums = fs.readFileSync(join(releaseDir, 'SHA256SUMS.txt'), 'utf8')
  const line = sums.split('\n').find((l) => l.trimEnd().endsWith(ompName))
  if (!line) throw new Error(`bundled omp: no SHA256SUMS entry for ${ompName}`)
  const expected = line.trim().split(/\s+/)[0].toLowerCase()
  const actual = crypto.createHash('sha256').update(fs.readFileSync(bundled)).digest('hex')
  if (actual !== expected) {
    throw new Error(`bundled omp: sha256 mismatch — expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…`)
  }
  if (isMac) {
    const lipo = execFileSync('lipo', ['-archs', bundled], { encoding: 'utf8' })
    if (!lipo.split(/\s+/).includes(arch === 'x64' ? 'x86_64' : 'arm64')) {
      throw new Error(`bundled omp: Mach-O does not contain the ${arch} slice (lipo: ${lipo.trim()})`)
    }
    fs.chmodSync(bundled, 0o755)
  }
  console.log(`  after-pack: bundled omp verified (${isMac ? 'darwin' : 'win32'} ${arch}, sha256 ${actual.slice(0, 12)}…)`)
}

// vizmaster (2026-11-07, packaging review §8 gap 1, P0): the DASHBOARD payload is
// integrator-written build state, deliberately untracked (.gitignore whitelist), so
// nothing in git can prove it exists — and a build without it ships a product whose
// prompt→VizShow loop silently cannot work. This is the enforcement the review found
// missing: the pack FAILS unless the integrated payload is present and complete.
// The three markers are the minimum the loop needs: an installable project, the OMP
// tool discovery shim, and the release identity the upgrader keys off.
function verifyDashboardPayload(context) {
  const { appOutDir, packager } = context
  const productName = packager.appInfo.productFilename
  const candidates = [
    context.electronPlatformName === 'darwin' ? join(appOutDir, `${productName}.app`, 'Contents', 'Resources', 'product', 'payload') : join(appOutDir, productName, 'resources', 'product', 'payload'),
    join(appOutDir, 'resources', 'product', 'payload'),
  ]
  const payload = candidates.find((dir) => fs.existsSync(join(dir, 'BUILD.json')))
  if (!payload) {
    throw new Error(
      [
        'vizshow payload: product/payload is missing its BUILD.json — the dashboard bytes are absent.',
        '  The payload is integrator-written build state (untracked by design): before building, run',
        '  VizMaster/scripts/bundle-vizmaster.mjs then integrate-vcclaw.mjs, or this build ships a product',
        '  whose prompt→VizShow loop silently cannot work. (packaging review §8 gap 1 — P0)',
      ].join('\n'),
    )
  }
  // The handoff (round-2 condition (i)): integrate-vcclaw.mjs delivers the member's
  // release/handoff.json to product/handoff.json, beside the payload's parent. Read it
  // and derive the marker list from it — the carrier's expectations stop being a
  // hand-kept mirror of the member's declaration (the gap-2 whitelist-mirror class).
  const handoffPath = join(payload, '..', 'handoff.json')
  if (!fs.existsSync(handoffPath)) {
    throw new Error(`vizshow payload: ${handoffPath} is missing — the integration is incomplete (the integrator fails closed without it; a pack must never default to lenient expectations) (P0)`)
  }
  let handoff
  try {
    handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'))
  } catch (error) {
    throw new Error(`vizshow payload: product/handoff.json is not parseable JSON — ${error.message}`)
  }
  if (!Array.isArray(handoff.markers) || handoff.markers.length === 0) {
    throw new Error('vizshow payload: product/handoff.json declares no markers — refusing to verify against an empty expectation set')
  }
  const markers = handoff.markers
  for (const marker of markers) {
    if (typeof marker !== 'string' || marker === '' || marker.includes('..')) {
      throw new Error(`vizshow payload: product/handoff.json marker ${JSON.stringify(marker)} is not a safe relative path`)
    }
    if (!fs.existsSync(join(payload, marker))) {
      throw new Error(`vizshow payload: ${marker} missing under ${payload} — the integration is incomplete (P0)`)
    }
  }
  // Round-2 condition (ii): the delivered handoff bytes are pinned in dependency-pins.json.
  // A member edit to markers/bind paths/contract tuple therefore requires a carrier pin
  // update in the same release — loosening expectations cannot happen silently.
  const pinsPath = join(__dirname, 'dependency-pins.json')
  const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'))
  const pinned = pins.handoff?.['product/handoff.json']
  if (!pinned || typeof pinned.integrity !== 'string' || !/^sha512-/.test(pinned.integrity)) {
    throw new Error('vizshow payload: dependency-pins.json has no handoff pin for product/handoff.json — pin the delivered bytes (round-2 condition ii)')
  }
  const digest = `sha512-${crypto.createHash('sha512').update(fs.readFileSync(handoffPath)).digest('base64')}`
  if (digest !== pinned.integrity) {
    throw new Error(
      `vizshow payload: product/handoff.json bytes do not match the pin (expected ${pinned.integrity.slice(0, 24)}…, got ${digest.slice(0, 24)}…) — a member-side expectation change needs a carrier pin update in the same release`,
    )
  }
  // Belt-and-braces for the member's bundle gate (bundle-vizmaster.mjs fails closed on
  // the same condition at bundle time): the payload is seeded to ~/.vizmaster/default and
  // runs `npm ci` on the USER's machine, where no @vizmaster/* workspace package exists —
  // such a row resolves against the public registry and 404s, breaking the seeded project
  // on first launch (measured 2026-11-07: tools-smoke.ts's dep declaration did exactly
  // this). The member gate guards the bundle; this guards the artefact, so a member-side
  // regression cannot ship.
  let manifest
  try {
    manifest = JSON.parse(fs.readFileSync(join(payload, 'package.json'), 'utf8'))
  } catch (error) {
    throw new Error(`vizshow payload: package.json under ${payload} is not parseable JSON — ${error.message}`)
  }
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = manifest[section]
    if (deps === undefined) continue
    if (typeof deps !== 'object' || deps === null || Array.isArray(deps)) {
      throw new Error(`vizshow payload: package.json ${section} is not an object`)
    }
    for (const [name, spec] of Object.entries(deps)) {
      if (name.startsWith('@vizmaster/')) {
        throw new Error(
          `vizshow payload: package.json declares ${name} (${section}) — @vizmaster/* are private workspace packages; a seeded project's npm ci resolves them against the public registry and 404s (P0)`,
        )
      }
      if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        throw new Error(`vizshow payload: package.json declares ${name}@${spec} (${section}) — workspace: protocols cannot resolve outside the member repo (P0)`)
      }
    }
  }
  console.log(`  after-pack: vizshow payload verified (${payload})`)
}

exports.verifyDashboardPayload = verifyDashboardPayload

function executablePath(context, platform = process.platform) {
  const { appOutDir, packager } = context
  const { productFilename } = packager.appInfo
  if (platform === 'darwin') return join(appOutDir, `${productFilename}.app`, 'Contents', 'MacOS', productFilename)
  if (platform === 'win32') return join(appOutDir, `${productFilename}.exe`)
  // app-builder-lib's LinuxPackager names the binary after the lowercased sanitized name unless executableName overrides it.
  return join(appOutDir, packager.appInfo.sanitizedName.toLowerCase())
}

exports.executablePath = executablePath

exports.default = async function hardenElectron(context) {
  verifyDashboardPayload(context)
  verifyBundledOmp(context)
  await flipFuses(executablePath(context), {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: process.platform === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
    [FuseV1Options.WasmTrapHandlers]: true,
  })
}
