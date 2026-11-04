# Where builds and the updater feed live

**Changed 2026-11-02 (operator instruction): desktop builds are hosted on R2, not only on GitHub Releases.**

Only artefacts built on the remote build host are upload candidates — see [BUILD.md](BUILD.md). A
local build prints `ARTEFACT(not-evidence)` and must never be published here.

| | |
|---|---|
| bucket / prefix | `vclawhub-assets` / `vclaw-desktop/` |
| **feed** | `https://assets.vclawhub.com/vclaw-desktop/latest.yml` (and `latest-mac.yml`, `latest-linux.yml`) |
| artefacts | `https://assets.vclawhub.com/vclaw-desktop/VClaw-<version>-<...>` |
| uploader | `scripts/publish-r2.sh <electron-builder output dir>` — pass it explicitly, e.g. `release/mac/arm64`; the script's built-in default `dist` predates `build.directories.output=release` |

`package.json` → `build.publish` is now the **generic** provider pointing at that base. That is what electron-builder
bakes into `app-update.yml` inside the app, so **new builds check R2**.

## The part that surprises people: `generic` does not upload

electron-builder's `generic` provider has **no uploader**. It writes the feed (`latest*.yml`) and the app's
`app-update.yml`, and then stops. Hosting is the caller's job, which is why `scripts/publish-r2.sh` exists. If you
run `electron-builder --publish always` and see nothing on R2, this is why — not a broken credential.

## Migration, and what it means for existing installs

- Installs **already shipped** carry the old `app-update.yml` (GitHub Releases). They keep updating from GitHub
  until they take one build produced after this change.
- Therefore **GitHub Releases should keep receiving artefacts for at least one release** after the switch, or old
  installs will see "no updates available" while still working.
- New builds read `https://assets.vclawhub.com/vclaw-desktop/latest.yml`.

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
