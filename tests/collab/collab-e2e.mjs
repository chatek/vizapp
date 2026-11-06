#!/usr/bin/env node
/**
 * collab-e2e.mjs — cross-repo E2E harness for shared prompt auto-complete.
 *
 * Contract: docs/lanes/VIZREGISTRY_PROMPT_COLLAB_2026-11-06.md §3 (wire) + §8 (v3:
 * agent-initiated, NATS Micro + segment-scoped push subjects, no SSE bridge).
 *
 * Runs against a LOCAL VizRegistry with the prompts service enabled. When the
 * prerequisite is absent, this FAILS LOUDLY naming exactly what is missing —
 * a harness that cannot run is not a harness, and a silent skip would read as
 * a pass in CI.
 *
 * Prerequisites (all checked before any test runs):
 *   1. VizRegistry API with follow + prompts routes reachable at $VIZREG_URL
 *      (default http://127.0.0.1:8089). The deployed vizshow-api.service does
 *      NOT have them yet (measured 2026-11-06: no `follow`, no `prompts`, no
 *      PROMPTS_MICRO in the bundle) — run a local build with the new routes.
 *   2. NATS reachable at $NATS_URL (default nats://127.0.0.1:4222) with the
 *      `vchat_vizreg` KV bucket for the follow graph and consent records.
 *   3. `nats` npm package available (this script imports it).
 *
 * Legs:
 *   A. mutual-follow setup       — REST follow both directions, assert 200s
 *   B. consent grant             — student consents to teacher (scope drafts+suggestions)
 *   C. room.open                 — student opens the consent session (contract §8: the
 *                                  agent initiates, room.open is the consent-session open)
 *   D. draft publish             — student publishes 一元二次方程 to the draft subject
 *   E. teacher agent suggests    — the AGENT path submits via the suggest Micro endpoint
 *   F. push arrives              — student's subscriber receives the suggestion with the
 *                                  right shape (suggestionId, prompt, from.kind=agent)
 *   G. non-mutual refusal        — a third identity (no follow) is refused with not_mutual
 *   H. feedback                  — student accepts; lifecycle recorded as accepted
 *
 * Usage: node tests/collab/collab-e2e.mjs [--json]
 * Exit: 0 all green · 1 any red · 2 prerequisite missing
 */

import { createHash, randomUUID } from 'node:crypto'
import { connect as natsConnect, headers as natsHeaders } from 'nats'
import nkeys from 'nkeys.js'

// ── configuration ───────────────────────────────────────────────────────────

const VIZREG_URL = process.env.VIZREG_URL ?? 'http://127.0.0.1:8089'
const NATS_URL = process.env.NATS_URL ?? 'nats://127.0.0.1:4222'
const STUDENT_SUB_HMAC = process.env.STUDENT_SUB_HMAC ?? 'e2e-student-sub-hmac-0001'
const TEACHER_SUB_HMAC = process.env.TEACHER_SUB_HMAC ?? 'e2e-teacher-sub-hmac-0001'
const STRANGER_SUB_HMAC = process.env.STRANGER_SUB_HMAC ?? 'e2e-stranger-sub-hmac-01'
const SEGMENT = process.env.VIZREG_SEGMENT ?? 'vcc'
const STUDENT_BEARER = process.env.STUDENT_BEARER ?? 'e2e-student-bearer'
const TEACHER_BEARER = process.env.TEACHER_BEARER ?? 'e2e-teacher-bearer'
const STRANGER_BEARER = process.env.STRANGER_BEARER ?? 'e2e-stranger-bearer'
// Fixture agent identities (nkey + seed) for minting ed25519-nkey assertions — the
// service's agent path (src/auth/agent.ts): iss=sub=<U-nkey>, aud:"vizmaster-registry-vcc",
// tool required (1-64 chars), iat/exp <= 300s, fresh jti, signed with the seed.
const STUDENT_NKEY = process.env.STUDENT_NKEY
const STUDENT_SEED = process.env.STUDENT_SEED
const TEACHER_NKEY = process.env.TEACHER_NKEY
const TEACHER_SEED = process.env.TEACHER_SEED
const STRANGER_NKEY = process.env.STRANGER_NKEY ?? TEACHER_NKEY
const STRANGER_SEED = process.env.STRANGER_SEED ?? TEACHER_SEED

function b64url(input) { return Buffer.from(input).toString('base64url') }

function mintAssertion(nkey, seedInput, tool = 'harness') {
  // Accepts both the comma-separated byte form and the SU… encoded string.
  const seed = seedInput.startsWith('SU')
    ? new TextEncoder().encode(seedInput)
    : new Uint8Array(seedInput.split(',').map(Number))
  const kp = nkeys.fromSeed(seed)
  const now = Math.floor(Date.now() / 1000)
  const signingInput = `${b64url(JSON.stringify({ alg: 'ed25519-nkey', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: nkey, sub: nkey, aud: 'vizmaster-registry-vcc', tool, iat: now, exp: now + 300, jti: randomUUID() }))}`
  const signature = kp.sign(new TextEncoder().encode(signingInput))
  return `${signingInput}.${Buffer.from(signature).toString('base64url')}`
}

/** A fresh assertion when nkey+seed are configured; else the static env value (which the
 * service refuses — that IS the leg's failure mode, visible rather than guessed). */
function bearerFor(principal) {
  if (principal === 'student' && STUDENT_NKEY && STUDENT_SEED) return mintAssertion(STUDENT_NKEY, STUDENT_SEED)
  if (principal === 'teacher' && TEACHER_NKEY && TEACHER_SEED) return mintAssertion(TEACHER_NKEY, TEACHER_SEED)
  if (principal === 'stranger' && STRANGER_NKEY && STRANGER_SEED) return mintAssertion(STRANGER_NKEY, STRANGER_SEED)
  if (principal === 'student') return STUDENT_BEARER
  if (principal === 'teacher') return TEACHER_BEARER
  return STRANGER_BEARER
}

const DRAFT_TEXT = '一元二次方程'

const results = []
let exitCode = 0

function log(leg, pass, detail) {
  const line = `${pass ? 'PASS' : 'FAIL'}  ${leg}  ${detail}`
  console.log(line)
  results.push({ leg, pass, detail })
  if (!pass) exitCode = 1
}

// ── prerequisites (fail loudly, exit 2) ────────────────────────────────────

async function checkPrerequisites() {
  const failures = []

  // 1. VizRegistry API reachable + has the new routes
  try {
    const health = await fetch(`${VIZREG_URL}/api/health`, { signal: AbortSignal.timeout(5_000) })
    if (!health.ok) failures.push(`VizRegistry /api/health at ${VIZREG_URL} answered ${health.status}`)
  } catch (error) {
    failures.push(`VizRegistry not reachable at ${VIZREG_URL}: ${error.message}`)
  }
  // The follow route is the marker for the new backend; the deployed service
  // does not have it (measured 2026-11-06). An unauthenticated GET should
  // still answer (401/403), not 404, when the route exists.
  try {
    const follow = await fetch(`${VIZREG_URL}/api/me/follows`, { signal: AbortSignal.timeout(5_000) })
    if (follow.status === 404) {
      failures.push(
        `VizRegistry at ${VIZREG_URL} has no /api/me/follows route (404). ` +
        'The deployed vizshow-api.service predates the prompt-collab backend — ' +
        'run a local build with the follow + prompts routes and PROMPTS_MICRO=1.',
      )
    }
  } catch (error) {
    failures.push(`VizRegistry /api/me/follows probe failed: ${error.message}`)
  }

  // 2. NATS reachable
  try {
    const nc = await natsConnect({ servers: NATS_URL, timeout: 3_000 })
    await nc.close()
  } catch (error) {
    failures.push(`NATS not reachable at ${NATS_URL}: ${error.message}`)
  }

  if (failures.length > 0) {
    console.error('═══════════════════════════════════════════════════════════════')
    console.error('  E2E PREREQUISITES MISSING — this harness cannot run.')
    console.error('═══════════════════════════════════════════════════════════════')
    for (const failure of failures) console.error(`  ✗ ${failure}`)
    console.error('═══════════════════════════════════════════════════════════════')
    console.error('  Fix these, then re-run. A silent skip would read as a pass.')
    process.exit(2)
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

async function rest(method, path, body, token) {
  const response = await fetch(`${VIZREG_URL}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(10_000),
  })
  let data = null
  try {
    data = await response.json()
  } catch {
    /* some refusals are text */
  }
  return { status: response.status, data }
}

function suggestSubject(subHmac) {
  return `tenant.${SEGMENT}.prompts.suggest.${subHmac}`
}

function draftSubject(subHmac) {
  return `tenant.${SEGMENT}.prompts.draft.${subHmac}`
}

/** Micro requests carry the bearer in NATS headers (measured live E2E). */
function microRequest(nc, subject, payload, bearer) {
  const header = natsHeaders()
  header.set('Authorization', `Bearer ${bearer}`)
  return nc.request(subject, new TextEncoder().encode(JSON.stringify(payload)), { timeout: 10_000, headers: header })
}

// ── the legs ────────────────────────────────────────────────────────────────

async function runLegs() {
  const nc = await natsConnect({ servers: NATS_URL, timeout: 5_000 })
  const conversationId = randomUUID()
  let suggestionReceived = null

  // The student's push subscriber — started BEFORE any suggestion is sent, because
  // core NATS is at-most-once (a push to nobody is lost, and that is the transport's
  // contract, not a failure).
  const suggestions = []
  const sub = nc.subscribe(suggestSubject(STUDENT_SUB_HMAC))
  const drain = (async () => {
    for await (const message of sub) {
      const decoded = JSON.parse(new TextDecoder().decode(message.data))
      suggestions.push(decoded)
    }
  })()

  // A. mutual follow (REST: PUT /api/me/follows/:handle, per the measured live E2E).
  // The mutual preflight is GET /api/me/follows/:handle?mutual=true — the list
  // route ignores the flag, so the preflight is the only reliable check.
  {
    const forward = await rest('PUT', `/api/me/follows/${TEACHER_NKEY}`, undefined, bearerFor('student'))
    const backward = await rest('PUT', `/api/me/follows/${STUDENT_NKEY}`, undefined, bearerFor('teacher'))
    const preflight = await rest('GET', `/api/me/follows/${TEACHER_NKEY}?mutual=true`, undefined, bearerFor('student'))
    const forwardOk = forward.status === 200 || forward.status === 201 || forward.status === 204
    const backwardOk = backward.status === 200 || backward.status === 201 || backward.status === 204
    const mutualOk = preflight.status === 200
    log('A mutual-follow', forwardOk && backwardOk && mutualOk,
      `student→teacher ${forward.status}, teacher→student ${backward.status}, mutual preflight ${preflight.status}`)
  }

  // B. consent grant (REST: PUT /api/me/collab-consent/:handle, per the measured live E2E;
  // NOT POST /api/consent — that route does not exist. KV key consent.<student>.<teacher>.)
  {
    const consent = await rest('PUT', `/api/me/collab-consent/${TEACHER_NKEY}`, undefined, bearerFor('student'))
    const ok = consent.status === 200 || consent.status === 201 || consent.status === 204
    log('B consent-grant', ok, `PUT /api/me/collab-consent/${TEACHER_NKEY} → ${consent.status}`)
  }

  // C. room.open — NATS Micro (v3: NATS for ALL principals; no REST collab surface).
  // The reply is {roomId, peer, expiresAt, mutual}.
  let roomId = null
  {
    const reply = await microRequest(nc, 'vizregistry.prompts.room.open', {
      peer: TEACHER_NKEY,
      conversationId,
    }, bearerFor('student'))
    const decoded = JSON.parse(new TextDecoder().decode(reply.data))
    roomId = decoded.roomId ?? null
    const ok = decoded.mutual === true
    log('C room-open', ok, `mutual=${decoded.mutual} roomId=${roomId ?? 'none'}`)
  }

  // D. draft publish (the student's typed phrase, published while consent holds)
  {
    nc.publish(draftSubject(STUDENT_SUB_HMAC), new TextEncoder().encode(JSON.stringify({
      roomId,
      draft: DRAFT_TEXT,
      locale: 'zh-CN',
      conversationId,
      at: new Date().toISOString(),
    })))
    await nc.flush()
    log('D draft-publish', true, `published "${DRAFT_TEXT}" to ${draftSubject(STUDENT_SUB_HMAC)}`)
  }

  // E. the teacher's AGENT submits a suggestion through the Micro endpoint
  let suggestionId = null
  {
    const suggest = await microRequest(nc, 'vizregistry.prompts.suggest', {
      roomId,
      requestId: randomUUID(),
      prompt: 'Solve the quadratic equation in one variable using the discriminant method',
      rationale: 'The student typed the Chinese term for this exact topic',
      locale: 'zh-CN',
      confidence: 0.9,
    }, bearerFor('teacher'))
    const decoded = JSON.parse(new TextDecoder().decode(suggest.data))
    suggestionId = decoded.suggestionId ?? null
    const ok = decoded.delivery === 'pushed' || decoded.delivery === 'queued'
    log('E agent-suggest', ok, `delivery=${decoded.delivery} suggestionId=${suggestionId ?? 'none'} rejected=${decoded.rejected ?? 'none'}`)
  }

  // F. the push arrives with the right shape
  {
    const deadline = Date.now() + 5_000
    while (suggestions.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const received = suggestions[0]
    if (!received) {
      log('F push-arrives', false, `no push on ${suggestSubject(STUDENT_SUB_HMAC)} within 5s`)
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

  // G. refusals, in the measured order: an identity that is not the room's teacher gets
  // `wrong_role` FIRST (deliberate — it discloses nothing about room membership); the
  // room's own teacher gets `not_mutual` only after a follow edge is deleted. The refusal
  // shape (measured live) is {ok:false, code:"not_mutual"|"wrong_role", message}, and NO push.
  {
    // G1. wrong_role: a stranger calling suggest on a room they are not the teacher of.
    const strangerReply = await microRequest(nc, 'vizregistry.prompts.suggest', {
      roomId,
      requestId: randomUUID(),
      prompt: 'should be refused with wrong_role',
      locale: 'en',
    }, bearerFor('stranger'))
    const stranger = JSON.parse(new TextDecoder().decode(strangerReply.data))
    const strangerRefused = stranger.ok === false && stranger.code === 'wrong_role'
    log('G1 wrong-role-refused', strangerRefused, `ok=${stranger.ok} code=${stranger.code ?? 'none'}`)

    // G2. not_mutual: delete the teacher→student follow edge, then suggest from the
    // (now non-mutual) teacher. The room's own teacher, so the refusal is not_mutual.
    const unfollow = await rest('DELETE', `/api/me/follows/${STUDENT_NKEY}`, undefined, bearerFor('teacher'))
    const mutualAfterDelete = await rest('GET', `/api/me/follows/${STUDENT_NKEY}?mutual=true`, undefined, bearerFor('teacher'))
    const teacherReply = await microRequest(nc, 'vizregistry.prompts.suggest', {
      roomId,
      requestId: randomUUID(),
      prompt: 'should be refused with not_mutual',
      locale: 'en',
    }, bearerFor('teacher'))
    const teacher = JSON.parse(new TextDecoder().decode(teacherReply.data))
    const teacherRefused = teacher.ok === false && teacher.code === 'not_mutual'
    const followDeleted = unfollow.status === 200 || unfollow.status === 204
    // The preflight answers 200 with {mutual:boolean} — the refusal is in the body, not the status.
    const noLongerMutual = mutualAfterDelete.status === 200 && mutualAfterDelete.data?.mutual === false
    log('G2 not-mutual-refused', teacherRefused && followDeleted && noLongerMutual,
      `unfollow=${unfollow.status} preflight-after=${mutualAfterDelete.status} code=${teacher.code ?? 'none'}`)

    // Nothing was pushed for either refusal (both suggestions are absent from the student's stream).
    const refusalPushes = suggestions.filter((s) => s.prompt?.startsWith('should be refused'))
    log('G3 no-push-for-refusals', refusalPushes.length === 0, `${refusalPushes.length} refusal push(es) received`)
  }

  // H. feedback (the student accepts)
  if (suggestionId) {
    const feedback = await microRequest(nc, 'vizregistry.prompts.feedback', {
      suggestionId,
      outcome: 'accepted',
    }, bearerFor('student'))
    const decoded = JSON.parse(new TextDecoder().decode(feedback.data))
    log('H feedback-accepted', decoded.ok === true, `ok=${decoded.ok}`)
  } else {
    log('H feedback-accepted', false, 'no suggestionId from leg E; cannot accept')
  }

  // teardown
  sub.unsubscribe()
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
