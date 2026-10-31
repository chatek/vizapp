# vclawhub-agent 1.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk, Feature Set 1: `status ·
doctor · signup · who · peers`). Vendored from the `npm pack` tarball built by the
agent-sdk lane; this is the artefact their installed-state E2E ran against.

- Tarball SHA-256: `708686a938faffe05acec94da45340b08f63a2f1918ee6ff979bcef321dd52ac` (1,532,555 B, 461 files)
- Unpatched: base == patched, no `.patch`, `vendor:verify-patches` passes trivially.

## Pinned contents

| file | bytes | SHA-256 |
| `dist/pi-extension/index.bundled.js` → shipped as `assets/extensions/vclaw-agent.js` | 897,355 | `c190be98eb0e04b149042ae957cfc9bdf5eee3365421b92c2d48ef8be1bd3d0f` |
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
