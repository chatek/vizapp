import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { accessSync, constants, existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, join, posix, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHIPPED_EXTENSION_FILENAMES } from '../../electron/main/extension-manifest.ts'
import { validateProductProfile } from '../../electron/main/product-profile.ts'

const localRequire = createRequire(import.meta.url)
const packageJsonPath = fileURLToPath(new URL('../../package.json', import.meta.url))
const nvmrcPath = fileURLToPath(new URL('../../.nvmrc', import.meta.url))

let productPrefixCache
/**
 * The artifact-name prefix the CURRENT package identity produces: electron-builder
 * resolves the `${productName}` macro to `build.productName`, so `VizMaster-<version>…`
 * names must always start with this. Single source of truth — scripts and tests derive
 * from here instead of hardcoding a product literal that the next rebrand would stale
 * (the 6f144322 VClaw→Vizmaster rename is exactly that failure mode).
 */
export function productArtifactPrefix() {
  productPrefixCache ??= String(JSON.parse(readFileSync(packageJsonPath, 'utf8')).build?.productName ?? '').trim()
  if (!productPrefixCache) throw new Error('package.json build.productName is missing or empty — cannot derive artifact names')
  return productPrefixCache
}

/** Escapes a prefix for embedding in an artifact-name RegExp. */
export function escapeArtifactPrefix(prefix) {
  return prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function validateAbsoluteSingleLinePath(value, label, platform = process.platform) {
  const pathApi = platform === 'win32' ? win32 : posix
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /[\0\r\n]/.test(value) || !pathApi.isAbsolute(value)) {
    throw new Error(`${label} must be an absolute single-line path`)
  }
  return value
}

/**
 * The profile staged as `resources/product.json`. A member tuple exists only at build time, so the
 * checked-in `defaultProject.version` is a placeholder; the packaged copy must carry the release id
 * from the payload `BUILD.json`, or the seeded project's `BUILD.json` names a different (stale)
 * release than the artifact it came from.
 */
export function renderStagedProfile(profile, release) {
  if (!profile.defaultProject) return profile
  if (typeof release !== 'string' || release.trim() === '') {
    throw new Error('cannot stage a member profile without the payload release id')
  }
  return { ...profile, defaultProject: { ...profile.defaultProject, version: release.trim() } }
}

/**
 * Resolves a release-script command to a spawn invocation that works on every platform.
 * Windows npm and npx ship as .cmd shims Node refuses to spawn without a shell, so known
 * commands run their JavaScript entrypoint directly under the current Node executable.
 */
export function resolveCommandInvocation(command, args, platform = process.platform, env = process.env) {
  if (command === 'node') return { file: process.execPath, args: [...args], shell: false }
  if (command === 'install-electron') {
    return { file: process.execPath, args: [localRequire.resolve('electron/install.js'), ...args], shell: false }
  }
  if (command === 'electron-builder') {
    return { file: process.execPath, args: [localRequire.resolve('electron-builder/cli.js'), ...args], shell: false }
  }
  if (command === 'npm') {
    const npmCli = env.npm_execpath
    if (npmCli) {
      const validatedNpmCli = validateAbsoluteSingleLinePath(npmCli, 'npm_execpath', platform)
      if (!/\.[cm]?js$/i.test(validatedNpmCli)) {
        throw new Error('npm_execpath must identify an absolute JavaScript npm CLI path')
      }
      return { file: process.execPath, args: [validatedNpmCli, ...args], shell: false }
    }
    if (platform === 'win32') {
      const adjacentCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
      if (existsSync(adjacentCli)) return { file: process.execPath, args: [adjacentCli, ...args], shell: false }
      throw new Error('Cannot locate a JavaScript npm CLI safely on Windows; run this command through npm or use a Node distribution that includes npm')
    }
    return { file: 'npm', args: [...args], shell: false }
  }
  return { file: command, args: [...args], shell: false }
}

export function runCommand(command, args, options = {}) {
  const env = options.env ?? process.env
  const invocation = resolveCommandInvocation(command, args, options.platform ?? process.platform, env)
  const result = spawnSync(invocation.file, invocation.args, {
    stdio: 'inherit',
    env,
    shell: invocation.shell,
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with exit code ${result.status ?? `signal ${result.signal}`}`)
  return result
}

export const RELEASE_CREDENTIAL_NAMES = [
  'RELEASE_SIGNING_TEAM_ID',
  'CSC_LINK',
  'CSC_KEY_PASSWORD',
  'APPLE_ID',
  'APPLE_APP_SPECIFIC_PASSWORD',
  'APPLE_TEAM_ID',
  'APPLE_API_KEY',
  'APPLE_API_KEY_ID',
  'APPLE_API_ISSUER',
  'WIN_CSC_LINK',
  'WIN_CSC_KEY_PASSWORD',
]

export function withoutReleaseCredentials(env = process.env, allowed = []) {
  const allowedNames = new Set(allowed)
  return Object.fromEntries(Object.entries(env).filter(([name]) => !RELEASE_CREDENTIAL_NAMES.includes(name) || allowedNames.has(name)))
}

function parseStableVersion(version, label, allowLeadingV = false) {
  if (typeof version !== 'string') throw new Error(`Cannot parse ${label} version: ${String(version)}`)
  const value = version.trim()
  const match = /^(v?)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value)
  if (!match || (!allowLeadingV && match[1])) throw new Error(`Cannot parse ${label} version: ${version}`)
  if (match[5]) throw new Error(`A stable ${label} release is required (found ${version})`)
  return { numbers: match.slice(2, 5).map(Number), version: match.slice(2, 5).join('.') }
}

function parseEngineFloor(value, field) {
  if (typeof value !== 'string' || !/^>=(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`package.json ${field} must use an exact stable minimum in the form >=x.y.z`)
  }
  return value.slice(2)
}

export function parseToolchainMetadata(packageJsonSource, nvmrcSource) {
  let packageJson
  try {
    packageJson = JSON.parse(packageJsonSource)
  } catch (error) {
    throw new Error(`Cannot parse package.json: ${error instanceof Error ? error.message : String(error)}`)
  }
  const node = parseEngineFloor(packageJson?.engines?.node, 'engines.node')
  const npm = parseEngineFloor(packageJson?.engines?.npm, 'engines.npm')
  const nvmNode = parseStableVersion(nvmrcSource.trim(), '.nvmrc').version
  if (nvmNode !== node) throw new Error(`.nvmrc (${nvmNode}) must match the package.json engines.node floor (${node})`)

  const packageManager = packageJson?.packageManager
  const packageManagerMatch = typeof packageManager === 'string' ? /^npm@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(packageManager) : null
  if (!packageManagerMatch) throw new Error('package.json packageManager must pin npm as npm@x.y.z')
  if (packageManagerMatch[1] !== npm) {
    throw new Error(`package.json packageManager (${packageManagerMatch[1]}) must match the engines.npm floor (${npm})`)
  }
  return { node, npm }
}

export function readRepositoryToolchain() {
  return parseToolchainMetadata(readFileSync(packageJsonPath, 'utf8'), readFileSync(nvmrcPath, 'utf8'))
}

function assertMinimumVersion(label, version, minimum, allowLeadingV = false) {
  const parsed = parseStableVersion(version, label, allowLeadingV).numbers
  const floor = parseStableVersion(minimum, `${label} minimum`).numbers
  for (let index = 0; index < floor.length; index += 1) {
    if (parsed[index] > floor[index]) return
    if (parsed[index] < floor[index]) throw new Error(`${label} >=${minimum} is required (found ${version})`)
  }
}

function removeFinalLineEnding(output) {
  if (output.endsWith('\r\n')) return output.slice(0, -2)
  if (output.endsWith('\n') || output.endsWith('\r')) return output.slice(0, -1)
  return output
}

export function readNpmOutput(args, options = {}) {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const invocation = options.npmCliPath
    ? {
        file: process.execPath,
        args: [validateAbsoluteSingleLinePath(options.npmCliPath, 'npm CLI path', platform), ...args],
        shell: false,
      }
    : resolveCommandInvocation('npm', args, platform, env)
  const result = spawnSync(invocation.file, invocation.args, {
    encoding: 'utf8',
    env,
    shell: invocation.shell,
    windowsHide: true,
  })
  const command = `npm ${args.join(' ')}`
  if (result.error) throw new Error(`Cannot run ${command}: ${result.error.message}`)
  if (result.status !== 0) {
    const detail = result.stderr?.trim()
    throw new Error(`${command} failed with exit code ${result.status ?? `signal ${result.signal}`}${detail ? `: ${detail}` : ''}`)
  }
  const output = removeFinalLineEnding(result.stdout ?? '')
  if (!output) throw new Error(`${command} returned no output`)
  return output
}

export function readNpmVersion(options = {}) {
  return readNpmOutput(['--version'], options)
}

export function assertSupportedNode(version = process.version, toolchain = readRepositoryToolchain()) {
  assertMinimumVersion('Node.js', version, toolchain.node, true)
}

export function assertSupportedNpm(version = readNpmVersion(), toolchain = readRepositoryToolchain()) {
  assertMinimumVersion('npm', version, toolchain.npm)
}

export function assertSupportedToolchain(options = {}) {
  const toolchain = options.toolchain ?? readRepositoryToolchain()
  const nodeVersion = options.nodeVersion ?? process.version
  const npmVersion = options.npmVersion ?? readNpmVersion(options)
  assertSupportedNode(nodeVersion, toolchain)
  assertSupportedNpm(npmVersion, toolchain)
  return { node: nodeVersion, npm: npmVersion, minimum: toolchain }
}

function requireNonEmpty(env, names, label) {
  const missing = names.filter((name) => !env[name]?.trim())
  if (missing.length) throw new Error(`${label} credentials are incomplete; missing ${missing.join(', ')}`)
}

export function validateReleaseCredentials(env = process.env, options = {}) {
  const { checkApiKeyFile = true } = options
  requireNonEmpty(env, ['RELEASE_SIGNING_TEAM_ID'], 'Developer ID signing')
  requireNonEmpty(env, ['CSC_LINK', 'CSC_KEY_PASSWORD'], 'Developer ID signing')

  const appleIdNames = ['APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
  const apiKeyNames = ['APPLE_API_KEY', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER']
  const hasAppleIdValue = appleIdNames.some((name) => env[name]?.trim())
  const hasApiKeyValue = apiKeyNames.some((name) => env[name]?.trim())
  if (hasAppleIdValue === hasApiKeyValue) {
    throw new Error('Provide exactly one complete notarization credential set: Apple ID or App Store Connect API key')
  }
  const selected = hasAppleIdValue ? appleIdNames : apiKeyNames
  requireNonEmpty(env, selected, 'Notarization')
  if (hasAppleIdValue && env.APPLE_TEAM_ID !== env.RELEASE_SIGNING_TEAM_ID) {
    throw new Error('APPLE_TEAM_ID must match RELEASE_SIGNING_TEAM_ID')
  }
  if (hasApiKeyValue && checkApiKeyFile && !existsSync(env.APPLE_API_KEY)) {
    throw new Error(`APPLE_API_KEY does not exist: ${env.APPLE_API_KEY}`)
  }
  if (hasApiKeyValue && checkApiKeyFile) accessSync(env.APPLE_API_KEY, constants.R_OK)
}

export function validateWindowsReleaseCredentials(env = process.env) {
  requireNonEmpty(env, ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD'], 'Windows Authenticode signing')
}

export function requireReleaseArtifacts(paths) {
  const artifacts = { dmg: [], zip: [] }
  for (const path of paths) {
    if (path.endsWith('.dmg')) artifacts.dmg.push(path)
    if (path.endsWith('.zip')) artifacts.zip.push(path)
  }
  for (const [extension, matches] of Object.entries(artifacts)) {
    if (matches.length !== 1) throw new Error(`Expected exactly one ${extension.toUpperCase()} artifact, found ${matches.length}`)
  }
  return { dmg: artifacts.dmg[0], zip: artifacts.zip[0] }
}

export function artifactArchitectures(path) {
  const architecture = /-(arm64|x64|universal)\.(?:dmg|zip)$/.exec(path)?.[1]
  if (!architecture) throw new Error(`Artifact name does not declare a supported architecture: ${path}`)
  if (architecture === 'arm64') return new Set(['arm64'])
  if (architecture === 'x64') return new Set(['x86_64'])
  return new Set(['arm64', 'x86_64'])
}

export function assertExactArchitectures(actual, expected, label) {
  const missing = [...expected].filter((architecture) => !actual.has(architecture))
  const unexpected = [...actual].filter((architecture) => !expected.has(architecture))
  if (missing.length || unexpected.length) {
    throw new Error(`${label} architectures do not match its artifact name (expected ${[...expected].join(', ')}, found ${[...actual].join(', ')})`)
  }
}

export function parseTeamIdentifier(output) {
  return /^TeamIdentifier=(.+)$/m.exec(output)?.[1]?.trim()
}

export function parseArchitectures(output) {
  return new Set(output.trim().split(/\s+/).filter(Boolean))
}

export function assertArchitectureCoverage(appArchitectures, nativeArchitectures, label) {
  const missing = [...appArchitectures].filter((architecture) => !nativeArchitectures.has(architecture))
  if (missing.length) throw new Error(`${label} is missing app architecture(s): ${missing.join(', ')}`)
}

export function assertAsarLayout(entries) {
  const normalized = new Set(entries.map((entry) => entry.replaceAll('\\', '/').replace(/^\//, '')))
  const required = [
    'out/main/index.js',
    'out/preload/index.js',
    'out/renderer/index.html',
    'node_modules/node-pty/lib/index.js',
    'node_modules/zeromq/lib/index.js',
    'node_modules/zeromq/build/manifest.json',
  ]
  const missing = required.filter((entry) => !normalized.has(entry))
  if (missing.length) throw new Error(`ASAR is missing required runtime entries: ${missing.join(', ')}`)
  const forbiddenPrefixes = ['node_modules/@xterm/', 'node_modules/lucide-react/', 'node_modules/react/', 'node_modules/react-dom/', 'node_modules/react-markdown/', 'node_modules/remark-gfm/']
  const forbidden = [...normalized].find((entry) => forbiddenPrefixes.some((prefix) => entry.startsWith(prefix)))
  if (forbidden) throw new Error(`Renderer-only dependency was duplicated into the ASAR: ${forbidden}`)
}

export function assertPackagedExtensions(resourcesDirectory) {
  const extensionsDirectory = join(resourcesDirectory, 'extensions')
  if (!existsSync(extensionsDirectory) || !lstatSync(extensionsDirectory).isDirectory()) {
    throw new Error(`Packaged application must contain a resources/extensions directory: ${extensionsDirectory}`)
  }
  const entries = readdirSync(extensionsDirectory, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort()
  const nonFiles = entries
    .filter((entry) => !entry.isFile())
    .map((entry) => entry.name)
    .sort()
  const expected = [...SHIPPED_EXTENSION_FILENAMES].sort()
  const missing = expected.filter((name) => !files.includes(name))
  const extra = files.filter((name) => !expected.includes(name))
  if (missing.length || extra.length || nonFiles.length) {
    throw new Error(`Unexpected packaged extension layout (missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}; non-file: ${nonFiles.join(', ') || 'none'})`)
  }
}

const pinsPath = fileURLToPath(new URL('./dependency-pins.json', import.meta.url))

export function readShippedAgentPin(path = pinsPath) {
  const shipped = JSON.parse(readFileSync(path, 'utf8'))?.artifacts?.['vclawhub-agent']?.shipped
  if (!shipped || typeof shipped.path !== 'string' || !/^[0-9a-f]{64}$/.test(shipped.sha256 ?? '') || !Number.isSafeInteger(shipped.size) || shipped.size <= 0) {
    throw new Error('dependency-pins.json is missing artifacts.vclawhub-agent.shipped {path, sha256, size}')
  }
  return shipped
}

/**
 * Verifies the extension the app will actually inject against the pinned digest.
 *
 * assertPackagedExtensions above proves the LAYOUT (every expected filename present, no
 * extras); it cannot see content. A stale or wrong bundle under the right filename passed
 * every gate until this existed — the pin gate compares repo bytes to the archive, and the
 * package verifier never opened the shipped file.
 */
export function assertPackagedExtensionContent(resourcesDirectory, shipped, readFile = readFileSync) {
  const name = basename(shipped.path)
  const packagedPath = join(resourcesDirectory, 'extensions', name)
  if (!existsSync(packagedPath)) {
    throw new Error(`Packaged application is missing the pinned extension ${name}: ${packagedPath}`)
  }
  const bytes = readFile(packagedPath)
  const digest = createHash('sha256').update(bytes).digest('hex')
  if (bytes.length !== shipped.size) {
    throw new Error(`Packaged extension ${name} is ${bytes.length} bytes; pinned ${shipped.size}`)
  }
  if (digest !== shipped.sha256) {
    throw new Error(`Packaged extension ${name} digest ${digest} does not match pinned ${shipped.sha256}`)
  }
  return { name, size: bytes.length, sha256: digest }
}

const NODE_PTY_UNPACKED_FILES = ['node_modules/node-pty/build/Release/pty.node', 'node_modules/node-pty/build/Release/spawn-helper']

const ZEROMQ_ARCHITECTURE_DIRECTORIES = new Map([
  ['arm64', 'arm64'],
  ['x86_64', 'x64'],
])

// Runtime-library directory names (for example, "libc-115-Release") encode
// the zeromq prebuild's toolchain and change across upgrades. An architecture
// may intentionally ship multiple ABI fallbacks, so match the bounded set
// without pinning the directory names.
export function expectedUnpackedNativeLayout(appArchitectures) {
  if (!appArchitectures.size) throw new Error('Packaged application architecture list is empty')
  const files = [...NODE_PTY_UNPACKED_FILES]
  const zeroMqAddons = []
  for (const architecture of [...appArchitectures].sort()) {
    const directory = ZEROMQ_ARCHITECTURE_DIRECTORIES.get(architecture)
    if (!directory) throw new Error(`Unsupported packaged application architecture: ${architecture}`)
    zeroMqAddons.push({
      label: `node_modules/zeromq/build/darwin/${directory}/node/*-Release/addon.node`,
      pattern: new RegExp(`^node_modules/zeromq/build/darwin/${directory}/node/[^/]+-Release/addon\\.node$`),
    })
  }
  return { files, zeroMqAddons }
}

function listUnpackedEntries(directory, prefix = '', found = { files: [], directories: [] }) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      found.directories.push(relativePath)
      listUnpackedEntries(join(directory, entry.name), relativePath, found)
    } else if (entry.isFile()) found.files.push(relativePath)
    else throw new Error(`Unpacked runtime contains a forbidden non-file entry: ${relativePath}`)
  }
  return found
}

function expectedDirectories(files) {
  const directories = new Set()
  for (const file of files) {
    const segments = file.split('/')
    for (let end = 1; end < segments.length; end += 1) directories.add(segments.slice(0, end).join('/'))
  }
  return directories
}

export function assertUnpackedNativeLayout(unpackedDirectory, appArchitectures, readArchitectures) {
  const { files, zeroMqAddons } = expectedUnpackedNativeLayout(appArchitectures)
  const actual = listUnpackedEntries(unpackedDirectory)
  const missing = files.filter((path) => !actual.files.includes(path))
  if (missing.length) throw new Error(`Missing unpacked native runtime file(s): ${missing.join(', ')}`)
  const expected = [...files]
  for (const { label, pattern } of zeroMqAddons) {
    const matches = actual.files.filter((path) => pattern.test(path))
    if (!matches.length) throw new Error(`Expected at least one unpacked ZeroMQ addon matching ${label}, found 0`)
    expected.push(...matches)
  }
  const expectedSet = new Set(expected)
  const allowedDirectories = expectedDirectories(expected)
  const extra = [...actual.files.filter((path) => !expectedSet.has(path)), ...actual.directories.filter((path) => !allowedDirectories.has(path))]
  if (extra.length) throw new Error(`Unexpected unpacked path(s): ${extra.join(', ')}`)

  for (const relativePath of expected) {
    const architectures = readArchitectures(join(unpackedDirectory, relativePath))
    assertArchitectureCoverage(appArchitectures, architectures, relativePath)
  }
}

const ARTIFACT_ARCHITECTURES = new Set(['arm64', 'x64', 'universal'])

/**
 * The member segment an artifact name claims, or null for the generic product name.
 *
 * Parsed from the RIGHT: a member id may itself contain hyphens, the architecture may not.
 * `VizMaster-1.1.17-arm64.dmg` -> null; `VizMaster-1.1.17-vizmaster-arm64.dmg` -> 'vizmaster'.
 */
export function artifactMemberSegment(filename) {
  const match = new RegExp(`^${escapeArtifactPrefix(productArtifactPrefix())}-\\d+\\.\\d+\\.\\d+-(.+)\\.(?:dmg|zip|exe|AppImage)$`).exec(filename)
  if (!match) throw new Error(`Unrecognised artifact name: ${filename}`)
  const segments = match[1].split('-')
  const architecture = segments.pop()
  if (!ARTIFACT_ARCHITECTURES.has(architecture)) throw new Error(`Unrecognised architecture in artifact name: ${filename}`)
  return segments.length ? segments.join('-') : null
}

/**
 * Proves the packaged app IS the product its filename claims.
 *
 * Two independent facts, both required: the build ships a valid profile, and that profile's id
 * matches the name. Without this a member-named artifact could carry the generic profile (users
 * would get no seeded project and three harnesses) or a generic name could hide a branded build.
 */
export function assertPackagedProductProfile(resourcesDirectory, artifactName) {
  const path = join(resourcesDirectory, 'product.json')
  if (!existsSync(path)) throw new Error(`${artifactName ?? 'package'} must ship Resources/product.json; the build carries no product profile`)
  const profile = validateProductProfile(JSON.parse(readFileSync(path, 'utf8')), 'packaged', path)
  if (artifactName === null || artifactName === undefined) return profile
  const claimed = artifactMemberSegment(artifactName)
  if (claimed === null && profile.id !== 'vclaw') {
    throw new Error(`${artifactName} is named as the generic product but carries profile id "${profile.id}"`)
  }
  if (claimed !== null && claimed !== profile.id) {
    throw new Error(`${artifactName} is named for member "${claimed}" but carries profile id "${profile.id}"`)
  }
  return profile
}
