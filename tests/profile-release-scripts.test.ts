import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { artifactMemberSegment, assertPackagedProductProfile } from '../scripts/release/lib.mjs'

const GENERIC = { profileVersion: 1, id: 'vclaw', harnesses: ['omp', 'prime', 'pi'] }
const MEMBER = {
  profileVersion: 1,
  id: 'vizmaster',
  harnesses: ['omp'],
  defaultProject: { name: 'VizMaster', from: 'vendor/vizmaster', to: '~/VizMaster', version: '1.0.0+20261029.7263596' },
}

function resources(product: unknown | null): { path: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'vclaw-product-'))
  if (product !== null) writeFileSync(join(root, 'product.json'), typeof product === 'string' ? product : JSON.stringify(product))
  return { path: root, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

describe('artifactMemberSegment', () => {
  test('reads the member from the right, because a member id may contain hyphens', () => {
    expect(artifactMemberSegment('VizMaster-1.1.17-arm64.dmg')).toBeNull()
    expect(artifactMemberSegment('VizMaster-1.1.17-vizmaster-arm64.dmg')).toBe('vizmaster')
    expect(artifactMemberSegment('VizMaster-1.1.17-some-member-x64.zip')).toBe('some-member')
    expect(artifactMemberSegment('VizMaster-1.1.17-arm64.zip')).toBeNull()
  })

  test('refuses names it cannot read rather than guessing', () => {
    // The bug this replaces: a naive regex captured "arm64" as the member segment, so every
    // GENERIC artifact suddenly looked member-named and the verifier threw on a good build.
    expect(() => artifactMemberSegment('VizMaster-1.1.17.dmg')).toThrow(/Unrecognised artifact name/)
    expect(() => artifactMemberSegment('VizMaster-1.1.17-vizmaster-mips.dmg')).toThrow(/Unrecognised architecture/)
  })
})

describe('assertPackagedProductProfile', () => {
  test('accepts a generic build whose profile agrees with its name', () => {
    const { path, cleanup } = resources(GENERIC)
    try {
      expect(assertPackagedProductProfile(path, 'VizMaster-1.1.17-arm64.dmg').id).toBe('vclaw')
    } finally {
      cleanup()
    }
  })

  test('accepts a member build whose profile agrees with its name', () => {
    const { path, cleanup } = resources(MEMBER)
    try {
      expect(assertPackagedProductProfile(path, 'VizMaster-1.1.17-vizmaster-arm64.dmg').id).toBe('vizmaster')
    } finally {
      cleanup()
    }
  })

  test('refuses a member-named artifact carrying the generic profile', () => {
    const { path, cleanup } = resources(GENERIC)
    try {
      expect(() => assertPackagedProductProfile(path, 'VizMaster-1.1.17-vizmaster-arm64.dmg')).toThrow(/named for member "vizmaster" but carries profile id "vclaw"/)
    } finally {
      cleanup()
    }
  })

  test('refuses a generic-named artifact hiding a branded build', () => {
    const { path, cleanup } = resources(MEMBER)
    try {
      expect(() => assertPackagedProductProfile(path, 'VizMaster-1.1.17-arm64.dmg')).toThrow(/generic product but carries profile id "vizmaster"/)
    } finally {
      cleanup()
    }
  })

  test('a packaged app without a profile is a failure, not a default', () => {
    const { path, cleanup } = resources(null)
    try {
      expect(() => assertPackagedProductProfile(path, 'VizMaster-1.1.17-arm64.dmg')).toThrow(/must ship Resources\/product.json/)
    } finally {
      cleanup()
    }
  })

  test('a malformed profile fails with the validator reason', () => {
    const { path, cleanup } = resources({ profileVersion: 1, id: 'Bad Id', harnesses: ['omp'] })
    try {
      expect(() => assertPackagedProductProfile(path, 'VizMaster-1.1.17-arm64.dmg')).toThrow(/Invalid product profile/)
    } finally {
      cleanup()
    }
  })
})
