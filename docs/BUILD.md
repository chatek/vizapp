# Building VClaw desktop

**Remote is primary; local is a fallback.** Every macOS artefact of record is built on the
remote host `BUILD_USER_REDACTED`. A build produced on a workstation is
never evidence for a release, whatever it is named.

| flow | use it for | procedure | driver |
|---|---|---|---|
| **remote (primary)** | every artefact of record — the `.app` | [BUILD_REMOTE.md](BUILD_REMOTE.md) | `scripts/release/build-remote.sh` |
| **local (fallback)** | only when that host is unavailable: does the tree still package? (when the tree bundles a harness binary, does the bundled `omp` verify?) | [BUILD_LOCAL.md](BUILD_LOCAL.md) | `scripts/release/build-local.sh` |
| dmg/zip, signing, notarisation (remote, CI path) | public/local-QA installers via `package.mjs` | [RELEASE_BUILD_HOST.md](RELEASE_BUILD_HOST.md) | `npm run package:mac[:local-qa]` |

```bash
# primary — builds on the host, pulls the .app back to release-remote/<arch>/
bash scripts/release/build-remote.sh --arm64

# fallback — refuses unless explicitly acknowledged; output is not evidence
bash scripts/release/build-local.sh --check
VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
```

## Does this checkout bundle a harness binary?

Both drivers **detect** it: `package.json` → `build.mac.extraResources` containing
`harness/bin` (the member/vizmaster tree maps `omp-darwin-${arch}` there; `main` does not).
The detection decides what the OMP steps mean:

- **bundling present** — the release set is required: the drivers sync it, verify the
  packaged binary's sha256 against `SHA256SUMS.txt`, assert the Mach-O slice, and
  `scripts/release/after-pack.cjs` gates the package step.
- **bundling absent** — every OMP pin/digest check prints
  `n/a — this checkout does not bundle a harness binary` and skips; nothing about this flow
  implies the binary ships, and `BUILD.json` carries `"omp": null`.

## Artefact-of-record rule

- **Only the remote host's artefact is evidence.** Report it as the triple (source commit,
  output digest, and — when the checkout bundles a harness binary — the pinned OMP digest)
  exactly as [BUILD_REMOTE.md](BUILD_REMOTE.md) collects it.
- A local build prints `ARTEFACT(not-evidence): …` and exists to answer packaging questions.
  Do not attach it to a release, do not compare it to a remote build as if equivalent, and do
  not copy it into `build/`.
- `build-remote.sh` never falls back on its own: if the host is unreachable it exits non-zero
  and points at the local script.

Release publishing (where artefacts go, and why `generic` does not upload) is
[RELEASE_HOSTING.md](RELEASE_HOSTING.md); member verticals are
[MEMBER_BUILD.md](MEMBER_BUILD.md).
