# vclawhub-agent 1.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk, Feature Set 1: `status ·
doctor · signup · who · peers`). Vendored from the `npm pack` tarball built by the
agent-sdk lane; this is the artefact their installed-state E2E ran against.

- Tarball SHA-256: `1c90d0f0e75f5294f52f16623b22699e7a5700d49cba9cfc6ee4c11943899b0c` (1,330,102 B, **355 files** — the `test/` tree is excluded from the pack; the one nested `dist/pears-sidecar.tgz` is the sidecar payload, not the stray-root-tarball defect the SDK lane excluded)
- ⚠ WRAPPER DISCREPANCY (2026-10-31): the agent-sdk lane quoted `798cb588…`
  (1,533,210 B) for this build; the file at `agent-sdk/vclawhub-agent-1.5.0.tgz`
  hashed `1c90d0f0…` instead. Every INNER digest matches their message exactly
  (pi-extension `2eaa5323…`, ext-synadia `c8585e4b…`, cli.js `d0aec72e…`), so the
  contents are their build; only the tarball wrapper differs — a repack after the
  quote, the same stale-by-builds hazard they flagged. Pin what was measured.
- Unpatched: base == patched, no `.patch`, `vendor:verify-patches` passes trivially.

## Pinned contents

| file | bytes | SHA-256 |
| `dist/pi-extension/index.bundled.js` → shipped as `assets/extensions/vclaw-agent.js` | 897,449 | `2eaa5323c61c7674b8d1b0abe66d8b5852536dd9dd692697fca0fcf04c0378cb` |
| `dist/ext-synadia/index.bundled.js` | 363,605 | `c8585e4ba69c53397043a3f97fdbff0d920656383845734ae7e18f42ea1beeb2` |
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
