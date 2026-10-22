import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { MEMBER_SEAMS_V1, verifyMemberSeams } from '../scripts/release/member-seams.mjs'

// Member integration seam contract: an upstream merge that renames an anchor a
// member build integrates against must turn red HERE, at merge time, not in a
// member's build at the next pin bump. See FORK.md ("Member integration seam
// contract") and scripts/release/member-seams.mjs for the change rules.

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('member integration seam contract v1', () => {
  test('every v1 anchor is present in this tree', () => {
    const report = verifyMemberSeams(ROOT)
    expect(report.ok, JSON.stringify(report.results.filter((row) => !row.ok), null, 2)).toBe(true)
  })

  test('contract declares the version and at least one consumer', () => {
    expect(MEMBER_SEAMS_V1.version).toBe(1)
    expect(MEMBER_SEAMS_V1.consumers.length).toBeGreaterThan(0)
  })
})
