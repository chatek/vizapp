# Validation guide

This page explains how to reproduce and interpret Vizmaster's validation gates. It is not a status report. A passing command or workflow is evidence only for the exact commit, runner, inputs, and credentials that produced it; do not infer that the current branch is green from this document.

## Protected `main` validation contract

The repository's `main` branch protection must require pull requests and require status checks to pass with **Require branches to be up to date before merging** enabled (`required_status_checks.strict: true`). This strict latest-main requirement prevents a PR from merging on a newer base than the integration state validated by CI.

The required checks are exactly the seven normal pull-request gates:

- `production-audit`
- `quality`
- `hermetic-e2e`
- `windows-state-migration`
- `packaging-smoke (macos-14, mac, arm64, --config.mac.identity=null)`
- `packaging-smoke (ubuntu-22.04, linux, x64)`
- `packaging-smoke (windows-2022, win, x64)`

Do not require `local-qa-package`: it is manual local QA, runs only through `workflow_dispatch`, and is intentionally excluded from pull-request validation.

Jobs that need hosted runners (`hermetic-e2e`, `windows-state-migration`, the `packaging-smoke` matrix, and `local-qa-package`) carry `if: github.server_url == 'https://github.com'`, an allowlist that needs no per-instance setup: on GitHub they run unchanged, on the capacity-1 Forgejo runner (where `server_url` is the instance URL) they are skipped instead of queuing until abandoned. The `ubuntu-22.04` leg of `packaging-smoke` is skipped with the job on Forgejo and is covered by the fast lane there.

`Production dependency audit` is a seventh pull-request gate: it runs the exception-aware `npm run audit:production` evaluator against the exact PR head. After the check context first appears on a pull request, a repository administrator must add `Production dependency audit` to the required status checks on `main`. The scheduled [dependency-audit workflow](../.github/workflows/audit.yml) remains for advisories disclosed after merge.

GitHub merge queues are not available to this public repository while it is owned by a personal account. Consequently, `merge_group` or a required merge queue cannot enforce this policy here; strict up-to-date branch protection is the supported latest-main control. If the repository moves to an organization, merge-queue support should be designed and tested separately before enabling it.

An authorized maintainer can verify the active legacy branch protection and exact required-context set with:

```sh
gh api repos/<owner>/<repo>/branches/main/protection \
  --jq '{strict: .required_status_checks.strict, contexts: .required_status_checks.contexts, reviews: .required_pull_request_reviews}'
```

## Sources of truth

| Concern | Authoritative definition |
|---|---|
| Pull-request, `main`, and manual CI | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Tagged release publication | Not automated. Releases are cut manually by the maintainer; [`.github/workflows/release.yml`](../.github/workflows/release.yml) documents the intended publish workflow but no pipeline runs it today. |
| Scheduled production-dependency audit | [`.github/workflows/audit.yml`](../.github/workflows/audit.yml) |
| Aggregate commands and toolchain policy | [`package.json`](../package.json) and [`.nvmrc`](../.nvmrc) |
| Resolved dependency graph | [`package-lock.json`](../package-lock.json) |
| Dependency-install lifecycle | [`package.json`](../package.json) and [`install-app-deps.mjs`](../scripts/release/install-app-deps.mjs) |
| Desktop build and packaging flows | [`docs/BUILD.md`](BUILD.md), [`docs/BUILD_LOCAL.md`](BUILD_LOCAL.md), and [`scripts/release/build-local.sh`](../scripts/release/build-local.sh) |
| Package and post-package guarantees | [`scripts/release/package.mjs`](../scripts/release/package.mjs), [`verify-package.mjs`](../scripts/release/verify-package.mjs), and [`verify-cross-platform-package.mjs`](../scripts/release/verify-cross-platform-package.mjs) |
| Audit policy and accepted risk | [`docs/security.md`](security.md), [`audit-production.mjs`](../scripts/release/audit-production.mjs), and [`audit-exceptions.json`](../scripts/release/audit-exceptions.json) |
| Vendored agent SDK (shipped as an injected harness extension) | [`vendor/vclawhub-agent-<version>.md`](../vendor/), `artifacts.vclawhub-agent` in [`dependency-pins.json`](../scripts/release/dependency-pins.json), and [`vendor-agent-pins.mjs`](../scripts/release/vendor-agent-pins.mjs) |

The agent SDK reaches the app pre-packaged: `assets/extensions/vclaw-agent.js` is the pinned
pi-extension bundle, injected into every harness by
[`extension-manifest.ts`](../electron/main/extension-manifest.ts). `npm run vendor:verify-patches`
checks both digests and proves by extraction that the shipped file is the archive member renamed —
never a rebuild — and `tests/release-vendor-agent.test.ts` re-checks the same relationship under
`npm test`. That bundle is a generated, minified artifact, so it is excluded from the linter scope
(`scripts/release/biome.json`) and from line coverage with two named compensating verifications;
neither exclusion applies to authored extensions, which are `.ts`.

Read these files at the commit being validated. Job names, test inventory, dependency versions, budgets, and artifact matrices can change; copying their current values into a permanent pass/fail table would create another stale snapshot.

## Reproducible setup

The repository derives its Node and npm policy from checked-in metadata. `package.json#engines`, `package.json#packageManager`, and `.nvmrc` must agree; release entry points reject unsupported, malformed, or prerelease tool versions. With `nvm`, prepare a checkout as follows:

```bash
nvm install
nvm use
npm run toolchain:bootstrap
npm ci
npm run release:preflight:toolchain
```

Run `toolchain:bootstrap` before installing project dependencies. It installs the `packageManager`-pinned npm into the invoked npm's validated global prefix, verifies the exact installed JavaScript CLI with the active Node executable, and publishes the matching shim directory to later GitHub Actions steps. This is necessary because the npm bundled by `actions/setup-node` can be older than the repository's npm floor.

`npm ci` runs the shared `postinstall` entry point. That entry point installs Electron's platform runtime synchronously before asking Electron Builder to rebuild native dependencies, so parallel test workers do not race Electron's lazy downloader. Installing with `--ignore-scripts` intentionally skips both operations; follow the recovery sequence in the [source setup instructions](../README.md#run-from-source) before running or packaging the application.

Do not hard-code the current Node, npm, or Electron version in validation notes. Record the values observed for the tested commit instead.

## Pull-request and branch CI

The [CI workflow](../.github/workflows/ci.yml) runs on pull requests, pushes to `main`, and manual dispatch. Each Node job bootstraps the repository npm before `npm ci` and executes the toolchain-only release preflight after installation.

| Job | When it runs | What a pass establishes |
|---|---|---|
| `production-audit` | Pull request, `main`, manual dispatch | The exception-aware production dependency audit passes for the exact checked-out commit. |
| `quality` | Pull request, `main`, manual dispatch | TypeScript checks; configured lint and format checks; the coverage suite and thresholds; production bundle creation; bundle-size budgets; coverage artifact upload. |
| `hermetic-e2e` | Pull request, `main`, manual dispatch (GitHub-hosted runners only) | The built application passes the Playwright Electron suite on the pinned macOS runner without relying on developer state. Failure artifacts are uploaded when available. |
| `windows-state-migration` | Pull request, `main`, manual dispatch (GitHub-hosted runners only) | The state migration suite passes on a real `windows-2022` runner, including the production-platform fresh-install, migration, restart, and update path. Simulating `platform: 'win32'` on another OS is useful unit coverage but is not a substitute for this job. |
| `packaging-smoke` | Pull requests only (GitHub-hosted runners only) | Native macOS arm64, Linux x64, and Windows x64 runners can build unpacked application directories. Linux and Windows additionally verify the ASAR layout and exact native-unpack allowlist. These are unsigned smoke builds, not public installers. |
| `local-qa-package` | Manual dispatch only (GitHub-hosted runners only) | Native runners create and verify installable local-QA artifacts for macOS, Linux, and Windows, then upload the configured artifact set. These artifacts are not represented as signed or notarized public releases. |

Expected skips are part of this design:

- `local-qa-package` is expected to be skipped on pull requests and pushes to `main`, and on any non-GitHub (Forgejo) runner.
- `packaging-smoke` is expected to be skipped on pushes to `main` and manual dispatches because its condition is pull-request-only, and on non-GitHub runners.

`windows-state-migration` is required for every CI trigger listed above on GitHub-hosted runners; on the Forgejo runner it is explicitly skipped by the host gate, not abandoned.

A green PR packaging matrix does not prove Developer ID signing, Apple notarization/stapling, Gatekeeper acceptance, Authenticode identity, or installer integrity. Nothing in this repo establishes those today (see *Release validation*).

## Local aggregate commands

Use focused tests while developing, then choose the aggregate that matches the claim you need to make. The command definitions in [`package.json`](../package.json) remain authoritative.

| Command | Scope |
|---|---|
| `npm run release:verify:package` | Toolchain preflight, typecheck, configured code checks, coverage tests, production bundle, and bundle-size gate. It does not create an installer or run Electron E2E. |
| `npm run release:verify` | The package-verification aggregate above plus the hermetic Electron E2E suite. |
| `npm run test:e2e` | Builds the application, then runs the hermetic Electron E2E suite. |
| `npm run audit:production` | Fetches npm's production audit report and applies the repository's high/critical advisory and exception policy. Network access is required. |
| `npm run package:mac:local-qa` | On macOS, runs the relevant verification aggregate, creates unsigned/unnotarized DMG and ZIP artifacts, and applies macOS post-package checks in QA mode. |
| `npm run package:linux:local-qa` | On Linux, runs the package-verification aggregate, creates the configured Linux artifacts, and verifies their runtime layout in QA mode. |
| `npm run package:win:local-qa` | On Windows, runs the package-verification aggregate, creates the configured Windows artifacts, and verifies their runtime layout in QA mode. |

Packaging is native: run each platform command on its matching operating system and architecture. The public `package:mac`, `package:linux`, and `package:win` commands use distribution mode; macOS and Windows distribution checks require their external signing configuration. A successful local-QA command must not be described as a public trust check.

Local packaging is also **not release evidence**. Official releases are cut by the maintainer from a controlled build environment — start at [`BUILD.md`](BUILD.md). [`build-local.sh`](../scripts/release/build-local.sh) is an explicitly opt-in QA path and prints `ARTEFACT(not-evidence)`; a local `package:*:local-qa` installer never becomes a release artefact.

## Dependency audit policy

The [dependency-audit workflow](../.github/workflows/audit.yml) runs weekly and on manual dispatch. It uses the repository toolchain and executes `npm run audit:production` against the production dependency graph. This scheduled job supplies advisory coverage for vendored package forms that Dependabot cannot parse.

Ordinary PR CI validates the exception file and its expiry rules, but it does not replace the live registry-backed audit. Use the scheduled or manually dispatched audit workflow when making a current dependency-advisory claim.

The project gate and raw npm output answer different questions:

- `npm audit --omit=dev` is the underlying registry report for the production lock graph. Its output and exit status are diagnostic and can change as the advisory database changes.
- `npm run audit:production` parses that report and fails on every unaccepted **high** or **critical** advisory.
- [`audit-exceptions.json`](../scripts/release/audit-exceptions.json) can accept an exact advisory/package pair only with a reason and expiry. The gate also fails expired exceptions and stale exceptions that no longer match the report.
- The ordinary release-script tests check exception structure and expiry, so an elapsed acceptance is visible in PR CI as well as in the weekly audit.

A passing audit therefore does not mean the production graph carries no known advisory: the gate also passes while an advisory is accepted in [`audit-exceptions.json`](../scripts/release/audit-exceptions.json) with a reason and an unexpired date. Never restate a passing gate as "zero vulnerabilities". Read that file for the accepted-risk position at the commit under review, and treat adding or extending an exception as a security-sensitive change governed by the [dependency pinning and supply-chain policy](security.md#dependency-pinning-and-supply-chain).

## Public release validation

There is **no CI release pipeline here**: no automated job builds or publishes a release.
The GitHub-hosted [`.github/workflows/release.yml`](../.github/workflows/release.yml) documents
the intended publish workflow, but no pipeline runs it today; releases are cut manually by
the maintainer. The table below is the workflow as committed, kept because the workflow and
this table are held equal by
[`tests/validation-documentation.test.ts`](../tests/validation-documentation.test.ts).

| Release job | Responsibility |
|---|---|
| `validate` | Enforce the repository toolchain, validate tag/package versions and `main` ancestry, and expose the exact release SHA. |
| `production-audit` | Apply the exception-aware production dependency audit to that immutable SHA before any package job. |
| `quality` | Run `release:verify:package` for that SHA. |
| `hermetic-e2e` | Build and run the Electron E2E suite for that SHA. |
| `package` | Build both native macOS architectures. Credential preflight is fail-closed; public verification checks the signing identity, required microphone entitlements on the app and every Electron helper, the notarization staple on each packaged app, Gatekeeper, artifact integrity, fuses, native layout/architecture, and package budgets. |
| `package-linux` | Build the configured Linux architectures on native runners and apply the Linux package/runtime verification path. |
| `package-windows` | When explicitly enabled, build either Authenticode-signed public packages or unsigned beta packages. Signed mode requires signing secrets and the configured signer subject and/or thumbprint. |
| `package-member` | When a member id is supplied on a manual dispatch, fetch that member repo at a pinned SHA, bundle its payload, integrate the overlay, and build/sign/notarize the member artifact. Independent stream: its artifacts go to the asset host, never into the GitHub Release, so it does not gate `release-packages`. |
| `release-packages` | Reject failed prerequisites, collect the enabled platform artifacts, generate checksums, attest provenance, and publish or resume the GitHub Release with write permission scoped to this final job. |

How a release artefact is validated, in order:

1. The maintainer's release procedure: a clean tree at the released commit, the build
   itself, and provenance re-read from the emitted `BUILD.json` (every arch agreeing on the
   commit) before anything is staged.
2. Gates from the build: `verify.txt`, then unzip + `lipo -archs` + the `omp` digest
   against `SHA256SUMS.txt`.
3. For the dmg/zip flow, `verify-package.mjs --mode qa` (static: archive integrity,
   contained app, native unpack allowlist, arch, fuses, size budgets, artifact name ↔
   profile) plus the packaged smoke (`--packaged-smoke`, rc=0 and the marker).
4. Publish-time re-fetch: served sizes equal the staged ones and `SHA256SUMS.txt` is
   byte-identical to the local file; the release body carries the evidence triple
   (commit, output digests, pinned OMP digest when bundled).

What that does **not** establish: Developer ID signing, notarisation/stapling, Gatekeeper
acceptance, or Authenticode identity. The jobs above that check those things need signing
credentials that are not configured; every artefact is `unsigned` and `--public` refuses.
`test:e2e:hermetic` needs a display and does not run headless — say so rather than
implying it ran.

## Recording evidence

Keep point-in-time results in the PR, release notes, or another commit-addressed record rather than updating this guide with a new "current status". Record at least:

- the full commit SHA and whether the worktree was clean;
- the workflow run URL or exact commands and exit status;
- runner image or local OS/architecture, plus observed Node and npm versions;
- workflow inputs and which conditional jobs or steps were skipped;
- the audit exception file used for dependency-audit claims;
- artifact names and checksums, and whether each artifact was unsigned, signed, notarized, stapled, or provenance-attested;
- any failure, rerun, accepted limitation, or manual observation needed to interpret the result.

Use test counts only inside that commit-addressed evidence. The durable claim is that the checked-in aggregate completed successfully, not that this guide remembers how many tests happened to exist at some earlier date.
