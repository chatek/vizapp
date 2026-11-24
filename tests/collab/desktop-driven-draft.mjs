// desktop-driven-draft.mjs — drives the SHIPPED desktop service against the live pair.
//
// This is the test neither harness could be: it imports electron/main/suggestions-service
// (compiled fresh), constructs it the way index.ts does, and drives the exact public
// methods the renderer path uses — openSession + setDraft — then asserts the teacher-side
// subscriber receives the draft through the service's Micro fan-out.
//
// Prerequisites: the throwaway stack (broker 14299 + service 8089) and seeded principals,
// exactly as collab-e2e.mjs sets them up. Env: STUDENT/TEACHER nkeys+seeds, HOME pointing
// at the fixture credentials file.
import { connect, headers as natsHeaders } from './node_modules/nats/index.js'
import { default as teacherNkeys } from 'nkeys.js'

const results = []
let exitCode = 0
const log = (leg, pass, detail) => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${leg}  ${detail}`)
  results.push({ leg, pass, detail })
  if (!pass) exitCode = 1
}

const NATS_URL = 'nats://127.0.0.1:14299'
const STUDENT_NKEY = process.env.STUDENT_NKEY
const TEACHER_NKEY = process.env.TEACHER_NKEY

// ── import the SHIPPED service (compiled output, fresh — the stale-bundle lesson) ──
const { SuggestionsService, resolvePromptConfig, promptBearerTokenSource } = await import(
  '../../dist-electron/main/suggestions-service.js'
).catch(async () => {
  // Fall back to the TS source through tsx if the electron build output is absent.
  console.error('(dist-electron absent — using tsx to run the TS source directly)')
  return await import('../../electron/main/suggestions-service.ts')
})

// ── resolve the config the way index.ts does (VCLAW_PROMPTS=1 + fixture HOME) ──
const resolution = resolvePromptConfig({ VCLAW_PROMPTS: '1', VCLAW_PROMPTS_NATS_URL: NATS_URL, VIZREG_SEGMENT: 'vcc' }, { home: '/tmp/collab-desktop-home' })
if (!resolution.ok) {
  console.error(`config resolution failed: ${resolution.error} — the fixture credentials file must exist at /tmp/collab-desktop-home/.config/vclaw/credentials.json`)
  process.exit(2)
}
const config = resolution.config

// ── construct the service the way index.ts does ──
// The throwaway broker has no vgate to mint a NATS user JWT from, so the real
// connectSuggestionsNats fails ('vgate returned no NATS token'). We inject a
// connector that opens a PLAIN nats connection (the broker has no auth) and wraps
// it in the service's SuggestionsNatsLike: request with the minted assertion in
// NATS headers, subscribe for push. This is the ONLY fixture piece — everything
// else (the draft path, the Micro request, the body shape) is the shipped code.
const requestTokens = promptBearerTokenSource(config)
const service = new SuggestionsService({
  connector: async () => {
    const nc2 = await connect({ servers: NATS_URL })
    const _bearer = await requestTokens.token()
    return {
      subscribe: async (subject, handler) => {
        const sub2 = nc2.subscribe(subject)
        ;(async () => { for await (const m of sub2) handler(m.data) })()
        return () => sub2.unsubscribe()
      },
      request: async (subject, data, options) => {
        const header = natsHeaders()
        const token = await requestTokens.token()
        if (token) header.set('Authorization', `Bearer ${token}`)
        const reply = await nc2.request(subject, data, { timeout: options?.timeoutMs ?? 10_000, headers: header })
        return reply.data
      },
      authToken: () => requestTokens.token(),
      refreshAuthToken: () => requestTokens.refresh(),
      close: async () => { await nc2.drain() },
    }
  },
  config,
  throttleMs: 50,
})

// ── teacher-side subscriber (started before the student types) ──
const drafts = []
const nc = await connect({ servers: NATS_URL })
const teacherDraftSubject = `tenant.vcc.prompts.draft.${TEACHER_NKEY}`
const draftSub = nc.subscribe(teacherDraftSubject)
const draftDrain = (async () => {
  for await (const message of draftSub) {
    drafts.push(JSON.parse(new TextDecoder().decode(message.data)))
  }
})()

// Also intercept the Micro request to check the BODY shape
const draftRequests = []
const microSub = nc.subscribe('vizregistry.prompts.draft')
const microDrain = (async () => {
  for await (const message of microSub) {
    // Record the request body; reply with a service-shaped answer
    const body = JSON.parse(new TextDecoder().decode(message.data))
    draftRequests.push(body)
    message.respond(new TextEncoder().encode(JSON.stringify({ accepted: true, requestId: body.requestId ?? 'req', teachersOnline: 1 })))
  }
})()

// ── setup: follow + consent (the prerequisites the service checks) ──
const studentBearer = await requestTokens.token()
const teacherKp = teacherNkeys.fromSeed(new TextEncoder().encode(process.env.TEACHER_SEED))
const teacherNow = Math.floor(Date.now() / 1000)
const teacherB64 = (x) => Buffer.from(x).toString('base64url')
const teacherSi = `${teacherB64(JSON.stringify({ alg: 'ed25519-nkey', typ: 'JWT' }))}.${teacherB64(JSON.stringify({ iss: TEACHER_NKEY, sub: TEACHER_NKEY, aud: 'vizmaster-registry-vcc', tool: 'harness', iat: teacherNow, exp: teacherNow + 300, jti: crypto.randomUUID() }))}`
const teacherSig = teacherKp.sign(new TextEncoder().encode(teacherSi))
const teacherBearer = `${teacherSi}.${Buffer.from(teacherSig).toString('base64url')}`

const rest = async (method, path, bearer) => {
  const response = await fetch(`http://127.0.0.1:8089${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
    body: method === 'GET' ? undefined : JSON.stringify({}),
    signal: AbortSignal.timeout(10_000),
  })
  return response.status
}
await rest('PUT', `/api/me/follows/${TEACHER_NKEY}`, studentBearer)
await rest('PUT', `/api/me/follows/${STUDENT_NKEY}`, teacherBearer)
await rest('PUT', `/api/me/collab-consent/${TEACHER_NKEY}`, studentBearer)

// ── LEG 1: start the service ──
await service.start()
log('DD1 service-start', true, 'started without throwing')

// ── LEG 2: open a session (the consent gate) ──
const opened = await service.openSession({ action: 'open', peer: TEACHER_NKEY, conversationId: 'dd-conv-1' })
log('DD2 open-session', opened.ok === true && opened.data?.mutual === true,
  `ok=${opened.ok} mutual=${opened.data?.mutual} roomId=${opened.data?.roomId ?? 'none'}`)

// ── LEG 3: type a draft (the renderer path: setDraft) ──
const draftOutcomes = []
service.onDraftOutcome((outcome) => draftOutcomes.push(outcome))
service.setDraft({ text: '一元二次方程', locale: 'zh-CN' })

// Wait for the flush (the throttle is 50 ms; allow the Micro round trip)
await new Promise((resolve) => setTimeout(resolve, 2_000))

// ── LEG 4: the draft request BODY matches the contract ──
const request = draftRequests[0]
if (!request) {
  log('DD4 request-body', false, 'no Micro request on vizregistry.prompts.draft')
} else {
  const bodyOk =
    typeof request.roomId === 'string' && request.roomId.length > 0
    && typeof request.draft === 'string' && request.draft === '一元二次方程'
    && request.locale === 'zh-CN'
  const noExtras = Object.keys(request).every((key) => ['roomId', 'draft', 'locale', 'cursor', 'vizshowId', 'requestId', 'conversationId', 'at'].includes(key))
  log('DD4 request-body', bodyOk && noExtras,
    `roomId=${request.roomId?.slice(0, 10)}… draft="${request.draft}" locale=${request.locale} keys=[${Object.keys(request).join(',')}]`)
}

// ── LEG 5: the teacher-side subscriber received the draft through the fan-out ──
const received = drafts[0]
if (!received) {
  log('DD5 teacher-receives', false, `no draft on ${teacherDraftSubject}`)
} else {
  log('DD5 teacher-receives', received.draft === '一元二次方程',
    `draft="${received.draft}" roomId=${received.roomId?.slice(0, 10)}…`)
}

// ── LEG 6: the draft outcome reached the renderer (the IPC surface) ──
const outcome = draftOutcomes[0]
log('DD6 outcome-surfaced', outcome?.state === 'sent',
  `state=${outcome?.state} error=${outcome?.error ?? 'none'}`)

// ── LEG 7: no raw publish on the draft subject from this client ──
// The service fans out FROM the Micro request; the client never publishes directly.
// If the client had published, the teacher's subscriber would see a message with
// NO corresponding entry in draftRequests (the Micro intercept). We checked both:
// every message the teacher received must have a matching Micro request.
const unmatched = drafts.filter((d) => !draftRequests.some((r) => r.roomId === d.roomId && r.draft === d.draft))
log('DD7 no-raw-publish', unmatched.length === 0,
  `${unmatched.length} draft(s) without a matching Micro request`)

// ── teardown ──
await service.stop()
draftSub.unsubscribe()
microSub.unsubscribe()
await Promise.race([draftDrain, new Promise((r) => setTimeout(r, 500))])
await Promise.race([microDrain, new Promise((r) => setTimeout(r, 500))])
await nc.drain()

const passed = results.filter((r) => r.pass).length
console.log(`\n${passed}/${results.length} legs green`)
process.exit(exitCode)
