# Producing a VClaw desktop installer (`.dmg`/`.zip`, macOS)

**Where this fits:** the flows and the artefact-of-record rule are in [BUILD.md](BUILD.md).
This file is the host-side **`.dmg`/`.zip`** variant (`package.mjs`, signing, notarisation).
The default `--dir` flow that bundles OMP is [BUILD_REMOTE.md](BUILD_REMOTE.md) — it also owns
the host facts table, which is measured more recently than this page. Both flows run on
`build@build-host.example` and only an artefact produced there is evidence.

Publishing the result is **not** done here and not in CI:
[RELEASE_FLOW.md](RELEASE_FLOW.md) §Publish.

## Prerequisites on the host

The installer flow needs the same machine, checkout and release set as the `--dir` flow, plus:

| requirement | why |
|---|---|
| a checkout at the release commit | `build-remote.sh` leaves one at `~/build/vclaw/vclaw-desktop` and throws it away per run; reuse that host/paths and re-sync after the build rather than keeping a second hand-synced tree |
| npm **12.0.2** on `PATH` for the packaging step | `package.mjs` refuses anything older; node 24.15.0 ships npm 11, so run `npm run toolchain:bootstrap` (off-system prefix, see `FORK.md`) and put its shim first |
| dependencies installed, `out/` built | `npm ci` alone does **not** create `out/`; `package.mjs` runs `npm run build:bundle` itself, so deps are the only manual step |
| `ELECTRON_MIRROR` **or** `VCLAW_ELECTRON_DIST` | the host's `github.com` is a fake-ip; electron-builder's Electron download dies late without one of them (trap 3) |
| no signing identity expected | 0 valid identities on this host; only `--qa` is possible (see *Signing*) |

## Procedure

```bash
H=build@build-host.example

# 1. source + release set on the host (idempotent; also proves the host still matches)
bash scripts/release/build-remote.sh --check

# 2. installer build over ssh, in the host's own checkout and toolchain
tailscale ssh $H 'cd ~/build/vclaw/vclaw-desktop &&
  export npm_config_prefix="$HOME/build/tools/npm12" &&
  npm run toolchain:bootstrap &&
  export PATH="$(npm prefix -g)/bin:$PATH" &&
  export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ &&
  node scripts/release/package.mjs --qa --platform mac --arch arm64 --skip-verify'

# 3. output: release/mac/arm64/{VClaw-<version>-arm64.dmg, .zip}
#    (arm64 and x64 are separate runs; x64 is not cross-packaged from this flow)

# 4. pull back, hash on both sides, then publish — RELEASE_FLOW.md §3
```

`tailscale ssh` returns **0** even when the remote command failed, so the local exit code of
step 2 proves nothing: read the remote output's own verdict line
(`Local QA mac/<arch> package pipeline passed.`) and the `Packaging failed: …` line that
precedes a non-zero exit.

`--skip-verify` skips the duplicate `release:verify` aggregate. Use it when
`release:verify:package` already ran on that exact commit; it does **not** skip bundle creation
or `verify-package`, which `package.mjs` runs after packaging regardless. There is no CI run to
lean on here (Forgejo Actions cannot build this repo), so if the aggregate has not run, drop the
flag — but `test:e2e:hermetic` needs a display and will not pass headless, so the honest version
of step 2 is "package verification ran, hermetic e2e did not". `npm run package:mac:local-qa`
is this command without `--skip-verify`.

## Trap 1 — if you hand-sync instead of using the driver, anchor the excludes

`--exclude='release'` matches **any** directory named `release` at any depth, so it drops
`scripts/release/` and all build scripts; every later step then fails with
`Cannot find module '.../scripts/release/…'`, which reads like a missing toolchain.
**Always anchor**: `--exclude='/release'`. Same shape for `build/`: `--exclude='build/*'`
strips the entitlements plists electron-builder needs, so do not exclude it — it is a *source*
directory (`buildResources`). `build-remote.sh` avoids rsync entirely.

## Trap 2 — two npm floors, and they are different

`node 24.15.0` ships npm **11**, and `package.json` pins `packageManager: npm@12.0.2`. The
split matters:

| step | npm that runs it | result |
|---|---|---|
| `npm ci` (dependencies) | 11 (node 24.15.0's own) | correct — the `allowScripts` allowlist in `package.json` lets the nine native install scripts run |
| `package.mjs` | **12.0.2 required** | refuses with `Packaging failed: npm >=12.0.2 is required (found 11.x)` |

So bootstrap npm 12 for step 2 only; do not reinstall dependencies with it. The old
`npm install-scripts approve --all && npm rebuild` dance is **obsolete** — it wrote a
host-absolute path into `package.json` for the vendored `prime-agent` tarball, and the
checked-in allowlist replaces it. A clean install now warns about exactly one blocked script
(`prime-agent`, which exits 0 unless a bootstrap env var is set); that warning is expected, and
any *other* blocked script is a new dependency that needs an allowlist entry.

## Trap 3 — the host cannot reach GitHub, so electron-builder downloads fail late

`nslookup github.com` on the host returns a fake-ip (`198.18.0.x`), so the downloader dies with
`⨯ connect EADDRNOTAVAIL …:443` **after** bundling, `@electron/rebuild` and packaging — it
reads as a packaging bug. Two mitigations, both usable together:

```bash
# 1. never download Electron — point at the copy npm already unpacked
export VCLAW_ELECTRON_DIST=$PWD/node_modules/electron/dist

# 2. the downloader still needs a mirror for anything else it fetches
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 3. if the .zip target is the only thing missing, produce it with the tool electron-builder uses
cd release/mac/arm64 && ditto -c -k --sequesterRsrc --keepParent VClaw.app VClaw-<version>-arm64.zip

# then gate it
cd ~/build/vclaw/vclaw-desktop && node scripts/release/verify-package.mjs \
  --mode qa --arch arm64 --release-directory=$PWD/release/mac/arm64
```

`verify-package.mjs` is **static** — archive integrity, contained application, native unpack
allowlist, architectures, Electron fuses, size budgets, artifact name ↔ packaged profile. It
does not launch the app, so it works over headless ssh.

### Runtime proof over ssh — the packaged smoke

A GUI launch is impossible over ssh, but the app carries its own headless mode, and it is the
only *runtime* evidence available on this host:

```bash
APP=release/mac/arm64/VClaw.app
"$APP/Contents/MacOS/VClaw" --packaged-smoke=/tmp/smoke-marker.json; echo "rc=$?"
# rc=0 and the marker written:
# {"event":"vclaw-packaged-smoke-ready","url":"prime-work://app/index.html","version":"…"}
```

The marker means the packaged app started, loaded its renderer and completed an authorized IPC
round trip — none of which `verify-package` can see. Run it on every artefact before delivery;
measured working on the 1.1.17 arm64 build (2026-11-01, rc=0).

## Delivering the artefact

Copy the DMG and ZIP back, then confirm the transfer with `shasum -a 256` on **both** sides
before anyone opens the file. Report the triple with every delivery: source commit, pinned CLI
digest, artefact digest — the publishing steps and the re-fetch check are
[RELEASE_FLOW.md](RELEASE_FLOW.md) §3. Only an artefact built on this host is evidence; a local
build (`BUILD_LOCAL.md`) is marked `not-evidence` and never enters `build/` or a release.

## Trap 5 — a platform `artifactName` silently beats the generic one

`package.json` sets `build.mac.artifactName`, and electron-builder resolves platform-specific
config before the generic key, so `--config.artifactName=…` and a top-level `build.artifactName`
are both ignored on macOS. The build looks correct — the file that appears matches the product
name — which is why this survived: a member build shipped as `VizMaster-1.1.17-arm64.dmg`
instead of `VClaw-1.1.17-vizmaster-arm64.dmg`, and nothing failed, because the only checker
compared the artifact to itself. Use the **per-platform** key (which `package.mjs` derives from
the profile) and let `verify-package` assert the name against the packaged identity.

## Signing

`security find-identity -v -p codesigning` → **0 valid identities** (host and workstation).
Only `--qa` builds are possible: `--qa` sets `CSC_IDENTITY_AUTO_DISCOVERY=false`,
`--config.mac.identity=null` and `--config.mac.notarize=false`. A `--public` build throws on
`validateReleaseCredentials` before packaging — do not spend a cycle discovering that, and do
not "fix" it by inventing a local identity. Unsigned artefacts are published marked `unsigned`,
releases default to draft, and an Apple Developer ID is an open blocker
([RELEASE_FLOW.md](RELEASE_FLOW.md) §Blocked).

## Verifying an arrival

Follow the destination host's README rules (`deploy/nodes.md`); they exist because each one
caught a real bad artefact:

1. **sha256 before extracting** — a truncated `.app` once passed `lipo -archs`, all four plist
   keys and the version string; only the digest caught it.
2. `lipo -archs <app>/Contents/MacOS/<exe>` → the requested arch (verify with a tool, never a
   filename).
3. Read `CFBundleName` / `CFBundleDisplayName` / `CFBundleIdentifier` from `Info.plist`.
4. **Read the exit code from the log file**, not the shell handle — `tailscale ssh` returns 0
   for a failed remote command ([BUILD_REMOTE.md](BUILD_REMOTE.md)).
5. One writer per output directory.

Report the digest of the **committed** source and the **pinned** CLI artefact alongside the
artefact digest; a build is a triple (commit, pinned CLI, output), not a single number.

## The vendored extension moves only via re-vendoring — do not chase staleness here

`assets/extensions/vclaw-agent.js` is vendored from the agent-sdk repo; **this repo has no
pi-extension bundler and no bundle-freshness gate** (`scripts/build-pi-extension.mjs` is
MODULE_NOT_FOUND on this branch, and `tests/unit/` has no bundle-freshness test). The
extension's bytes change only when the SDK lane re-vendors — so "the bundle is stale" is
never a vclaw-desktop defect.

Measured in agent-sdk 2026-11-02, because a false red can appear THERE: after a
single-file `git checkout -- <source>` advances a source mtime past the tracked bundle,
agent-sdk's `test/unit/bundle-freshness.test.ts` fails with "STALE BUNDLE … re-bundle with
`node scripts/build-pi-extension.mjs`" even on a clean tree — re-running the bundler
produced byte-identical output and an empty diff (mtime only, not staleness). That gate
and its bundler live in agent-sdk; nothing in this repo re-bundles anything.
