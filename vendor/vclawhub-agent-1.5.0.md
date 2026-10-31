# vclawhub-agent 1.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk, Feature Set 1: `status ·
doctor · signup · who · peers`). Vendored from the `npm pack` tarball built by the
agent-sdk lane; this is the artefact their installed-state E2E ran against.

- Tarball SHA-256: `1c90d0f0e75f5294f52f16623b22699e7a5700d49cba9cfc6ee4c11943899b0c` (1,330,102 B)
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
load (agent-sdk §8.7); zero non-builtin bare imports (§8.8); `npm install` of the
tarball then `vclaw-agent vclaw status|doctor|who --json` answers degraded and
exits 4 with no identity, unknown verb exits 2.

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
