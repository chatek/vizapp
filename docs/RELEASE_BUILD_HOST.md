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

**Which entrypoint forces this, measured rather than assumed — it matters, because the two
answers differ:**

| entrypoint | npm floor enforced? | consequence |
|---|---|---|
| `npm run package:mac` / `package.mjs` | **yes**, hard | npm 11 is refused before anything runs: `Packaging failed: npm >=12.0.2 is required (found 11.17.0)` (node 24.19.0, npm 11.17.0, 2026-11-01). So bootstrap npm 12 — and then approve + rebuild, because npm 12 blocks the scripts. |
| member driver (`app/scripts/build-local.sh` in `chatek/vizmaster`) | **no** — it never calls `package.mjs` | homebrew npm 11 works fine and runs the install scripts normally. This is why the VizMaster rehearsal never hit either half of this trap. |

So "the pinned toolchain is not required" is true for the member driver and **false** for the
generic entrypoint. If you use the generic one, you need both steps, in this order:

```bash
npm install-scripts approve --all && npm rebuild
```

⚠ `approve` writes an `allowScripts` block **into `package.json`**, and for the vendored
prime-agent tarball it records a **host-absolute path**
(`file:/Users/chance/vclaw-desktop-build/vendor/...`). Restore the committed `package.json`
after the rebuild — the approval is an install-time action, not a source change, and an
artefact must come from the commit, not from a host-mutated tree.

> **FIXED — `package.json` now carries an `allowScripts` allowlist** (ten registry entries,
> version-pinned). Verified by a genuine clean install on the host, with no `approve` step:
> `rm -rf node_modules && npm ci` → `node_modules/.bin/esbuild`,
> `node_modules/node-pty/build/Release/pty.node`, `node_modules/fsevents/fsevents.node`,
> `node_modules/zeromq/build/darwin/arm64/…/addon.node`,
> `node_modules/koffi/build/koffi/darwin_arm64/koffi.node` and Electron's dist all present.
>
> **The one entry that cannot be expressed — and why it does not matter.** `prime-agent` is a
> `file:` dependency, and npm keys install scripts for those by the **resolved absolute path**:
> measured on this host, `allowScripts` entries `prime-agent@0.7.0-gooeypi.1`, `dep` and
> `file:./dep-1.0.0.tgz` were **all blocked** for a local tarball dep, and only
> `dangerously-allow-all-scripts=true` ran it. That is why `npm install-scripts approve` writes
> `file:/Users/<builder>/…` — an entry no commit can carry. Leaving it blocked is safe here:
> prime-agent's `postinstall.cjs` delegates to `dist/postinstall.js`, which exits 0 unless
> `PRIME_AGENT_BOOTSTRAP_KERNEL_ON_INSTALL=1` or `PRIME_AGENT_BOOTSTRAP_TOOLS_ON_INSTALL=1`
> (read from the vendored tarball; neither is set by this repo or its workflows).
>
> Consequence: a clean install warns about exactly one blocked script — `prime-agent` — and that
> warning is expected. Anything else appearing in `npm install-scripts ls` is a new dependency
> that needs an entry.

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

### Runtime proof over ssh — the packaged smoke

A GUI launch is impossible over ssh, but the app carries its own headless mode, and it is the
only *runtime* evidence available on this host:

```bash
APP=release/mac/arm64/mac-arm64/VClaw.app
"$APP/Contents/MacOS/VClaw" --packaged-smoke=/tmp/smoke-marker.json; echo "rc=$?"
# rc=0 and the marker written:
# {"event":"vclaw-packaged-smoke-ready","url":"prime-work://app/index.html","version":"1.1.17"}
```

The marker means the packaged app started, loaded its renderer and completed an authorized IPC
round trip — none of which `verify-package` can see. Run it on every artefact before delivery;
measured working on the 1.1.17 arm64 build (2026-11-01, rc=0).

## Delivering the artefact

`vclaw-desktop/build/` is both electron-builder's `buildResources` directory and the agreed drop
point, so it holds tracked plists and large binaries at once. `.gitignore` ignores the artefact
patterns but **not** the plists — never `git add build/` wholesale.

Copy the DMG and ZIP back, then confirm the transfer with `shasum -a 256` on **both** sides
before anyone opens the file. Report the triple with every delivery: source commit, pinned CLI
digest, artefact digest.

## Trap 5 — a platform `artifactName` silently beats the generic one

`package.json` sets `build.mac.artifactName` (`${productName}-${version}-${arch}.${ext}`). electron-builder
resolves **platform-specific config before the generic key**, so `--config.artifactName=…` and a top-level
`build.artifactName` are both ignored on macOS. The build looks correct — the file that appears matches the
product name — which is why this survived: a member build therefore shipped as
`VizMaster-1.1.17-arm64.dmg` instead of `VClaw-1.1.17-vizmaster-arm64.dmg`, and nothing failed, because the
only checker compared the artifact to itself.

Set the **per-platform** key: `--config.<platform>.artifactName=…`. And assert the name against the product
identity at verification time (`assertPackagedProductProfile`), which is what turned this from a silent
mismatch into a failing gate.

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
