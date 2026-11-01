# vclawhub-agent 1.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk, Feature Sets 1+2: `status ·
doctor · signup · who · peers · send · inbox`). Vendored from the `npm pack` tarball built by the
agent-sdk lane; this is the artefact their installed-state E2E and their real-TUI
acceptance ran against.

- Tarball SHA-256: `07ff87a52a88dd98c56ce79d126b16481794694886df58b121cbd5697635cc7f` (921,619 B, 353 files — agent-sdk f192d22, published bytes, vendor-by-digest not by rebuild. Members: `bin dist skills jsr.json package.json README.md UPGRADE.md CHANGELOG.md`. 14 verbs incl. `up`; the shipped bundle is byte-identical to the pin's own committed dist.
  **Supersedes `88a14d16…` (433 files, 1,201,433 B).** Two changes made that supersession worth taking: (i) `scripts/` is out of `files`, so the harness can no longer ship inside the artefact it checks, and `ARTIFACT_SHA` has no baked default (`ARTIFACT_SHA="${ARTIFACT_SHA-}"`) — an artefact cannot pin itself, and the old baked value always named the PREVIOUS pack; (ii) `docs/`, `packages/` and `.github/` are out of the consumer surface (80 fewer files), `dist/` still carries both bundles so `/vclaw` and `/ext-synadia` are unaffected.
  **The tarball published for 79d781a remains QUARANTINED, never vendored.** It shipped 45 files no clean build produces, including `package/.env` (238 B, carrying NPM_TOKEN and JSR_TOKEN), `package/dist/agent.js` (1,858,301 B) and 42 files under `package/dist/autonomous/` — 408 files against 363 from a clean build. Root cause: no `files` allowlist and a `.npmignore` that never excluded `.env`; `npm pack` reads the FILESYSTEM, so a file `.gitignore` hides from git still ships. **A digest proves identity, never safety: extract and list any tarball before vendoring it.**
  **Reproducibility, settled**: the BUILD is reproducible — `bun install --frozen-lockfile` + `bun run build` yields the same bundle on both lanes, while `npm install` yields a different one because npm ignores `bun.lock` (the sole lockfile). The TARBALL DIGEST is not portable, so this row pins the BYTES that are committed here; it is never re-derived from a rebuild to 'verify' a vendoring.

- Unpatched: base == patched, no `.patch` — but this archive is **not** skipped by the vendor gate:
  `npm run vendor:verify-patches` pins its digest and size and proves by extraction that
  `dist/pi-extension/index.bundled.js` is byte-identical to the shipped
  `assets/extensions/vclaw-agent.js` (the pairing is enforced by
  [`vendor-agent-pins.mjs`](../scripts/release/vendor-agent-pins.mjs) and re-checked by
  `tests/release-vendor-agent.test.ts`). A re-vendor that forgets to update this note, or a bundle
  swapped without a re-vendor, fails the gate.

## Pinned contents

| file | bytes | SHA-256 |
| `dist/pi-extension/index.bundled.js` → shipped as `assets/extensions/vclaw-agent.js` | 1,002,518 | `699f45271116419836af514414f1b7fa1cb79dc2082a26d881f459f0f031909e` — 14 verbs incl. `up`; member == the pin's committed dist == shipped |
| `dist/ext-synadia/index.bundled.js` | 364,074 | `dee4e7232546f94e83f111d0cb4abda4423cc0fd510cd924e65fce84589206c6` — stable across five builds (canary). *This row said 363,605 until 2026-10-31: the digest was right and the count was not.* |
| `dist/cli.js` | 30,280 | `8561399b3ee0174b3d91ef4bff798d5684c85a6f5245f2d3052193f77cb16c7c` — the wrapper maps commander's unknown-option exit(1) into the usage class (2), help/version stay 0: **exit 1 exists nowhere in the binary** (desktop-lane D4 finding). *This row said 29,412 until 2026-10-31: same defect, right digest and wrong count.* |

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
- ⚠ **ROOT CAUSE, CORRECTED (do not harden the wrong story)**: the pre-drainer message loss was NOT a wrong-plane
  subscription. Measured with `VCLAW_DEBUG=1` in a live TUI: `SUBJECT_ROOT` is ADOPTED FROM THE JWT at runtime, so
  `subA2A` was on `tenant.vclaw.a2a.<self>.>` — the same subject `send` publishes to. The frame WAS received; the
  handler then required a reply path (`env.a2a.replySubject || msg.reply`), `send` sets neither, so it took the
  no-reply branch, logged to stderr, and DROPPED — and the CLI inbox's 3-second listen window made it invisible to
  the human too. RECEIVED → LOGGED → DROPPED. A wrong-plane theory would send the next reader hunting a bug that
  does not exist. Full audit: `docs/lanes/VCLAW_MESSAGING_AUDIT_2026-10-31.md` (agent-sdk, parent `7c7c03c1`).
- 🔒 **AUDIT FINDINGS that shape the inbox pane** (same audit): (F2, MEDIUM, accepted) A2A pub is tenant-wide
  (`tenant.vclaw.a2a.>`), so any agent can DM any peer at any rate and set `from.nkey` to anything — **`from` is a
  claim, not an identity**; the pane must keep labelling it as one. (F5, design rule) The no-reply discard is a
  SECURITY feature — an unauthenticated frame never reaches the model; spool everything, inject only what a human
  or a reply path asked for, and treat any future "inject no-reply DMs into the agent" change as a trust-boundary
  change, not a bug fix. (F3/F4, LOW) replay is id-dedupe only (re-signed frames indistinguishable); send has no
  byte cap (server default 1 MB, fail-at-publish).
- 🔎 **CLASS TO WATCH**: both this defect and the earlier `$SRV.INFO.agents.default.>` violation came from a
  CONSTANT defaulting to `'default'` leaking into a subject before the JWT tenant is adopted. Grep constants in
  subject construction, not verbs.
  MINT HALF VERIFIED CLEAN (2026-10-31, agent-sdk audit "Mint-side verification"): vgate builds every subject
  from the configured/resolved segment (`token.go:344,345,352,385,386`; `cmd/vgate/main.go:454,833,1435`) — no
  literal `"default"` builds a subject. One residual, LOW and `[INFERENCE]`: `approve.go:522` falls back to
  `segmentname.Canonical` (`"vclaw"`) for an admin record with an empty segment — a hardcoded deployment value
  that silently ATTRIBUTES to vclaw instead of refusing; harmless while vclaw is the only segment, and
  refusing should become the default the moment a second one is real.

Artefact history: `50a5e9ec…` (FS2, 1,348,203 B) → `a511aa4b01287c62b9e5fbfdbc9860d54e0bec65b1074e02f216b7167c43218f`
(1,349,041 B, 368 files). Inner digests UNCHANGED between them (pi `994a3913…`, ext-synadia `dee4e723…`, cli
`d0aec72e…`) — the delta-2 fixes live in `dist/vclaw/{fabric,inbox-store}.js`, which only the CLI loads; the
shipped bundle asset is byte-identical, so no desktop functional change from that bump. Then `459b0b4f…` (this
pin, 1,352,692 B): `build:extensions` joined `npm run build` (agent-sdk `47143d8`) and the bundle REGENERATED
(pi-extension → `3b3533d2…`, 911,226 B) — the first artefact whose TUI surface carries the full verb table and
the classified exit codes.
