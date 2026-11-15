# Building Vizmaster locally — the QA path

**Status:** measured 2026-11-04 and re-measured 2026-11-05 on an Apple Silicon workstation
(arm64, Homebrew node 22.22.2; nvm `v24.19.0` activated for the build, electron-builder
26.15.7). The 2026-11-05 run was a full `--arm64` build: 120 s wall,
`ARTEFACT(not-evidence)` printed, bundled `omp` digest/slice/mode verified, the packaged app
smoked far enough to write its readiness marker, `release/` deleted afterwards. Artefacts
are throwaway, so these numbers describe the toolchain, not a shippable build.

This document describes **local packaging for QA**. Official releases are cut by the
maintainer from a controlled build environment; artefacts produced here are **not release
evidence** — they may prove the tree packages and the bundled `omp` verifies, and nothing
about a release.

```bash
bash scripts/release/build-local.sh --check                       # read-only preflight
VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
```

Without `VCLAW_ALLOW_LOCAL_BUILD=1` and without `--check`, the script **refuses** (exit 2)
and says why. That is deliberate: a local build that silently succeeds is how a QA artefact
ends up attached to a release.

What a local `--dir` build gives you: `release/mac-arm64/Vizmaster.app` (`--x64` lands in
`release/mac` — electron-builder only suffixes non-x64 targets), unsigned (ad-hoc), with
`Contents/Resources/harness/bin/omp` verified against `SHA256SUMS.txt` by
`scripts/release/after-pack.cjs`. What it does **not** give you: a `.dmg`/`.zip`, a notarised
or Developer-ID-signed bundle, a tested update feed, or anything you may ship.

---

## 1 · When a local build is legitimate

To answer one of these questions:

- does this commit still package (`npm run build` + `electron-builder --dir` succeed)?
- does `after-pack` accept the bundled `omp` (present, digest matches, Mach-O slice matches)?
- does the packaged app boot far enough to write the readiness marker?

Anything that ends in a release decision — "ship it", "this is the build", "the DMG is ready"
— is the maintainer's release flow, not this one. `build-local.sh --check` is the only part
of this document that is always safe (it is read-only and downloads nothing).

## 2 · Hard prerequisites (all enforced by `--check`)

| prerequisite | requirement | why |
|---|---|---|
| node | **major 24** active on `PATH` (`.nvmrc` pins 24.15.0) | `engines.node` and the pinned toolchain; the script never calls `nvm`, it uses what is already active |
| dependencies | `node_modules/.bin/electron-builder` executable (`npm ci`) | nothing is installed for you |
| bundled `omp` | `../vendors/oh-my-pi/releases/v18.16.0/omp-darwin-<arch>` + `SHA256SUMS.txt` | `mac.extraResources` copies it; a fresh clone does **not** have it (see trap 3) |
| Electron download | `ELECTRON_MIRROR` reachable (HEAD, 15 s timeout) | needed wherever github.com is not routable |
| Xcode CLT | `xcode-select -p` returns a developer dir | native modules (`node-pty`, `zeromq`, `koffi`) |
| `lipo` | on `PATH` | arch assertion in preflight **and** in `after-pack` |
| disk | **> 20 GiB** free on the volume holding `release/` | `node_modules`, `out/`, and an app bundle that carries the 215 MB `omp` |
| arch | requested arch == host arch | cross-arch local builds are unsupported, see trap 5 |

A Homebrew node can be older than the required major while `.nvmrc` wants **24.15.0**.
Activate the nvm toolchain first —

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"   # measured here; any 24.x works
node -v                                                     # must print v24.*
```

`--check` accepts any `24.x` and says so (`major 24; .nvmrc pins v24.15.0 — active
toolchain kept, not switched`). It never runs `nvm use`, because a script that mutates the
caller's toolchain is worse than one that refuses.

## 3 · Exact commands

`--arm64` is the only arch that can be built on an arm64 Mac.

```bash
cd vclaw-desktop
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"

bash scripts/release/build-local.sh --check                  # must exit 0 first
VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
```

That runs, in order: the same preflight · `npm run build` (`tsc --noEmit` × 5 + electron-vite
build) · `electron-builder --mac --arm64 --dir --publish never` with
`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` exported · a re-verification of
`release/mac-arm64/Vizmaster.app/Contents/Resources/harness/bin/omp` (sha256 + `lipo`) · one line

```
ARTEFACT(not-evidence): <app path> <sha256 of the bundled omp> <lipo -archs of the app binary>
```

x64 is the same command with `--x64`, and it **only runs on an Intel host** (trap 5). On an
arm64 workstation `--check --x64` fails the `arch` item by design.

Manual equivalent, if you need to see the steps separately:

```bash
npm run build
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
./node_modules/.bin/electron-builder --mac --arm64 --dir --publish never
```

## 4 · What to verify afterwards

**A zero exit from `electron-builder` is not the check.** A stale or half-swapped bundle can
exit 0 while the process ran the wrong thing. `build-local.sh` therefore re-derives the
facts from the packaged bytes. Checks 1 and 2 are automated — the script dies on any
mismatch; 3 and 4 are manual. The exit code is not the result.

1. **`after-pack` line** in the builder output — the build fails if it is missing, the digest
   differs, or `lipo` reports the wrong slice:
   `after-pack: bundled omp verified (sha256 d4a10d97488d…, arm64)`.
2. **Packaged binary on disk** — 215,642,256 B for arm64, mode `0755` (the script asserts the
   digest, the Mach-O slice, and the executable bit; a mode-`0644` copy — what a skipped
   `after-pack` chmod leaves, since the vendored file is `0644` — fails the build):
   ```bash
   shasum -a 256 release/mac-arm64/Vizmaster.app/Contents/Resources/harness/bin/omp
   stat -f '%z %Lp' release/mac-arm64/Vizmaster.app/Contents/Resources/harness/bin/omp
   lipo -archs release/mac-arm64/Vizmaster.app/Contents/Resources/harness/bin/omp   # arm64
   ```
3. **Runtime smoke** — the packaged app must write the readiness marker and exit 0:
   ```bash
   M="$(mktemp -d)"
   release/mac-arm64/Vizmaster.app/Contents/MacOS/Vizmaster \
     --packaged-smoke="$M/ready.json" --user-data-dir="$M/ud" ; echo "rc=$?"
   ```
   The marker fires at ~1.4 s. A `providers:catalog …` error with a non-zero exit status
   (`143`/SIGTERM in the 2026-11-05 run; earlier notes showed `-1`) is a shutdown race in
   the smoke harness, not a defect (`omp models` needs ~2.5 s).
4. **Cleanup** — `release/` is gitignored and throwaway: `rm -rf release`. Do not carry it
   forward; there is no supported path from a local `.app` to a release.

## 5 · Why these artefacts are not release evidence

- **Not the release environment.** A local result says nothing about what the release
  build produces (different node, different Xcode, different `npm`).
- **Unsigned and ad-hoc.** No Developer ID identity is used, and `after-pack` re-signs
  ad-hoc after flipping fuses. Gatekeeper rejects the `.app` on any other machine.
- **`--dir` only.** No `.dmg`, no `.zip`, no notarisation, no update feed — so the two things
  releases actually fail on (notarisation, updater metadata) are untested by construction.
- **A dirty tree yields a non-reproducible bundle.** `build-local.sh` warns, but cannot make
  uncommitted work reproducible.

## 6 · Known traps

### Trap 1 — node 25 (or 22) is not node 24

`.nvmrc` (24.15.0) is the contract and `engines.node` is `>=24.15.0`; this QA path accepts
any 24.x. A node **25** exists on some machines and is *outside* npm 12's supported range —
do not "just use the newest". Activate a 24.x from nvm, as in §2.

### Trap 2 — electron-builder cannot always download Electron from github.com

`⨯ connect ETIMEDOUT 20.205.243.166:443`. electron-builder 26.15.7 fetches `electron` via
`got`; github.com is not routable from every network. Without the mirror the build stalls
and then dies. `build-local.sh` exports
`ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"` (override with the env var) and
`--check` probes it with a HEAD request first.

### Trap 3 — a fresh clone has no `omp` binaries

`../vendors/oh-my-pi/releases/v18.16.0/` is gitignored, so a fresh clone has the glob but no
file: `after-pack` then fails the build (`resources/harness/bin/omp is missing — was
mac.extraResources applied?`). A stale or truncated binary fails there too, on the sha256 or
the `lipo` slice, so the failure is loud — what it does *not* catch is a *correct* binary for
the wrong arch, which trap 5 turns into a broken bundle. Expected values (2026-11-04):
arm64 `215,642,256` B
`d4a10d97488d6054d2b18198bd24f461079952c7e0fb75ba66336ca0df0cb99e`; x64 `227,570,128` B
`abd62d315b66314f0f635d537407037e7b0d06782513d8035669db5ef744242d`. The path **must stay a
sibling** of the repo (`../vendors/…`); the `extraResources.from` glob and `after-pack.cjs`
both resolve it relative to the repo root. The binaries are published with the
[oh-my-pi](https://github.com/can1357/oh-my-pi) fork's release set; obtain them from the
release channel you trust and verify against `SHA256SUMS.txt`.

### Trap 4 — `--dir` is not `--mac`

`mac.notarize` is `true` in `package.json`, and a plain `electron-builder --mac --arm64`
builds `dmg`/`zip` targets and then tries to sign and notarise — which fails on a machine
with no Developer ID identity and no notarisation credentials. Only `--dir --publish never`
is the local target: it produces the `.app`, runs `after-pack`, and stops. Do not "fix" a
notarisation error by adding credentials locally; a signed build needs an Apple Developer ID
that this project does not hold, so it is an open blocker, not a local configuration step.

Related: `after-pack.cjs` reads `context.arch` as electron-builder's numeric enum
(ia32=0, x64=1, armv7l=2, arm64=3, universal=4). This was a real bug, fixed in `cabbc52`;
on an older tree the arch assertion misfires and universal builds are refused outright.

### Trap 5 — cross-arch builds are refused on purpose

`--x64` on arm64 would package host-arch native modules (`node-pty`, `zeromq`, `koffi`) into
an x64 bundle. `--dir` gives you no `npm rebuild --arch` step, so the app would be broken in
ways the structural checks cannot see. `build-local.sh` therefore fails the `arch` preflight
item when the requested arch differs from `uname -m`. Build x64 on an x64 host.

### Trap 6 — unsigned / ad-hoc signing

With no identity, electron-builder skips signing and `after-pack` re-signs the bundle
**ad-hoc** after flipping fuses (`resetAdHocDarwinSignature: true`). The `.app` launches on
the machine that built it; after any transfer it carries a quarantine attribute and Gatekeeper
refuses it (`xattr -dr com.apple.quarantine` is a local workaround, never a release step).
An update feed signed this way cannot be consumed by shipped installs.

---

**See also:** `docs/BUILD.md` (the build entry point), `scripts/release/after-pack.cjs`
(the assertions a successful packaging must satisfy).
