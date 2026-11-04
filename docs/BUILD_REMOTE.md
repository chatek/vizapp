# Remote build — VClaw desktop, `electron-builder --dir` flow

The macOS app is built **only** on `BUILD_USER_REDACTED`; a local
`release/` tree is a throwaway, not evidence. This file is the authoritative procedure for the
flow that bundles OMP into the app (`electron-builder --mac --<arch> --dir`, driver
`scripts/release/build-remote.sh`). The dmg/zip flow — signing, notarisation, `package.mjs`,
its npm-12 trap — is a different lane and lives in [RELEASE_BUILD_HOST.md](RELEASE_BUILD_HOST.md).

This driver **builds**; it does not publish. The workstation runs
`scripts/release/release-forgejo.sh`, which calls this driver, tags the commit, uploads
`release-remote/<arch>/` to a Forgejo release on `chatek/vclaw-app` and re-fetches to verify
([RELEASE_FLOW.md](RELEASE_FLOW.md) §3).

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

Two things about the host's network are not negotiable, and both cost a cycle if discovered late:

* **`github.com` does not resolve to anything routable** — `nslookup github.com` → `198.18.0.11`,
  the fake-ip range a local Clash Verge (`verge-mihomo`) TUN hands out. electron-builder's
  downloads therefore need `ELECTRON_MIRROR`, and the OMP binaries can never be fetched from a
  GitHub release URL on this host.
* **The host's tailnet does not contain the Forgejo box.** `tailscale status` on the host lists
  42 peers and no `vmaker-pi`; `vmaker-pi.TAILNET_REDACTED` resolves to the same fake-ip
  `198.18.0.11` and `curl -v` dies in the TLS handshake:
  `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`. Measured — so this host **cannot clone from
  Forgejo**, even though the workstation can (`curl -o /dev/null -w %{http_code}` → `200`,
  `TAILNET_IP_REDACTED`). Source therefore arrives as a **git bundle streamed over `tailscale ssh`**,
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
H=BUILD_USER_REDACTED

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
#     https://vmaker-pi.TAILNET_REDACTED/forgejo/chatek/oh-my-pi/releases/download/v18.16.0/)
```

Nothing in the driver touches `brew`, sudo, npm globals, `PATH` files or shell rc files:
it exports `PATH="$HOME/build/toolchain/node-v24.15.0-darwin-arm64/bin:$PATH"` inside each
remote command, so the host's system node stays v25.8.0.

## Provenance — `BUILD.json`

Every build writes one, next to the zip (arm64 shown; x64 differs only in `arch`, `artifact`,
`app.path`, `executableSlices` and the `omp` binary/digest):

```json
{
  "schema": 1,
  "builtAt": "2026-11-04T16:15:50Z",
  "host": "BUILD_USER_REDACTED",
  "source": { "repo": "vclaw-desktop", "remote": "https://vmaker-pi.TAILNET_REDACTED/forgejo/chatek/vclaw-app", "branch": "vizmaster", "commit": "cabbc52495bb8174b344599312b2911c50f6a2cd" },
  "arch": "arm64",
  "product": { "id": "vclaw", "name": "VClaw", "appId": "com.vclaw.desktop" },
  "artifact": { "file": "VClaw-arm64-app.zip", "bytes": 249687816, "sha256": "e4780cb30a63272a25af02a1f2ab1adb75b7d8d1808cffdce8bd14dab9d3b247" },
  "app": { "path": "/Users/chance/build/vclaw/vclaw-desktop/release/mac-arm64/VClaw.app", "executable": "VClaw", "executableSlices": "arm64" },
  "omp": { "release": "v18.16.0", "binary": "omp-darwin-arm64", "sha256": "d4a10d97488d6054d2b18198bd24f461079952c7e0fb75ba66336ca0df0cb99e", "slices": "arm64" },
  "electron": "43.4.0",
  "signing": null
}
```

`source.remote` is `git remote get-url origin`. In this clone that is the **Forgejo mirror**
(`chatek/vclaw-app`), not the record repo (GitHub `chatek/vclaw-desktop`), so treat the field as a
**locator, not an authority**: it says which URL this checkout fetched from, not which repo is
canonical. Measured 2026-11-05 at HEAD `346127d`: both remotes carry `main 92991ab` and
`vizmaster 1b2c62b`, and `c49cc37` is an ancestor of `cabbc52` — one linear history, not two. A pin
consumer should therefore resolve repo+sha against the designated record, and use
`source.remote` only to explain which mirror produced the bytes.

`branch` records the branch the bundle was cut from, not a policy. The flow now cuts from
**`main`** — the single long-lived branch; `origin/vizmaster` is legacy and retiring — so a
`BUILD.json` naming `vizmaster` is a historical measurement, not an instruction.

The example above is from the run at `cabbc52…`. The `release-remote/{arm64,x64}/BUILD.json` on
disk were regenerated at `9d2e9b76f164…` on 2026-11-05 and do carry `source.remote`; both were
re-checked field by field against the pulled zips (see *Proof run*). A rebuild of the same commit
is still a **new** artefact — `ditto` records timestamps, so `artifact.sha256` differs — so
regenerate, never hand over an older file.

`build-remote.sh --check` can be run on the receiving side to re-prove a host still matches; the
digests in `BUILD.json` are the bytes that were actually pulled (zip sha256 is taken on the host
*before* transfer and re-computed locally after it).

### Three different files are called `BUILD.json`

| file | written by | contents | meaning |
|---|---|---|---|
| `release-remote/<arch>/BUILD.json` (**release**) | this driver, beside the artefact, never inside the app | full 40-char commit, branch, product id/appId, zip bytes+sha256, `omp` digest+slices, electron version, `signing` | what these exact bytes are |
| `VClaw.app/Contents/Resources/product/payload/BUILD.json` (**payload**) | the **member** repo: `scripts/build-info.mjs`, copied into the payload by `bundle-vizmaster.mjs` (`bundle:vcclaw`); this build only carries it, and the mounted-dmg assert in `release.yml` reads it afterwards | eight keys incl. `vizmasterVersion`, `vizmasterCommit`, `vclawVersion`, `vclawCommit`, `builtAt`, `dirty`, `vclawDirty` — **short shas** | which member/vclaw pair the payload was cut from |
| `~/<Name>/BUILD.json` (**runtime seed**) | the app itself, `writeBuildJson()` in `electron/main/default-project.ts:186-203`, at first-launch project seed; skipped when the installed `release` already matches | `{release, name, seededAt}` merged over keys the payload already carried | which payload release a user's project was seeded from |

Attribution matters: `electron/main/product-profile.ts:55` is the JSDoc on
`DefaultProjectSpec.version` that *documents* the stamp — it writes nothing. The in-bundle payload
file comes from the member repo, the `~/<Name>` file from the runtime seeder, and neither is
produced by this packaging step. `release.yml` therefore validates a stamp it did not emit
(including `dirty`/`vclawDirty` and short-sha *prefix* comparison); a pin auto-bump that reads it
inherits that format and that producer, so if full shas are wanted the producer has to change —
not the assertion.

**The zip is not bit-reproducible across runs.** Three builds of the same commit (`cabbc52495bb…`)
on the same host produced 249,687,809 → 249,687,816 → 249,687,818 bytes (arm64) and 260,078,847 →
260,078,851 → 260,078,857 bytes (x64), each with a different sha256. So a pin must name the **commit**, and any artifact hash in
`latest.json`/`app-release.json` must come from the `BUILD.json` of the run that was uploaded —
never from a previous build of the same commit.

### Proof run — 2026-11-05, commit `9d2e9b7`

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

The same commit built twice gave **different** zips that day: arm64 249,687,818 B / `5d39a1da…`
first, 249,687,802 B / `eb2e3b6c…` on the repeat. Bytes and sha256 in `BUILD.json` describe *that
run's file*; pin the commit, hash the run you ship.

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
Each arch lands in `release-remote/<arch>/` as `VClaw-<arch>-app.zip`, unpacked under `unpacked/`
for verification, beside `build.log` (the full remote build log), `verify.txt` (the host-side gate
output), `product.json` (lifted out of the app) and `BUILD.json` (provenance, see below).

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
   ./node_modules/.bin/electron-builder --mac --<arch> --dir --publish never \
     --config.mac.identity=null --config.mac.notarize=false [--config.electronDist=…]
   ```
   `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` is exported for the run.
   `release/mac-<arch>` is deleted first so a stale `.app` can never be mistaken for the build.
5. **host gates** — the log must contain `after-pack: bundled omp verified (…)`; the driver then
   prints the app path, `lipo -archs` of `Contents/MacOS/VClaw`, sha256 + `lipo -archs` of
   `Contents/Resources/harness/bin/omp`, and the packed `product.json` id
   (`release-remote/<arch>/verify.txt`).
6. **collect** — `ditto -c -k --sequesterRsrc --keepParent VClaw.app` on the host, sha256 taken
   there, file pulled, sha256 recomputed locally and compared.
7. **local gates** — unzip, then `lipo -archs` must show the requested slice for **both** the app
   executable and the bundled `omp`, and the pulled `omp` sha256 must appear in `SHA256SUMS.txt`
   for `omp-darwin-<arch>`.
8. **provenance** — writes `release-remote/<arch>/BUILD.json` (below), so a release manifest or a
   pin bump never has to re-derive what an artefact is from a filename.

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
| `curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to vmaker-pi.TAILNET_REDACTED:443` | the host is not in the Forgejo box's tailnet; the name resolves to `198.18.0.11` | do not clone from Forgejo on this host — the driver streams a bundle |
| `node -v` → `v25.8.0` and the build then behaves differently from the validated toolchain | homebrew node on `PATH` | prepend `~/build/toolchain/node-v24.15.0-darwin-arm64/bin`; the driver refuses to start if that node is missing or not `v24.15.0` |
| `Error: bundled omp: resources/harness/bin/omp is missing — was mac.extraResources applied?` | the release set is not at `../vendors/oh-my-pi/releases/v18.16.0/` relative to the checkout | create the sibling `vendors/` tree |
| electron-builder `⨯ Application entry file "out/main/index.js" … was not found in this archive` | `out/` was never built — `npm ci` alone does not produce it | run `npm run build:bundle` first; the driver does, and asserts `out/main/index.js` |
| electron-builder `• file source doesn't exist  from=…/product/profile.active.json` (**warning only**) | the generated profile was never staged | stage `$VCLAW_PROFILE` → `product/profile.active.json` before packaging; otherwise the app has no `resources/product.json` |
| a failing remote command looks successful — the build exits 0 and the driver carries on | **`tailscale ssh` always returns 0**: `tailscale ssh host -- 'exit 5'` → local `rc=0` | every remote invocation in the driver carries an in-band `__VCLAW_RC__=<n>` marker and reads the status from it; never trust the ssh exit code, and never write a driver without this |
| driver verifies `release/mac-x64/VClaw.app` and reports `missing …/release/mac-x64/VClaw.app` although the build was green | electron-builder puts x64 in `release/mac`, only non-x64 arches get a suffix | map the dir per arch (`out_dir_for()`); never assume `release/mac-<arch>` |
| a member build's packaged identity disagrees with `product/vizmaster.json` (the profile says `com.vclaw.desktop`, the package says something else) | the profile's identity was not passed to electron-builder | pass `--config.productName/--config.appId` from the profile and assert the packaged appId (the driver does); `product.json` **id** stays `vizmaster` by design |
| `lipo: can't open input file …/Contents/MacOS/VClaw` on a member build | the executable is named after the profile's `productName`, not a hardcoded name | derive the executable from `CFBundleExecutable`, never hardcode it |
| `omp-darwin-x64` missing on the host and an `--x64` build requested | the release set is synced per arch right before that arch builds | the driver syncs it; `--check` reports it as `FAIL omp x64 — missing …` before you spend a build |
| `Error: bundled omp: no SHA256SUMS entry for omp-darwin-<arch>` | binary present, `SHA256SUMS.txt` stale | re-copy the release set together, never a lone binary |
| `Error: bundled omp: sha256 mismatch — expected … got …` | truncated/partial transfer | both sides are hashed during sync; a partial reaches `.partial` and never lands |
| `Error: bundled omp: Mach-O does not contain the <arch> slice (lipo: …)` | wrong-arch binary for the requested `--arch` | copy the matching `omp-darwin-<arch>` |
| `Error: bundled omp: universal mac builds are not supported` | `--universal` | build `--arm64` and `--x64` separately |
| `Packaging failed: npm >=12.0.2 is required (found 11.x)` | only the `package.mjs` flow enforces the pinned npm | unrelated to this flow; see RELEASE_BUILD_HOST.md |
| `npm warn EBADENGINE … required: { npm: '>=12.0.2' } current: { npm: '11.12.1' }` | node 24.15.0 ships npm 11, the repo pins npm 12 for `package.mjs` | expected here and **not** a failure: this flow calls electron-builder directly, and npm 11 runs the install scripts the way the lockfile expects |
| `  • skipped macOS code signing  reason=identity explicitly is set to null` | no signing identity on the host (0 valid) | expected; this flow produces unsigned `--dir` artefacts only |

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
| collected zip | `VClaw-arm64-app.zip` | `VizMaster-arm64-app.zip` (249,691,722 B, sha256 `bc3b25054ec5…`) |

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

### What `VCLAW_PROFILE` does **not** do

It selects identity and `resources/product.json` — it does **not** produce the member payload
layout. Measured on the pulled member bundle: `Contents/Resources/` holds
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
`chatek/vizmaster`, `forgejo` = `…/forgejo/chatek/vizmaster`). Measured 2026-11-05: the Forgejo
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

## Publishing to Forgejo (`scripts/release/release-forgejo.sh`)

The host cannot reach the Forgejo box, so the workstation publishes. One command takes "code at a
commit" to "assets on a `chatek/vclaw-app` release":

```bash
bash scripts/release/release-forgejo.sh --arm64 --dry-run       # rehearse: build, print payloads
bash scripts/release/release-forgejo.sh --arm64                 # arm64 draft release
bash scripts/release/release-forgejo.sh --arm64 --x64 --publish # both arches, published
bash scripts/release/release-forgejo.sh --tag v1.1.17+346127d   # explicit tag
```

Order: preflight (clean tracked tree, HEAD == `origin/<branch>` tip, `--check`, token, Releases
unit) → `build-remote.sh` → provenance re-read from `release-remote/<arch>/BUILD.json` → annotated
tag `v<version>+<short sha>` pushed to `origin` **and** `github` (this submodule has no fan-out) →
`POST /api/v1/repos/chatek/vclaw-app/releases` → upload the zip, `BUILD-<arch>.json`, merged
`SHA256SUMS.txt`, `tuple.json` → re-fetch and compare served sizes and `SHA256SUMS.txt`. Signing is
unavailable (the host reports `identities=0`), so the zip asset name carries `-unsigned`, the body
says `unsigned=yes`, and the release stays a draft unless `--publish` is passed. The token comes
from `FORGEJO_TOKEN` or `<superproject>/.prime/forgejo-token`; it is handed to curl in a 0600 config
so it never appears on a command line or in any output.

| failure | what it means |
|---|---|
| `has uncommitted changes to tracked files` | commit or undo — the host builds a commit, not your working tree |
| `is not the tip of origin/<branch>` | push the branch, or check out the tip you mean to release |
| `--check failed on: <label>` | a host fault a build cannot repair (node, disk, mirror, profile); `checkout` / `omp …` / `SHA256SUMS.txt` failures are synced by the build |
| `Releases unit is disabled` | `PATCH /api/v1/repos/chatek/vclaw-app` with `{"has_releases":true}`, once, as an admin |
| `already exists at …` / `a release for … already exists` | tags and releases are never rewritten — pick another `--tag` |
| `served size … != local` | the upload truncated; the release is not trustworthy |
