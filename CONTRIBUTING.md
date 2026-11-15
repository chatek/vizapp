# Contributing

See the [source setup](README.md#run-from-source) and
[validation guide](docs/validation.md) for the supported toolchain and checks.

## Local development without release credentials

You do not need access to signing or notarization credentials for the production
`com.vclaw.desktop` bundle. Use `npm run dev` while developing and run the relevant checks
from the validation guide before submitting a change.

Packaging starts at [docs/BUILD.md](docs/BUILD.md). `npm run package:mac:local-qa` creates
unsigned, unnotarized installers for smoke-testing on the machine that built them; the
equivalent `package:linux:local-qa` and `package:win:local-qa` commands exist for their
platforms. These are QA artefacts, not releases, and a contribution never needs signing
credentials: macOS and Windows distribution checks require external signing configuration
that is not part of this repository ([docs/BUILD.md](docs/BUILD.md)).

If you need a local package that can sit alongside an installed Vizmaster, use the
[local build](docs/BUILD_LOCAL.md) command shape with a separate Electron state directory:

```bash
# BUILD_LOCAL.md's `--dir` invocation, plus:
#   --config.directories.output=release/local-dev
#   --config.extraMetadata.name=vclaw-local-dev
```

The `extraMetadata.name` override isolates Electron state under
`~/Library/Application Support/vclaw-local-dev`; changing only the product name or bundle ID
does not isolate it. These values are local examples and must not replace the production
package metadata.
