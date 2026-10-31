# Durable inbox — host wiring design (pull path)

**Status:** design note only. The endpoint **does not exist**; nothing here is coded, and nothing
should be coded against a stub — a stub would become a second truth about the wire shape.
**Scope:** the vclaw-desktop half of durable inbox: where the URL comes from, which credential signs
the request, what the UI does when it fails. The server half (spool, `serverSeq` allocation) is
agent-sdk/vgate's.

## Frozen contract (restated, not invented)

```
GET <vgateUrl>/v1/agent/inbox?since=<serverSeq>&limit=<n>
  -> { agent, messages[], latest, more }
```

- each record is the spool record **plus** `serverSeq`.
- the spool record is fixed today in `agent-sdk/src/vclaw/inbox-store.ts` · `InboxRecord`:
  `kind:"message", v:1, seq, id, ts, from, fromName?, conversationId?, subject, body, digest, recvTs`.
- `latest` is the cursor to store; `more` says the page was full.

## 1. Where the URL is configured

**Measured: nowhere in vclaw-desktop.** `grep -rn "vgate\|VCLAW_API_URL\|apiUrl\|fabricUrl" electron src`
returns nothing, and `AppSettings` (`src/types/api.ts`) has no endpoint field — `browserHome` is its
only URL.

The single truth already exists and is not ours:

```
~/.config/vclaw/config.json  ->  { vgateUrl?, server? }
agent-sdk/src/vclaw/fabric.ts: openFabric()  ->  cfg?.vgateUrl ?? process.env.VCLAW_API_URL ?? "https://api.vclawhub.com"
```

**Decision: the desktop adds no second URL field.** It reads that file read-only (display only) and
must not persist an override, because a second configured endpoint is a second authority — and the
estate rule is that a surface may render another authority's decision, never compute one. If an
override is ever wanted, it belongs in that file, next to the value the extension already uses.

## 2. Which credential signs the request

The fabric **device JWT**, minted by vgate from the agent NKey seed
(`fetchNatsUserJWT(vgate, public_key, seed)`), sent as `Authorization: Bearer`. There is no token
exchange and no cookie.

Seed custody does not move. `~/.config/vclaw/credentials.json` (0600, S-form seed) belongs to the
extension/CLI; the desktop reads it today for nothing and must keep it that way.

| shape | who mints/uses the JWT | verdict |
|---|---|---|
| **A (recommended)** pull executed by the vendored extension through the existing `AgentCommand` bridge; the desktop renders rows | extension | no new secret path; reuses `openFabric()` and its classifier |
| **B** desktop spawns `vclaw-agent vclaw inbox --json --sync` (client half, W4-4) and parses the envelope | CLI subprocess | acceptable; still no seed in the desktop |
| C desktop reads `credentials.json` and mints JWTs itself | desktop | **rejected** — duplicates secret custody and the 0600 boundary |

## 3. Local state is not the server state

`agent-sdk/src/vclaw/inbox-store.ts` says the spool is *"one spool per TENANT (the consumer contract
with vclaw-desktop, which fs.watches it)"*. **Measured: the desktop contains zero references to
`inbox` or `spool`** — that consumer does not exist. So the wiring defines it, and must not create
competing truth:

- spool (local, at-most-once, `~/.vclaw/inbox/<tenant>.<self8>.spool.jsonl`, append-only, `seq`)
  is what the window *saw*;
- server (`serverSeq`, `latest`) is what the gateway *holds*;
- the pane shows the server page, annotates rows the spool already has (by `id`/`digest`), and shows
  the difference as *"not captured locally"* rather than as an empty list.
- **Read state has one writer.** Today that is the CLI (`<self>.read.json`). The desktop must not
  write it until the CLI exposes read/unread through the bridge; a second writer is how a message
  becomes read twice or never.

## 4. Failure mapping (the part that must not be improvised)

The class taxonomy is already decided in one place — `classifyFabricError` in
`agent-sdk/src/vclaw/fabric.ts` — and this pane reuses the mapping instead of inventing UI-only
error text.

| condition | class | pane |
|---|---|---|
| `403 agent_not_claimed`, "not claimed", "already issued" | **4** — identity not ready | labelled degraded: "claim not approved yet"; **no retry loop**, it needs a human; link to the claim flow |
| `401` with no identity on host | **4** | "not onboarded"; point at signup |
| timeout, `ECONNREFUSED`, DNS failure, `5xx` | **3** — dependency unavailable | degraded + explicit retry with backoff |
| malformed body / unknown `v` | **3** | degraded, show the parse reason verbatim |
| empty page, `more=false`, `latest` unchanged | none | "nothing new" — distinguishable from every state above |

Never: a generic "failed" (that was the measured defect in `inbox` previously — a pending-claim 403
escaped as exit 1, a class outside the contract), and never a silently empty pane.

## 5. Acceptance for when the endpoint lands

1. Fixture server serving the frozen shape: every record's spool fields byte-identical to the local
   spool record, plus `serverSeq`; `latest`/`more` honoured.
2. `403 agent_not_claimed` → class 4 (asserted, not observed); hang past the deadline → class 3.
3. A static test that the desktop never reads `~/.config/vclaw/credentials.json` (grep-level, plus a
   temp `HOME` in the test), so shape C cannot creep in.
4. Pane distinguishes the four rows of the table above in a renderer test.

## Open questions for the owner of the server half

- `since` semantics: `0` = replay from the first retained record, or "start from now"? At-most-once
  delivery makes this a product decision, not a detail.
- `limit` bounds: suggest default 100, hard max 500, and `more` derived from that bound.
- Who allocates `serverSeq` — vgate spool or the fabric — and does it survive a gateway restart?
