# Building VClaw desktop

**Remote is primary; local is a fallback.** Every macOS artefact of record is built on the
remote host `BUILD_USER_REDACTED`. A build produced on a workstation is
never evidence for a release, whatever it is named. This page is the entry point; each flow
below has exactly one procedure document.

| flow | use it for | procedure | driver |
|---|---|---|---|
| **remote (primary)** | every artefact of record — the unsigned `.dmg` and the `.app` `.zip` (OMP is bundled only in a checkout that declares `harness/bin` in `build.mac.extraResources`) | [BUILD_REMOTE.md](BUILD_REMOTE.md) | `scripts/release/build-remote.sh` |
| **local (fallback)** | only when that host is unavailable: does the tree still package? (when the tree bundles a harness binary) does the bundled `omp` verify? | [BUILD_LOCAL.md](BUILD_LOCAL.md) | `scripts/release/build-local.sh` |
| **windows (win11 KVM guest)** | every Windows artefact of record — the `.exe`/AppX installer (`package:win` / `package:win:local-qa`) | [BUILD_REMOTE.md](BUILD_REMOTE.md) §Windows host | `npm run package:win[:local-qa]` on the guest |

Exact commands live in each procedure page, not here. Lane ownership, the handoff rule and what
one lane may ask of another are [BOUNDARIES.md](BOUNDARIES.md).

## Artefact-of-record rule

- **Windows artefacts follow the same rule on their own host:** only a build produced inside the
  `_WIN_HOST_` win11 guest (see the windows flow row above) is evidence for a Windows release;
  `package.mjs` refuses `--platform win` unless `process.platform === 'win32'`, so no other
  machine can produce it.
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
  release on `chatek/vclaw-desktop` (draft unless `--publish`) and re-fetches to verify. Steps and
  token/`--dry-run` details: [RELEASE_FLOW.md](RELEASE_FLOW.md) §3 · Publish.
- **Nobody signs today.** The host and the workstation each have 0 codesigning identities, so
  `package.mjs --public` refuses and only `--qa` artefacts exist; releases are marked `unsigned`
  and default to draft. An Apple Developer ID is an open blocker, not a procedure — see
  [RELEASE_FLOW.md](RELEASE_FLOW.md) §5 · Blocked today.
- **Forgejo Actions cannot build this repo**: there is no darwin runner and the instance cannot
  reach github.com to fetch actions. Do not document or plan a CI build path.
- **The handoff is that release URL, once it answers anonymously** — a draft is not a handoff, and
  this repo's responsibility ends at the page ([BOUNDARIES.md](BOUNDARIES.md) §2).
- The updater feed (separate from release assets) is [RELEASE_HOSTING.md](RELEASE_HOSTING.md);
  member verticals are [MEMBER_BUILD.md](MEMBER_BUILD.md).
