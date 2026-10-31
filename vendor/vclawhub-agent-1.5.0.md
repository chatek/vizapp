# vclawhub-agent 1.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk, Feature Sets 1+2: `status ·
doctor · signup · who · peers · send · inbox`). Vendored from the `npm pack` tarball built by the
agent-sdk lane; this is the artefact their installed-state E2E and their real-TUI
acceptance ran against.

- Tarball SHA-256: `c57f6a09e1d8013412cd703990146d2195cc26235a2e9015e25d63709409a6cd` (1,353,895 B, **371 files** — the session mailbox: the extension subscribes `tenant.<t>.a2a.<self>.>` for the whole session and drains into the CLI spool through ONE shared record builder, so CLI `inbox` and the drainer write identical bytes by construction). History: `1c90d0f0…` (FS1, CLI-only) → `50a5e9ec…` (FS2 CLI-only; the surface split) → `459b0b4f…` (all verbs in both surfaces) → this.
- Unpatched: base == patched, no `.patch`, `vendor:verify-patches` passes trivially.

## Pinned contents

| file | bytes | SHA-256 |
| `dist/pi-extension/index.bundled.js` → shipped as `assets/extensions/vclaw-agent.js` | 924,891 | `15cd7f64cd2302e2eb2a5f58501251457704272c10e8785edea1c34bdf7272f8` — all verbs + the session mailbox: subscribes `tenant.<t>.a2a.<self>.>` at session_start and drains into the CLI spool (shared record builder); failures are logged, never session-fatal; opt out with `VCLAW_AGENT_AUTOSTART=0`; starts only when an identity exists |
| `dist/ext-synadia/index.bundled.js` | 363,605 | `dee4e7232546f94e83f111d0cb4abda4423cc0fd510cd924e65fce84589206c6` — stable across four builds (canary) |
| `dist/cli.js` | 29,205 | `d0aec72e21413ce0a43199fe544713a0bdbb0b48fa16e84cf637d0ad83094cc5` |

Verified on this artefact (2026-10-31): both bundles import clean under `env -i`
(PATH only) with an empty `$HOME` — no credential read, no connect, no timer at
load (agent-sdk §8.7); zero non-builtin bare imports (§8.8). Installed state:
`vclaw-agent vclaw status|doctor|who|inbox --json` answers labelled degraded JSON
and exits 4 with no identity (the exit-1 inbox bug is fixed and stays fixed), send
usage exits 2, unknown verb exits 2. In a real interactive TUI: `/vclaw send`
prints its usage (exit 2), `/vclaw inbox` reports nothing-unread (exit 0), and a
no-identity `/vclaw inbox` reports the 4-class error (all measured on the
agent-sdk side, tmux-driven; the bundle digest above matches ours, so their
acceptance transfers). The SDK's own gate `npm run verify:pack`
(scripts/verify-pack.mjs) passes on this pack (368 files, 5 verbs, both bundles) —
prefer it over a bare `npm pack`.

## The rebuild trap (why the tarball is vendored, not rebuilt) — and its structural fix

agent-sdk's `.gitignore` carries `dist/*` with exceptions only for
`dist/pi-extension/` and `dist/ext-synadia/` — **`dist/cli.js` is not in git**, so
a clean checkout has no CLI bundle and an `npm pack` without a preceding `tsc`
ships whatever stale `cli.js` sits in the working tree. Measured 2026-10-31: a
pack without the build step produced a 28,324 B pre-`vclaw` CLI that answered
`unknown command 'vclaw'`. When bumping this vendoring, run the SDK's build before
`npm pack`, and diff the tarball digest against the row above — the
`ext-synadia` bundle is deterministic from unchanged source and must match
byte-for-byte, which makes it the drift canary.

The trap's SECOND half bit in the same round: the bundles are built by
`build:extensions`, which was NOT part of `npm run build` — so a pack could ship a
fresh CLI with a STALE extension bundle (measured on `50a5e9ec…`: the TUI had no
`send`/`inbox` while the CLI did). Fixed structurally in agent-sdk `47143d8`:
`npm run build` is now `tsc && npm run build:extensions`. **Invariant: the CLI and
the TUI cannot disagree unless the build stops producing a bundle.** Also for any
future TUI testing: `omp plugin link <dir>` refuses a hand-made directory ("No
omp/pi manifest") and `/vclaw` then silently falls through to the MODEL — link the
PACKAGE root, or (our route) inject the bundle file with `--extension`.

## Two environment names that are NOT the same switch

| variable | owner | meaning |
|---|---|---|
| `VCLAW_AGENT_EXTENSION_PATH` | this app | the injection path WE set for the shipped asset (`assets/extensions/vclaw-agent.js`, i.e. the pi-extension bundle renamed); `harness-adapter` turns it into `--extension` argv |
| `VCLAW_MANAGES_OPEN_URL` | agent-sdk | behaviour gate for `/vclaw signup`: when `1`, the extension does NOT spawn an opener and only prints `data.claimUrl` (precedence 1) |

This app deliberately does **not** set `VCLAW_MANAGES_OPEN_URL`: with no host-side
router for extension-printed URLs, precedence 1 would print a link that nothing
opens. The extension's best-effort `open`/`xdg-open` is therefore the single
opener for the signup link today. If the desktop ever routes extension output
through a link component, set the flag then — it is a one-line precedence on the
SDK side and is not set speculatively.

## Feature Set 2 consumer notes (measured on 50a5e9ec… and a511aa4b…, 2026-10-31)

- Uniform envelope CONFIRMED: top-level `code` === process exit, no `data.code`. The inbox exit-1 bug is
  FIXED and verified on a511aa4b… (installed state, empty HOME): inbox/status/who all exit 4 with json.code 4 —
  consumers may branch on exit codes again. Cause was an unclassified plain Error from openFabric(); now
  classified by cause (no-credentials/no-mailbox → 4, unreachable fabric → 3; a bare 1 = internal fault only).
- Spool contract as shipped: `~/.vclaw/inbox/<tenant>__<self8>.jsonl` (+ `.read.json` read-state), 0600,
  `kind`-first records with per-file monotonic `seq`, `conversationId` pass-through, `--prune` the only rewrite.
  The suffix landed before any consumer existed (measured on their fleet: `vclaw__UBNBJ35N.jsonl`). The desktop
  watches the DIRECTORY and re-tails from the last `seq`, deriving `self8` from the own nkey.
- ✅ **SURFACE SPLIT CLOSED (2026-10-31, artefact 459b0b4f…)**: the extension bundle now registers all five
  verbs — `/vclaw send` prints its usage (exit 2) and `/vclaw inbox` reports nothing-unread (exit 0) in a real
  TUI; a no-identity `/vclaw inbox` reports the 4-class error. Root cause was structural (`build:extensions` was
  not part of `npm run build`; see the rebuild-trap section). The FS2 verbs' exit codes were also re-classified
  (fabric failures → 3/4, never a bare 1).
- ✅ **DURABLE WHILE A SESSION IS OPEN (artefact c57f6a09…)**: the extension subscribes
  `tenant.<t>.a2a.<self>.>` for the whole session and drains every frame into the SAME spool the CLI reads — a DM
  sent while the host idles (no inbox running) is spooled and renders later (their cross-container measurement).
  ⚠ **NOT durable across a CLOSED host**: with no session running the fabric does not replay — that needs a
  broker-side durable consumer (JetStream/queue), which this fabric does not grant agents today.
  HONEST INBOX LABELS (freeze these): **LIVE** (session open, subscription healthy) | **CACHED** (spool read,
  session closed — may have gaps) | **UNAVAILABLE** (no identity / no fabric). Never "complete".
  Opt-out: `VCLAW_AGENT_AUTOSTART=0`. The mailbox starts only when an identity exists — no identity, no
  subscribe, no error noise.

Artefact history: `50a5e9ec…` (FS2, 1,348,203 B) → `a511aa4b01287c62b9e5fbfdbc9860d54e0bec65b1074e02f216b7167c43218f`
(1,349,041 B, 368 files). Inner digests UNCHANGED between them (pi `994a3913…`, ext-synadia `dee4e723…`, cli
`d0aec72e…`) — the delta-2 fixes live in `dist/vclaw/{fabric,inbox-store}.js`, which only the CLI loads; the
shipped bundle asset is byte-identical, so no desktop functional change from that bump. Then `459b0b4f…` (this
pin, 1,352,692 B): `build:extensions` joined `npm run build` (agent-sdk `47143d8`) and the bundle REGENERATED
(pi-extension → `3b3533d2…`, 911,226 B) — the first artefact whose TUI surface carries the full verb table and
the classified exit codes.
