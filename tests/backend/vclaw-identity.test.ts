import { describe, expect, it } from 'vitest'
import {
  CONNECT_WAIT_SECONDS,
  readVclawIdentityState,
  runConnectFlow,
  type VclawVerbOutcome,
  type VclawVerbRunner,
} from '../../electron/main/vclaw-identity'

// The agentic-identity contract (operator ruling 2026-11-19, Q1): the agent
// NKey is the desktop's ONLY identity. "Linked" is a filesystem fact — an nkey
// in the credentials file, or the spool only an identity can have — and the
// one-click flow sequences the vendored CLI's OWN verbs, never re-deriving
// the claim protocol.

const NKEY = 'UBYYRKJHZGXATWKWZRYT5VI6AG5YEL2U2QERQDAJP4EH7TVGEXT2JK5F'
const SELF8 = 'UBYYRKJH'

const credentialsWithNkey = (nkey: string): string => JSON.stringify({ nkey, name: 'anon' })

describe('linked/not detection', () => {
  it('is un-linked with no credentials and no spool', () => {
    const state = readVclawIdentityState(() => { throw new Error('no file') }, () => [], '/home/x')
    expect(state).toEqual({ linked: false, hasNkey: false, spoolPath: null })
  })

  it('is linked on the nkey alone, and names the spool when it exists', () => {
    const directories = (path: string): string[] => path.endsWith('inbox') ? [`default__${SELF8}.jsonl`] : []
    const readFile = (path: string): string => path.endsWith('credentials.json') ? credentialsWithNkey(NKEY) : ''
    const state = readVclawIdentityState(readFile, directories, '/home/x')
    expect(state.linked).toBe(true)
    expect(state.hasNkey).toBe(true)
    expect(state.spoolPath).toContain(`${SELF8}.jsonl`)
  })

  it('stays un-linked when the credentials file is present but carries no nkey', () => {
    const state = readVclawIdentityState(() => '{"name":"anon"}', () => [], '/home/x')
    expect(state).toEqual({ linked: false, hasNkey: false, spoolPath: null })
  })
})

const verb = (partial: Partial<VclawVerbOutcome>): VclawVerbOutcome => ({ state: 'ok', exit: 0, data: {}, text: '', ...partial })

function scriptedRunner(script: Array<{ argv: string[]; answer: VclawVerbOutcome }>): { runner: VclawVerbRunner; calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    runner: async (argv) => {
      calls.push(argv)
      const match = script.find((step) => step.argv[0] === argv[0])
      if (!match) throw new Error(`unexpected verb: ${argv.join(' ')}`)
      return match.answer
    },
  }
}

describe('connect flow — login first, signup only when login prescribes it', () => {
  it('returns the printed auth link from login for a pending claim', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: verb({ state: 'degraded', data: { claim: 'pending', claimUrl: 'https://claim/a/1?proof=x' }, text: 'waiting for approval' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome).toEqual({ status: 'link', claimUrl: 'https://claim/a/1?proof=x', message: 'waiting for approval' })
    expect(calls).toEqual([['login', '--wait', '90']])
  })

  it('reports authenticated when login already carries an approved identity', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: verb({ data: { claim: 'approved', nkey: NKEY }, text: 'already authenticated' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome.status).toBe('authenticated')
    expect(calls).toHaveLength(1)
  })

  it('falls through to signup when login classifies the host as needsSignup, and surfaces signup link', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: verb({ state: 'unavailable', exit: 4, data: { needsSignup: true }, text: 'no identity on this host' }) },
      { argv: ['signup'], answer: verb({ state: 'degraded', data: { claimed: false, claimUrl: 'https://claim/a/2?proof=y' }, text: 'claim link for anon' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome.status).toBe('link')
    expect(outcome.claimUrl).toBe('https://claim/a/2?proof=y')
    expect(calls.map((argv) => argv[0])).toEqual(['login', 'signup'])
  })

  it('reports authenticated when signup completes the claim inside its wait', async () => {
    const { runner } = scriptedRunner([
      { argv: ['login'], answer: verb({ state: 'unavailable', exit: 4, data: { needsSignup: true } }) },
      { argv: ['signup'], answer: verb({ data: { claimed: true, steward: 'op' }, text: 'approved ✓' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome.status).toBe('authenticated')
  })

  it('keeps the link visible even when signup recorded it with a non-zero exit', async () => {
    // signup's approved-but-local-write-failed class keeps claimUrl in data so
    // the caller can still finish in the browser without minting a new claim.
    const { runner } = scriptedRunner([
      { argv: ['login'], answer: verb({ state: 'unavailable', exit: 4, data: { needsSignup: true } }) },
      { argv: ['signup'], answer: verb({ state: 'unavailable', exit: 3, data: { sessionId: 's', claimUrl: 'https://claim/a/3' }, text: 'local write failed' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome).toEqual({ status: 'link', claimUrl: 'https://claim/a/3', message: 'local write failed' })
  })

  it('does not run signup on a fabric fault (exit 3) — the same wall would meet it', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: verb({ state: 'unavailable', exit: 3, text: 'cannot reach the fabric' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome.status).toBe('error')
    expect(calls).toHaveLength(1)
  })

  it('reports error when signup fails too, carrying signup text', async () => {
    const { runner } = scriptedRunner([
      { argv: ['login'], answer: verb({ state: 'unavailable', exit: 4, data: { needsSignup: true }, text: 'no identity' }) },
      { argv: ['signup'], answer: verb({ state: 'unavailable', exit: 4, text: 'signup was refused' }) },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome).toEqual({ status: 'error', message: 'signup was refused' })
  })

  it('waits the documented number of seconds', () => {
    expect(CONNECT_WAIT_SECONDS).toBe(90)
  })
})
