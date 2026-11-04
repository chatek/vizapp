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

// VClaw bundles OMP (resources/harness/bin/omp, wired through
// mac.extraResources from ../vendors/oh-my-pi/releases/<pin>/omp-darwin-${arch}).
// Verify, before fuses are flipped: the binary is present, its sha256 matches the
// release set's SHA256SUMS.txt, and its Mach-O slice matches the build arch. A wrong
// or stale binary here would be launched by discovery order #3 ahead of any host OMP.
function verifyBundledOmp(context) {
  if (context.electronPlatformName !== 'darwin') return
  const arch = archName(context.arch)
  if (arch === 'universal') {
    throw new Error('bundled omp: universal mac builds are not supported — build --arm64 and --x64 separately')
  }
  const appResources = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
  const bundled = join(appResources, 'harness', 'bin', 'omp')
  if (!fs.existsSync(bundled)) {
    throw new Error('bundled omp: resources/harness/bin/omp is missing — was mac.extraResources applied?')
  }
  const releaseDir = join(__dirname, '..', '..', '..', 'vendors', 'oh-my-pi', 'releases', 'v18.16.0')
  const sums = fs.readFileSync(join(releaseDir, 'SHA256SUMS.txt'), 'utf8')
  const line = sums.split('\n').find((l) => l.trimEnd().endsWith(`omp-darwin-${arch}`))
  if (!line) throw new Error(`bundled omp: no SHA256SUMS entry for omp-darwin-${arch}`)
  const expected = line.trim().split(/\s+/)[0].toLowerCase()
  const actual = crypto.createHash('sha256').update(fs.readFileSync(bundled)).digest('hex')
  if (actual !== expected) {
    throw new Error(`bundled omp: sha256 mismatch — expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…`)
  }
  const lipo = execFileSync('lipo', ['-archs', bundled], { encoding: 'utf8' })
  if (!lipo.split(/\s+/).includes(arch === 'x64' ? 'x86_64' : 'arm64')) {
    throw new Error(`bundled omp: Mach-O does not contain the ${arch} slice (lipo: ${lipo.trim()})`)
  }
  fs.chmodSync(bundled, 0o755)
  console.log(`  after-pack: bundled omp verified (sha256 ${actual.slice(0, 12)}…, ${arch})`)
}

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
