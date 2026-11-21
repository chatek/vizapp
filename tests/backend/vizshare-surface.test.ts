import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { verifyVizshareSurface } from '../../scripts/release/verify-vizshare-surface.mjs'

const roots: string[] = []

function fixture(contents: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'vizshare-surface-'))
  roots.push(root)
  for (const [relative, body] of Object.entries(contents)) {
    const path = join(root, relative)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, body)
  }
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('verifyVizshareSurface', () => {
  it('fails when the replayed shared-tree state is present (files deleted)', () => {
    const root = fixture({
      'electron/main/vizshare/broker.ts': 'no route here\n',
      'electron/main/vizshare/index.ts': '\n',
    })
    const result = verifyVizshareSurface(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('agent-assertion-store.ts')
    expect(result.problems.join('\n')).toContain('agent-token-source.ts')
  })

  it('fails when the broker route was reverted but the files exist', () => {
    const root = fixture({
      'electron/main/vizshare/agent-assertion-store.ts': 'store\n',
      'electron/main/vizshare/agent-token-source.ts': 'export const PREFER_AGENT_ASSERTION = true\n',
      'electron/main/vizshare/broker.ts': '// no push route\n',
    })
    const result = verifyVizshareSurface(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('/v1/agent-assertion')
  })

  it('fails when the dual-mode switch is gone from the token source', () => {
    const root = fixture({
      'electron/main/vizshare/agent-assertion-store.ts': 'store\n',
      'electron/main/vizshare/agent-token-source.ts': 'export const OTHER = 1\n',
      'electron/main/vizshare/broker.ts': "route('/v1/agent-assertion')\n",
    })
    const result = verifyVizshareSurface(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('PREFER_AGENT_ASSERTION')
  })

  it('passes on the landed surface', () => {
    const root = fixture({
      'electron/main/vizshare/agent-assertion-store.ts': 'store\n',
      'electron/main/vizshare/agent-token-source.ts': 'export const PREFER_AGENT_ASSERTION = true\n',
      'electron/main/vizshare/broker.ts': "route('/v1/agent-assertion')\n",
    })
    expect(verifyVizshareSurface(root)).toEqual({ ok: true, problems: [] })
  })
})
