import { createPrivateKey, sign as cryptoSign, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

/* ------------------------------------------------------------------ *
 * agent-assertion — the agent-side half of broker-retirement step 2
 * (spec §3.2 A, ruling §8.1).
 *
 * The agent runtime holds the NKey seed (agent-sdk credentials) and PUSHES
 * short-lived registry assertions to the desktop's loopback share broker:
 *
 *   POST /v1/agent-assertion   { assertion: "<jwt>" }   x-vizshare-cap: …
 *
 * The broker keeps the latest one in RAM only; the registry validates it
 * (compound verifier, aud vizmaster-registry-vcc, exp−iat ≤ 300 s, tool
 * required). The seed is NEVER written anywhere, logged, or sent anywhere
 * except in the signature. The desktop binary never reads the seed file.
 *
 * Imports are node builtins only (payload standalone rule): the NKey seed
 * is base32 of a raw ed25519 seed, so node:crypto signs it directly — no
 * nkeys dependency needed on this side.
 * ------------------------------------------------------------------ */

export const REGISTRY_ASSERTION_AUDIENCE = 'vizmaster-registry-vcc';
export const REGISTRY_ASSERTION_TOOL = 'vizshare-broker';
/** Well inside the registry's 300 s ceiling (agent.ts exp−iat check). */
export const ASSERTION_TTL_SECONDS = 240;
/** Push cadence; a fresh assertion always awaits the broker. */
export const ASSERTION_PUSH_INTERVAL_MS = 120_000;

const CREDS_ENV = 'VCLAW_CREDS_DIR';
const CREDS_ENV_LEGACY = 'CREDS_DIR';
const SDK_ROOT_ENV = 'VCLAW_HOME';
const CAP_ENV = 'VIZMASTER_VIZSHARE_CAP';

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

export interface AssertionSeed {
  /** U-form public key (the assertion's iss and sub). */
  publicKey: string;
  /** Raw seed material; lives only in memory, never logged. */
  seed: Uint8Array;
}

export interface AgentCap {
  pid: number;
  port: number;
  cap: string;
}

/**
 * Decodes an ENCODED NKey seed ("SU…" — the WHOLE string is one base32 blob:
 * 2 prefix bytes, the 32-byte ed25519 seed, then a 2-byte CRC16 trailer; the
 * first two base32 chars only look like a readable prefix because of the bit
 * slanting, see @nats-io/nkeys codec._encode/_decodeSeed). Returns the raw
 * 32-byte signing seed.
 */
function rawSeedFromEncodedSeed(encoded: string): Uint8Array {
  const raw = base32Decode(encoded);
  if (raw.length !== 36) throw new Error('seed payload has the wrong length');
  return raw.slice(2, 34);
}
function base32Decode(input: string): Uint8Array {
  const clean = input.trim().toLowerCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('seed is not valid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function base64Url(input: string | Uint8Array): string {
  return Buffer.from(input).toString('base64url');
}

function credentialConfigDir(): string {
  // Same resolution order the vendored SDK store uses: its env helper reads
  // VCLAW_CREDS_DIR (legacy bare CREDS_DIR honored too — this module reads
  // both), then the profile root when the desktop pinned VCLAW_HOME, then
  // the generic ~/.config/vclaw. (VizApp process-utils sets VCLAW_HOME and
  // VCLAW_CREDS_DIR for member profiles — the SDK-divergence fold-in.)
  const override = process.env[CREDS_ENV] ?? process.env[CREDS_ENV_LEGACY];
  if (override !== undefined && override.length > 0) return override;
  const sdkRoot = process.env[SDK_ROOT_ENV];
  if (sdkRoot !== undefined && sdkRoot.length > 0) return join(sdkRoot, 'config');
  return join(homedir(), '.config', 'vclaw');
}

/**
 * Reads the agent-sdk credentials WITHOUT trusting anything but the two
 * identity fields; everything else in the file is ignored.
 */
export async function readAssertionSeed(): Promise<AssertionSeed | null> {
  let raw: string;
  try {
    raw = await readFile(join(credentialConfigDir(), 'credentials.json'), 'utf8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const record = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  const publicKey = typeof record.public_key === 'string' ? record.public_key.trim() : '';
  const seedText = typeof record.seed === 'string' ? record.seed.trim() : '';
  if (publicKey.length === 0 || seedText.length === 0) return null;
  try {
    return { publicKey, seed: rawSeedFromEncodedSeed(seedText) };
  } catch {
    return null;
  }
}

export interface MintedAssertion {
  jwt: string;
  expiresAtEpochSeconds: number;
}

/**
 * Mints the registry assertion. Claim shape matches the desktop's own
 * prompt-assertion minter and the registry compound verifier: iss == sub
 * == U-form nkey, aud vizmaster-registry-vcc, tool required, TTL ≤ 300 s.
 */
export function buildRegistryAssertion(seed: AssertionSeed, nowSeconds = Math.floor(Date.now() / 1000)): MintedAssertion {
  const header = { alg: 'ed25519-nkey', typ: 'JWT' };
  const expiresAt = nowSeconds + ASSERTION_TTL_SECONDS;
  const claims = {
    iss: seed.publicKey,
    sub: seed.publicKey,
    aud: REGISTRY_ASSERTION_AUDIENCE,
    iat: nowSeconds,
    exp: expiresAt,
    tool: REGISTRY_ASSERTION_TOOL,
    jti: randomBytes(12).toString('base64url'),
  };
  const encoded = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  // PKCS8 #0 version, algorithm id 1.3.101.112 (Ed25519), OCTET STRING seed.
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(seed.seed)]);
  const key = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  const signature = cryptoSign(null, Buffer.from(encoded, 'utf8'), key);
  return { jwt: `${encoded}.${base64Url(new Uint8Array(signature))}`, expiresAtEpochSeconds: expiresAt };
}

/** Same capability file the share tool reads; minimal shape here (port + cap). */
export async function readAgentCapForPush(): Promise<AgentCap | null> {
  const override = process.env[CAP_ENV];
  const path = override !== undefined && override.length > 0 ? override : join(homedir(), '.vizmaster', 'vizshare-agent-cap');
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.pid !== 'number' || typeof parsed.port !== 'number' || typeof parsed.cap !== 'string') return null;
    return { pid: parsed.pid, port: parsed.port, cap: parsed.cap };
  } catch {
    return null;
  }
}

export type PushOutcome = { ok: true } | { ok: false; reason: 'no_seed' | 'no_cap' | 'transport' | 'refused' };

/** One push: mint now, POST to the broker. Failures are silent-by-design (retry next tick). */
export async function pushAssertionOnce(nowMs = Date.now(), post: typeof fetch = fetch): Promise<PushOutcome> {
  const [seed, broker] = await Promise.all([readAssertionSeed(), readAgentCapForPush()]);
  if (seed === null) return { ok: false, reason: 'no_seed' };
  if (broker === null) return { ok: false, reason: 'no_cap' };
  const { jwt } = buildRegistryAssertion(seed, Math.floor(nowMs / 1000));
  try {
    const response = await post(`http://127.0.0.1:${broker.port}/v1/agent-assertion`, {
      method: 'POST',
      // Never localhost: the broker enforces the exact Host authority.
      headers: { 'content-type': 'application/json', 'x-vizshare-cap': broker.cap },
      body: JSON.stringify({ assertion: jwt }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? { ok: true } : { ok: false, reason: 'refused' };
  } catch {
    return { ok: false, reason: 'transport' };
  }
}

/**
 * Session-lifecycle pusher: push immediately (session start ≈ broker may have
 * just started), then every interval. Also re-pushes when the broker RESTARTS
 * (the capability file's pid changes) — that is the "and on broker start" leg:
 * the fresh broker's RAM cache is empty, and a cap-file write is how a restart
 * becomes visible to the agent.
 */
export function startAssertionPusher(intervalMs = ASSERTION_PUSH_INTERVAL_MS): { stop(): void } {
  let lastBrokerPid = 0;
  let stopped = false;
  const tick = async (): Promise<void> => {
    if (stopped) return;
    const broker = await readAgentCapForPush();
    const brokerRestarted = broker !== null && broker.pid !== lastBrokerPid;
    if (broker !== null) lastBrokerPid = broker.pid;
    if (brokerRestarted) void pushAssertionOnce();
    void pushAssertionOnce();
  };
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  return {
    stop(): void {
      stopped = true;
      clearInterval(timer);
    },
  };
}
