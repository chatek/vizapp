# Producing a VClaw desktop build (macOS)

The build runs **on `BUILD_USER_REDACTED`**, never on the workstation
(repo rule, `deploy/nodes.md`). This file is the procedure as measured on 2026-11-01, by the
builder who took the lane over; every command below was run, and the two traps cost real time.

## Host facts (measured 2026-11-01)

| | |
|---|---|
| hardware / OS | Apple M4, 16 GiB, Darwin arm64, headless over ssh |
| disk | 460 GiB, **201 Gi free** |
| node | **v25.8.0** — satisfies `engines.node: >=24.15.0`, and is *outside* npm 12.0.2's own supported set |
| npm | 11.11.0 shipped; **12.0.2 installed by `toolchain:bootstrap`** (required) |
| Xcode | Command Line Tools only (`/Library/Developer/CommandLineTools`) — fine for native modules |
| code-signing identities | **0 valid** — see *Signing* below |

## Procedure

```bash
# 0. on the workstation — source must be committed; the host has no .git
cd vclaw-desktop && git status --porcelain   # empty
COMMIT=$(git rev-parse --short HEAD)

# 1. sync. THE EXCLUDES MUST BE ANCHORED, see trap 1
rsync -az --delete \
  --exclude='/.git' --exclude='/node_modules' --exclude='/out' \
  --exclude='/release' --exclude='/test-results' \
  . BUILD_USER_REDACTED:~/vclaw-desktop-build/

# 2. toolchain + deps (fresh clone only; node_modules persists between builds)
ssh BUILD_USER_REDACTED 'cd ~/vclaw-desktop-build && node scripts/release/bootstrap-npm.mjs'
ssh BUILD_USER_REDACTED 'cd ~/vclaw-desktop-build && npm ci'

# 3. THE INSTALL SCRIPTS, see trap 2 — approve, rebuild, then restore package.json
ssh BUILD_USER_REDACTED 'cd ~/vclaw-desktop-build && npm install-scripts approve --all && npm rebuild'
rsync -az package.json BUILD_USER_REDACTED:~/vclaw-desktop-build/package.json   # undo the approval edit

# 4. package. --skip-verify is the CI path (release.yml): the verify suite has already
#    run on this commit, and the hermetic Playwright e2e cannot run headless.
ssh BUILD_USER_REDACTED 'cd ~/vclaw-desktop-build \
  && node scripts/release/package.mjs --qa --platform mac --skip-verify'

# 5. collect: release/mac/arm64/{VClaw-<version>-arm64.dmg, .zip, mac-arm64/VClaw.app}
```

`npm run package:mac:local-qa` is the same thing **without** `--skip-verify`; it additionally
runs `release:verify` = `release:verify:package` + `test:e2e:hermetic`. Use the direct
invocation when the verify suite already ran on the commit, exactly as CI does.

## Trap 1 — an unanchored rsync exclude silently empties `scripts/`

`--exclude='release'` matches **any** directory named `release` at any depth, so it drops
`scripts/release/` and all 25 build scripts. Every later step then fails with
`Cannot find module '.../scripts/release/bootstrap-npm.mjs'`, which reads like a missing
toolchain and is not. **Always anchor**: `--exclude='/release'`.

Same shape for `build/`: `--exclude='build/*'` strips the entitlements plists electron-builder
needs. Do not exclude `build/`; it is a *source* directory here (electron-builder's
`buildResources`), and it is also where the finished artefact is delivered.

## Trap 2 — npm 12 blocks the install scripts this app needs

`package.json` pins `packageManager: npm@12.0.2`, and npm 12 **refuses to run dependency
install scripts** unless they are listed under `allowScripts` (the repo has no such list).
A fresh `npm ci` therefore exits **0** while skipping nine scripts — including `node-pty`,
`esbuild` (both copies), `zeromq`, `koffi`, `protobufjs`, `electron-winstaller` and
`prime-agent`. Exit 0 does not mean installed: `node_modules/.bin/esbuild` and
`node_modules/node-pty/build/Release/pty.node` will be **missing**, and the failure surfaces
later as a bundling or terminal error.

```bash
npm install-scripts approve --all && npm rebuild
```

⚠ `approve` writes an `allowScripts` block **into `package.json`**, and for the vendored
prime-agent tarball it records a **host-absolute path**
(`file:/Users/chance/vclaw-desktop-build/vendor/...`). Restore the committed `package.json`
after the rebuild — the approval is an install-time action, not a source change, and an
artefact must come from the commit, not from a host-mutated tree.

> **Open defect (recorded, not fixed):** the repo cannot be installed reproducibly under the
> npm it pins. A committed `allowScripts` list would fix it, but the prime-agent entry needs a
> spec that is not host-absolute, so it must be verified rather than typed. Until then, step 3
> is mandatory on every fresh install.

## Trap 3 — the host's DNS cannot reach GitHub, so electron-builder stalls on downloads

`nslookup github.com` on the host returns **`198.18.0.49`** — the fake-ip range a proxy/VPN
hands out when it is not actually routing. electron-builder uses `got` for every download, so
the build dies with:

```
⨯ connect EADDRNOTAVAIL 198.18.0.49:443 - Local (0.0.0.0:0)
```

It fails **late**: after bundling, after `@electron/rebuild`, after the `.app` is packaged —
so it reads as a packaging bug. It is not.

Two mitigations, both used together:

```bash
# 1. never download Electron — it is already unpacked in node_modules by `npm ci`
npx electron-builder --mac --arm64 --publish never \
  --config.directories.output=release/mac/arm64 \
  --config.mac.identity=null --config.mac.notarize=false \
  --config.electronDist=$PWD/node_modules/electron/dist

# 2. the ZIP target can still reach for a network resource. When .app and .dmg exist but the
#    .zip is missing, produce it with the same tool electron-builder uses:
cd release/mac/arm64 && ditto -c -k --sequesterRsrc --keepParent mac-arm64/VClaw.app \
  VClaw-<version>-arm64.zip

# then gate it:
cd ~/vclaw-desktop-build && node scripts/release/verify-package.mjs \
  --mode qa --arch arm64 --release-directory=$PWD/release/mac/arm64
```

`verify-package.mjs` is **static** — archive integrity, contained application, native unpack
allowlist, architectures, Electron fuses, size budgets. It does not launch the app, so it works
over headless ssh. `release:verify`'s other half, `test:e2e:hermetic`, does not: that is why
step 4 uses `--skip-verify` and the verify suite must have run on the commit beforehand.

## Signing

`security find-identity -v -p codesigning` → **0 valid identities**. Only `--qa` builds are
possible: `package.mjs --qa` sets `CSC_IDENTITY_AUTO_DISCOVERY=false`,
`--config.mac.identity=null` and `--config.mac.notarize=false`. A `--public` build will throw
on `validateReleaseCredentials` before packaging — do not spend a cycle discovering that.

## Verifying an arrival

Follow the host README rules in `deploy/nodes.md`; they exist because each one caught a real
bad artefact:

1. **sha256 before extracting** — a truncated `.app` once passed `lipo -archs`, all four plist
   keys and the version string; only the digest caught it.
2. `lipo -archs <app>/Contents/MacOS/<exe>` → `arm64` (verify with a tool, never a filename).
3. Read `CFBundleName` / `CFBundleDisplayName` / `CFBundleIdentifier` from `Info.plist`.
4. **Read the exit code from the log file**, not the shell handle.
5. One writer per output directory.

Report the digest of the **committed** source and the **pinned** CLI artefact alongside the
artefact digest; a build is a triple (commit, pinned CLI, output), not a single number.
