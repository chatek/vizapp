#!/usr/bin/env node
/**
 * collab-e2e.mjs — cross-repo E2E harness for shared prompt auto-complete.
 *
 * Contract: docs/lanes/VIZREGISTRY_PROMPT_COLLAB_2026-11-06.md §3 (wire) + §8 (v3)
 * + the NKEY re-key (service b32eb25): delivery subjects are keyed by NKEY, not
 * subHmac, because vgate can only grant what it can name.
 *
 * Legs (10):
 *   A. mutual follow            — REST PUT both directions + mutual preflight
 *   B. consent grant            — REST PUT /api/me/collab-consent/:nkey
 *   C. room.open                — NATS Micro with a minted assertion
 *   D. draft publish            — 一元二次方程 to the NKEY-keyed draft subject
 *   E. teacher's agent suggests — via the suggest Micro endpoint
 *   F. push arrives             — on the NKEY-keyed suggest subject, right shape
 *   G1. wrong_role refusal      — a resolvable but non-teacher identity
 *   G2. not_mutual refusal      — the room's own teacher after unfollow
 *   G3. no push for refusals    — neither refusal reached the wire
 *   H. feedback accept          — the student accepts; ok=true
 *
 * Auth: ed25519-nkey assertions minted locally (the service's agent path).
 * REST identifiers are NKEYs (resolved via agent-bindings).
 *
 * Prerequisites (checked loudly, exit 2):
 *   VIZREG_URL service with /api/me/follows · NATS_URL broker · env NKEYs + seeds
 *
 * Usage: node tests/collab/collab-e2e.mjs [--json]
 * Env:   VIZREG_URL NATS_URL VIZREG_SEGMENT(vcc)
 *        STUDENT_NKEY STUDENT_SEED TEACHER_NKEY TEACHER_SEED
 *        STRANGER_NKEY STRANGER_SEED (optional — defaults to a wrong-role probe via the student)
 *        STUDENT_SUB_HMAC TEACHER_SUB_HMAC (for the negative leg only)
 */

import { randomUUID } from 'node:crypto'
import { connect as natsConnect, headers as natsHeaders } from 'nats'
import nkeys from 'nkeys.js'

// ── configuration ───────────────────────────────────────────────────────────

const VIZREG_URL = process.env.VIZREG_URL ?? 'http://127.0.0.1:8089'
const NATS_URL = process.env.NATS_URL ?? 'nats://127.0.0.1:14299'
const SEGMENT = process.env.VIZREG_SEGMENT ?? 'vcc'
const DRAFT_TEXT = '一元二次方程'

// Fixture agent identities — REAL nkeys, because assertions must sign with a seed
// the service verifies against the public key in the JWT's iss/sub.
const STUDENT_NKEY = process.env.STUDENT_NKEY
const STUDENT_SEED = process.env.STUDENT_SEED
const TEACHER_NKEY = process.env.TEACHER_NKEY
const TEACHER_SEED = process.env.TEACHER_SEED
const STRANGER_NKEY = process.env.STRANGER_NKEY ?? TEACHER_NKEY
const STRANGER_SEED = process.env.STRANGER_SEED ?? TEACHER_SEED
// subHmacs are needed only for the OLD-subject negative leg.
const STUDENT_SUB_HMAC = process.env.STUDENT_SUB_HMAC

const results = []
let exitCode = 0

function log(leg, pass, detail) {
  const line = `${pass ? 'PASS' : 'FAIL'}  ${leg}  ${detail}`
  console.log(line)
  results.push({ leg, pass, detail })
  if (!pass) exitCode = 1
}

// ── prerequisites ───────────────────────────────────────────────────────────

async function checkPrerequisites() {
  const failures = []
  try {
    const health = await fetch(`${VIZREG_URL}/api/health`, { signal: AbortSignal.timeout(5_000) })
    if (!health.ok) failures.push(`VizRegistry /api/health at ${VIZREG_URL} answered ${health.status}`)
  } catch (error) {
    failures.push(`VizRegistry not reachable at ${VIZREG_URL}: ${error.message}`)
  }
  try {
    const follow = await fetch(`${VIZREG_URL}/api/me/follows`, { signal: AbortSignal.timeout(5_000) })
    if (follow.status === 404) {
      failures.push(`VizRegistry at ${VIZREG_URL} has no /api/me/follows route (404) — run a local build with PROMPTS_MICRO=1.`)
    }
  } catch (error) {
    failures.push(`VizRegistry /api/me/follows probe failed: ${error.message}`)
  }
  try {
    const nc = await natsConnect({ servers: NATS_URL, timeout: 3_000 })
    await nc.close()
  } catch (error) {
    failures.push(`NATS not reachable at ${NATS_URL}: ${error.message}`)
  }
  if (!STUDENT_NKEY || !STUDENT_SEED) failures.push('STUDENT_NKEY and STUDENT_SEED env are required (the assertion must be minted)')
  if (!TEACHER_NKEY || !TEACHER_SEED) failures.push('TEACHER_NKEY and TEACHER_SEED env are required')

  if (failures.length > 0) {
    console.error('═══════════════════════════════════════════════════════════════')
    console.error('  E2E PREREQUISITES MISSING — this harness cannot run.')
    console.error('═══════════════════════════════════════════════════════════════')
    for (const failure of failures) console.error(`  ✗ ${failure}`)
    process.exit(2)
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

const b64url = (input) => Buffer.from(input).toString('base64url')

/**
 * Mints the service's agent assertion: {alg:"ed25519-nkey", typ:"JWT"} with
 * iss=sub=<U-nkey>, aud:"vizmaster-registry-vcc", tool required, iat/exp <= 300s.
 * Accepts the seed as the SU… encoded string or comma-separated byte values.
 */
function mintAssertion(nkey, seedInput, tool = 'harness') {
  const seed = seedInput.startsWith('SU')
    ? new TextEncoder().encode(seedInput)
    : new Uint8Array(seedInput.split(',').map(Number))
  const kp = nkeys.fromSeed(seed)
  const now = Math.floor(Date.now() / 1000)
  const signingInput = `${b64url(JSON.stringify({ alg: 'ed25519-nkey', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: nkey, sub: nkey, aud: 'vizmaster-registry-vcc', tool, iat: now, exp: now + 300, jti: randomUUID() }))}`
  const signature = kp.sign(new TextEncoder().encode(signingInput))
  return `${signingInput}.${Buffer.from(signature).toString('base64url')}`
}

/** REST call: always sends a JSON body (fastify refuses an empty body with content-type set). */
async function rest(method, path, bearer) {
  const response = await fetch(`${VIZREG_URL}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
    body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  })
  let data = null
  try { data = await response.json() } catch { /* text refusals */ }
  return { status: response.status, data }
}

/** Micro request: bearer in NATS headers, 10 s timeout (the service's own budget). */
function microRequest(nc, subject, payload, bearer) {
  const header = natsHeaders()
  header.set('Authorization', `Bearer ${bearer}`)
  return nc.request(subject, new TextEncoder().encode(JSON.stringify(payload)), { timeout: 10_000, headers: header })
}

const suggestSubject = (nkey) => `tenant.${SEGMENT}.prompts.suggest.${nkey}`

// ── the legs ────────────────────────────────────────────────────────────────

async function runLegs() {
  const studentBearer = () => mintAssertion(STUDENT_NKEY, STUDENT_SEED)
  const teacherBearer = () => mintAssertion(TEACHER_NKEY, TEACHER_SEED)
  const strangerBearer = () => mintAssertion(STRANGER_NKEY, STRANGER_SEED)

  const nc = await natsConnect({ servers: NATS_URL, timeout: 5_000 })
  const conversationId = randomUUID()

  // Subscribers started BEFORE anything is published (core NATS is at-most-once).
  const suggestions = []
  const sub = nc.subscribe(suggestSubject(STUDENT_NKEY))
  const drain = (async () => {
    for await (const message of sub) {
      suggestions.push(JSON.parse(new TextDecoder().decode(message.data)))
    }
  })()

  // The OLD subHmac-keyed subject must receive NOTHING (the re-key deleted it).
  const legacySuggestions = []
  const legacySub = STUDENT_SUB_HMAC
    ? nc.subscribe(`tenant.${SEGMENT}.prompts.suggest.${STUDENT_SUB_HMAC}`)
    : null
  const legacyDrain = legacySub
    ? (async () => { for await (const message of legacySub) { legacySuggestions.push(message) } })()
    : null

  // A. mutual follow
  {
    const forward = await rest('PUT', `/api/me/follows/${TEACHER_NKEY}`, studentBearer())
    const backward = await rest('PUT', `/api/me/follows/${STUDENT_NKEY}`, teacherBearer())
    const preflight = await rest('GET', `/api/me/follows/${TEACHER_NKEY}?mutual=true`, studentBearer())
    const ok = (forward.status === 200 || forward.status === 201 || forward.status === 204)
      && (backward.status === 200 || backward.status === 201 || backward.status === 204)
      && preflight.status === 200 && preflight.data?.mutual === true
    log('A mutual-follow', ok,
      `student→teacher ${forward.status}, teacher→student ${backward.status}, mutual=${preflight.data?.mutual}`)
  }

  // B. consent grant
  {
    const consent = await rest('PUT', `/api/me/collab-consent/${TEACHER_NKEY}`, studentBearer())
    const ok = consent.status === 200 || consent.status === 201 || consent.status === 204
    log('B consent-grant', ok, `PUT /api/me/collab-consent → ${consent.status}`)
  }

  // C. room.open
  let roomId = null
  {
    const reply = await microRequest(nc, 'vizregistry.prompts.room.open', {
      peer: TEACHER_NKEY,
      conversationId,
    }, studentBearer())
    const decoded = JSON.parse(new TextDecoder().decode(reply.data))
    roomId = decoded.roomId ?? null
    log('C room-open', decoded.mutual === true, `mutual=${decoded.mutual} roomId=${roomId ?? 'none'}`)
  }

  // D. draft — a Micro REQUEST to the service, exactly like the desktop's flush. The service
  // owns fan-out to each consenting teacher's nkey subject; a raw publish here would be a message
  // into the void (nobody subscribes) and a DENIED publish (vgate grants PUB only on
  // `vizregistry.prompts.>`), so this leg must go through the endpoint.
  {
    try {
      const reply = await microRequest(nc, 'vizregistry.prompts.draft', {
        roomId,
        draft: DRAFT_TEXT,
        locale: 'zh-CN',
      }, studentBearer())
      const decoded = JSON.parse(new TextDecoder().decode(reply.data))
      log('D draft-request', decoded.accepted === true, `accepted=${decoded.accepted} teachersOnline=${decoded.teachersOnline ?? '?'}`)
    } catch (error) {
      log('D draft-request', false, `no reply on vizregistry.prompts.draft: ${error instanceof Error ? error.message : error}`)
    }
  }

  // E. the teacher's AGENT suggests
  let suggestionId = null
  {
    const suggest = await microRequest(nc, 'vizregistry.prompts.suggest', {
      roomId,
      requestId: randomUUID(),
      prompt: 'Solve the quadratic equation in one variable using the discriminant method',
      rationale: 'The student typed the Chinese term for this exact topic',
      locale: 'zh-CN',
      confidence: 0.9,
    }, teacherBearer())
    const decoded = JSON.parse(new TextDecoder().decode(suggest.data))
    suggestionId = decoded.suggestionId ?? null
    const ok = decoded.delivery === 'pushed' || decoded.delivery === 'queued'
    log('E agent-suggest', ok, `delivery=${decoded.delivery} suggestionId=${suggestionId ?? 'none'} rejected=${decoded.rejected ?? 'none'}`)
  }

  // F. the push arrives on the NKEY-keyed subject, with the right shape
  {
    const deadline = Date.now() + 5_000
    while (suggestions.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const received = suggestions[0]
    if (!received) {
      log('F push-arrives', false, `no push on ${suggestSubject(STUDENT_NKEY)} within 5s`)
    } else {
      const shapeOk =
        typeof received.suggestionId === 'string' && received.suggestionId.length > 0
        && typeof received.prompt === 'string' && received.prompt.length > 0
        && typeof received.roomId === 'string'
        && received.from && (received.from.kind === 'agent' || received.from.kind === 'human')
        && typeof received.from.nkey === 'string'
      log('F push-arrives', shapeOk,
        `suggestionId=${received.suggestionId?.slice(0, 12)}… from.kind=${received.from?.kind} prompt="${received.prompt?.slice(0, 40)}…"`)
    }
  }

  // G1. wrong_role: a resolvable but non-teacher identity
  {
    const strangerReply = await microRequest(nc, 'vizregistry.prompts.suggest', {
      roomId,
      requestId: randomUUID(),
      prompt: 'should be refused with wrong_role',
      locale: 'en',
    }, strangerBearer())
    const stranger = JSON.parse(new TextDecoder().decode(strangerReply.data))
    log('G1 wrong-role-refused', stranger.ok === false && stranger.code === 'wrong_role',
      `ok=${stranger.ok} code=${stranger.code ?? 'none'}`)
  }

  // G2. not_mutual: the room's teacher after the follow edge is deleted
  {
    const unfollow = await rest('DELETE', `/api/me/follows/${STUDENT_NKEY}`, teacherBearer())
    const preflight = await rest('GET', `/api/me/follows/${STUDENT_NKEY}?mutual=true`, teacherBearer())
    const teacherReply = await microRequest(nc, 'vizregistry.prompts.suggest', {
      roomId,
      requestId: randomUUID(),
      prompt: 'should be refused with not_mutual',
      locale: 'en',
    }, teacherBearer())
    const teacher = JSON.parse(new TextDecoder().decode(teacherReply.data))
    const followDeleted = unfollow.status === 200 || unfollow.status === 204
    const noLongerMutual = preflight.status === 200 && preflight.data?.mutual === false
    log('G2 not-mutual-refused', teacher.ok === false && teacher.code === 'not_mutual' && followDeleted && noLongerMutual,
      `unfollow=${unfollow.status} mutual=${preflight.data?.mutual} code=${teacher.code ?? 'none'}`)
  }

  // G3. no push for either refusal
  {
    const refusalPushes = suggestions.filter((s) => s.prompt?.startsWith('should be refused'))
    log('G3 no-push-for-refusals', refusalPushes.length === 0, `${refusalPushes.length} refusal push(es)`)
  }

  // N. NEGATIVE: the OLD subHmac-keyed subject received NOTHING (the re-key deleted it)
  {
    await new Promise((resolve) => setTimeout(resolve, 500))
    log('N legacy-subject-silent', legacySuggestions.length === 0,
      `${legacySuggestions.length} message(s) on the old subHmac-keyed subject`)
  }

  // H. feedback accept
  if (suggestionId) {
    const feedback = await microRequest(nc, 'vizregistry.prompts.feedback', {
      suggestionId,
      outcome: 'accepted',
    }, studentBearer())
    const decoded = JSON.parse(new TextDecoder().decode(feedback.data))
    log('H feedback-accepted', decoded.ok === true, `ok=${decoded.ok}`)
  } else {
    log('H feedback-accepted', false, 'no suggestionId from leg E')
  }

  // teardown
  sub.unsubscribe()
  legacySub?.unsubscribe()
  await Promise.race([drain, new Promise((resolve) => setTimeout(resolve, 1_000))])
  await nc.drain()
}

// ── main ────────────────────────────────────────────────────────────────────

const asJson = process.argv.includes('--json')

await checkPrerequisites()
await runLegs().catch((error) => {
  console.error(`harness crashed: ${error.message}`)
  exitCode = 1
})

if (asJson) {
  console.log(JSON.stringify({ exitCode, results }, null, 2))
} else {
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} legs green`)
}

process.exit(exitCode)
