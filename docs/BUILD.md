# Building VClaw desktop

**Remote is primary; local is a fallback.** Every macOS artefact of record is built on the
remote host `BUILD_USER_REDACTED`. A build produced on a workstation is
never evidence for a release, whatever it is named. This page is the entry point; each flow
below has exactly one procedure document.

| flow | use it for | procedure | driver |
|---|---|---|---|
| **remote (primary)** | every artefact of record — the unsigned `.dmg` and the `.app` `.zip` (OMP is bundled only in a checkout that declares `harness/bin` in `build.mac.extraResources`) | [BUILD_REMOTE.md](BUILD_REMOTE.md) | `scripts/release/build-remote.sh` |
| **local (fallback)** | only when that host is unavailable: does the tree still package? (when the tree bundles a harness binary) does the bundled `omp` verify? | [BUILD_LOCAL.md](BUILD_LOCAL.md) | `scripts/release/build-local.sh` |
| **dmg/zip via `package.mjs`** | the signing/notarisation lane on that same host and toolchain — blocked while no Developer ID exists; the remote flow already emits an unsigned dmg, so this is not needed for an unsigned release | [RELEASE_BUILD_HOST.md](RELEASE_BUILD_HOST.md) | `npm run package:mac[:local-qa]` |

```bash
# primary — builds on the host, pulls the .dmg and the .app .zip back to release-remote/<arch>/
bash scripts/release/build-remote.sh --arm64

# fallback — refuses unless explicitly acknowledged; output is not evidence
bash scripts/release/build-local.sh --check
VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
```

## Artefact-of-record rule

- **Only the remote host's artefact is evidence.** Report it as the triple (source commit,
  output digest, and — when the checkout bundles a harness binary — the pinned OMP digest)
  exactly as [BUILD_REMOTE.md](BUILD_REMOTE.md) collects it.
- A local build prints `ARTEFACT(not-evidence): …` and exists to answer packaging questions.
  Do not attach it to a release, do not compare it to a remote build as if equivalent, and do
  not copy it into `build/`.
- `build-remote.sh` never falls back on its own: if the host is unreachable it exits non-zero
  and points at the local script.

## Publishing and signing

- **Publishing happens on the workstation — not on the build host, not in CI.**
  `scripts/release/release-forgejo.sh` builds through `build-remote.sh`, tags, publishes a Forgejo
  release on `chatek/vclaw-app` (draft unless `--publish`) and re-fetches to verify. Steps and
  token/`--dry-run` details: [RELEASE_FLOW.md](RELEASE_FLOW.md) §3 · Publish.
- **Nobody signs today.** The host and the workstation each have 0 codesigning identities, so
  `package.mjs --public` refuses and only `--qa` artefacts exist; releases are marked `unsigned`
  and default to draft. An Apple Developer ID is an open blocker, not a procedure — see
  [RELEASE_FLOW.md](RELEASE_FLOW.md) §5 · Blocked today.
- **Forgejo Actions cannot build this repo**: there is no darwin runner and the instance cannot
  reach github.com to fetch actions. Do not document or plan a CI build path.
- The updater feed (separate from release assets) is [RELEASE_HOSTING.md](RELEASE_HOSTING.md);
  member verticals are [MEMBER_BUILD.md](MEMBER_BUILD.md).
