# Where builds and the updater feed live

Two destinations, and they are different things:

| what | where | who writes it |
|---|---|---|
| **release assets** (the thing a person downloads) | this repository's release page | the maintainer, from a verified build |
| **updater feed** | `https://assets.vclawhub.com/vclaw-desktop/latest.yml` (and `latest-mac.yml`, `latest-linux.yml`) | the maintainer, after a verified release — pass the electron-builder output directory explicitly (`release/mac/arm64`); the upload script's default `dist` predates `build.directories.output=release` |

Only artefacts from a verified release build are upload candidates — see
[BUILD.md](BUILD.md). A local QA build prints `ARTEFACT(not-evidence)` and must never be
published here.

`package.json` → `build.publish` is the **generic** provider pointing at that base. That is
what electron-builder bakes into `app-update.yml` inside the app, so **new builds check that
feed**.

## The part that surprises people: `generic` does not upload

electron-builder's `generic` provider has **no uploader**. It writes the feed (`latest*.yml`) and the app's
`app-update.yml`, and then stops. Hosting is the caller's job, which is why the upload script exists. If you
run `electron-builder --publish always` and see nothing on the feed host, this is why — not a broken credential.

## Migration, and what it means for existing installs

- Installs **already shipped** with an older `app-update.yml` keep reading their previous
  feed until they take one build produced after the repoint; that old feed is frozen, not
  maintained by this flow.
- New builds read `https://assets.vclawhub.com/vclaw-desktop/latest.yml`, so a build that is
  attached to a release but not uploaded to the feed reaches nobody's updater.

## Two rules from measurement

1. **Artefact names already carry the version** (`${productName}-${version}-${arch}.${ext}`), so a new build never
   overwrites an old one. Keep it that way — the domain serves `cache-control: max-age=14400`.
2. **`latest*.yml` is reused by design** — it is the feed pointer. electron-updater requests it with a `?noCache=`
   query for exactly this reason, so anything in front of the host must pass query strings through unchanged.

## Verify after publishing

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://assets.vclawhub.com/vclaw-desktop/latest.yml   # 200
curl -s https://assets.vclawhub.com/vclaw-desktop/latest.yml | head -5                            # has this version
```
