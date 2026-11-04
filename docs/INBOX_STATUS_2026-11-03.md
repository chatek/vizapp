# vclaw inbox — status report (2026-11-03)

One page, measured from the tree. What exists, what is designed but not built, and the
prototype harness that landed with this report.

## 1. Architecture as it stands (all of this is LIVE code)

```
agent-sdk writes                    desktop reads
~/.vclaw/inbox/<tenant>__<self8>.jsonl      (0600, append-only, one JSON record/line, seq monotonic per file)
        │
        ▼  fs.watch on the DIRECTORY (a --prune rewrite replaces the inode; a file watch
           would go silent on the exact event that matters)
VclawInboxService        electron/main/inbox-service.ts
  re-reads whole, merges by seq (union — a truncated file never erases a shown row),
  warns when the spool mode is not 0600, debounces 120 ms
        │  IPC  vclaw-inbox:read  +  vclaw-inbox:changed (fanned to renderers)
        ▼
window.prime.inbox       electron/preload/index.ts (frozen)
        ▼
InboxPanel               src/components/inspector/InboxPanel.tsx  (Inspector right panel, "Inbox" tab)
```

Spool discovery is by **directory scan**, not name composition: the filename carries a
tenant token that would otherwise have to be decoded from a JWT (`findSpoolPath`), and a
scan is rename-tolerant by construction. The own identity is `self8` — the first 8 chars
of the nkey in `~/.config/vclaw/credentials.json`, the only thing read from that file.

## 2. The frozen contract (do not invent beside it)

- Record: `kind:"message", v:1, seq, id, ts, from, fromName?, conversationId?, subject,
  body, digest, recvTs` — pinned at `bf1e237f` (bundle `407c8722`), `agent-sdk/src/vclaw/inbox-store.ts`.
- **State vocabulary is three labels and nothing finer**: `LIVE | CACHED | UNAVAILABLE`.
  There is deliberately no "complete" — the fabric grants agents no durable consumer, so
  with the session closed the spool is what was *captured*, not what was *sent*.
- `from`/`fromName` are **asserted by the sender** (A2A publish is tenant-wide) and are
  rendered as a claim — the pane labels them "(asserted)" forever.
- `seq` is authoritative for ordering; `serverSeq` (when it exists) is only a sync cursor
  and must never sort rows.
- Retention math (`src/lib/inbox-retention.ts`): gateway = 7-day TTL / 500 msgs / 1 MB;
  local = 2,000 lines, no TTL. Three divergences, **none of which may render as an empty
  list**: not-captured-locally / captured-locally-gateway-dropped / gone-for-good
  (`expiredThrough` → a persistent loss line ABOVE the rows, rows kept).

## 3. Designed but NOT built (the design doc is honest about this)

`docs/DURABLE_INBOX_PULL_DESIGN.md` — the durable pull path. **The endpoint does not
exist**; nothing is coded against a stub, because a stub would become a second truth
about the wire shape. Already decided there:

- `GET <vgateUrl>/v1/agent/inbox?since=&limit=` → `{agent, messages[], latest, more,
  expiredThrough?}`; limit default 100 / max 500; `since=0` answers from the first
  retained record with `expiredThrough` (measured from `docs/C19_INBOX_ENDPOINT.md`).
- The URL comes from `~/.config/vclaw/config.json` — the desktop adds **no second URL
  field** and persists no override.
- Credential: the fabric device JWT minted from the nkey seed, held by the **extension**
  (shape A) or the CLI subprocess (shape B). Shape C — desktop reads `credentials.json`
  and mints JWTs itself — is **rejected** (duplicate secret custody).
- Failure classes reuse `classifyFabricError` (agent-sdk), never improvised UI text:
  403-not-claimed → class 4, no retry loop; timeout/5xx → class 3, retry with backoff.

**Consequence for today's UI:** the panel types already carry `serverSeq?` and
`expiredThrough?` (forward-prepared), and `retentionRows()` accepts a `server` set — but
no code path can supply one, so the divergence *notes* are unreachable from real data
today. Only the loss line is reachable (the field survives in the snapshot), and only if
something sets it.

## 4. What the pane does NOT do (measured gaps, not wishes)

- **No reply / compose.** The pane is read-only by design; nothing in the spool contract
  or the IPC surface carries an outbound path.
- **No read-state writing.** One writer rule: the CLI owns `<self>.read.json`; the
  desktop renders `read` from the spool record and must not write it until the CLI
  exposes read/unread through the bridge.
- **No threads.** `conversationId` is carried on every record and **not rendered as
  grouping** — it appears nowhere in the panel today.
- **No pagination, search, or filtering**; no digest verification surface (the digest
  field is carried, unshown); no notifications beyond the in-app panel.

## 5. The prototype harness (landed with this report)

The interesting pane states are states of the *world* — most cannot be produced on demand
from a real spool. The harness swaps the data source in dev so the SAME markup can be
designed against every state, with hot reload and no backend:

| file | role |
|---|---|
| `src/lib/inbox-fixtures.ts` | nine named `VclawInboxSnapshot` fixtures: `live-busy`, `live-threaded`, `cached-synced`, `cached-gaps`, `loss-line`, `divergence`, `mode-warning`, `unavailable`, `empty` |
| `src/hooks/useInboxSnapshot.ts` | the pane's single data source: preload, or a dev fixture from `localStorage['vclaw.inbox.fixture']`. While a fixture is selected it never touches `window.prime` |
| `InboxPanel.tsx` | a fixture bar rendered only under `import.meta.env.DEV` (statically replaced, so it is dead-code-eliminated from production builds) |
| `tests/frontend/inbox-fixtures.test.tsx` | 6 tests: fixtures internally consistent; loss line appears exactly when declared; each state renders through the shipped markup; the no-fixture path reads the real spool through preload |

Use: `npm run dev` → open the Inspector (right panel) → **Inbox** tab → the dashed
fixture bar above the header. `spool` = the real thing; every other chip is a fixture.
Switching re-reads exactly like the spool watcher firing, so loading states are exercised
too.

The `divergence` fixture exists precisely because that state is unreachable from real
data (§3): when the sync endpoint lands, that fixture becomes the acceptance reference
for the notes' wording, and the harness retires nothing.
