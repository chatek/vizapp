import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// The agent SDK reaches the app PRE-PACKAGED: nothing installs it at runtime, so the
// vendored archive and the shipped extension bundle are one pair. Both digests are pinned
// in dependency-pins.json and the shipped bundle must be the archive member renamed, never
// rebuilt — agent-sdk accepted the surface in that exact file, and a quiet rebuild would
// ship a surface nobody accepted. Kept as a module (not inline in the release script)
// because the release-coverage family counts scripts/release, so these lines are exercised
// by the test suite rather than widening an uncovered file.

const PIN_FILE = 'scripts/release/dependency-pins.json'
const PIN_KEY = 'vclawhub-agent'

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function readAgentPin(root) {
  const pins = JSON.parse(readFileSync(join(root, PIN_FILE), 'utf8'))
  const pin = pins?.artifacts?.[PIN_KEY]
  if (!pin?.path || !pin?.sha256 || !pin?.shipped?.path) throw new Error(`dependency-pins.json is missing artifacts.${PIN_KEY}`)
  return pin
}

export function assertPinned(label, path, sha256Hex, size) {
  const actualSha256 = sha256File(path)
  if (actualSha256 !== sha256Hex) throw new Error(`${label} checksum mismatch: ${path} is ${actualSha256}`)
  const actualSize = statSync(path).size
  if (actualSize !== size) throw new Error(`${label} size mismatch: ${path} is ${actualSize} bytes, pinned ${size}`)
}

/**
 * Verifies the pinned agent artifact and proves the shipped bundle is its archive member.
 * A caller that already knows the pin (a fixture) may pass it to check a different tree.
 */
export function verifyVendorAgentPins(root, { pin = readAgentPin(root) } = {}) {
  const archive = join(root, pin.path)
  const shipped = join(root, pin.shipped.path)
  assertPinned('Vendored agent archive', archive, pin.sha256, pin.size)
  assertPinned('Shipped agent bundle', shipped, pin.shipped.sha256, pin.shipped.size)

  const work = mkdtempSync(join(tmpdir(), 'vclaw-vendor-agent-'))
  try {
    const extraction = spawnSync('tar', ['-xzf', archive, '-C', work], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false })
    if (extraction.error) throw extraction.error
    if (extraction.status !== 0) throw new Error(`tar -xzf ${pin.path} failed: ${(extraction.stderr || extraction.stdout).trim()}`)
    // A rebuild can rename the member as well as change it, so absence is the same
    // defect: the shipped bundle is no longer the file agent-sdk accepted.
    const member = join(work, pin.shipped.from)
    if (!existsSync(member) || sha256File(member) !== pin.shipped.sha256) {
      throw new Error(`Shipped bundle is not the vendored archive member: ${pin.shipped.path}`)
    }
  } finally {
    rmSync(work, { recursive: true, force: true })
  }

  return { version: pin.version, archive: pin.path, shipped: pin.shipped.path, sha256: pin.shipped.sha256 }
}

// Entry point. A module with no main guard exits 0 having checked nothing, which reads
// as a green gate to anyone who runs it directly — measured 2026-10-31, when
// `node scripts/release/vendor-agent-pins.mjs` printed nothing and succeeded against a
// stale archive. Tests cover this path so it cannot silently regress to a no-op.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(import.meta.dirname, '../..')
  try {
    const verified = verifyVendorAgentPins(root)
    console.log(`${verified.archive} -> ${verified.shipped}: pinned digests match and the archive member is byte-identical (${verified.sha256.slice(0, 12)}…)`)
  } catch (error) {
    console.error(`agent artifact pin verification failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
