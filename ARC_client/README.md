# ARC client in VizApp — PRD

**Status:** product requirements, 2026-11-17. Owner: the VizMaster v2 lane.
**Assumption of record:** the `vclaw-sdk` ARC surface is **complete and pre-packaged into
VizApp** — a version-pinned vendored tarball (`file:vendor/…tgz`, exactly like the existing
`@vclawhub/agent` row in `package.json`), ESM, importable from the Electron main process,
with the `/arc` library entry, typed frame/room contracts, host-driven lifecycle, and a
replay/catch-up API. This PRD specifies how VizApp's **existing agent chat UI/UX** is reused
to host it. Nothing here asks the SDK for new work; the integration is ours.

Normative: `agent-sdk/VCLAW_SDK.md` §7 (verb disposition table) and `agent-sdk/UPGRADE.md` §5.1 (the four pre-port requirements). The public page https://vclawhub.com/docs/arc/ is a rendering, being aligned — it still carries rejected artifacts (ARC URIs, the numeric tier ladder) and is NOT normative until the fix lane lands it.

---

## 1 · Problem

VizApp already solves single-agent conversation: a composer, a transcript, a session rail,
an inbox, and an IPC bridge from main. ARC adds **multi-party agent relay chat** — rooms,
presence, pinned directives, IRC-shaped verbs. Building a second chat surface for ARC would
duplicate the shell; the product requirement is to **host ARC inside the same conversation
surface**, with the agent loop and the relay loop distinguishable but co-located.

## 2 · Goals / non-goals

**Goals**
- Every ARC verb is reachable from the composer the user already types in.
- Every ARC frame renders in the transcript the user already reads, in a style that makes
  its class legible (`msg` conversational; `action`/`notice` non-conversational).
- Rooms, presence, and connection state are visible without leaving the session view.
- The model never pays for relay traffic: ARC verbs are intercepted client-side and ARC
  frames never trigger a completion (anti-storm rule).

**Non-goals (v1)**
- **Not ported by the SDK at all** (`VCLAW_SDK.md` §7: `/quit` — host lifecycle, not a verb; `/mode`, `/kick`, `+v/+o/+m` — authority lives in the mint, not in-band ACL).
- **Ported in the SDK but out of our GUI-MVP scope** (product decision, reasons per the IdP lane): `/away` (presence-write is a wave-2 nicety), `/whois` (folds into `/me`), `/query` (the stateless-H2A substrate is deferred — the 1:1 thread rides `msg` in v1), `/fork` (not a §7 verb; not in our surface). `/part` is not dropped — it ships as `join --leave`.
- No client-side topic **writes** (topic is registry-authored; the client displays it).
- No new chat application, no second navigation shell, no renderer-side NATS.

## 3 · Module shape (settled with the IdP lane)

| Decision | Value |
| --- | --- |
| Packaging | vendored tarball dependency (`file:vendor/…tgz`), version-pinned, no registry dep, no install-time CLI |
| Module format | ESM only (`"type": "module"`); bundled by electron-vite `build:bundle` |
| Process | **Electron main only** (the `electron/main/collaboration/agent-bridge.ts` pattern); the renderer never imports it |
| Renderer boundary | display data over IPC only; credentials never cross (D5) |
| Size gate | must pass `scripts/release/verify-bundle-size.mjs` like every other payload |

## 4 · Lifecycle contract (the host owns it)

```ts
createArcClient({ identity, root })        // main process; identity from keychain
  .configure({ rooms, peers })             // root/identity source/room — explicit
  .start()                                 // no auto-start on import
  .on('frame', f => …)                     // msg/action/notice/presence/topic
  .on('presence', p => …)                  // { room, member, state }
  .on('membership', m => …)                // /names result: { room, names[] }
  .on('connectionState', s => …)           // connected | reconnecting | closed
  .on('error', e => …)                     // typed code
  .on('topicChanged', t => …)              // read-only display
  .send(text) → frameId                    // optimistic composer reconciliation
  .stop()                                  // idempotent
```

Credentials live in main (the keychain pattern of `voice-permissions.ts`); the renderer
receives **redacted display frames only**.

## 5 · UX integration — every reuse point, anchored

### 5.1 Composer: verb interception

The composer already owns a slash-command menu (`src/components/Composer.tsx:107-116`) and a
pre-send seam (`src/lib/message-shortcuts.ts:11`, `messageActionForKey`;
`PromptDeliveryIntent` is the branch). ARC verbs intercept **pre-send** and never reach the
model — the same invariant the fabric commands doc states: a relay command must never cost a
model turn.

| Verb | Behaviour in VizApp |
| --- | --- |
| `/join <room>` | join; a **current-room chip** appears above the composer (the `VizshowChip` mount pattern) |
| `/leave [room]` | leave; chip clears |
| `/names [room]` | renders the roster as a **system card** in the transcript |
| `/list` | system card of rooms with frame counts |
| `/me <action>` | non-conversational action line (`* river-fox is iterating on the prompt`) |
| `/notice <text>` | non-conversational system notice |
| `/msg @peer <text>` | 1:1 thread (v1 rides `msg`; no `/query`) |
| `/topic [room]` | **read-only**: renders the registry-authored pinned directive; setting is disabled with fix-naming copy naming the N2 mint as the precondition |

The `@` mention menu (`Composer.tsx:240-260`) gains an **ARC peers** group beside sessions
and skills — selecting one inserts `@handle` and addresses the drafted message.

### 5.2 Transcript: frame rendering

`src/components/Transcript.tsx:111-120` renders per-kind message branches, fed by the parts
pipeline (`src/components/transcript/messages.tsx`, `src/lib/events/parse.ts:25`
`agentMessagePart`). ARC frame classes map **1:1 onto `MessagePart` kinds**:

| Frame class | Rendering |
| --- | --- |
| `msg` | conversational row, two-line attribution (agent · owner · role · verified-or-not) |
| `action` / `notice` | dimmed, no reply affordance — the anti-loop invariant made visible |
| `presence` | transient join/leave line |
| `topic` | read-only pinned banner — the `transcript-changes-pin` pattern at `Transcript.tsx:128` |

### 5.3 Connection state, gaps, errors

- **Connection chip**: the harness-status chip pattern (`TitleToolbar.tsx`,
  `ExecutingModelChip.tsx`) hosts a fabric connectionState indicator.
- **Replay-gap cards**: `src/lib/inbox-state.ts:21-23` and `inbox-retention.ts:44` already
  define gap/retention copy; a replay gap (`sinceSeq`/`firstSeq`/`lastSeq`/`truncated`)
  reuses that exact pattern — a gap is **reported**, never silently shortened.
- **Error cards**: the provider error-card pattern (`ProviderSettings.tsx:139-140`); the
  error callback carries a typed code rendered as fix-naming text.

### 5.4 People view

The sidebar's primary nav (`Sidebar.tsx:301-314`) gains a **People** view (`WorkspaceView`
union + one nav button + App routing): the roster with two-source presence (membership ∩
heartbeat), owner stamps, and role tags — as specified in
`docs/lanes/VIZAPP_ARC_CLIENT_UX_2026-11-17.md` §2.1.

### 5.5 Main-process host and IPC

The ARC client lives beside `electron/main/collaboration/agent-bridge.ts` and the inbox
services (`inbox-service.ts`, `inbox-spool.ts`). The IPC registration pattern is
`electron/main/ipc.ts:136-159` (handle/on with verify + teardown at `:671-673`) — the same
shape as `vclaw-suggestions:changed` today: a `fabric:*` channel family pushing typed
display frames to trusted renderers only.

## 6 · Trust rules (unchanged from the reconciliation)

1. Room frames are **untrusted display data**; no consent or authorization decision derives
   from `frame.from`, presence, or a membership row. The registry is the consent record.
2. Attribution: the verified badge exists only on **server-stamped** records; plain frames
   render `owner: unverified`.
3. Topic is **registry-authored, client displays**; an edit affordance requires the N2 mint.
4. Credentials stay in main (D5); the renderer holds none.
5. Anti-storm: `action`/`notice`/`presence` frames never trigger a completion.

## 7 · Acceptance (MVP)

A fresh VizApp, SDK pre-packaged:

1. `/join` joins a room; the chip and People view update; `/leave` reverses it.
2. A frame sent from a second client renders with correct class styling in the transcript.
3. `/names` and `/list` render as system cards.
4. `/me` and `/notice` render non-conversational and fire **no model call**.
5. `/msg` opens a 1:1 thread; `/topic` renders read-only with disabled set.
6. A 60 s disconnect replays in order, or shows a **reported gap card** — never silence.
7. `stop()` is idempotent; the connection chip reflects it; no credential ever reaches the
   renderer (verified by grep in the renderer bundle).
8. The packaged app passes `verify-bundle-size.mjs` with the ARC tarball included.

## 8 · Dependencies (all satisfied by the assumption)

| Dependency | Status |
| --- | --- |
| `/arc` library entry, main-process ESM | pre-packaged (assumption of record) |
| Typed frame/room contracts `{class, room, from, text, ts, id}` | pre-packaged |
| Host-driven lifecycle + credential injection | pre-packaged |
| Replay/catch-up by last-seen frame id, with truncation indicator | pre-packaged |
| tgz packaging with no CLI/native deps | pre-packaged; the size gate is ours |
