import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertPinned, parsePinnedRows, readAgentPin, verifyVendorAgentPins } from '../scripts/release/vendor-agent-pins.mjs'

// vclaw-desktop consumes agent-sdk PRE-PACKAGED — the join pipe is not part of its
// install path — so the vendored archive and the injected bundle are the whole
// dependency. Without these assertions an artifact could be swapped, rebuilt, or left
// stale against the vendor note and every other check would still pass.
const root = process.cwd()
const pin = readAgentPin(root)
const scratchDirectories: string[] = []

function scratchDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'vclaw-agent-pin-'))
  scratchDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('vendored agent artifact pins', () => {
  it('verifies the archive and proves the shipped bundle is its member', () => {
    const verified = verifyVendorAgentPins(root)
    expect(verified).toEqual({
      version: pin.version,
      archive: pin.path,
      shipped: 'assets/extensions/vclaw-agent.js',
      sha256: pin.shipped.sha256,
    })
  })

  it('reports a checksum mismatch when the shipped bundle bytes change', () => {
    const tampered = join(scratchDirectory(), 'vclaw-agent.js')
    writeFileSync(tampered, `${readFileSync(join(root, pin.shipped.path), 'utf8')}\n// tampered\n`)
    expect(() => assertPinned('Shipped agent bundle', tampered, pin.shipped.sha256, pin.shipped.size)).toThrow(/checksum mismatch/)
  })

  it('reports a size mismatch when a pinned size goes stale', () => {
    expect(() => assertPinned('Shipped agent bundle', join(root, pin.shipped.path), pin.shipped.sha256, pin.shipped.size - 1))
      .toThrow(/size mismatch/)
  })

  it('refuses a shipped bundle that is not the archive member', () => {
    // A rebuild would keep the filename and change the bytes; this is the branch that
    // catches it, because extraction — not trust — decides membership.
    const rebuilt = { ...pin, shipped: { ...pin.shipped, from: 'package/dist/pi-extension/absent.js' } }
    expect(() => verifyVendorAgentPins(root, { pin: rebuilt })).toThrow(/not the vendored archive member/)
  })

  it('refuses a pins file that does not pin the agent artifact', () => {
    const directory = scratchDirectory()
    mkdirSync(join(directory, 'scripts/release'), { recursive: true })
    writeFileSync(join(directory, 'scripts/release/dependency-pins.json'), JSON.stringify({ artifacts: {} }))
    expect(() => readAgentPin(directory)).toThrow(/missing artifacts\.vclawhub-agent/)
  })

  it('parses every pinned row so byte counts are checked, not just digests', () => {
    const rows = parsePinnedRows(readFileSync(join(root, `vendor/vclawhub-agent-${pin.version}.md`), 'utf8'))
    expect(rows.map((row) => row.member)).toEqual([
      'package/dist/pi-extension/index.bundled.js',
      'package/dist/ext-synadia/index.bundled.js',
      'package/dist/cli.js',
      'package/dist/arc/index.js',
    ])
    expect(rows.every((row) => Number.isInteger(row.bytes) && row.bytes > 0)).toBe(true)
    expect(rows.every((row) => /^[0-9a-f]{16,64}$/.test(row.sha256))).toBe(true)
  })

  it('fails when a pinned row’s byte count disagrees with the archive', () => {
    // The measured 2026-10-31 defect: right digest, stale count, invisible to a gate that
    // only checked the shipped bundle's row.
    const tree = scratchDirectory()
    mkdirSync(join(tree, 'scripts', 'release'), { recursive: true })
    mkdirSync(join(tree, 'vendor'), { recursive: true })
    mkdirSync(join(tree, 'assets', 'extensions'), { recursive: true })
    copyFileSync(join(root, pin.path), join(tree, pin.path))
    copyFileSync(join(root, pin.shipped.path), join(tree, pin.shipped.path))
    const note = readFileSync(join(root, `vendor/vclawhub-agent-${pin.version}.md`), 'utf8')
      .replace(/(\| `dist\/cli\.js` \| )([\d,]+)( \|)/, (_, head, size, tail) => `${head}${Number(size.replaceAll(',', '')) + 1}${tail}`)
    writeFileSync(join(tree, `vendor/vclawhub-agent-${pin.version}.md`), note)
    writeFileSync(join(tree, 'scripts', 'release', 'dependency-pins.json'), JSON.stringify({ artifacts: { 'vclawhub-agent': pin } }))
    expect(() => verifyVendorAgentPins(tree)).toThrow(/size disagrees with the archive for package\/dist\/cli\.js/)
  })

  it('runs as a script and reports the digests it actually checked', () => {
    // Guards the measured hole: without a main guard the module exits 0 having checked
    // nothing, which everyone reading the exit code takes as a green gate.
    const result = spawnSync(process.execPath, ['scripts/release/vendor-agent-pins.mjs'], { cwd: root, encoding: 'utf8' })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('byte-identical')
    expect(result.stdout).toContain(pin.path)
    expect(result.stdout).toContain(pin.shipped.sha256.slice(0, 12))
  })

  it('keeps the vendor note and the machine pin describing the same build', () => {
    const note = readFileSync(join(root, `vendor/vclawhub-agent-${pin.version}.md`), 'utf8')
    expect(note).toContain(pin.sha256)
    // The note abbreviates the extension digest in its pinned-contents row.
    expect(note).toContain(pin.shipped.sha256.slice(0, 16))
    // Doc-vs-pin, both directions (desktop-lane B2 extension): a doc bump without
    // an artefact bump — or the reverse — must fail here, because the .md rows
    // and dependency-pins.json describe the same bytes or one of them is lying.
    expect(note).toContain(pin.shipped.sha256)
    expect(note).toContain(Number(pin.shipped.size).toLocaleString('en-US'))
    expect(note).toContain(Number(pin.size).toLocaleString('en-US'))
  })
})
