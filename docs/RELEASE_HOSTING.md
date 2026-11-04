# Where builds and the updater feed live

Two destinations, and they are different things:

| what | where | who writes it |
|---|---|---|
| **release assets** (the thing a person downloads) | a Forgejo release on `chatek/vclaw-app`, built from `release-remote/<arch>/` | the workstation: `scripts/release/release-forgejo.sh` — [RELEASE_FLOW.md](RELEASE_FLOW.md) §3 |
| **updater feed** | `https://assets.vclawhub.com/vclaw-desktop/latest.yml` (and `latest-mac.yml`, `latest-linux.yml`), bucket `vclawhub-assets` / `vclaw-desktop/` | `scripts/publish-r2.sh <electron-builder output dir>`, from the workstation after a verified release — pass the directory explicitly (`release/mac/arm64`); the script's default `dist` predates `build.directories.output=release` |

GitHub Releases is not a destination in this flow; installs that shipped before the R2 feed
existed keep reading it until they take one build from this feed (*Migration*, below).

Only artefacts built on the remote build host are upload candidates — see [BUILD.md](BUILD.md). A
local build prints `ARTEFACT(not-evidence)` and must never be published here.

`package.json` → `build.publish` is now the **generic** provider pointing at that base. That is what electron-builder
bakes into `app-update.yml` inside the app, so **new builds check R2**.

## Member handoff staging (`staging/member/…`)

The live member handoff is the **release URL** described in
[RELEASE_FLOW.md](RELEASE_FLOW.md) §3, whose provenance (`BUILD-<arch>.json`, `SHA256SUMS.txt`,
`tuple.json`) sits beside the assets. That URL is all a receiving lane is owed
([BOUNDARIES.md](BOUNDARIES.md) §2); a `handoff.json` is not required for a handoff, and this
publisher does not emit one.

The staging prefix below is written by the **GitHub-hosted** member job
(`.github/workflows/release.yml`), which the release flow does not run; treat it as the mechanism
the member lane already has, not as the current publish path, and not as a second definition of
what a release must contain.

That job publishes its handoff bundle to a public, append-only staging prefix:

```
https://assets.vclawhub.com/staging/member/<member>/<release>/<vclaw-sha>/<arch>/
```

`staging/` is a top-level prefix, deliberately **outside** the published `vclaw-desktop/` tree:
nothing under it is an updater feed or a release, so a stale stage cannot be mistaken for one, and
the consumer's publisher remains the only writer to its own `releases/` tree.

Contents: the `.dmg`, `.zip`, payload `BUILD.json`, `SHA256SUMS`, `handoff.json`, and
`tuple.json` (`{sha, branch, dirty}` — the vclaw side). `handoff.json` is the flat manifest the
consumer validates when present — `{vizmasterSha, vclawSha, arch, dirty, builtAt}`, with both shas
prefixed by the corresponding `BUILD.json` commits and `builtAt` agreeing. `scripts/release/publish-member-staging.mjs` refuses a
prefix that already holds any object, so a re-run fails instead of changing bytes a published digest
referred to. The key is both release- and commit-scoped: the same member release built against a
different vclaw sha lands on a different prefix.

`SHA256SUMS` is a **claim**: the consumer re-verifies every digest, runs its mount assert and
`codesign --verify --deep --strict`, and only its own immutable copy is user-facing. That signature
check is why an unsigned stage is refused — there are 0 codesigning identities in this estate
([RELEASE_FLOW.md](RELEASE_FLOW.md) §5), so the `.dmg` a stage can carry today is unsigned. Dirty is a
**refusal** at emit and at staging (`BUILD.json` must carry boolean `false` for `dirty` and
`vclawDirty`), so `tuple.json` can only ever say clean. Credentials (`R2_*`) live in the member
job's env; the consumer needs none.

## The part that surprises people: `generic` does not upload

electron-builder's `generic` provider has **no uploader**. It writes the feed (`latest*.yml`) and the app's
`app-update.yml`, and then stops. Hosting is the caller's job, which is why `scripts/publish-r2.sh` exists. If you
run `electron-builder --publish always` and see nothing on R2, this is why — not a broken credential.

## Migration, and what it means for existing installs

- Installs **already shipped** carry the old `app-update.yml` (GitHub Releases). They keep updating from GitHub
  until they take one build produced after the repoint; that old feed is frozen, not maintained by this flow.
- New builds read `https://assets.vclawhub.com/vclaw-desktop/latest.yml`, so a build that is uploaded to a
  Forgejo release but not to R2 reaches nobody's updater.

## Two rules from measurement

1. **Artefact names already carry the version** (`${productName}-${version}-${arch}.${ext}`), so a new build never
   overwrites an old one. Keep it that way — the domain serves `cache-control: max-age=14400`.
2. **`latest*.yml` is reused by design** — it is the feed pointer. electron-updater requests it with a `?noCache=`
   query for exactly this reason, so anything in front of the bucket must pass query strings through unchanged.

## Verify after publishing

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://assets.vclawhub.com/vclaw-desktop/latest.yml   # 200
curl -s https://assets.vclawhub.com/vclaw-desktop/latest.yml | head -5                            # has this version
```
