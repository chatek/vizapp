import { describe, expect, it } from 'vitest'
import {
  RETENTION_GATEWAY_DROPPED,
  RETENTION_NOT_CAPTURED,
  retentionLossLine,
  retentionRows,
} from '../../src/lib/inbox-retention'
import type { VclawInboxMessage } from '../../src/types/api'

// The two sets retention-diverge in BOTH directions: gateway 7 days, local spool 2,000
// lines with no TTL. Neither is 'the truth' about the other, and no divergence may
// render as an empty list.

const rec = (seq: number, subject = `s${seq}`): VclawInboxMessage => ({ kind: 'message', seq, subject, body: `b${seq}` })

describe('retention divergence — three states, none of them empty', () => {
  it('(1) a server row absent locally says "not captured locally"', () => {
    const { rows } = retentionRows({ local: [rec(1)], server: [rec(1), rec(2)] })
    const missing = rows.find((row) => row.seq === 2)
    expect(missing?.presence).toBe('server-only')
    expect(missing?.note).toBe(RETENTION_NOT_CAPTURED)
  })

  it('(2) a local row absent on the gateway says the gateway no longer has it — never that it still does', () => {
    const { rows } = retentionRows({ local: [rec(1), rec(2), rec(3)], server: [rec(3)] })
    const dropped = rows.filter((row) => row.seq < 3)
    expect(dropped.map((row) => row.note)).toEqual([RETENTION_GATEWAY_DROPPED, RETENTION_GATEWAY_DROPPED])
    // the row is still rendered — nothing vanishes because the gateway forgot it
    expect(rows.map((row) => row.seq)).toEqual([1, 2, 3])
  })

  it('(3) neither, plus expiredThrough: a persistent loss line AND the rows are kept', () => {
    const { rows, lossLine } = retentionRows({ local: [rec(7)], server: [rec(7)], expiredThrough: 6 })
    expect(lossLine).toContain('Gone for good up to seq 6')
    expect(rows.map((row) => row.seq)).toEqual([7])
  })

  it('no expiredThrough means no loss line', () => {
    expect(retentionLossLine(undefined)).toBeUndefined()
    expect(retentionRows({ local: [rec(1)] }).lossLine).toBeUndefined()
  })
})

describe('the trap: an unfetched server set is UNKNOWN, not empty', () => {
  it('claims nothing about the gateway when server data has not been fetched', () => {
    const { rows } = retentionRows({ local: [rec(1), rec(2)] })
    expect(rows.map((row) => row.note)).toEqual([undefined, undefined])
    expect(rows.map((row) => row.presence)).toEqual(['local-only', 'local-only'])
  })

  it('treats rows present in both sets as agreeing (no note)', () => {
    const { rows } = retentionRows({ local: [rec(1)], server: [rec(1)] })
    expect(rows[0].presence).toBe('both')
    expect(rows[0].note).toBeUndefined()
  })

  it('orders by seq across both sets regardless of which side supplied the row', () => {
    const { rows } = retentionRows({ local: [rec(1), rec(4)], server: [rec(2), rec(4)] })
    expect(rows.map((row) => row.seq)).toEqual([1, 2, 4])
  })
})
