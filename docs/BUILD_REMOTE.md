# Remote build — VClaw desktop, `electron-builder --mac dmg zip` flow

The macOS app is built **only** on `build@build-host.example`; a local
`release/` tree is a throwaway, not evidence. This file is the authoritative procedure for the
flow that bundles OMP into the app and emits, per arch, an **unsigned `.dmg`** (mountable
installer) and the **`.app` `.zip`** from one pack: `electron-builder --mac dmg zip --<arch>
--publish never --config.mac.identity=null --config.mac.notarize=false`, driver
`scripts/release/build-remote.sh`. Both targets are produced from the same `.app`, so the bundle
inside the dmg and the bundle inside the zip are the one that passed the OMP gates below. The
signing/notarisation lane through `package.mjs` (its npm-12 trap) is separate and lives in
[RELEASE_BUILD_HOST.md](RELEASE_BUILD_HOST.md).

This driver **builds**; it does not publish. The workstation runs
`scripts/release/release-forgejo.sh`, which calls this driver, tags the commit, uploads the dmg,
the app zip, `BUILD-<arch>.json`, `SHA256SUMS.txt` and `tuple.json` to a draft Forgejo release on
`chatek/vclaw-desktop` and re-fetches to verify (served sizes, `cmp` of the sums file, and
`hdiutil verify` on each re-downloaded dmg) ([RELEASE_FLOW.md](RELEASE_FLOW.md) §3). Lane
ownership and what a handoff is: [BOUNDARIES.md](BOUNDARIES.md).

The asset set is fixed and **the zip is not optional**: per arch
`<product>-<version>-<arch>-unsigned.dmg` **and** `<product>-<version>-<arch>-unsigned.zip`, plus
`BUILD-<arch>.json` per arch (one per arch, not a single `BUILD.json`), the merged
`SHA256SUMS.txt` and `tuple.json` — 2 + 2·arch assets. A consumer or a stale-asset pruner that
expects `dmg, BUILD.json, SHA256SUMS, tuple.json` will delete or flag the zips; the dmg is the
installer, the zip is the only asset an updater or a non-mounting verifier can consume.

Everything below was measured on 2026-11-04/05 on the host, not inferred from the docs.

## Remote is primary — there is no silent fallback

`scripts/release/build-remote.sh` builds **only** on the host. If the host is unreachable it
exits non-zero and prints the pointer to `scripts/release/build-local.sh` /
[BUILD_LOCAL.md](BUILD_LOCAL.md); it never switches to a local build on its own, and a local
build is never evidence for a release. The local path is a separate, explicitly opt-in script
(`VCLAW_ALLOW_LOCAL_BUILD=1`) for the case where the host is genuinely unavailable.

## Host facts

| | before setup | after setup |
|---|---|---|
| node (PATH) | **v25.8.0** (`/opt/homebrew/bin/node`) | v25.8.0 — untouched; the driver prepends **v24.15.0** for the build |
| npm | 11.11.0 (from node 25) | 11.12.1 (ships inside node 24.15.0) |
| bun / nvm / fnm / mise | absent | absent (not needed) |
| Xcode | Command Line Tools only, `/Library/Developer/CommandLineTools`; `xcodebuild -version` → `xcode-select: error: tool 'xcodebuild' requires Xcode` | same — CLT is sufficient, no Xcode.app |
| OS / CPU | macOS 26.3.1 (25D2128), arm64, Apple M4 | same |
| disk | 198 GiB free on `/System/Volumes/Data` | 198 GiB free before the build |
| code-signing identities | 0 → `--config.mac.identity=null` in the driver | same |

## Windows host — `build@win-build-host.example` (win11 KVM guest on hypervisor)

Windows artefacts of record are built **only** inside this guest, by the same evidence rule as
the mac host: `package.mjs` refuses `--platform win` unless it runs on `win32`, so this guest is
the only machine that can produce them. Measured 2026-11-13:

| | facts |
|---|---|
| what it is | Windows 11 **Pro** (unactivated — see note), KVM guest `win11` on `hypervisor.example`, 8 vCPU / 16 GiB, qcow2 on btrfs |
| access | `ssh build@win-build-host.example` (tailscale MagicDNS, key auth; `hypervisor-alias` alias in the workstation's `~/.ssh/config`) |
| node / npm / git | system node **v26.13.1**/npm 11.20.0 (npm needed `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`), git **2.56.0.windows.4**; **build toolchain** = pinned node **v24.15.0**+npm 12.0.2 off-system at `~\build\toolchain\node-v24.15.0-win-x64\` (npmmirror), Python 3.12, VS Build Tools 2022 (C++ workload), VC++ 2015+ runtime |
| omp on the guest | omp/18.20.0 via bun — GLM configured (`glm-5.3` default, `glm-5.3-flash` smol) — usable for build-driving agents |
| activation note | the provisioned MAK key was rejected by Microsoft (`0xC004F050`, revoked volume key) — the box runs unactivated, which does not affect building; a real retail key is an open errand |
| DNS | estate servers (119.29.29.29, 8.8.8.8, 223.5.5.5, 8.8.4.4) on the Ethernet adapter; Tailscale adapter keeps MagicDNS |
| network caveat | outbound CDN throughput is poor (~100 KB/s class to Microsoft/herdr.dev); stage large payloads via the LAN/tailnet (measured: ISO 9.1 GB at ~110 MB/s via ct17 rsync) |

**Windows build procedure (PROVEN 2026-11-13/14 — first full run, QA, commit `160c431`):**

```powershell
# 0. prerequisites (one-time): see the toolchain notes below
# 1. clone (Forgejo IS reachable from the guest; github.com is not — 401)
git clone https://forgejo.internal.example/chatek/vclaw-desktop.git C:\Users\build\dev\vclaw-desktop
# 2. install WITHOUT scripts (the postinstall forces a node-pty rebuild — see trap 4)
npm ci --no-audit --no-fund --ignore-scripts
# 3. copy node-pty prebuilts into the build path
Copy-Item node_modules\node-pty\prebuilds\win32-x64\* node_modules\node-pty\build\Release\ -Recurse -Force
# 4. electron binary
node node_modules\electron\install.js
# 5. bundle + package (npm 12 required — bootstrap first)
npm run toolchain:bootstrap
node scripts/release/package.mjs --qa --platform win --arch x64 --skip-verify
```

**First-run artefacts (2026-11-13T19:50Z):** `VClaw-1.1.17-x64.exe` 124,480,048 B
sha256 `d4132931…e9029546`, plus appx/msix/zip/latest.yml — pulled to the workstation
`build/` with digests verified both sides.

**Windows traps (all measured, each cost a cycle):**
1. **node version is load-bearing:** system node 26 LTS fails native modules with
   `ERR_DLOPEN_FAILED` (ABI). Use the pinned 24.15.0 from `.nvmrc`, off-system at
   `~\build\toolchain\node-v24.15.0-win-x64\` (npmmirror mirror is fast ~9 MB/s).
2. **VC++ runtime absent on fresh Windows** — `VCRUNTIME140.dll` missing breaks
   `@electron-internal/extract-zip` with a misleading "optional deps npm bug" message.
   `winget install Microsoft.VCRedist.2015+.x64` fixes it.
3. **`core.autocrlf` must be OFF** (global + repo) or `verify-vendor-patches` fails: patches
   are cut against LF; CRLF checkout breaks both apply and byte-compare.
4. **node-pty Spectre (MSB8040):** the VS Build Tools installer is BROKEN on the guest
   ("Didn't find any channel feed", exit 87/1 across every documented invocation shape —
   direct setup.exe, bootstrapper, channelUri, short paths). Workaround: patch
   `SpectreMitigation: 'Spectre'` out of `node_modules/node-pty/binding.gyp` AND
   `node_modules/node-pty/deps/winpty/src/winpty.gyp` (LOCAL-ONLY edits; prebuilts are
   NAPI-stable, non-Spectre build is fine for QA). The proper fix upstream is to stop
   force-rebuilding node-pty (it ships prebuilts — see daintree #4145 for the analysis).
5. **`verify-vendor-patches.mjs` portability:** needs `npm.cmd` + `spawnSync … shell:true`
   on win32 (two local patches; upstream-worthy).
6. **Windows sleep suspends the VM mid-build** (`pmsuspended` at the hypervisor, twice):
   `powercfg /setactive SCHEME_MIN; powercfg /change standby-timeout-ac 0; powercfg /h off`
   inside the guest. Recovery from suspend: `virsh dompmwakeup win11` on the hypervisor.
7. **`--skip-verify` justification:** the coverage thresholds fail on this commit ON MAC TOO
   (measured 2026-11-13 at `73e62c3`) — the aggregate is red upstream, not a Windows defect;
   the documented skip applies, and package verification + verify-cross-platform-package
   still run inside package.mjs regardless.

**Proof point:** the mac-doc traps translate as documented — trust the tool's own verdict
line, not the ssh exit code; hash on both sides before delivery.

Two things about the **mac host's** network are not negotiable, and both cost a cycle if
discovered late:

* **`github.com` does not resolve to anything routable** — `nslookup github.com` → `198.18.0.11`,
  the fake-ip range a local Clash Verge (`verge-mihomo`) TUN hands out. electron-builder's
  downloads therefore need `ELECTRON_MIRROR`, and the OMP binaries can never be fetched from a
  GitHub release URL on this host.
* **The host's tailnet does not contain the Forgejo box.** `tailscale status` on the host lists
  42 peers and no `vmaker-pi`; `forgejo.internal.example` resolves to the same fake-ip
  `198.18.0.11` and `curl -v` dies in the TLS handshake:
  `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`. Measured — so this host **cannot clone from
  Forgejo**, even though the workstation can (`curl -o /dev/null -w %{http_code}` → `200`,
  `192.0.2.10`). Source therefore arrives as a **git bundle streamed over `tailscale ssh`**,
  which is also why the driver never needs a GitHub or Forgejo credential.

## Directory layout on the host

```
~/build/vclaw/
├── src.bundle                                   # last transferred bundle (kept for reuse)
├── vclaw-desktop/                               # git repo, detached at the built commit
│   ├── node_modules/                            # `npm ci`, recreated every run
│   └── release/mac-<arch>/VClaw.app             # the artefact
└── vendors/oh-my-pi/releases/v18.16.0/
    ├── omp-darwin-arm64
    ├── omp-darwin-x64
    └── SHA256SUMS.txt
```

`vendors/` is a **sibling of the checkout**, not inside it. `scripts/release/after-pack.cjs`
resolves the release set as `join(__dirname, '..', '..', '..', 'vendors', …)`, so from
`~/build/vclaw/vclaw-desktop/scripts/release/` that is `~/build/vclaw/vendors/…`. The binaries
are not in git on purpose (215 MB + 228 MB).

## One-time setup (run once per host)

```bash
H=build@build-host.example

# 1. node 24.15.0 — from the official tarball, into ~/build/toolchain.
#    Do NOT use homebrew's node v25.8.0 as the build node: `.nvmrc` pins 24.15.0 and
#    25.x is not the toolchain this branch was validated on. Do NOT `brew install node@24`
#    either — it rewrites the host's default node for every other lane on the box.
tailscale ssh $H 'mkdir -p ~/build/toolchain && cd ~/build/toolchain &&
  curl -fSL -o node24.tar.gz https://nodejs.org/dist/v24.15.0/node-v24.15.0-darwin-arm64.tar.gz &&
  shasum -a 256 node24.tar.gz && tar -xzf node24.tar.gz'
#   measured: 51,450,940 B in 3m06s over the host's uplink,
#             sha256 372331b969779ab5d15b949884fc6eaf88d5afe87bde8ba881d6400b9100ffc4
#   → ~/build/toolchain/node-v24.15.0-darwin-arm64/bin/node = v24.15.0, npm 11.12.1
#   The host default stays v25.8.0; build-remote.sh prepends the 24.15.0 bin dir per command.

# 2. layout
tailscale ssh $H 'mkdir -p ~/build/vclaw/vclaw-desktop ~/build/vclaw/vendors/oh-my-pi/releases/v18.16.0'

# 3. the OMP release set — streamed from the workstation, digests checked on both sides
#    (equivalently from Forgejo on a machine that can reach it:
#     https://forgejo.internal.example/chatek/oh-my-pi/releases/download/v18.16.0/)
```

Nothing in the driver touches `brew`, sudo, npm globals, `PATH` files or shell rc files:
it exports `PATH="$HOME/build/toolchain/node-v24.15.0-darwin-arm64/bin:$PATH"` inside each
remote command, so the host's system node stays v25.8.0.

## Provenance — `BUILD.json`

Every build writes one, next to the dmg and the zip (arm64 shown; x64 differs only in `arch`,
`artifact`, `dmg`, `app.path`, `executableSlices` and the `omp` binary/digest):

```json
{
  "schema": 1,
  "builtAt": "2026-11-04T18:06:31Z",
  "host": "build@build-host.example",
  "dirty": false,
  "source": {
    "repo": "vclaw-desktop",
    "remote": "https://forgejo.internal.example/chatek/vclaw-desktop",
    "branch": "vizmaster",
    "commit": "ee212d9810741a7d8094fa8ef99907d2222f1902",
    "worktree": { "clean": true, "from": "git bundle at ee212d9810741a7d8094fa8ef99907d2222f1902" }
  },
  "arch": "arm64",
  "product": { "id": "vclaw", "name": "VClaw", "appId": "com.vclaw.desktop" },
  "artifact": { "file": "VClaw-1.1.17-arm64.zip", "bytes": 242783591, "sha256": "ae93b58f713475efa9a1b83f13146e64467c9088f4fda4d69d23c67adb7850c9" },
  "dmg": { "file": "VClaw-1.1.17-arm64.dmg", "bytes": 250630884, "sha256": "3b5aef726b4be5523e0affcc7e7bc6b370052f70b5d9c035aac1e2d0e41bf89e", "hdiutilVerify": "VALID" },
  "app": { "path": "/Users/build/vclaw/vclaw-desktop/release/mac-arm64/VClaw.app", "executable": "VClaw", "executableSlices": "arm64" },
  "omp": { "release": "v18.16.0", "binary": "omp-darwin-arm64", "sha256": "d4a10d97488d6054d2b18198bd24f461079952c7e0fb75ba66336ca0df0cb99e", "slices": "arm64" },
  "electron": "43.4.0",
  "signing": null,
  "build": "generic"
}
```

A **member** build adds one block and says so in `build`. Nothing else changes shape:

```json
  "build": "member",
  "member": {
    "repo": "git@github.com:chatek/vizmaster.git",
    "sha": "2a896d80fbbec4fb6b816a0de69a0a0f08356bf2",
    "payload_sha256": "46726ef78f7e505cd949624daa725e6ee75a6a7a492dd505024a64593cbb5367",
    "layout": "product/payload",
    "carrier": "v2",
    "integrate": "v2-local",
    "release": "1.0.0+20261104.2a896d8",
    "files": 103,
    "bytes": 7540417,
    "bundle": "git bundle at 2a896d80fbbec4fb6b816a0de69a0a0f08356bf2"
  }
```

Measured values from draft release #518. `payload_sha256` changes between builds of the same
commits: the payload's own `BUILD.json` carries `builtAt`, so the tree digest is a per-build
fingerprint (like `artifact.sha256`), not a commit hash.

`source.remote` is `git remote get-url origin`. ★ 2026-11-11: the Forgejo repo was renamed
`chatek/vclaw-app` → `chatek/vclaw-desktop` (matching this directory; the old name 301s), and this
checkout's remotes were repointed the same day — `github` is the GitHub record repo, `origin` the
Forgejo one — so treat the field as a
**locator, not an authority**: it says which URL this checkout fetched from, not which repo is
canonical. Measured 2026-11-05 at HEAD `346127d`: both remotes carried `main 92991ab` and
`vizmaster 1b2c62b`, and `c49cc37` is an ancestor of `cabbc52` — one linear history, not two. A pin
consumer should therefore resolve repo+sha against the designated record, and use
`source.remote` only to explain which remote produced the bytes.

`branch` records the branch the bundle was cut from, not a policy. The flow now cuts from
**`main`** — the single long-lived branch; `origin/vizmaster` is legacy and retiring — so a
`BUILD.json` naming `vizmaster` is a historical measurement, not an instruction.

The example above is the run at `ee212d98…` (2026-11-05). The `release-remote/{arm64,x64}/BUILD.json`
on disk were regenerated by that run and carry `source.remote`, `artifact` **and** `dmg`; both were
re-checked field by field against the pulled files (see *Proof run*). A rebuild of the same commit
is still a **new** artefact — the zip and dmg embed file timestamps, so `artifact.sha256` and
`dmg.sha256` differ — so regenerate, never hand over an older file.

`build-remote.sh --check` can be run on the receiving side to re-prove a host still matches; the
digests in `BUILD.json` are the bytes that were actually pulled (zip sha256 is taken on the host
*before* transfer and re-computed locally after it).

### Three different files are called `BUILD.json`

| file | written by | contents | meaning |
|---|---|---|---|
| `release-remote/<arch>/BUILD.json` (**release**) | this driver, beside the artefacts, never inside the app | full 40-char commit, branch, **`dirty: false` + `source.worktree`**, product id/appId, zip bytes+sha256, dmg bytes+sha256+`hdiutilVerify`, `omp` digest+slices, electron version, `signing`, `build` (`generic`/`member`) and, for a member build, the `member` block (repo, 40-hex sha, payload sha256/layout/carrier/release/files/bytes) | what these exact bytes are, and which commit + payload they came from |
| `VClaw.app/Contents/Resources/product/payload/BUILD.json` (**payload**) | the **member** repo: `scripts/build-info.mjs`, copied into the payload by `bundle-vizmaster.mjs` (`bundle:vcclaw`); this build only carries it, and the mounted-dmg assert in `release.yml` reads it afterwards | eight keys incl. `vizmasterVersion`, `vizmasterCommit`, `vclawVersion`, `vclawCommit`, `builtAt`, `dirty`, `vclawDirty` — **short shas** | which member/vclaw pair the payload was cut from |
| `~/<Name>/BUILD.json` (**runtime seed**) | the app itself, `writeBuildJson()` in `electron/main/default-project.ts:186-203`, at first-launch project seed; skipped when the installed `release` already matches | `{release, name, seededAt}` merged over keys the payload already carried | which payload release a user's project was seeded from |

### Which manifest is a consumer looking at?

The two are told apart by **shape**, not by filename — same basename, different producer, different
vocabulary:

| | release manifest (this driver) | payload manifest (member `build-info.mjs`) |
|---|---|---|
| top-level keys | `schema`, `builtAt`, `host`, `dirty`, `source{repo,remote,branch,commit,worktree}`, `arch`, `product`, `artifact`, `dmg`, `app`, `omp`, `electron`, `signing`, `build`, `member` | `release`, `vizmasterVersion`, `vizmasterCommit`, `vclawVersion`, `vclawCommit`, `vclawDirty`, `builtAt`, `dirty` (+ `vizmasterCommitFull`/`vclawCommitFull`) |
| clean-state evidence | `dirty: false` + `source.worktree.clean` | `dirty: false` + `vclawDirty: false` |
| member tuple | `member.{repo,sha,payload_sha256,layout,carrier,integrate,release,files,bytes,bundle}` | the eight keys above |

A consumer that validates **shape first** is right, and it must refuse the release manifest as a
payload stamp: measured against VizMaster's publisher, the release manifest yields
`refusing: BUILD.json is not a member payload manifest — missing keys: release, vizmasterVersion,
vizmasterCommit, vclawVersion, vclawCommit, vclawDirty, dirty (this looks like the builder release
manifest; the payload stamp is produced by the member integrate step)`, rc 3 — the intended verdict,
not a regression. The member tuple a handoff consumer needs (`vclawCommitFull`, payload digest,
layout, integrate mode) lives in *this* manifest's `member` block and in `tuple.json`; the payload
stamp lives inside the app at `Resources/product/payload/BUILD.json`.

The **release** `BUILD.json` states the clean-worktree verdict **explicitly** — `"dirty": false`
plus `"source.worktree": {"clean": true, "from": "git bundle at <40-hex>"}` — because it is written
by a builder that ships a *commit*: the bundle is cut from the commit, the host checks that commit
out, and no working-tree edit can reach it. Earlier provenance files omitted the key and VizMaster's publisher
read the *absence* as `dirty=true`, refusing a clean build (mechanism, measured on their side: the
gate did `node -p "require(file).dirty"`, which prints the literal string `undefined` for a missing
key, and the refusal hardcoded `dirty=true` regardless of the value — a permanent false positive for
any non-member manifest). Their publisher now validates the manifest shape first and prints the
actual value; `release-forgejo.sh` now refuses to
stage an arch whose `BUILD.json` does not say `dirty: false`. A consumer still has to treat a
**missing** key from an older build as "unknown", not as "dirty" — the field is explicit from this
revision on.

Attribution matters: `electron/main/product-profile.ts:55` is the JSDoc on
`DefaultProjectSpec.version` that *documents* the stamp — it writes nothing. The in-bundle payload
file comes from the member repo, the `~/<Name>` file from the runtime seeder, and neither is
produced by this packaging step. `release.yml` therefore validates a stamp it did not emit
(including `dirty`/`vclawDirty` and short-sha *prefix* comparison); a pin auto-bump that reads it
inherits that format and that producer, so if full shas are wanted the producer has to change —
not the assertion.

**The zip and the dmg are not bit-reproducible across runs.** Three builds of the same commit (`cabbc52495bb…`)
on the same host produced 249,687,809 → 249,687,816 → 249,687,818 bytes (arm64) and 260,078,847 →
260,078,851 → 260,078,857 bytes (x64), each with a different sha256. So a pin must name the **commit**, and any artifact hash in
`latest.json`/`app-release.json` must come from the `BUILD.json` of the run that was uploaded —
never from a previous build of the same commit.

### Proof run — 2026-11-05, commit `9d2e9b7` (`--dir` era, pre-dmg)

Kept as measured history: this run predates the dmg target, so its artefact is the `ditto`-made
`.app` zip in `release/mac[-arm64]/`. The dmg flow's proof run is below.

Two separate runs (`--arm64`, then `--x64`) on an already-warm host: source and release set
present, so no transfer happens (a cold run adds the transfer times below).

| arch | wall | result |
|---|---|---|
| arm64 | 64 s | rc=0, `release/mac-arm64/VClaw.app` |
| x64 | 83 s | rc=0, `release/mac/VClaw.app` — x64 gets **no** suffix |

| step | command | result |
|---|---|---|
| preflight | `build-remote.sh --check` | `preflight: PASS (arm64 x64)`, 12 `ok`; on a host without the x64 binary it exits 1 with `FAIL omp x64 — missing …` |
| node on host | `~/build/toolchain/node-v24.15.0-darwin-arm64/bin/node -v` | `v24.15.0`, npm `11.12.1`; host default node still `v25.8.0` |
| source | `git bundle` → `tailscale ssh` → `git fetch` → `checkout --detach` | `9d2e9b76f164b3fb513dc20e4d1a74c71eeace51`, `rev-parse HEAD` matched (already on host → `no transfer`) |
| deps | `npm ci --no-audit --no-fund` | 719 packages in 8–9 s, `npm warn EBADENGINE` only (npm 11 vs pinned 12) |
| bundle | `npm run build:bundle` | `out/` produced; `out/main/index.js` 541.63 kB |
| package arm64 | `electron-builder --mac --arm64 --dir` | `after-pack: bundled omp verified (sha256 d4a10d97488d…, arm64)`, `using custom unpacked Electron distribution electronDist=node_modules/electron/dist`, `skipped macOS code signing` |
| package x64 | `electron-builder --mac --x64 --dir` | `after-pack: bundled omp verified (sha256 abd62d315b66…, x64)`, `downloaded label=electron progress=100%` — the x64 Electron came from `ELECTRON_MIRROR`, not github |
| host gates arm64 | `lipo` / `shasum` on `release/mac-arm64/VClaw.app` | exe `arm64`, omp `arm64`, omp sha256 `d4a10d97488d6054d2b18198bd24f461079952c7e0fb75ba66336ca0df0cb99e`, `product.json` id `vclaw` |
| host gates x64 | same on `release/mac/VClaw.app` | exe `x86_64`, omp `x86_64`, omp sha256 `abd62d315b66314f0f635d537407037e7b0d06782513d8035669db5ef744242d`, `product.json` id `vclaw` |
| collect arm64 | `ditto -c -k --sequesterRsrc --keepParent` → pull | `release-remote/arm64/VClaw-arm64-app.zip`, 249,687,802 B, sha256 `eb2e3b6cb83108dbb3c4a468f1a9bd28b2d761cd3a3bafe3914af748b3c5addb` + `BUILD.json` |
| collect x64 | same | `release-remote/x64/VClaw-x64-app.zip`, 260,078,847 B, sha256 `3177631df55c6bc95dbc42a6cd74d422a350aae10ea9d6d916d3d97932ca16f8` + `BUILD.json` |
| local gates | unzip + `lipo -archs` + `SHA256SUMS.txt` | arm64: exe `arm64`, omp `arm64`; x64: exe `x86_64`, omp `x86_64`; both omp digests found in `SHA256SUMS.txt` |
| provenance | `BUILD.json` re-read against the pulled file | `source.commit` full 40 chars `9d2e9b76f164b3fb513dc20e4d1a74c71eeace51`, `artifact.bytes`/`sha256` == `ls`/`shasum` of the zip, `omp.sha256` == `SHA256SUMS.txt`, `arch` == the directory, `app.path` == `release/mac[-arm64]/VClaw.app` |

Five arm64 builds of **this** commit on the same host that day — two in this lane plus three from
the release lane — produced 249,687,800 / 249,687,802 / 249,687,806 / 249,687,818 bytes, each with a
different sha256 (this lane: `5d39a1da…` at 249,687,818 B, `eb2e3b6c…` at 249,687,802 B). Bytes and
sha256 in `BUILD.json` describe *that run's file*, so a release body must pin the digest of the bytes
it actually uploads; a later `shasum release-remote/<arch>/…` diverging from the table above is
expected, not a discrepancy.

### dmg proof run — 2026-11-05, commit `ee212d9`

One `--arm64 --x64` run of the dmg-capable driver (`bash scripts/release/build-remote.sh --arm64
--x64`, rc=0, warm host: source and release set already present, so no transfer). `dmg` and `zip`
are the two targets of **one** `electron-builder --mac … dmg zip` pack per arch, so the `.app`
inside the dmg and inside the zip is the same bundle `after-pack` verified. Filenames come from
`mac.artifactName` (`${productName}-${version}-${arch}.${ext}`) and land in `release/`, one level
above the per-arch app dir.

| arch | dmg | zip | `hdiutil verify` |
|---|---|---|---|
| arm64 | `VClaw-1.1.17-arm64.dmg` — 250,630,884 B, sha256 `3b5aef726b4be5523e0affcc7e7bc6b370052f70b5d9c035aac1e2d0e41bf89e` | `VClaw-1.1.17-arm64.zip` — 242,783,591 B, sha256 `ae93b58f713475efa9a1b83f13146e64467c9088f4fda4d69d23c67adb7850c9` | `VALID` (host, CRC32 `$55F8E0BE`; workstation, same CRC32) |
| x64 | `VClaw-1.1.17-x64.dmg` — 260,802,907 B, sha256 `8cf728d5bb0ed675074cadcd0db8b2ea1f5a05514093f7b0c2013e3ec035d2d6` | `VClaw-1.1.17-x64.zip` — 252,954,541 B, sha256 `661a297baa97a1beb8aedcd613c61b6bf15f1d310b7ee2374a31e8e0b1b0ccfc` | `VALID` (host, CRC32 `$3CF7249C`; workstation, same CRC32) |

| gate | arm64 | x64 |
|---|---|---|
| `after-pack: bundled omp verified` | `sha256 d4a10d97…, arm64` | `sha256 abd62d31…, x64` |
| app executable slices / omp slices | `arm64` / `arm64` | `x86_64` / `x86_64` |
| pulled-app `lipo` + omp digest in `SHA256SUMS.txt` | ok | ok |
| server-side digests | zip and dmg hashed on the host, re-hashed after the pull, equal | same |
| `BUILD.json` | `artifact` = the zip, `dmg` = file+bytes+sha256+`hdiutilVerify: VALID` | same |

Two traps this run proved, both now in *Failure modes*: the artefacts land in `release/`
(**not** in `release/mac-<arch>/`, which only holds the unpacked app and is what a `--dir` run
made people expect), and the name is `<product>-<version>-<arch>.<ext>`, so the version has to be
read from the packaged `Info.plist` rather than assumed.

The bytes and digests above describe **this** run of `ee212d9`, not "the build of `ee212d9`":
dmg and zip are not bit-reproducible (timestamps), so a rebuild — including the one in
`release-remote/` today — has different digests with the same content. Pin the digest of the
bytes a release actually uploaded (`BUILD.json` of that run), never a number quoted in this file.

**Nothing was built on the workstation.** It produced a git bundle and read the pulled `.app`s;
the packages come from `~/build/vclaw/vclaw-desktop/release/{mac-arm64,mac}` on the host, and the
workstation has no `release/` tree of its own (`ls -d vclaw-desktop/release` → no such file).

### Forced failures — proven, not assumed

`tailscale ssh` cannot report a status: measured `tailscale ssh $H -- 'exit 5'` → local **`rc=0`**.
That is why every remote call carries `__VCLAW_RC__=<n>`; both failure paths were then injected on
purpose, observed, and undone:

| injection | what the driver printed | local rc |
|---|---|---|
| `mv` the host's `omp-darwin-arm64` aside and `chmod 500` the release set — the remote write fails | step `==> sync OMP release set …`, `omp-darwin-arm64  sending 206M`, then one line: `build-remote: FATAL: transfer of omp-darwin-arm64 to … failed (stream rc=141): zsh:1: permission denied: …/omp-darwin-arm64.partial` | 1, before any packaging |
| `$LOCAL_OUT/arm64/build.log` created as a **directory** — `tee` cannot open the log | `tee: … Is a directory`; the remote build still finished green (`__VCLAW_RC__=0`), then `build-remote: FATAL: build of arm64 failed (remote rc=255, log: …)` plus the note that 255 means "no in-band marker — transport or log, not a build verdict" | 1, nothing collected |

Restored afterwards: `chmod 755`, binary moved back, `shasum -a 256` → `d4a10d97…` again, and the
green proof run above was taken **after** the restore.

The second row is a defect this proved and the driver now handles: `ssh_stream` wraps its pipeline
in `|| true` and re-checks the log, because otherwise the ERR trap fired on `tee` *after* the build
had been paid for and the run died with a raw `FAILED at line 88 (rc=1): tee "$log"` — no step, no
log path, no verdict. `transfer_up` is guarded the same way (`trap - ERR` inside the substitution,
`|| rc=$?`, ssh stderr folded into the message): before the fix the trap printed
`FAILED at line 107 (rc=141)` (gzip's SIGPIPE) *before* the real diagnosis and the remote's own
error text only reached the terminal. Any new expected-to-fail pipeline in this driver needs the
same treatment.

### What a first run measured

| step | measured |
|---|---|
| source → host | 96,902,342 B bundle, `9m53s` at ~163 KB/s, digest `b2c87f46…` identical on both sides |
| `omp-darwin-arm64` | 215,642,256 B, sha256 `d4a10d97…`, gzip-streamed |
| `omp-darwin-x64` | 227,570,128 B, sha256 `abd62d31…`, gzip-streamed |

The host link is slow (single stream ~1.3 MB/s on a 2 MB probe, 0.8 MB/s aggregate for four
parallel streams), so the driver streams **one gzip -1 connection at a time** and skips a
binary whose remote sha256 already matches. Parallel streams were measured and are slower;
do not "optimise" this into fan-out.

## Per-release build

```bash
cd vclaw-desktop
bash scripts/release/build-remote.sh --check             # read-only preflight, changes nothing
bash scripts/release/build-remote.sh --arm64             # one arch
bash scripts/release/build-remote.sh --x64
bash scripts/release/build-remote.sh --arm64 --x64       # both, sequentially
bash scripts/release/build-remote.sh                     # no arch flag → the host's arch
```

`--check` is read-only and prints one `ok`/`FAIL` line per item, exiting 0 only when none
failed: ssh reachability, the host's node being exactly `$(cat .nvmrc)` (and what the host's own
default node is), the checkout being at the workstation's commit, `SHA256SUMS.txt` plus each
OMP binary present on the host with the digest the sums file claims, free space under `$HOME`
(> 20 GiB), the Electron mirror answering from the host, `xcode-select -p` and `lipo`. With no
arch flag it checks both arches. Items that a first build will create are `FAIL` by design —
that is the point of a preflight, not a bug.

Options: `BUILD_HOST`, `REMOTE_ROOT`, `LOCAL_OUT`, `ELECTRON_MIRROR`, `VCLAW_PROFILE` (env).
Each arch lands in `release-remote/<arch>/` as `VClaw-<version>-<arch>.dmg` and
`VClaw-<version>-<arch>.zip`, the zip unpacked under `unpacked/` for verification, beside
`build.log` (the full remote build log), `verify.txt` (the host-side gate output), `product.json`
(lifted out of the app) and `BUILD.json` (provenance, see below).

What the driver does, in order, failing loudly at each step:

1. **preconditions** — resolves `HEAD` and the branch (refuses a detached HEAD), warns (does not
   fail) if the tree is dirty, and states explicitly that uncommitted changes are *not* in the
   bundle. Requires `omp-darwin-<arch>` + `SHA256SUMS.txt` locally, `git` on the host, and node
   `$(cat .nvmrc)` on the host.
2. **source** — `git bundle create` of the branch, streamed to `~/build/vclaw/src.bundle`,
   sha256 compared on both sides; skipped entirely when the host already has the commit
   (`git cat-file -e`). Then `git init` (once) → `fetch` → `checkout --force --detach <commit>`
   and `rev-parse HEAD` must equal it.
3. **release set** — per-arch binary streamed with `gzip -1`, written to `.partial`, moved into
   place, sha256 compared to the local file. A mismatch aborts; there is no "close enough".
4. **build** — one remote bash body per arch, streamed to `release-remote/<arch>/build.log`:
   `node -v; npm -v; npm ci --no-audit --no-fund; npm run build:bundle`, a hard
   `test -f out/main/index.js`, staging of `product/profile.active.json` from
   `$VCLAW_PROFILE` (default `product/profile.json`; a member profile also supplies
`productName`/`appId` — see *Member profiles* below), then
   ```
   ./node_modules/.bin/electron-builder --mac dmg zip --<arch> --publish never \
     --config.mac.identity=null --config.mac.notarize=false [--config.electronDist=…]
   ```
   `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` is exported for the run.
   `release/mac-<arch>` is deleted first, together with any `release/*-<arch>.dmg`/
   `release/*-<arch>.zip` of an earlier run, so a stale artefact can never be mistaken for the
   build. electron-builder writes the artefacts to the project output dir (`release/`)
   and the unpacked app to `release/mac-<arch>` (x64: `release/mac`).
   `dmg` and `zip` are targets of the same pack, so `after-pack` runs once and
   the `.app` inside both artefacts is the one it verified.
5. **host gates** — the log must contain `after-pack: bundled omp verified (…)`; the driver then
   prints the app path, `lipo -archs` of `Contents/MacOS/VClaw`, sha256 + `lipo -archs` of
   `Contents/Resources/harness/bin/omp`, and the packed `product.json` id
   (`release-remote/<arch>/verify.txt`). It then runs `hdiutil verify` on
   `release/VClaw-<version>-<arch>.dmg` and aborts unless that reports `VALID`.
6. **collect** — sha256 of the dmg and the zip is taken on the host, both files are pulled over
   `tailscale ssh`, and each sha256 is recomputed locally and compared. The pulled dmg is run
   through the workstation's `hdiutil verify` too.
7. **local gates** — `hdiutil verify` on the pulled dmg, then unzip the app zip and `lipo -archs`
   must show the requested slice for **both** the app executable and the bundled `omp`, and the
   pulled `omp` sha256 must appear in `SHA256SUMS.txt` for `omp-darwin-<arch>`.
8. **provenance** — writes `release-remote/<arch>/BUILD.json` (below) with `artifact` (the zip)
   and `dmg` (file, bytes, sha256, `hdiutilVerify`), so a release manifest or a pin bump never
   has to re-derive what an artefact is from a filename.

Two prerequisites are easy to miss and both were hit on the first real run:

* **`npm run build:bundle` (`electron-vite build`) is what creates `out/`.** `npm ci` does not,
  and `package.json` ships `files: ["out/**/*", …]`, so packaging without it produces an
  `app.asar` with no entry point. electron-builder then exits **1** with
  `⨯ Application entry file "out/main/index.js" in the ".../app.asar" is corrupted: Error:
  "out/main/index.js" was not found in this archive`. The driver runs the bundle and asserts the
  file exists before packaging.
* **`product/profile.active.json` is generated, not tracked** (`.gitignore:36`). `package.mjs`
  writes it from the chosen profile so electron-builder can copy it to `resources/product.json`,
  then deletes it. The driver stages `$VCLAW_PROFILE` (default `product/profile.json` = the
  generic `vclaw` profile; `product/vizmaster.json` for a member build) and removes it afterwards.
  Without it electron-builder only *warns* (`file source doesn't exist from=…/product/profile.active.json`)
  and the app ships without `resources/product.json` — the build is green and the product is
  unnamed.

`npm ci` is deliberate: `node_modules` is thrown away each run, so a stale native module can
never be packaged. It also runs the repo's `postinstall`
(`scripts/release/install-app-deps.mjs`), which logs
`• executing @electron/rebuild … arch=arm64` — i.e. `node-pty` is rebuilt against this Electron
before electron-builder ever starts, and electron-builder rebuilds it again per target arch. The one expected warning is `prime-agent`'s blocked install script — see
RELEASE_BUILD_HOST.md; with the tarball's **npm 11** the scripts run normally, which is why this
flow does not need the npm 12 `install-scripts approve` + `rebuild` dance.

`--config.electronDist` is applied **only when the build arch equals the host arch**
(`arm64:arm64` and `x64:x86_64`; on this arm64 box only the first ever matches). `node_modules/electron/dist` is a single-arch tree; pointing an x64 build
at it would ship arm64 Electron. Cross-arch builds get their Electron from `ELECTRON_MIRROR`.

## Failure modes seen (and what they mean)

| symptom | cause | action |
|---|---|---|
| `⨯ connect EADDRNOTAVAIL 198.18.0.11:443 - Local (0.0.0.0:0)` | electron-builder downloading from github.com; the Clash TUN fake-ip is not routed | export `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` (the driver always does), or build the host arch where `electronDist` applies |
| `curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to forgejo.internal.example:443` | the host is not in the Forgejo box's tailnet; the name resolves to `198.18.0.11` | do not clone from Forgejo on this host — the driver streams a bundle |
| `node -v` → `v25.8.0` and the build then behaves differently from the validated toolchain | homebrew node on `PATH` | prepend `~/build/toolchain/node-v24.15.0-darwin-arm64/bin`; the driver refuses to start if that node is missing or not `v24.15.0` |
| `Error: bundled omp: resources/harness/bin/omp is missing — was mac.extraResources applied?` | the release set is not at `../vendors/oh-my-pi/releases/v18.16.0/` relative to the checkout | create the sibling `vendors/` tree |
| electron-builder `⨯ Application entry file "out/main/index.js" … was not found in this archive` | `out/` was never built — `npm ci` alone does not produce it | run `npm run build:bundle` first; the driver does, and asserts `out/main/index.js` |
| electron-builder `• file source doesn't exist  from=…/product/profile.active.json` (**warning only**) | the generated profile was never staged | stage `$VCLAW_PROFILE` → `product/profile.active.json` before packaging; otherwise the app has no `resources/product.json` |
| a failing remote command looks successful — the build exits 0 and the driver carries on | **`tailscale ssh` always returns 0**: `tailscale ssh host -- 'exit 5'` → local `rc=0` | every remote invocation in the driver carries an in-band `__VCLAW_RC__=<n>` marker and reads the status from it; never trust the ssh exit code, and never write a driver without this |
| driver verifies `release/mac-x64/VClaw.app` and reports `missing …/release/mac-x64/VClaw.app` although the build was green | electron-builder puts x64 in `release/mac`, only non-x64 arches get a suffix | map the dir per arch (`out_dir_for()`); never assume `release/mac-<arch>` |
| a member build's packaged identity disagrees with `product/vizmaster.json` (the profile says `com.vclaw.desktop`, the package says something else) | the profile's identity was not passed to electron-builder | pass `--config.productName/--config.appId` from the profile and assert the packaged appId (the driver does); `product.json` **id** stays `vizmaster` by design |
| `electron-builder produced no release/mac-<arch>/<product>-<version>-<arch>.zip` | `dmg`/`zip` targets write into the **project output dir** (`release/`), not into the per-arch app dir — only `--dir`'s unpacked app lives in `release/mac[-arm64]` | collect from `release/<product>-<version>-<arch>.<ext>`; the unpacked app stays in `release/mac[-arm64]/` for the gates |
| `cat: /Users/<user>/release/<file>: No such file or directory`, then `transfer digest mismatch (local e3b0c442… remote …)` | `pull_down` takes a path **relative to the remote `$HOME`**, and was handed the checkout-relative one | pass `$REMOTE_REPO/release/<file>`; `e3b0c442…` is the digest of an empty file, so a digest check catches this every time |
| `lipo: can't open input file …/Contents/MacOS/VClaw` on a member build | the executable is named after the profile's `productName`, not a hardcoded name | derive the executable from `CFBundleExecutable`, never hardcode it |
| `omp-darwin-x64` missing on the host and an `--x64` build requested | the release set is synced per arch right before that arch builds | the driver syncs it; `--check` reports it as `FAIL omp x64 — missing …` before you spend a build |
| `Error: bundled omp: no SHA256SUMS entry for omp-darwin-<arch>` | binary present, `SHA256SUMS.txt` stale | re-copy the release set together, never a lone binary |
| `Error: bundled omp: sha256 mismatch — expected … got …` | truncated/partial transfer | both sides are hashed during sync; a partial reaches `.partial` and never lands |
| `Error: bundled omp: Mach-O does not contain the <arch> slice (lipo: …)` | wrong-arch binary for the requested `--arch` | copy the matching `omp-darwin-<arch>` |
| `Error: bundled omp: universal mac builds are not supported` | `--universal` | build `--arm64` and `--x64` separately |
| `Packaging failed: npm >=12.0.2 is required (found 11.x)` | only the `package.mjs` flow enforces the pinned npm | unrelated to this flow; see RELEASE_BUILD_HOST.md |
| `npm warn EBADENGINE … required: { npm: '>=12.0.2' } current: { npm: '11.12.1' }` | node 24.15.0 ships npm 11, the repo pins npm 12 for `package.mjs` | expected here and **not** a failure: this flow calls electron-builder directly, and npm 11 runs the install scripts the way the lockfile expects |
| `  • skipped macOS code signing  reason=identity explicitly is set to null` | no signing identity on the host (0 valid) | expected; this flow produces unsigned dmg+zip artefacts only |

Anchored rsync excludes (`--exclude='/release'`, not `--exclude='release'`) and the
`build/` `buildResources` trap are documented in RELEASE_BUILD_HOST.md and apply to any
rsync-based sync; the driver avoids rsync entirely.

## Member profiles (`VCLAW_PROFILE`)

`VCLAW_PROFILE=product/vizmaster.json bash scripts/release/build-remote.sh --arm64` packages the
member build from this tree — measured, rc=0, 1m06s:

| | generic (default `product/profile.json`) | member (`product/vizmaster.json`) |
|---|---|---|
| app bundle on the host | `release/mac-arm64/VClaw.app` | `release/mac-arm64/VizMaster.app` |
| executable (`CFBundleExecutable`) | `VClaw` | `VizMaster` |
| `Resources/product.json` id | `vclaw` | `vizmaster` |
| `CFBundleIdentifier` | `com.vclaw.desktop` | `app.vizmaster.desktop` |
| collected artefacts | `VClaw-<version>-arm64.{dmg,zip}` | `VizMaster-arm64-app.zip` (249,691,722 B, sha256 `bc3b25054ec5…`) — measured pre-dmg |

> **2026-11-05 operator ruling — the member profile keeps the GENERIC identity.**
> `product/vizmaster.json` must carry `productName: "VClaw"` / `appId: "com.vclaw.desktop"`. The
> member build is meant to install **over** a generic install: same userData, one updater channel,
> in-place upgrade, and the existing `~/VizMaster` workspace preserved. The member row above is the
> **pre-ruling** measurement; `product.json` id stays `vizmaster` (it names the artifact and the
> profile), and once the profile change is committed the bundle/executable/`CFBundleIdentifier`
> become `VClaw.app` / `VClaw` / `com.vclaw.desktop`. `package.mjs` derives exactly the generic
> build's identity, so the packaged `CFBundleIdentifier` must equal the generic artifact's.
>
> **State at the time of writing:** the ruling is applied in the working tree but **not committed**,
> and this driver builds the *commit* — so a build of the current HEAD still packages the pre-ruling
> profile (`VizMaster` / `app.vizmaster.desktop`). The driver now refuses that divergence: a profile
> that differs from HEAD aborts with `product profile … has uncommitted changes, but this build
> packages the profile committed at <sha>`, and `--check` reports `FAIL profile — … differs from
> HEAD`. Re-measure the member build once the profile change is committed.

Contract v2 uses ONE payload location: `product/payload`, shipped by the static `extraResources`
entry and named by `defaultProject.from`. The legacy integrator's `vendor/<member>` +
`{from: 'vendor/vizmaster', to: 'vizmaster'}` route seeds nothing under this profile (the directory
exists but is the README placeholder) and is retired — `defaultProject.from` must be
`product/payload`, and `package.mjs` refuses any other value. The mounted-dmg assert reads
`Resources/product/payload/BUILD.json`. `defaultProject.version` is checked in as
`0.0.0+unrendered` and is rendered by `package.mjs` from `product/payload/BUILD.json`'s `release`;
otherwise one artifact would carry two release ids and the seeded project's `BUILD.json` would name
a stale one.

The profile's `identity.productName` / `identity.appId` are passed as
`--config.productName=…` / `--config.appId=…`, exactly as `package.mjs` does, and the driver
**asserts** the packaged `CFBundleIdentifier` and `product.json` id against the profile — a
mismatch aborts. Two traps made that assertion earn its keep:

* **Without those flags the packaged identity silently diverges from the profile.** Pre-ruling
  measurement: `product.json` said `vizmaster` while `CFBundleIdentifier` was still
  `com.vclaw.desktop` and the bundle was still `VClaw.app` — every gate green, profile and package
  disagreeing. The assert compares them, so with the 2026-11-05 generic identity both sides are
  `com.vclaw.desktop` and the member build intentionally matches the generic artifact.
* **App and executable names follow `productName`.** A gate that hardcodes a bundle name only works
  for the profile whose identity matches it: a `VizMaster.app` hardcode broke the pre-ruling member
  build (`lipo` on a nonexistent path → the gate fails, which is how this was found), and a
  `VClaw.app` hardcode would break any member that later selects a different `productName`. Both are
  derived now: the bundle from the profile, the executable from `CFBundleExecutable` via `plutil`.

Only the generic default was proven for x64; the member profile was proven for arm64 **pre-ruling**.
Post-ruling values follow from the same mechanism (`APP_NAME` from the profile, so the bundle is
`VClaw.app`, executable `VClaw`, `CFBundleIdentifier com.vclaw.desktop`, `product.json` id still
`vizmaster`) but are unmeasured until that profile change is committed.

### What `VCLAW_PROFILE` alone does **not** do

It selects identity and `resources/product.json` — it does **not** produce the member payload
layout (`--member` does; see §*Member builds* below). Measured on the pulled member bundle: `Contents/Resources/` holds
`product/payload/{README.md}` (the generic `extraResources` mapping) and there is **no**
`Contents/Resources/vizmaster/` and no payload `BUILD.json`. The member job in
`.github/workflows/release.yml` does this end to end — checkout the member repo at the pinned 40-hex sha →
`npm run bundle:<member>` → `npm run integrate:<member> -- --vclaw "$GITHUB_WORKSPACE"` →
`integrate … --check` → `npm run package:mac -- --member "$MEMBER_ID" --profile "product/$MEMBER_ID.json"` — but that workflow is GitHub-hosted and the release flow does not run it (no Forgejo Actions; publishing is the manual flow in `RELEASE_FLOW.md` §3). `--dir` cannot substitute: the **integrate** step is
what writes the member overlay into this checkout; contract v2 puts the payload at
`product/payload` (one location, seeded from `Resources/product/payload`), and the legacy
`Resources/<MEMBER_ID>/` route is retired.

`package.mjs --member` now fails closed **before** electron-builder when `product/payload/dist`
is absent, when `product/payload` carries only `README.md`, when the profile's
`defaultProject.from` is not `product/payload`, or when `product/payload/BUILD.json` has no
`release` id. A missing or early integrate therefore cannot produce a plausible artifact with no
member content, and the packaged profile cannot stamp a placeholder release. The mounted-dmg assert
in `release.yml` then re-checks the same v2 path inside the built dmg.

The payload `BUILD.json` itself is emitted by the **member** repo (`scripts/build-info.mjs`,
copied in by `bundle-vizmaster.mjs`), and `release.yml` only validates it. The bundler fails
closed **before** it touches the payload: no `BUILD.json` in its `--out` dir → rc=1 with a
three-line refusal and nothing written (a late refusal would leave a half-written bundle).

The handed-over post-packaging assert (`chatek/vizmaster` `scripts/assert-member-dmg.sh`, eight
keys, prefix compare, `dirty`/`vclawDirty`, payload `dist/`, `Resources/extensions/vclaw-agent.js`)
was run here against a dmg built from this driver's member bundle with a **synthetic** payload
(labelled synthetic — not a release). The pass/prefix/dirty/removed rows were measured at the
revision then current; the layout-aware revision was re-measured on a real pulled `.app` and reports
its input and the layouts it probed (>`input: app bundle`, then the failure below).

| case | result |
|---|---|
| matching pin | `BUILD.json OK …` then `PASS`, rc=0 |
| wrong pin | `FAIL: vizmasterCommit 772f4bb is not a prefix of the pinned deadbeef…`, rc=1 |
| `dirty: true` | `FAIL: artifact carries a dirty build`, rc=1 |
| payload `BUILD.json` removed | `FAIL: no payload BUILD.json in the .app (looked for vizmaster/ and product/payload/)`, rc=1 (current, layout-aware revision; an earlier revision said `missing vizmaster/BUILD.json in the .app`) |
| `vclawVersion: null` | `FAIL: BUILD.json has empty/non-string values: vclawVersion`, rc=1 |
| `vclawDirty: "false"` (string, not boolean) | `FAIL: BUILD.json dirty/vclawDirty must be booleans`, rc=1 |

On this driver's real member output (no payload integration) it fails at the last check, which is
the correct verdict: `--dir` cannot substitute for the member job.

**Measured divergence from `release.yml:320-327`.** Both programs were run on the *same* fixture
`BUILD.json` (the workflow's inline node program extracted from the YAML and invoked exactly as the
workflow invokes it: `node -e '<program>' "$BUILD" "$MEMBER_REF" "$SHA"`):

| fixture mutation | `release.yml:320-327` | member assert |
|---|---|---|
| all keys valid, pin matches | accepts (`payload pins ok: …`) | `PASS`, rc=0 |
| `release: ""` | **accepts** | `FAIL: BUILD.json has empty/non-string values: release`, rc=1 |
| `release` deleted | **accepts** | `FAIL: BUILD.json missing keys: release`, rc=1 |
| `vclawDirty: "false"` (string) | **accepts** | `FAIL: BUILD.json dirty/vclawDirty must be booleans`, rc=1 |
| `vclawVersion: null` | rejects (`::error::BUILD.json missing vclawVersion`) | `FAIL: BUILD.json has empty/non-string values: vclawVersion`, rc=1 |

The third row is the one that matters: the in-tree gate tests `dirty === true`, so a payload whose
dirty flag is the **string** `"false"` passes a gate meant to refuse dirty builds. It is latent
today (the member emitter writes real booleans), but any second producer that stringifies the field
walks through. Do not "simplify" the stricter assert to match `:320`.

The short-sha gap is closed on the producer side: `build-info.mjs` emits
`vizmasterCommitFull` / `vclawCommitFull` (40 hex), and when both the payload and the pin carry full
shas the assert compares them **exactly** — `FAIL: vizmasterCommitFull <full> != pinned <full>`,
rc=1 — keeping the prefix rule for short pins (verified in the member tree at `59bac6b`:
`assert-member-dmg.sh:91-93`, `build-info.mjs:118-119`). A pin can therefore name the exact commit;
the short keys remain for display and for the in-tree `:326` prefix check.

**Member-repo source of truth.** Reproducible with one command per side — `git ls-remote
<remote> refs/heads/main` against the member clone's remotes (`origin` = GitHub
`chatek/vizmaster`, `forgejo` = `https://forgejo.internal.example/chatek/vizmaster`). Measured 2026-11-05: the Forgejo
mirror answers `a77a74ef` (its 2026-10-26 tip, unchanged) while GitHub's main keeps advancing
(`813c2c7` at the time of writing, `31dd4a5` minutes earlier) — so the mirror is not merely behind,
it is frozen, and the gap grows. A payload cut from the mirror would carry a stamp naming code that is not there,
so mirror reads are NOT-EVIDENCE for a pin until the sync is fixed.

The workflow now emits that provenance itself: between `Install member dependencies` and
`Bundle the member payload at the pinned sha` it runs, with `working-directory: member`,

```
VCLAW_SRC="$GITHUB_WORKSPACE" node scripts/build-info.mjs --out app/build
```

Emitted **before** integrate on purpose: `build-info` reads the vclaw checkout's tracked state, and
integrate deliberately dirties it, so a later emitter would stamp `vclawDirty: true` and the
mounted-dmg assert would reject the artifact. After the dmg is verified, the member job copies that
payload `BUILD.json` beside the dmg (`release/mac/<arch>/BUILD.json`), adds it to `SHA256SUMS`, and
uploads it — so the handoff directory carries the vclaw sha under named keys
(`vclawCommit`/`vclawVersion`) instead of requiring it to be inferred from the artifact tuple's
ordering. The same job then publishes that directory to the public staging prefix
`staging/member/<member>/<release>/<vclaw-sha>/<arch>/` (dmg, zip, `BUILD.json`,
`SHA256SUMS`, `handoff.json`, `tuple.json`) with `scripts/release/publish-member-staging.mjs`: the prefix is
append-only (an existing key is refused), and a dirty `BUILD.json` is a refusal, so the tuple can
only say clean. `handoff.json` is the flat manifest the consumer validates
(`{vizmasterSha, vclawSha, arch, dirty, builtAt}`); it is written from the payload's full-sha keys.
See `RELEASE_HOSTING.md` §"Member handoff staging".

## Member builds (`--member`, contract-v2 payload)

A member artefact is the *only* publishable output for a member's intake: the generic tree ships
`Resources/product/payload/README.md` and nothing else, which is exactly what a VizMaster-style
Gate 1 refuses. `--member` runs the member path on the host — the same three steps
`.github/workflows/release.yml` runs, minus the GitHub-hosted runner:

```bash
bash scripts/release/build-remote.sh --arm64 \
  --member vizmaster \
  --member-repo ~/Documents/Chatek/apps/VizMaster \
  --member-sha 2a896d80fbbec4fb6b816a0de69a0a0f08356bf2
```

All three flags or none; `--member <id>` also implies `VCLAW_PROFILE=product/<id>.json`, and the
driver refuses when the profile's `id` disagrees with `--member` (the profile decides the product,
including the identity flags the driver passes to electron-builder). The profile is read from the
**commit** (`git show <commit>:product/<id>.json`), not the working tree: the host checks the commit
out, so a local edit to the profile is a `WARNING … packing the COMMITTED profile` and never a
build input.

### Integration mode (`--member-integrate`, default `integrator`)

| mode | what runs on the host | when |
|---|---|---|
| `integrator` (default) | the member repo's own `scripts/integrate-vcclaw.mjs --vclaw <checkout> --carrier v2`, then `… --check`. Fails closed if the member's anchors do not match this vclaw commit. | the member repo's integration targets the commit you build |
| `v2` (opt-in) | contract-v2 **local** integration: copy the bundled payload to `product/payload`, render `product/profile.active.json` from the payload `BUILD.json` `release` (identity passed through). No source rewrites, no anchor patching, no `package.json` mutation — the profile rows are static. The member's integrator is **not** run. | the member's integrator still patches the anchors contract v2 retired (`docs/MEMBER_BUILD.md` step 4) |

A `v2` build is labelled where it cannot be missed: the artefact files are
`<Product>-<version>-<arch>-v2local.{dmg,zip}`, `BUILD.json` carries
`member.integrate: "v2-local"`, `tuple.json` carries the same field, and the release body prints
`integrate: v2-local` plus a line stating that the member repo integrator was **not** used and
why. `--member-integrate v2` does not change what gets asserted: the payload must still be real
(more than `README.md`, a payload `BUILD.json`, `dist/`) and the profile must still stamp that
payload's release, or nothing is packaged. `release-forgejo.sh` refuses a release whose
provenance mode disagrees with the flag it was given.

### What the member path ships and runs

1. **The member repo at `<sha>`**, cut as a git bundle from the refs that contain it
   (`git for-each-ref --contains <sha> refs/heads`) and streamed like this checkout. Measured
   2026-11-05: 1.1 MB for VizMaster `main` `813c2c7`. It lands in `~/build/vclaw/member-<id>`,
   is fetched into `refs/remotes/member/*`, checked out **detached** at `<sha>`, and the driver
   refuses to continue unless `git status --porcelain --untracked-files=no` is empty — a
   member working-tree edit is never ship-able, only the commit is.
2. **Provenance → payload → integrate → `--check`**, in that order, in one streamed body
   (measured commands; the log is `release-remote/member.log`):

   ```bash
   npm ci
   npm run schema:build --if-present            # the dashboard imports @vizmaster/schema (dist/)
   VCLAW_SRC=$HOME/build/vclaw/vclaw-desktop node scripts/build-info.mjs --out app/build
   node scripts/bundle-vizmaster.mjs --with-dist
   node scripts/integrate-vcclaw.mjs --vclaw $HOME/build/vclaw/vclaw-desktop --carrier v2
   node scripts/integrate-vcclaw.mjs --vclaw $HOME/build/vclaw/vclaw-desktop --carrier v2 --check
   ```

   *Provenance first* is load-bearing: `build-info` reads the vclaw checkout's tracked state
   (`vclawDirty`), and integrate deliberately dirties it, so emitting afterwards stamps
   `vclawDirty: true` on a clean build and the mounted-dmg assert rejects the artefact.
   `schema:build` is the first measured failure of this flow: without it the dashboard's
   `tsc --noEmit` dies on `Cannot find module '@vizmaster/schema'` (rc=1). `--payload` is omitted
   on purpose — `app/build/payload/vizmaster` is exactly where `bundle-vizmaster.mjs` writes.
   `--check` runs **after** the real integrate, not before: before it there is nothing to read
   back (measured: the same `ok`/refusal verdict either way, but the pre-integrate run can only
   ever fail).
3. **The pre-packaging assert**, `member-payload-assert.cjs`, written locally and streamed to the
   host (digest-checked) so the builder and the workstation run the *same* code. It refuses
   unless `product/payload/` (v2) or `vendor/<member>/` (v1) carries something other than
   `README.md`, a payload `BUILD.json` with a `release` id, and `dist/`; with `--profile` it also
   refuses when the staged profile's `defaultProject.version` is not that release id (one
   artefact must not carry two release ids). It prints the layout it detected, e.g. (measured on
   the real bundled payload):

   ```
   layout product/payload (v2) — 103 files (102 payload), 7.2 MiB, dist/index.html=yes, payload BUILD.json release=1.0.0+20261104.813c2c7, product/profile.active.json defaultProject.version=1.0.0+20261104.813c2c7
   PAYLOAD_ASSERT layout=product/payload carrier=v2 release=1.0.0+20261104.813c2c7 files=103 bytes=7540417 sha256=114364bf2bf6eed222c66a43b44c8408db06aaa6988763fb73e780bd8bc0b24b
   ```

   and refuses the placeholder payload by name (measured on the un-integrated checkout, rc=1):

   ```
   member-payload-assert: product/payload (v2) REFUSED — nothing but README.md — this is the placeholder payload the generic tree ships; no payload BUILD.json — the member provenance was never emitted into it; no dist/ — the member bundle ran without --with-dist
   ```

   The digest is deterministic — sha256 over the payload files in sorted order, each contributing
   `path\0 bytes \0` — so the same value is recomputed *inside the packaged .app* (where it must
   equal the pre-packaging one) and again locally on the pulled `.app` zip (where it must equal
   `BUILD.json`'s `member.payload_sha256`). A payload that changes between the assert and the
   artefact cannot pass. The handoff directory keeps the member's contract shape: `<arch>/BUILD.json`
   is this driver's release manifest, and the payload manifest lives **inside** the `.app` at
   `Contents/Resources/product/payload/BUILD.json` — a publisher reads it from the mounted dmg
   (VizMaster's publisher does exactly that), so no extra file is emitted beside the artefacts.
4. **Package with the member profile.** The driver packages `product/profile.active.json` — which
   the v2 integrator already rendered from the payload's release — rather than copying the
   checked-in profile over it (the generic path's behaviour), so the seed and the artefact share
   one release id. It calls electron-builder directly, not `package.mjs`: `package.mjs` pins
   `npm >= 12.0.2` and the host runs npm 11.12.1, the documented reason this flow has its own
   electron-builder invocation (`docs/MEMBER_BUILD.md` step 7 bootstraps npm 12 for CI).

### The measured state, 2026-11-05

Two real arm64 runs at vclaw `16871f5` / VizMaster `main` `2a896d8`, differing only in
`--member-integrate`:

| mode | payload | artefact | verdict |
|---|---|---|---|
| `integrator` (default) | built: 103 files, 7,540,417 B, `dist/index.html`, payload `BUILD.json` `release=1.0.0+20261104.2a896d8` | none — nothing packaged | **refused**, correctly (below) |
| `v2` | same payload; packaged at `Resources/product/payload` (103 files, 7,540,417 B) | `VizMaster-1.1.17-arm64-v2local.{dmg,zip}`, 252,952,736 / 245,074,026 B, `hdiutil verify VALID` | **built and published as draft release #518** (`v1.1.17+16871f5-vizmaster`), all five assets re-fetched and re-hashed |

The strict-mode refusal, verbatim:

```
integrate-vcclaw: projects.ts list return anchor not found — VClaw fork drifted
__VCLAW_RC__=2
build-remote: FATAL: preparing the member payload failed (remote rc=2, log: …/release-remote/member.log)
```

Cause, measured: `integrate-vcclaw.mjs` (VizMaster `main` `2a896d8`) anchors on
`return sortProjects(records, 'recent')`; vclaw `electron/main/projects.ts` was refactored to
`const sorted = sortProjects(records, 'recent')` by `daec25a` ("a product may present ONE
project"), which is in **both** vclaw tips (`vizmaster 16871f5` and `origin/main 031c805`). The
vclaw record says the same thing from the other side: `docs/MEMBER_BUILD.md` step 4 — contract v2
**retired** the harness rewrite, the project-list wrapper and the `ensureDefaultProject` call, and
the profile expresses them as data — and VizMaster's `docs/vclaw-desktop-build.md` records the
tree split (the v2 profile ships `product/payload` while its integrator still patches the retired
anchors). The member repo's pending work is an overlay patch series
(`packaging/vizmaster/patches`, applied with `git apply`), which is the mechanism that replaces
those edits. So the refusal is a **cross-repo pin**, and the fix belongs in the member repo: the
driver keeps running the member's integrator, and `--member-integrate v2` is the labelled,
opt-in alternative until the member's integration matches the vclaw commit you build. Never make
the payload path silently skip the overlays without that label.

## x64 on an arm64 host

electron-builder can emit `--x64` from an arm64 host, and it does here — measured on
2026-11-05: `after-pack: bundled omp verified (sha256 abd62d315b66…, x64)`, `lipo -archs` of
`Contents/MacOS/VClaw` → `x86_64`. Two things differ from an arm64 build and both are easy to
misread:

* **The output directory has no arch suffix.** electron-builder only suffixes non-x64 targets:
  `--arm64` → `release/mac-arm64/VClaw.app`, `--x64` → `release/mac/VClaw.app`
  (log: `appOutDir=release/mac`). The driver maps this with `out_dir_for()`.
* **Electron is downloaded, not copied from `node_modules`.** `node_modules/electron/dist` is the
  host's arm64 tree, so the x64 build logs `• downloaded label=electron progress=100%` from
  `ELECTRON_MIRROR` — the one path that needs the mirror, since github.com is unroutable.

Native modules are rebuilt per arch by electron-builder's `@electron/rebuild`
(`• preparing moduleName=node-pty arch=x64` / `• finished`). Verified in the pulled bundles,
not assumed:

```bash
file release-remote/x64/unpacked/VClaw.app/Contents/Resources/app.asar.unpacked/node_modules/node-pty/build/Release/pty.node
#   Mach-O 64-bit bundle x86_64        (arm64 bundle: Mach-O 64-bit bundle arm64)
lipo -archs release-remote/x64/unpacked/VClaw.app/Contents/Resources/app.asar.unpacked/node_modules/zeromq/build/darwin/x64/node/*-Release/addon.node
#   x86_64                             (arm64 bundle: build/darwin/arm64/..., arm64)
```

So an `--x64` app from this host carries x64 `node-pty` and x64 `zeromq`. The driver's gates
still only assert the app executable and the bundled `omp`; the addon slices above were checked
by hand and are worth re-checking if the native dependency set changes.

## Not covered here

* dmg/zip targets, signing and notarisation — RELEASE_BUILD_HOST.md.
* The `--packaged-smoke` runtime proof — RELEASE_BUILD_HOST.md; it works over ssh and should be
  run on the `.app` this driver produces.
* Forgejo clone/fetch from the host — impossible on this host today (netmap, see above).

## Publishing — not on this page

The host cannot reach the Forgejo box, so the workstation publishes. The procedure, the
prerelease flip, the anonymous-surface proof and the failure table live in exactly one place:
[RELEASE_FLOW.md](RELEASE_FLOW.md) §3 (and §3.1/§3.2). The handoff rule is
[BOUNDARIES.md](BOUNDARIES.md) §2.

Two facts belong here because they are **build** inputs:

- A member release forwards `--member/--member-repo/--member-sha/--member-integrate` verbatim to
  `build-remote.sh`, and the publisher then *requires* the provenance to say so: every arch's
  `BUILD.json` must carry `build: "member"`, `dirty: false`, the same `member.sha` and the same
  payload digest, or the release is refused before tagging. The tuple gains `"build": "member"`
  plus the `member` block (repo, 40-hex sha, payload sha256, layout, carrier, release, files,
  `integrate`), and the body states `integrate:` (`integrator` or `v2-local`, saying when the
  member repo's integrator was **not** used). A generic build says `generic` in the same fields.
  There is no path from "artefact with the placeholder payload" to a member release: the driver's
  pre-packaging assert refuses first.
- Signing is unavailable (`identities=0` on the host), so asset names carry `-unsigned`, the body
  says `unsigned=yes`, and the release stays a draft unless `--publish` is passed.

## Handoff

**The handoff is a published (or explicitly `prerelease`) Forgejo release URL on
`chatek/vclaw-desktop`; this lane's responsibility ends there.** The rule, the legitimate cross-lane
requests and the anti-patterns — including why a **draft is not a handoff** — are
[BOUNDARIES.md](BOUNDARIES.md) §2–§4.

What this driver must have put on that page first, per arch: the `.dmg` and `.app` `.zip`,
`BUILD-<arch>.json`, a merged `SHA256SUMS.txt`, and `tuple.json`, with the served bytes equal to
the built bytes.

