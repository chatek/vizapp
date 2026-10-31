import { describe, expect, it } from 'vitest'
import {
  buildSnapshot,
  classifyState,
  describeInboxState,
  findSpoolPath,
  INBOX_STATE_LABEL,
  lastSeqOf,
  mergeSpool,
  parseSpool,
  selfPrefix,
  type VclawInboxMessage,
} from '../../electron/main/inbox-spool'
import { VclawInboxService } from '../../electron/main/inbox-service'

// The frozen contract (agent-sdk pin bf1e237f): <.vclaw/inbox/<tenant>__<self8>.jsonl>,
// kind-first records, monotonic seq per file, and THREE state labels — never 'complete'.

const record = (seq: number, extra: Partial<VclawInboxMessage> = {}): VclawInboxMessage => ({
  kind: 'message',
  seq,
  id: `id-${seq}`,
  ts: `2026-10-31T0${seq}:00:00.000Z`,
  from: 'UBN5HKOLCWNK',
  fromName: 'asserted-name',
  subject: `subject ${seq}`,
  body: `body ${seq}`,
  ...extra,
})

const NKEY = 'UBYYRKJHZGXATWKWZRYT5VI6AG5YEL2U2QERQDAJP4EH7TVGEXT2JK5F'
const SELF8 = 'UBYYRKJH'

describe('inbox state vocabulary', () => {
  it('has exactly three states and never "complete"', () => {
    const states = [
      classifyState(false, false),
      classifyState(true, false),
      classifyState(true, true),
    ]
    expect(new Set(states)).toEqual(new Set(['unavailable', 'cached', 'live']))
    for (const state of states) expect(state).not.toBe('complete')
  })

  it('is unavailable without an identity, cached with one and no session, live while a session is open', () => {
    expect(classifyState(false, false)).toBe('unavailable')
    expect(classifyState(false, true)).toBe('unavailable') // no identity wins
    expect(classifyState(true, false)).toBe('cached')
    expect(classifyState(true, true)).toBe('live')
  })
})

describe('spool reading', () => {
  it('parses kind-first records and skips malformed or seq-less lines', () => {
    const text = [
      '{"kind":"message","seq":2,"subject":"b"}',
      'not json at all',
      '{"kind":"message"}',
      '{"kind":"message","seq":1,"subject":"a"}',
      '',
    ].join('\n')
    const messages = parseSpool(text)
    expect(messages.map((m) => m.seq)).toEqual([1, 2])
    expect(messages[0].kind).toBe('message')
  })

  it('derives self8 as the first eight nkey characters', () => {
    expect(selfPrefix(NKEY)).toBe(SELF8)
  })

  it('finds the spool by directory scan, not by composing the tenant', () => {
    const files = ['vclaw__UBNBJ35N.jsonl', `vclaw__${SELF8}.jsonl`, 'other__XXXXXXXX.jsonl']
    const found = findSpoolPath(() => files, '/home/x', SELF8)
    expect(found).toBe(`/home/x/.vclaw/inbox/vclaw__${SELF8}.jsonl`)
    expect(findSpoolPath(() => ['vclaw__UBNBJ35N.jsonl'], '/home/x', SELF8)).toBeNull()
  })
})

describe('row 3 — a replaced or truncated spool never loses a row', () => {
  it('unions by seq so a shorter rewritten file cannot erase what was shown', () => {
    const shown = [record(1), record(2), record(3)]
    const replacedWithCopy = [record(1)]
    const merged = mergeSpool(shown, replacedWithCopy)
    expect(merged.map((m) => m.seq)).toEqual([1, 2, 3])
    expect(lastSeqOf(merged)).toBe(3)
  })

  it('advances with new rows and de-duplicates by seq', () => {
    const merged = mergeSpool([record(1), record(2)], [record(2, { subject: 'edited' }), record(3)])
    expect(merged.map((m) => m.seq)).toEqual([1, 2, 3])
    expect(merged[1].subject).toBe('edited')
  })
})

describe('service snapshots', () => {
  function serviceWith(files: Record<string, string>, sessionOpen: () => boolean) {
    const directory = '/home/test'
    return new VclawInboxService({
      home: directory,
      isSessionOpen: sessionOpen,
      readFile: (path: string) => {
        if (path.endsWith('credentials.json')) return JSON.stringify({ nkey: NKEY })
        const contents = files[path]
        if (contents === undefined) throw new Error(`ENOENT ${path}`)
        return contents
      },
      listDirectory: () => [`vclaw__${SELF8}.jsonl`],
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
  }

  it('row 1 — a record landing while the pane is open appears on the next refresh', () => {
    const files: Record<string, string> = { [`/home/test/.vclaw/inbox/vclaw__${SELF8}.jsonl`]: '' }
    const service = serviceWith(files, () => true)
    expect(service.snapshot().messages).toHaveLength(0)
    files[`/home/test/.vclaw/inbox/vclaw__${SELF8}.jsonl`] = `${JSON.stringify(record(1))}\n`
    const next = service.refresh()
    expect(next.messages.map((m) => m.seq)).toEqual([1])
    expect(next.state).toBe('live')
    expect(next.unread).toBe(1)
  })

  it('row 2 — spooled while closed reads cached, then live once a session opens', () => {
    let open = false
    const files: Record<string, string> = {
      [`/home/test/.vclaw/inbox/vclaw__${SELF8}.jsonl`]: `${JSON.stringify(record(1))}\n${JSON.stringify(record(2))}\n`,
    }
    const service = serviceWith(files, () => open)
    expect(service.refresh().state).toBe('cached')
    open = true
    const live = service.refresh()
    expect(live.state).toBe('live')
    expect(live.messages).toHaveLength(2)
  })

  it('row 3 — a spool replaced by a shorter copy keeps the already-rendered rows', () => {
    const path = `/home/test/.vclaw/inbox/vclaw__${SELF8}.jsonl`
    const files: Record<string, string> = {
      [path]: `${JSON.stringify(record(1))}\n${JSON.stringify(record(2))}\n`,
    }
    const service = serviceWith(files, () => true)
    expect(service.refresh().messages).toHaveLength(2)
    files[path] = `${JSON.stringify(record(1))}\n`
    const after = service.refresh()
    expect(after.messages.map((m) => m.seq)).toEqual([1, 2])
    expect(after.lastSeq).toBe(2)
  })

  it('row 4 — no identity reports unavailable and offers no spool path', () => {
    const service = new VclawInboxService({
      home: '/home/empty',
      isSessionOpen: () => true,
      readFile: () => {
        throw new Error('ENOENT')
      },
      listDirectory: () => [],
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
    const snapshot = service.refresh()
    expect(snapshot.state).toBe('unavailable')
    expect(snapshot.spoolPath).toBe('')
  })

  it('from/fromName travel as asserted values, untouched', () => {
    const snapshot = buildSnapshot({
      hasIdentity: true,
      sessionOpen: true,
      spoolPath: '/x',
      messages: [record(1, { from: 'UBN5HKOLCWNK', fromName: 'claimed-name' })],
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
    expect(snapshot.messages[0].from).toBe('UBN5HKOLCWNK')
    expect(snapshot.messages[0].fromName).toBe('claimed-name')
  })
})

describe('W4-5 / A18 — CACHED becomes provable without a fourth state', () => {
  it('keeps exactly three labels and never says complete', () => {
    expect(Object.keys(INBOX_STATE_LABEL).sort()).toEqual(['cached', 'live', 'unavailable'])
    for (const state of ['live', 'cached', 'unavailable'] as const) {
      expect(describeInboxState(state)).not.toMatch(/complete/i)
    }
  })

  it('gains "synced as of seq N" only for cached, and only when serverSeq exists', () => {
    expect(describeInboxState('cached')).not.toContain('synced as of')
    expect(describeInboxState('cached', 42)).toContain('synced as of seq 42')
    // serverSeq must never upgrade a LIVE sentence or invent one for UNAVAILABLE.
    expect(describeInboxState('live', 42)).not.toContain('synced as of')
    expect(describeInboxState('unavailable', 42)).not.toContain('synced as of')
  })
})

describe('W4-9 — the pane’s failure paths', () => {
  it('(a) a corrupt or partial line is skipped; the rest survive and nothing throws', () => {
    const path = `/home/test/.vclaw/inbox/vclaw__${SELF8}.jsonl`
    const files: Record<string, string> = {
      [path]: [
        JSON.stringify(record(1)),
        '{"kind":"message","seq":2,"subject":"trunc', // partial write at EOF
        'null',
        JSON.stringify(record(3)),
      ].join('\n'),
    }
    const service = new VclawInboxService({
      home: '/home/test',
      isSessionOpen: () => true,
      readFile: (p) => (p.endsWith('credentials.json') ? JSON.stringify({ nkey: NKEY }) : files[p]),
      listDirectory: () => [`vclaw__${SELF8}.jsonl`],
      statFile: () => ({ mode: 0o100600 }),
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
    const snapshot = service.refresh()
    expect(snapshot.messages.map((m) => m.seq)).toEqual([1, 3])
    expect(snapshot.state).toBe('live')
  })

  it('(b) a spool with the wrong mode is still read, and the pane SAYS so', () => {
    const path = `/home/test/.vclaw/inbox/vclaw__${SELF8}.jsonl`
    const service = new VclawInboxService({
      home: '/home/test',
      isSessionOpen: () => false,
      readFile: (p) => (p.endsWith('credentials.json') ? JSON.stringify({ nkey: NKEY }) : `${JSON.stringify(record(1))}\n`),
      listDirectory: () => [`vclaw__${SELF8}.jsonl`],
      statFile: () => ({ mode: 0o100644 }),
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
    const snapshot = service.refresh()
    expect(snapshot.messages).toHaveLength(1)
    expect(snapshot.warning).toContain('644')
    expect(snapshot.warning).toContain('expected 600')
  })

  it('(b-followup) a 0600 spool carries no warning', () => {
    const service = new VclawInboxService({
      home: '/home/test',
      isSessionOpen: () => true,
      readFile: (p) => (p.endsWith('credentials.json') ? JSON.stringify({ nkey: NKEY }) : `${JSON.stringify(record(1))}\n`),
      listDirectory: () => [`vclaw__${SELF8}.jsonl`],
      statFile: () => ({ mode: 0o100600 }),
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
    expect(service.refresh().warning).toBeUndefined()
  })

  it('(c) a missing inbox directory is an empty state, not an error', () => {
    const service = new VclawInboxService({
      home: '/home/test',
      isSessionOpen: () => false,
      readFile: (p) => {
        if (p.endsWith('credentials.json')) return JSON.stringify({ nkey: NKEY })
        throw new Error('ENOENT')
      },
      listDirectory: () => {
        throw new Error('ENOENT: no such file or directory')
      },
      now: () => new Date('2026-10-31T00:00:00.000Z'),
    })
    expect(() => service.start()).not.toThrow()
    const snapshot = service.snapshot()
    expect(snapshot.state).toBe('cached')
    expect(snapshot.messages).toEqual([])
    expect(snapshot.spoolPath).toBe('')
    expect(snapshot.warning).toBeUndefined()
    service.stop()
  })

  it('(d) ordering follows seq, never serverSeq — a live-drained row and a synced row sort together', () => {
    const synced = { ...record(2), serverSeq: 9 } as VclawInboxMessage
    const liveDrained = record(3)
    const merged = mergeSpool([], [synced, liveDrained])
    expect(merged.map((m) => m.seq)).toEqual([2, 3])
    // and the reverse input order must not change the answer
    expect(mergeSpool([], [liveDrained, synced]).map((m) => m.seq)).toEqual([2, 3])
    expect(lastSeqOf(merged)).toBe(3) // lastSeq is local seq, not the sync cursor
  })
})
