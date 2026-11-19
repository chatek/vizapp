import { describe, expect, it } from 'vitest'
import {
  CONNECT_WAIT_SECONDS,
  connectFlowContextFromArgv,
  inspectCredentialsState,
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

// ── connect-flow guards (operator ruling after the 2026-11-19 mint incident) ──

const VALID_ENCODED_SEED = 'SU' + 'A'.repeat(56)

describe('inspectCredentialsState — fail-closed shape validation', () => {
  const read = (body: string | null): (path: string) => string => (path) => {
    if (body === null) throw new Error('ENOENT')
    return body
  }
  const validBody = JSON.stringify({ name: 'probe', public_key: NKEY, seed: VALID_ENCODED_SEED })

  it('absent when no credentials file exists', () => {
    expect(inspectCredentialsState(read(null), '/home/x')).toBe('absent')
  })

  it('valid when public_key and an 58-char encoded seed both shape-check', () => {
    expect(inspectCredentialsState(read(validBody), '/home/x')).toBe('valid')
  })

  it('INVALID when the file exists but the seed is malformed — even with a good public key', () => {
    // The exact incident shape: a seed that does not decode to the 36-byte encoded layout.
    expect(inspectCredentialsState(read(JSON.stringify({ public_key: NKEY, seed: 'SU' + 'A'.repeat(54) })), '/home/x')).toBe('invalid')
    expect(inspectCredentialsState(read(JSON.stringify({ public_key: NKEY, seed: 'not base32 !!!' })), '/home/x')).toBe('invalid')
  })

  it('INVALID when the public key is missing or not U-form', () => {
    expect(inspectCredentialsState(read(JSON.stringify({ seed: VALID_ENCODED_SEED })), '/home/x')).toBe('invalid')
    expect(inspectCredentialsState(read(JSON.stringify({ public_key: 'Xshort', seed: VALID_ENCODED_SEED }), ), '/home/x')).toBe('invalid')
  })

  it('INVALID on unparsable JSON', () => {
    expect(inspectCredentialsState(read('{not json'), '/home/x')).toBe('invalid')
  })
})

describe('connect flow guards', () => {
  const needsSignup = verb({ state: 'unavailable', exit: 4, data: { needsSignup: true }, text: 'no identity' })
  const signupLink = verb({ state: 'degraded', data: { claimed: false, claimUrl: 'https://claim/x?proof=1' }, text: 'claim link' })

  it('FAILS CLOSED on malformed existing credentials: typed refusal, runner never called', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: needsSignup },
      { argv: ['signup'], answer: signupLink },
    ])
    const outcome = await runConnectFlow(runner, { credentialsState: 'invalid' })
    expect(outcome.status).toBe('error')
    expect(outcome.code).toBe('credentials_invalid')
    expect(calls).toEqual([])
    expect(outcome.message).toMatch(/malformed/i)
  })

  it('refuses signup in a verification context after login — one runner call, no mint', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: needsSignup },
      { argv: ['signup'], answer: signupLink },
    ])
    const outcome = await runConnectFlow(runner, { verificationContext: true })
    expect(outcome.status).toBe('error')
    expect(outcome.code).toBe('signup_refused_in_verification')
    expect(calls.map((argv) => argv[0])).toEqual(['login'])
  })

  it('keeps the interactive path unchanged: signup still runs outside verification contexts', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: needsSignup },
      { argv: ['signup'], answer: signupLink },
    ])
    const outcome = await runConnectFlow(runner)
    expect(outcome.status).toBe('link')
    expect(calls.map((argv) => argv[0])).toEqual(['login', 'signup'])
  })

  it('escape hatch (--allow-unapproved) logs and proceeds with signup in a verification context', async () => {
    const { runner, calls } = scriptedRunner([
      { argv: ['login'], answer: needsSignup },
      { argv: ['signup'], answer: signupLink },
    ])
    const logs: string[] = []
    const outcome = await runConnectFlow(runner, {
      verificationContext: true,
      allowUnapproved: true,
      log: (message) => logs.push(message),
    })
    expect(outcome.status).toBe('link')
    expect(calls.map((argv) => argv[0])).toEqual(['login', 'signup'])
    expect(logs.join('\n')).toContain('--allow-unapproved')
  })
})

describe('verification context from argv/env', () => {
  const smokeArgv = ['/exe', '--packaged-smoke=/tmp/ready.json']
  const cleanEnv = (): NodeJS.ProcessEnv => {
    const previous = { vizmaster: process.env.VIZMASTER_VERIFICATION, vclaw: process.env.VCLAW_VERIFICATION, hatch: process.env.VCLAW_ALLOW_UNAPPROVED }
    delete process.env.VIZMASTER_VERIFICATION
    delete process.env.VCLAW_VERIFICATION
    delete process.env.VCLAW_ALLOW_UNAPPROVED
    return previous
  }
  const restoreEnv = (previous: NodeJS.ProcessEnv): void => {
    if (previous.vizmaster === undefined) delete process.env.VIZMASTER_VERIFICATION
    else process.env.VIZMASTER_VERIFICATION = previous.vizmaster
    if (previous.vclaw === undefined) delete process.env.VCLAW_VERIFICATION
    else process.env.VCLAW_VERIFICATION = previous.vclaw
    if (previous.hatch === undefined) delete process.env.VCLAW_ALLOW_UNAPPROVED
    else process.env.VCLAW_ALLOW_UNAPPROVED = previous.hatch
  }

  it('detects the packaged-smoke flag and REFUSES the escape hatch there (logged)', () => {
    const previous = cleanEnv()
    try {
      const errors: string[] = []
      const originalError = console.error
      console.error = (message: unknown) => { errors.push(String(message)) }
      try {
        const context = connectFlowContextFromArgv([...smokeArgv, '--allow-unapproved'])
        expect(context).toEqual({ verificationContext: true, allowUnapproved: false })
        expect(errors.join('\n')).toMatch(/REFUSED in a verification context/)
      } finally {
        console.error = originalError
      }
    } finally {
      restoreEnv(previous)
    }
  })

  it('detects the VCLAW_/VIZMASTER_ verification env as the same context', () => {
    const previous = cleanEnv()
    process.env.VCLAW_VERIFICATION = '1'
    try {
      expect(connectFlowContextFromArgv(['/exe'])).toEqual({ verificationContext: true, allowUnapproved: false })
    } finally {
      restoreEnv(previous)
    }
  })

  it('interactive argv with the hatch stays non-verification (signup already allowed there)', () => {
    const previous = cleanEnv()
    try {
      expect(connectFlowContextFromArgv(['/exe', '--allow-unapproved'])).toEqual({ verificationContext: false, allowUnapproved: false })
    } finally {
      restoreEnv(previous)
    }
  })

  it('plain argv is neither verification nor hatched', () => {
    const previous = cleanEnv()
    try {
      expect(connectFlowContextFromArgv(['/exe'])).toEqual({ verificationContext: false, allowUnapproved: false })
    } finally {
      restoreEnv(previous)
    }
  })
})
