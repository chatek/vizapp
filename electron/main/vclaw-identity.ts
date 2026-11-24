import { readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { PACKAGED_SMOKE_FLAG } from './packaged-smoke'
import { findSpoolPath, readOwnNkey, selfPrefix } from './inbox-spool'
import { vclawCredentialsPath, vclawSdkRootDirectory } from './vclaw-sdk-root'

/**
 * Agentic identity (operator ruling 2026-11-19, Q1): the agent's NKey is the
 * desktop's ONLY identity. "Linked" means this host carries a vclaw identity —
 * an nkey in the credentials file, or the inbox spool that only an identity
 * can have. There is deliberately no account state and no login form; the
 * human approves the binding once, in the Browser pane, via the vendored
 * CLI's own login/signup verbs.
 */
export interface VclawIdentityState {
  linked: boolean
  /** True when the credentials file carries an nkey (the identity half). */
  hasNkey: boolean
  /** Absolute spool path, or null when this identity has no spool (or no identity). */
  spoolPath: string | null
}

export function readVclawIdentityState(
  readFile: (path: string) => string,
  listDirectory: (path: string) => string[],
  home: string,
): VclawIdentityState {
  const nkey = readOwnNkey(readFile, home)
  const spoolPath = nkey ? findSpoolPath(listDirectory, home, selfPrefix(nkey)) : null
  return { linked: nkey !== null || spoolPath !== null, hasNkey: nkey !== null, spoolPath }
}

/** Shape of the agent-sdk credentials file as the connect flow must see it. */
export type CredentialsState = 'absent' | 'valid' | 'invalid'

const ENCODED_SEED_PATTERN = /^[A-Za-z2-7]{58}$/

/**
 * Fail-closed credential inspection (operator ruling after the 2026-11-19 mint
 * incident): a credentials file that EXISTS but does not shape-validate is a
 * CORRUPT/HOSTILE identity, not an absent one. Absent → the login→signup
 * sequence may mint. Invalid → the connect flow must refuse and never mint on
 * top of material it cannot read.
 */
export function inspectCredentialsState(
  readFile: (path: string) => string,
  home: string,
): CredentialsState {
  let raw: string
  try {
    raw = readFile(vclawCredentialsPath(home))
  } catch {
    return 'absent'
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return 'invalid'
  }
  const record = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  const publicKey = typeof record.public_key === 'string' ? record.public_key.trim() : ''
  const seed = typeof record.seed === 'string' ? record.seed.trim() : ''
  if (!publicKey.startsWith('U') || publicKey.length < 51 || publicKey.length > 60) return 'invalid'
  // Encoded seed: 'S' + role letter + base32 of [2 prefix bytes][32 seed][2 CRC].
  if (!ENCODED_SEED_PATTERN.test(seed) || !seed.startsWith('S')) return 'invalid'
  const decoded = base32DecodeSeed(seed)
  return decoded !== null && decoded.length === 36 ? 'valid' : 'invalid'
}

/** Base32 (RFC 4648, unpadded) decode; null on any non-alphabet character. */
function base32DecodeSeed(input: string): Uint8Array | null {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567'
  const clean = input.toLowerCase()
  const out: number[] = []
  let bits = 0
  let value = 0
  for (const char of clean) {
    const index = alphabet.indexOf(char)
    if (index < 0) return null
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** Reads the live identity state off the real filesystem (main process use). */
export function vclawIdentityState(): VclawIdentityState {
  const home = homedir()
  return readVclawIdentityState(
    (path) => readFileSync(path, 'utf8'),
    (path) => readdirSync(path),
    home,
  )
}

/* ── Connect flow ────────────────────────────────────────────────────────────
 * One click → the vendored CLI's own verbs run, and the printed auth link
 * comes back for the Browser pane (never the system browser). The CLI owns the
 * flow end to end: `login` re-issues a pending claim's link and can wait for
 * the approval; when no identity exists it classifies itself with
 * `needsSignup` and prescribes `signup`, which mints the identity and prints
 * ITS link — the desktop only sequences what the verbs already own and never
 * re-derives the claim protocol.
 */

/** One verb run's structured outcome — the subset of runVclaw's shape we consume. */
export interface VclawVerbOutcome {
  state: string
  exit: number
  data: Record<string, unknown>
  text: string
}

export type VclawVerbRunner = (argv: string[]) => Promise<VclawVerbOutcome>

export interface ConnectAgentOutcome {
  /** `link` = navigate the pane to claimUrl; `authenticated` = identity ready now. */
  status: 'link' | 'authenticated' | 'error'
  /** Typed refusal reason: credentials shape-invalid, or signup refused in a verification context. */
  code?: 'credentials_invalid' | 'signup_refused_in_verification'
  claimUrl?: string
  /** The verb's own human text, for the toast/console — never a parsed claim secret. */
  message: string
}

export interface ConnectFlowGuards {
  /**
   * Result of inspectCredentialsState(): 'invalid' FAILS the flow closed —
   * the exact incident path (malformed sandbox seed → treated as absent →
   * signup minted) must be a typed refusal, never a mint.
   */
  credentialsState?: CredentialsState
  /**
   * Verification context (the app's own --packaged-smoke flag or a
   * VIZMASTER_/VCLAW_ verification env of the smoke harness): signup is
   * refused unless the escape hatch is explicitly set.
   */
  verificationContext?: boolean
  /**
   * Escape hatch: allows signup inside a verification context. ALWAYS logged
   * when it takes effect; the CALLER refuses it under --packaged-smoke
   * specifically (forced false there — a packaged-smoke run never mints).
   */
  allowUnapproved?: boolean
  /** Diagnostic sink for guard decisions; defaults to console.log in main. */
  log?: (message: string) => void
}

export const CONNECT_WAIT_SECONDS = 90

function claimUrlOf(outcome: VclawVerbOutcome): string | null {
  const url = outcome.data?.claimUrl
  return typeof url === 'string' && url.length > 0 ? url : null
}

export async function runConnectFlow(runner: VclawVerbRunner, options: ConnectFlowGuards = {}, waitSeconds = CONNECT_WAIT_SECONDS): Promise<ConnectAgentOutcome> {
  const log = options.log ?? (() => undefined)
  if (options.credentialsState === 'invalid') {
    log('vizshare connect: refusing — agent-sdk credentials file exists but fails shape validation')
    return {
      status: 'error',
      code: 'credentials_invalid',
      message:
        'Connect your agent — the agent-sdk credentials file on this host exists but is malformed (bad public key or seed shape). ' +
        'Refusing to run the connect flow over it: fixing or discarding it is a deliberate local action, never a silent re-mint.',
    }
  }
  const wait = String(waitSeconds)
  const verificationSignupRefusal = (): ConnectAgentOutcome => ({
    status: 'error',
    code: 'signup_refused_in_verification',
    message:
      'Connect your agent — verification context: login-only. Minting an identity (signup) is refused in packaged-smoke/verification runs; ' +
      'run the app normally, or explicitly pass --allow-unapproved outside a smoke run.',
  })
  const login = await runner(['login', '--wait', wait])
  const link = claimUrlOf(login)
  // A link in `data` wins even over a non-zero exit: signup's
  // approved-but-local-write-failed class keeps the URL in `data` on purpose,
  // so the caller can still finish in the browser without minting a new claim.
  if (link) return { status: 'link', claimUrl: link, message: login.text }
  if (login.data?.claim === 'approved') return { status: 'authenticated', message: login.text }
  if (login.exit === 0) return { status: 'authenticated', message: login.text }
  // Fabric-level fault (exit 3): re-running signup would hit the same wall.
  if (login.exit !== 4) return { status: 'error', message: login.text }
  // No identity (or nothing pending to re-issue): signup is the next step —
  // but in a verification context it is refused unless the escape hatch is
  // explicitly set, and the hatch taking effect is ALWAYS logged.
  if (options.verificationContext === true) {
    if (options.allowUnapproved !== true) return verificationSignupRefusal()
    log('vizshare connect: --allow-unapproved — verification-context signup EXPLICITLY ALLOWED; a fabric identity will be minted')
  }
  // No identity (or nothing pending to re-issue): `signup` mints the identity
  // and prints its auth link — the exact next step login's text prescribes.
  const signup = await runner(['signup', '--wait', wait])
  const signupLink = claimUrlOf(signup)
  if (signupLink) return { status: 'link', claimUrl: signupLink, message: signup.text }
  if (signup.data?.claimed === true || signup.exit === 0) return { status: 'authenticated', message: signup.text }
  return { status: 'error', message: signup.text || login.text }
}

/* ── Vendored CLI adapter ────────────────────────────────────────────────────
 * The verbs run in-process, the same way the vendored pi-extension bundle
 * consumes them (`vclaw-agent.js` calls runVclaw directly). A child process
 * was ruled out by the packaging facts, not preference: the CLI ships inside
 * app.asar (smartUnpack false) and the production fuses disable
 * ELECTRON_RUN_AS_NODE (after-pack.cjs), so no child can load it.
 */

type VclawRunModule = {
  runVclaw(argv: string[]): Promise<{ result: { state: string; data?: Record<string, unknown> }; exit: number; text: string }>
}

let verbRunnerPromise: Promise<VclawVerbRunner> | null = null

/** Test hook: inject a runner instead of the vendored CLI. */
export function setVclawVerbRunnerForTests(runner: VclawVerbRunner | null): void {
  verbRunnerPromise = runner ? Promise.resolve(runner) : null
}

async function loadVclawVerbRunner(): Promise<VclawVerbRunner> {
  verbRunnerPromise ??= (async () => {
    // Resolve through the package's EXPORTED root specifier, never
    // '@vclawhub/agent/package.json': the exports map does not export it, and
    // require.resolve throws ERR_PACKAGE_PATH_NOT_EXPORTED in the packaged app
    // (measured 2026-11-19, VizMaster.app — dev only escaped because the
    // earlier probe hand-built the path). import.meta.resolve honours the
    // exports map and works from inside app.asar; the verbs module sits
    // beside the resolved dist entry.
    const entryUrl = import.meta.resolve('@vclawhub/agent')
    const module = await import(new URL('./vclaw/run.js', entryUrl).href) as VclawRunModule
    return async (argv) => {
      const { result, exit, text } = await module.runVclaw(argv)
      return { state: result.state, exit, data: result.data ?? {}, text }
    }
  })()
  return verbRunnerPromise
}

/**
 * Pins the member-profile agent-sdk root around an in-process verb run. The
 * generic app keeps host env passthrough byte-for-byte untouched (same rule
 * as safeChildEnvironment); a member profile must not let the CLI's default
 * ~/.config/vclaw paths win over <root>/config.
 */
async function withProfileSdkEnvironment<T>(run: () => Promise<T>): Promise<T> {
  const sdkRoot = vclawSdkRootDirectory()
  if (!sdkRoot) return run()
  const root = join(homedir(), sdkRoot)
  const previousHome = process.env.VCLAW_HOME
  const previousCredsDir = process.env.VCLAW_CREDS_DIR
  // The SDK env helper resolves env("CREDS_DIR") as VCLAW_CREDS_DIR (with a
  // VCHAT_ legacy fallback) — a bare CREDS_DIR is ignored by the store, which
  // is exactly how a member-profile signup could land in ~/.config/vclaw.
  process.env.VCLAW_HOME = root
  process.env.VCLAW_CREDS_DIR = join(root, 'config')
  try {
    return await run()
  } finally {
    if (previousHome === undefined) delete process.env.VCLAW_HOME
    else process.env.VCLAW_HOME = previousHome
    if (previousCredsDir === undefined) delete process.env.VCLAW_CREDS_DIR
    else process.env.VCLAW_CREDS_DIR = previousCredsDir
  }
}

/** One connect at a time: the verbs poll for approval for up to `--wait` seconds. */
let connectInFlight: Promise<ConnectAgentOutcome> | null = null

/**
 * The verification context, from signals that ALREADY exist (no second one):
 * the app's own --packaged-smoke flag (PACKAGED_SMOKE_FLAG from
 * packaged-smoke.ts — the single definition of that signal) and the
 * VIZMASTER_VERIFICATION / VCLAW_VERIFICATION env the smoke harness family
 * sets. --allow-unapproved is the escape hatch; under --packaged-smoke
 * SPECIFICALLY it is refused (forced false, logged) — a packaged-smoke run
 * never mints.
 */
export function connectFlowContextFromArgv(argv: readonly string[] = process.argv): { verificationContext: boolean; allowUnapproved: boolean } {
  const verificationContext = argv.some((argument) => argument.startsWith(PACKAGED_SMOKE_FLAG))
    || process.env.VIZMASTER_VERIFICATION === '1'
    || process.env.VCLAW_VERIFICATION === '1'
  const requested = argv.includes('--allow-unapproved') || process.env.VCLAW_ALLOW_UNAPPROVED === '1'
  if (verificationContext) {
    // packaged-smoke smoke harness (and any verification run): the hatch is
    // refused — a verification run NEVER mints, whatever it asks for.
    if (requested) console.error('vizshare connect: --allow-unapproved REFUSED in a verification context — verification runs never mint identities')
    return { verificationContext: true, allowUnapproved: false }
  }
  if (requested) console.error('vizshare connect: --allow-unapproved in an INTERACTIVE context is a no-op (signup is already allowed)')
  return { verificationContext: false, allowUnapproved: false }
}

export function connectVclawIdentity(): Promise<ConnectAgentOutcome> {
  connectInFlight ??= withProfileSdkEnvironment(() => loadVclawVerbRunner().then((runner) => {
    const context = connectFlowContextFromArgv()
    const credentialsState = inspectCredentialsState((path) => readFileSync(path, 'utf8'), homedir())
    return runConnectFlow(runner, {
      credentialsState,
      verificationContext: context.verificationContext,
      allowUnapproved: context.allowUnapproved,
      log: (message) => console.log(message),
    })
  }))
    .finally(() => { connectInFlight = null })
  return connectInFlight
}
