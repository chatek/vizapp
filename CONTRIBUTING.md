# Contributing

See the [source setup](README.md#run-from-source) and
[validation guide](docs/validation.md) for the supported toolchain and checks.

## Local macOS development without release credentials

You do not need access to signing or notarization credentials for the production
`com.vclaw.desktop` bundle. Use `npm run dev` while developing and run the relevant checks
from the validation guide before submitting a change.

Packaging has two flows; start at [docs/BUILD.md](docs/BUILD.md). macOS builds of record run
on the remote build host ([docs/BUILD_REMOTE.md](docs/BUILD_REMOTE.md)); a local build is only
a fallback for when that host is unavailable ([docs/BUILD_LOCAL.md](docs/BUILD_LOCAL.md)) and
its output is **not evidence**. A contribution never needs signing credentials, and the boundary
between this repo, the VizMaster lane, the vchat3 deploy lane and estate signing is
[docs/BOUNDARIES.md](docs/BOUNDARIES.md).

`npm run package:mac:local-qa` creates unsigned, unnotarized installers for smoke-testing on
the machine that built them. It is not a release artefact and not a substitute for the remote
flow. `npm run package:mac` needs a Developer ID identity; neither the build host nor a
workstation in this estate has one, so it refuses — there is no credentialed local path today
([docs/RELEASE_FLOW.md](docs/RELEASE_FLOW.md) §5 · Blocked today).

If you need a local package that can sit alongside an installed VClaw, use the
[local fallback](docs/BUILD_LOCAL.md) command shape with a separate Electron state directory:

```bash
# BUILD_LOCAL.md's `--dir` invocation, plus:
#   --config.directories.output=release/local-dev
#   --config.extraMetadata.name=vclaw-local-dev
```

The `extraMetadata.name` override isolates Electron state under
`~/Library/Application Support/vclaw-local-dev`; changing only the product name or bundle ID
does not isolate it. These values are local examples and must not replace the production
package metadata.
