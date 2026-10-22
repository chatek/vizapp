# VClaw — fork notes

This repository is a **fork of `am-will/gooey-pi`** (Electron desktop workspace for the Pi / OMP / Prime Agent
harnesses), rebranded to **VClaw**. This file is the fork's own document of record: what changed, how to build it for
each target, what has been verified, and what is still open.

| | |
|---|---|
| base | `am-will/gooey-pi` **v1.1.17**, upstream commit `459c996` (the fork was an exact mirror before its first commit) |
| first fork commit | `5cf74ec` — *rebrand to VClaw* |
| strategy | **track-and-merge** — keep our diff small so upstream releases stay mergeable |

## Identity

| field | value |
|---|---|
| `build.productName` | **`VClaw`** (no space — this keeps the upstream `${productName}` filename template safe) |
| `package.json` `name` | **`vclaw`** — the Electron **state directory follows this**, so data lives in `~/Library/Application Support/vclaw` (macOS) |
| `build.appId` | `com.vclaw.desktop` |
| `build.publish` | `{ provider: github, owner: chatek, repo: vclaw-desktop }` — **repointed off upstream**, or the updater would offer upstream builds |
| `build.*.artifactName` | `${productName}-${version}-…` — deliberately the **upstream shape** |
| `desktopName` / MSIX identity | `vclaw.desktop` / `VClaw` (space-free) |
| **kept on purpose** | `LICENSE` (upstream MIT), `package.json` `author`/`homepage`, upstream repo URLs, and the sha512-pinned `vendor/prime-agent-*-gooeypi.1.tgz` artefact names |

The internal namespace is fully renamed (`VCLAW_*` env family, `vclaw_session_*` tool names, `vclaw-*` capability ids,
`vclawV4Migration`, `pets/vclaw`, `vclaw-computer-use`). One deliberate compatibility fallback: the third-party
manifest key is read as `vclaw` with a fallback to the legacy `gooeypi`, so packages in the wild keep working.

## Building

**Toolchain is pinned**: `.nvmrc` = **node 24.15.0**, `engines.npm` = **npm 12.0.2**. Install both rather than
trusting "new enough" — the repo's gate only enforces **minimums**, so a newer node passes while the pinned npm says
it does not support it (measured: npm 12.0.2 rejects node 25.8.0). `npm run toolchain:bootstrap` installs the pinned
npm from `vendor/npm-12.0.2.tgz`, and it honours `npm_config_prefix`, so it can be installed into a private prefix
without touching a system npm.

```bash
export npm_config_prefix="$HOME/vclaw-agent/tools/npm12"     # keep it off the system install
npm run toolchain:bootstrap && npm run release:preflight:toolchain
npm ci
npm run build
```

### macOS

```bash
# arm64 (Apple silicon)
node node_modules/electron-builder/cli.js --dir --mac --arm64 --publish=never \
  --config.directories.output=release/mac/arm64 --config.mac.identity=null --config.mac.notarize=false
# Intel
node node_modules/electron-builder/cli.js --dir --mac --x64 --publish=never \
  --config.directories.output=release/mac/x64 --config.mac.identity=null --config.mac.notarize=false
```

Both have been built and verified on a single Apple-silicon host — the Intel leg is a **cross-build**
(electron-builder fetches the x64 Electron and rebuilds native modules for it). They are **two per-arch bundles**, which
is what upstream ships; there is no universal target here. Running the Intel build on Apple silicon needs Rosetta 2.

### Linux

```bash
node node_modules/electron-builder/cli.js --linux --x64   --publish=never --config.directories.output=release/linux/x64
node node_modules/electron-builder/cli.js --linux --arm64 --publish=never --config.directories.output=release/linux/arm64
```

Targets are AppImage / deb / rpm / pacman, and the **arch token differs per target** (that is electron-builder's rule,
and it matches `scripts/release/prepare-github-release.mjs`): `x86_64` and `aarch64` for AppImage/rpm, `amd64` for deb,
`x64` for pacman. The arm64 set cross-builds fine from x86_64. Use the **conventional output path**
`release/<platform>/<arch>` — downstream scripts expect it.

### Windows

Configured (`nsis`, `zip`, `appx`; MSIX identity `VClaw`) and verified by `verify-cross-platform-package.mjs`
including Authenticode signer assertions, but **buildable only on Windows** — the release workflow has a
`windows-2022` job gated by repository variables. Two setup items for a fork: rename the repo variables
`GOOEYPI_WINDOWS_CERT_*` → `VCLAW_WINDOWS_CERT_*` (the workflow already reads the new names), and provide the signing
certificate for the signed leg.

### Headless limits (measured)

* `npm run package:mac` cannot finish headlessly: it runs `verify-package.mjs`, which requires **exactly one `.dmg`
  and one `.zip`**, and a DMG needs a GUI session. Use `--dir` on a headless host; the repo's own CI does the same.
* The Playwright e2e suite needs a display: fine on Linux under `xvfb-run`, and on a macOS CI runner — not on a
  headless macOS box.
* Signed/notarized macOS artefacts need an **Apple Developer ID** and the CI secrets; without them the builds here are
  unsigned QA bundles.

## Verification status

| check | state |
|---|---|
| `typecheck` · biome lint+format · `vendor:verify-patches` | green |
| `vitest` | **1927 passed, 1 skipped** — on macOS and on Linux |
| release-name map vs produced artefacts | **zero mismatches** (mac + all four Linux targets) |
| macOS arm64 + x64 builds | built; identity, resources and fuses inspected |
| Linux x64 + arm64 installers | all eight built; binary `vclaw`, `vclaw.desktop`, deb `Package: vclaw`, rpm `NAME=vclaw` |
| Linux e2e under xvfb | **56/66**, and **none of the 7 failures is this fork's**: 1 is a virtual-screen clamp, 6 are the suite's own Linux assumptions (a darwin-only heading, a hard-coded `⌘N`, and `SHELL=/bin/zsh`) |
| macOS e2e | **not run** — needs a GUI runner; that is the CI leg |

## Notes on the base (found while forking)

* OMP is **already the default harness** for new installs (`HARNESS_IDS = ['omp','prime','pi']`, `defaultSettings()`
  returns `'omp'`); a *legacy* install is deliberately mapped to `prime`.
* The OMP integration is **not version-pinned**: the app resolves whatever `omp` is on the machine and reads its
  version for display only. The only hard fence is a protocol-v2 handshake, which fails loudly; a changed model JSON
  shape degrades **silently**. The vendored `prime-agent` (tarballs + patches, sha512-pinned) is the dependency that
  *is* pinned.
* Upstream latent bug, not carried here: with a **spaced** `productName`, `verify-cross-platform-package.mjs` derived
  the Linux binary name differently from `after-pack.cjs`, so Linux packaging verification would fail. Irrelevant to
  `VClaw` (no space) — noted rather than patched, to keep the diff small.
* The app icon is upstream's Prime Intellect butterfly artwork; a VClaw icon is still a design task.

## Member integration seam contract (v1)

Member apps (first: **VizMaster**) build a branded vertical from a **pinned `main` commit**: they snapshot
this tree, copy in their payload, and perform anchored insertions into the files below (the consumer this
contract was extracted from: `VizMaster/scripts/integrate-vcclaw.mjs`, measured 2026-10-22). There are no
member branches and no member-owned files in this repo — the contract is what keeps pinned builds
integrable across upstream merges.

| seam (v1) | file | anchor |
|---|---|---|
| `index-store-import` | `electron/main/index.ts` | `import { type JsonStateStore, openDesktopStateStore, StateCompatibilityError, StateMigrationError } from './store'` |
| `index-state-store-call` | `electron/main/index.ts` | `  const stateStore = await openDesktopStateStore(userDataPath)` |
| `index-harness-import` | `electron/main/index.ts` | either `import { HarnessDiscoveryService, reconcileActiveHarness } from './harness-discovery'` or `import { HarnessDiscoveryService } from './harness-discovery'` |
| `index-harness-reconcile-call` | `electron/main/index.ts` | `reconcileActiveHarness(stateStore,` |
| `projects-store-import` | `electron/main/projects.ts` | `import type { FolderIdentity, JsonStateStore, PersistedProject } from './store'` |
| `projects-list-return` | `electron/main/projects.ts` | `return sortProjects(records, 'recent')` |
| `package-extra-resources` | `package.json` | `build.extraResources` exists and is an array |

Documented, not patched: `HARNESS_IDS` (`src/types/api.ts:13`, behavioral seam) and the third-party
manifest key `vclaw` with legacy `gooeypi` fallback (`electron/main/plugins/catalog.ts`).

**The verifier is the gate:** `node scripts/release/member-seams.mjs` (zero-dependency; also wrapped by
`tests/member-seams.test.ts` in the normal suite). An upstream merge that breaks an anchor turns THIS
repo red at merge time, instead of breaking a member's build at their next pin bump.

The full member-build runbook — what/why/how, with the pinned-snapshot flow, the identity-override
warning, and the estate build rules — is **`docs/MEMBER_BUILD.md`**.

**Change rules:** an anchor may be renamed only by bumping the contract version (see
`scripts/release/member-seams.mjs` → `MEMBER_SEAMS_V1`) and recording the rename in this file in the
same commit. Members ride `main` as the dependency stream; release trains and updater channels are
per-member. Escape hatch, unneeded today: a member need that outgrows anchored integration is cut as a
branch-per-RELEASE from main (short-lived, merge-forward) — never branch-per-forever.

## Open items

1. **Apple Developer ID** + notarization secrets — blocks signed/notarized macOS distribution.
2. **Windows**: repo-variable rename + signing certificate (see above).
3. **CI for this fork**: the release workflow expects a `chatek`-owned repo with the release vars/secrets set.
4. **Icon** — replace the inherited butterfly.
5. **Upstream merge policy** is *track-and-merge*; keep the diff reviewed against upstream releases.
