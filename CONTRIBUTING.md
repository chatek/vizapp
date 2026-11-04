# Contributing

See the [source setup](README.md#run-from-source) and
[validation guide](docs/validation.md) for the supported toolchain and checks.

## Local macOS development without release credentials

You do not need access to the signing and notarization credentials for the
production `com.vclaw.desktop` bundle. Use `npm run dev` while developing and
run the relevant checks from the validation guide before submitting a change.

Packaging has two flows; start at [docs/BUILD.md](docs/BUILD.md). macOS builds of
record run on the remote build host ([docs/BUILD_REMOTE.md](docs/BUILD_REMOTE.md));
a local build is only a fallback for when that host is unavailable
([docs/BUILD_LOCAL.md](docs/BUILD_LOCAL.md)) and its output is **not evidence**.

`npm run package:mac:local-qa` creates unsigned, unnotarized local-QA artifacts.
It does not establish that a build is ready for public distribution, and it is not
a substitute for the remote flow; `npm run package:mac` is reserved for maintainers
with the release credentials.

As an optional development convenience, use a separate app identity and
Electron data directory when keeping a local package alongside VClaw. This is a
local-only build (`ARTEFACT(not-evidence)`), and electron-builder cannot reach
github.com from this workstation, so the mirror is required:

```bash
npm run build
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npx electron-builder --mac dir --arm64 --publish never \
  --config.mac.identity=null \
  --config.mac.notarize=false \
  --config.productName="VClaw Dev" \
  --config.appId=app.vclaw.desktop.localdev \
  --config.extraMetadata.name=vclaw-local-dev \
  --config.directories.output=release/local-dev
```

Use `--x64` instead of `--arm64` on an Intel Mac. The `extraMetadata.name`
override isolates Electron state under
`~/Library/Application Support/vclaw-local-dev`; changing only the product
name or bundle ID does not isolate it. These values are local examples and must
not replace the production package metadata.
