# vclawhub-agent 2.5.0

The `@vclawhub/agent` CLI + extension bundle (agent-sdk @ `0378869` — "build(arc): sync
the tracked dist mirrors to the destination-PEP slice"; src-identical to `4ed04f1`, the
range touches only tracked dist mirrors). Vendored from the `npm pack` tarball built on
this workstation from the estate source tree (operator directive 2026-11-28: prepackage
VizApp with the latest SDK build; the vchat-email-lead A2A consult timed out twice, and
the official `install-sdk.sh` is the onboarding pipe — it mints S-form credentials and
joins the fabric, an operator-only action, not the prepackage channel; the lead's reply
later confirmed: NO versioned artifact travels via the installer, and the only published
channel is JSR where **latest = 2.1.0** — 2.5.0 is operator-gated and unpublished, so
"latest build" = the source tree at the pinned revision, which is what this row pins).

- Tarball SHA-256: `33cdda2fa9dfd8dc77eb9304ea57d6e6cbd60e5a0bea0976b3f3a0b36e97a216`
  (1,082,268 B, 429 files). Members: `bin dist skills jsr.json package.json README.md
  UPGRADE.md CHANGELOG.md VCLAW_SDK.md THIRD_PARTY_NOTICES.md LICENSE`.
- **Quarantine record (extract-and-list, per the 79d781a lesson):** extracted and listed
  every member — zero `.env`/`*.env` files, zero `dist/autonomous/` files, 429 members
  from a clean dist. A first pack attempt from a STALE dist tree carried 513 members
  (84 stale remnants) and was rejected, never vendored.
- **Reproducible chain (measured 2×, byte-identical):** `bun install --frozen-lockfile`
  → `rm -rf dist` → `npm run build` (tsc) → `npm run build:extensions` → `npm pack`.
  CAVEAT measured 2026-11-28: running `build-pi-extension.mjs` over a PARTIALLY STALE
  dist (not cleaned first) yields different bundle bytes (`a015867a…` 1,462,790 B and
  `4edd3653…` 1,457,827 B were both stale-dist artifacts, never shipped). The clean-dist
  chain is the only canonical one; always `rm -rf dist` before rebuilding for a re-vendor.
- **Three-way byte identity (measured 2026-11-28):** the repo-tracked
  `dist/pi-extension/index.bundled.js` at agent-sdk `0378869` == the on-disk dist ==
  the shipped VizApp bundle — all `bcf24c5d…` / 1,333,560 B. The SDK lane's own
  committed dist mirror is the exact artifact vendored here, so the bytes are
  corroborated by the source repo, not just this workstation's build.
- **SDK lane preflight (their reply's suggested check):** `npm run verify:pack` at
  `0378869` — "OK: 429 files, 33 verbs, both bundles present, no tests shipped,
  allowlist clean"; the 429-file count equals this tarball's member count.
- The tarball digest is not portable (per the 1.5.0 note's settled rule): this row pins
  the BYTES committed here; it is never re-derived from a rebuild to "verify" a vendoring.

## Pinned contents

| file | bytes | SHA-256 |
| `dist/pi-extension/index.bundled.js` → shipped as `assets/extensions/vclaw-agent.js` | 1,333,560 | `bcf24c5d1b0d6ee1d9d5d39ba3771c70041a77b914dd50d35c3e332bb031074b` — member == the committed dist (agent-sdk 0378869) == shipped; v2.5.0, version stamped via AGENT_SDK_VERSION define |
| `dist/ext-synadia/index.bundled.js` | 364,105 | `e79d82681dcfdf13a082373f2ec05e57425e905bcd0b6543a4f6f5da44c9c984` — the local site-fabric sibling extension |
| `dist/cli.js` | 13,665 | `adf1b1da256d1d2e18200f6f1aaa343c78251b486e8d648d2c639bbe1b50b5a7` — the P1-subtraction CLI wrapper (commander entry) |
| `dist/arc/index.js` | 204,829 | `2056607a32e76d9065e6362e94eb35b867666a01d2a71520238a5b0d09a086b4` — the ARC client (destination PEP) |

## Ruling: main build over the 2.5.0 release tag (operator, 2026-11-28)

The repo carries a release tag `agent-sdk-v2.5.0` @ `76ab9abb` whose extension bundle
is `27fd696a…` / 1,168,610 B — 10 commits behind main, without the destination-PEP
work. A third consult message under `vchat-email-lead` named the tag as the release
artifact (its facts verified exactly); the operator ruled to ship the MAIN build
(`bcf24c5d…`, destination-PEP included) per the "latest build" directive. A future
re-vendor may revisit only with an operator ruling — the tag bytes are recorded here
so that decision has its evidence.

- Unpatched: base == patched, no `.patch` — but this archive is **not** skipped by the
  vendor gate: `npm run vendor:verify-patches` pins its digest and size and proves by
  extraction that `dist/pi-extension/index.bundled.js` is byte-identical to the shipped
  `assets/extensions/vclaw-agent.js` (the pairing is enforced by
  [`vendor-agent-pins.mjs`](../scripts/release/vendor-agent-pins.mjs) and re-checked by
  `tests/release-vendor-agent.test.ts`). A re-vendor that forgets to update this note, or
  a bundle swapped without a re-vendor, fails the gate.
