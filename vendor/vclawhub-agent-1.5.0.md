# vclawhub-agent 1.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk, Feature Set 1: `status ·
doctor · signup · who · peers`). Vendored from the `npm pack` tarball built by the
agent-sdk lane; this is the artefact their installed-state E2E ran against.

- Tarball SHA-256: `50a5e9ecae59e6ed6c99629236e39da7fa8dc879b8cb4a46c3ac5fd327670c36` (1,348,203 B, **368 files** — Feature Set 2: `send` + `inbox`, uniform top-level `code`, frozen digest spec, tenant-keyed append-only spool). Historical: `1c90d0f0…` (355 files, FS1) matched its quote exactly; the earlier `798cb588…` quote was superseded before it existed on disk.
- Unpatched: base == patched, no `.patch`, `vendor:verify-patches` passes trivially.

## Pinned contents

| file | bytes | SHA-256 |
| `dist/pi-extension/index.bundled.js` → shipped as `assets/extensions/vclaw-agent.js` | — | `994a3913d65b3785a9b02d05aa6f0ffbe071eb7170f034f538105ab7690f3b25` |
| `dist/ext-synadia/index.bundled.js` | — | `dee4e7232546f94e83f111d0cb4abda4423cc0fd510cd924e65fce84589206c6` — CHANGED at agent-sdk `31ac4de` (the G14 one-prompt-in-flight fix genuinely touched this package; the canary fired and the change was verified real, not staleness) |
| `dist/cli.js` | 29,205 | `d0aec72e21413ce0a43199fe544713a0bdbb0b48fa16e84cf637d0ad83094cc5` |

Verified on this artefact (2026-10-31): both bundles import clean under `env -i`
(PATH only) with an empty `$HOME` — no credential read, no connect, no timer at
load (agent-sdk §8.7); zero non-builtin bare imports (§8.8). Installed state:
`vclaw-agent vclaw status|doctor|who --json` answers labelled degraded JSON and
exits 4 with no identity, unknown verb exits 2; after a real `/vclaw signup` in an
interactive TUI (isolated HOME), `status` reads `pendingClaim: true` and `who`
answers the contracted `403 agent_not_claimed` with exit 3. The SDK's own gate
`npm run verify:pack` (scripts/verify-pack.mjs) passes: "355 files, 5 verbs, both
bundles present, no tests shipped" — prefer it over a bare `npm pack`.

## The rebuild trap (why the tarball is vendored, not rebuilt)

agent-sdk's `.gitignore` carries `dist/*` with exceptions only for
`dist/pi-extension/` and `dist/ext-synadia/` — **`dist/cli.js` is not in git**, so
a clean checkout has no CLI bundle and an `npm pack` without a preceding `tsc`
ships whatever stale `cli.js` sits in the working tree. Measured 2026-10-31: a
pack without the build step produced a 28,324 B pre-`vclaw` CLI that answered
`unknown command 'vclaw'`. When bumping this vendoring, run the SDK's build before
`npm pack`, and diff the tarball digest against the row above — the
`ext-synadia` bundle is deterministic from unchanged source and must match
byte-for-byte, which makes it the drift canary.

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

## Feature Set 2 consumer notes (measured on 50a5e9ec…, 2026-10-31)

- Uniform envelope CONFIRMED on status and send: top-level `code` === process exit, no `data.code`.
  **Open bug filed with the SDK lane**: `inbox --json` with no identity exits **1** (`ok:false, state:"unavailable"`)
  — outside the frozen set {0,2,3,4}; no-identity should be 4. Until fixed, consumers must not branch on
  exit codes alone for inbox.
- Spool contract as shipped: `~/.vclaw/inbox/<tenant>.jsonl`, 0600, `kind`-first records with per-file monotonic
  `seq`, `conversationId` pass-through, `--prune` the only rewrite. The desktop watches the DIRECTORY and re-tails
  from the last `seq`. Pending decision with the SDK lane: suffix the filename with the own-identity prefix
  (`<tenant>__<self8>.jsonl`) before the first consumer ships, to keep a second identity on one host from
  interleaving into the same file.
- ⚠ **AT-MOST-ONCE today**: no standing subscription — a DM sent while nobody is subscribed is NOT replayed.
  The spool is durable for what was received; it is not a mailbox. Do not treat it as complete until the
  SDK lane lands the session_start subscription.
