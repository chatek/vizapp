# Building Vizmaster desktop

This page is the entry point for building and packaging Vizmaster. Exact commands for each flow
live in the procedure pages, not here.

| flow | use it for | procedure |
|---|---|---|
| **local packaging (macOS)** | smoke-testing an installer on the machine that built it; verifying the tree still packages and the bundled `omp` (when the checkout declares `harness/bin` in `build.mac.extraResources`) verifies | [BUILD_LOCAL.md](BUILD_LOCAL.md) |
| **local packaging (Linux / Windows)** | the same QA purpose on their native hosts (`package:linux:local-qa`, `package:win:local-qa`) | [FORK.md](../FORK.md) |
| **Windows build host (ct18 KVM guest)** | every Windows build; the VM **must be powered off after each use** (operator rule) | [BUILD_WIN.md](BUILD_WIN.md) |
| **development run** | running the app from source while working on it | [README.md](../README.md#run-from-source) |

Packaging is native: run each platform command on its matching operating system and
architecture. `package.mjs` refuses `--platform win` unless it runs on `win32`.

## QA-artefact rule

- A local `--dir` build prints `ARTEFACT(not-evidence): …` and exists to answer packaging
  questions. Do not attach it to a release, and do not present it as equivalent to an
  official release build.
- Official releases are cut by the maintainer from a controlled build environment; a
  contribution never needs signing credentials to be accepted.
- `build-local.sh` refuses to run unless the fallback is acknowledged
  (`VCLAW_ALLOW_LOCAL_BUILD=1`), so a QA artefact cannot be mistaken for a release by
  accident.

## Signing

**Nobody signs today.** No Apple Developer ID or Authenticode credentials are configured, so
`package.mjs --public` refuses and only `--qa` artefacts exist; releases are marked
`unsigned`. A signing identity is an open blocker, not a procedure — do not "fix" a
signing error by inventing a local identity.

The updater feed (separate from release assets) is [RELEASE_HOSTING.md](RELEASE_HOSTING.md).
Product profiles — how one codebase builds the generic product and branded verticals — are
[PRODUCT_PROFILES.md](PRODUCT_PROFILES.md).
