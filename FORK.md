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
| `build.publish` | generic provider `https://assets.vclawhub.com/vclaw-desktop/` — **repointed off upstream**, or the updater would offer upstream builds (see `docs/RELEASE_HOSTING.md`) |
| `build.*.artifactName` | `${productName}-${version}-…` — deliberately the **upstream shape** |
| `desktopName` / MSIX identity | `vclaw.desktop` / `VClaw` (space-free) |
| **kept on purpose** | `LICENSE` (upstream MIT), `package.json` `author`/`homepage`, upstream repo URLs, and the sha512-pinned `vendor/prime-agent-*-gooeypi.1.tgz` artefact names |

The internal namespace is fully renamed (`VCLAW_*` env family, `vclaw_session_*` tool names, `vclaw-*` capability ids,
`vclawV4Migration`, `pets/vclaw`, `vclaw-computer-use`). One deliberate compatibility fallback: the third-party
manifest key is read as `vclaw` with a fallback to the legacy `gooeypi`, so packages in the wild keep working.

## Building

**macOS is the flow in scope of [`docs/BUILD.md`](docs/BUILD.md)** (remote primary, local
fallback). The Linux and Windows recipes below run on their native hosts, on demand, and are
not alternatives to the remote macOS flow. The release flow publishes **macOS artefacts only**
([`docs/RELEASE_FLOW.md`](docs/RELEASE_FLOW.md)); no CI job builds or publishes any platform.
What this fork hands to another lane — a published Forgejo release URL and nothing else — is
[`docs/BOUNDARIES.md`](docs/BOUNDARIES.md).

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

macOS builds have two flows — **remote primary**, **local fallback** — and one entry point:
[`docs/BUILD.md`](docs/BUILD.md), which carries the commands, the drivers and the evidence rule.
Do not run electron-builder by hand here.

Only the remote host's `.app` is evidence; a local `--dir` build prints
`ARTEFACT(not-evidence)` and must never be shipped. Cross-arch local builds are refused because
`node-pty`, `zeromq`, and `koffi` are host-arch. The dmg/zip path is
[`docs/RELEASE_BUILD_HOST.md`](docs/RELEASE_BUILD_HOST.md); signing needs an Apple Developer ID
and there is none in this estate, so only unsigned `--qa` installers exist. This is **two per-arch
bundles**, which is what upstream ships; there is no universal target here (`after-pack.cjs`
refuses one).

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
including Authenticode signer assertions, but **buildable only on Windows**. The GitHub-hosted
`.github/workflows/release.yml` carries a `windows-2022` job gated by repository variables, but the release flow
does not run that workflow ([`docs/RELEASE_FLOW.md`](docs/RELEASE_FLOW.md)), so a Windows installer is a local
recipe today, not a published asset. Two setup items for a fork: rename the repo variables
`GOEYPI_WINDOWS_CERT_*` → `VCLAW_WINDOWS_CERT_*` (the workflow already reads the new names), and provide the signing
certificate for the signed leg.

### Headless limits (measured)

* `npm run package:mac` runs the full `release:verify` aggregate, whose `test:e2e:hermetic` half needs a display, so
  a headless run passes `--skip-verify` after `release:verify:package` has run on that commit — there is no CI run to
  rely on. `verify-package.mjs` itself is static and does run over ssh (see `docs/RELEASE_BUILD_HOST.md`); the
  default `--dir` flow (`docs/BUILD_REMOTE.md`) needs no display at all.
* The Playwright e2e suite needs a display: fine on Linux under `xvfb-run` — not on a headless macOS box.
* Signed/notarized macOS artefacts need an **Apple Developer ID**; there are 0 codesigning identities on the build
  host and on the workstation, and no CI secrets to hold one. Until an identity exists the builds here are unsigned
  QA bundles, published marked `unsigned` with releases defaulting to draft.

## Verification status

| check | state |
|---|---|
| `typecheck` · biome lint+format · `vendor:verify-patches` | green |
| `vitest` | **1927 passed, 1 skipped** — on macOS and on Linux |
| release-name map vs produced artefacts | **zero mismatches** (mac + all four Linux targets) |
| macOS arm64 + x64 builds | built; identity, resources and fuses inspected |
| Linux x64 + arm64 installers | all eight built; binary `vclaw`, `vclaw.desktop`, deb `Package: vclaw`, rpm `NAME=vclaw` |
| Linux e2e under xvfb | **56/66**, and **none of the 7 failures is this fork's**: 1 is a virtual-screen clamp, 6 are the suite's own Linux assumptions (a darwin-only heading, a hard-coded `⌘N`, and `SHELL=/bin/zsh`) |
| macOS e2e | **not run** — needs a GUI runner; there is no CI leg (no Forgejo Actions, and the release flow runs no workflows) |

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

## Member integration seam contract (v2) — product profiles

v1 made a member build *edit code*: rewrite `reconcileActiveHarness`, wrap the project list with
`singleProjectFilter`, append an `ensureDefaultProject` call. Two user-visible defects came from
exactly those edits — a three-harness selector in a product that supports one, and no project on
first launch — and none of the behaviour could be tested in this repo, because the patched code
existed only inside a member snapshot.

v2 replaces those three edits with **data**: a product profile the app reads at startup.

| seam (v2) | file | anchor / expectation |
|---|---|---|
| `index-store-import` | `electron/main/index.ts` | the store import line — member module imports still insert here (new CODE still needs an anchor) |
| `package-extra-resources` | `package.json` | `build.extraResources` is an array (member payload ships through it) |
| `product-profile` | `product/profile.json` | the generic profile exists; a member passes its own with `--profile` |

**Retired in v2** (v1 remains exported so a member pinning an older commit still verifies):

| retired seam | replaced by |
|---|---|
| `index-harness-reconcile-call` | profile `harnesses` (offered set; discovery supplies what is installed) |
| `projects-list-return` | profile `defaultProject` + `projects: "single"` — the list boundary, not a code wrapper |
| `index-state-store-call` | `electron/main/default-project.ts`, called by `bootstrap()` for every product |

A product profile is:

```json
{ "profileVersion": 1, "id": "vizmaster",
  "identity": { "productName": "VClaw", "appId": "com.vclaw.desktop" },
  "harnesses": ["omp"],
  "projects": "single",
  "defaultProject": { "name": "VizMaster", "from": "product/payload", "to": "~/VizMaster", "version": "0.0.0+unrendered" } }
```

The member keeps the generic identity (`com.vclaw.desktop` / `VClaw`) by operator ruling
(2026-11-05) so it upgrades in place over a generic install and shares one userData directory and
updater channel. `version` is a placeholder: `package.mjs` renders the payload's release id from
`BUILD.json` into the staged `resources/product.json`, and refuses a member build without it.

`projects` is `"multiple"` (default) or `"single"`. A single-project product presents ONLY its
seeded project — the sidebar shows one entry, not a list where the seeded project happens to sort
first. Filtering happens at the listing boundary, so other grants are not deleted: switching the
profile back restores them with their session history.

Build with `node scripts/release/package.mjs --qa --platform mac --profile product/vizmaster.json`.
The artifact name is derived from `id` (`VClaw-<version>-<id>-<arch>`), and **`verify-package` refuses
an artifact whose name and profile disagree** — a member-named build carrying the generic profile, or
the reverse. `--member <id>` is shorthand and must match the profile id.

Where the payload lives: `product/payload` — always shipped (README-only for the generic product),
which is the contract-v2 carrier. The integrator copies the bundled payload there and
`defaultProject.from` must be `product/payload`; `package.mjs --member` refuses any other value and
fails before packaging if `product/payload/dist`, the payload content, or the payload `BUILD.json`
release id is missing, so a missing or early integrate cannot seed an empty project silently. The
legacy `vendor/<member>` + `{from: 'vendor/vizmaster', to: 'vizmaster'}` route is retired.

## Open items

1. **Apple Developer ID** + notarization secrets — blocks signed/notarized macOS distribution.
2. **Windows**: repo-variable rename + signing certificate (see above).
3. **CI for this fork — not available**: Forgejo Actions cannot build this repo (no darwin runner;
   the instance cannot fetch actions from github.com), and publishing is the manual workstation flow
   in `docs/RELEASE_FLOW.md`.
4. **Icon** — replace the inherited butterfly.
5. **Upstream merge policy** is *track-and-merge*; keep the diff reviewed against upstream releases.
