# Building VClaw locally — the fallback

**Status:** measured 2026-11-04 on an Apple Silicon workstation (arm64, node 22.22.2 from
Homebrew, nvm `v24.19.0`, electron-builder 26.15.7). The numbers come from one proven
`--dir` run on this tree; this revision was verified with `build-local.sh --check` only — a
full local build was deliberately **not** re-run (artefacts are throwaway).

**The primary flow is [`docs/BUILD_REMOTE.md`](BUILD_REMOTE.md) with
[`scripts/release/build-remote.sh`](../scripts/release/build-remote.sh).** That host —
`BUILD_USER_REDACTED` — is the **only sanctioned builder**. This document
describe a **local fallback for when that host is unavailable**, and artefacts produced
here are **not evidence** (repo rule, `AGENTS.md`): they may prove the tree packages (and,
when the checkout bundles a harness binary, that the bundled `omp` verifies), and nothing
about the release.

```bash
bash scripts/release/build-local.sh --check                       # read-only preflight
VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
```

Without `VCLAW_ALLOW_LOCAL_BUILD=1` and without `--check`, the script **refuses** (exit 2)
and points at the remote flow. That is deliberate: a local build that silently succeeds is
how a non-evidence artefact ends up attached to a release.

What a local `--dir` build gives you: `release/mac-arm64/VClaw.app` (`--x64` lands in
`release/mac` — electron-builder only suffixes non-x64 targets), unsigned (ad-hoc). When the
checkout bundles a harness binary (`package.json` → `build.mac.extraResources` containing
`harness/bin` — the member/vizmaster tree does; this checkout does **not**), the bundle also
carries `Contents/Resources/harness/bin/omp`, verified against `SHA256SUMS.txt` by
`scripts/release/after-pack.cjs`; without that mapping the script prints
`n/a — this checkout does not bundle a harness binary` and skips the OMP checks. What it does
**not** give you: a `.dmg`/`.zip`, a notarised or Developer-ID-signed bundle, a tested update
feed, or anything you may ship.

---

## 1 · When a local build is legitimate

Only to answer one of these questions while the remote host is down:

- does this commit still package (`npm run build` + `electron-builder --dir` succeed)?
- when the checkout bundles one, does `after-pack` accept the bundled `omp` (present, digest
  matches, Mach-O slice matches)?
- does the packaged app boot far enough to write the readiness marker?

Anything that ends in a release decision — "ship it", "this is the build", "the DMG is ready"
— is the remote flow, not this one. If the remote host is reachable, use it even for the
questions above; `build-local.sh --check` is the only part of this document that is always
safe (it is read-only and downloads nothing).

## 2 · Hard prerequisites (all enforced by `--check`)

| prerequisite | requirement | why |
|---|---|---|
| node | **major 24** active on `PATH` (`.nvmrc` pins 24.15.0) | `engines.node` and the pinned toolchain; the script never calls `nvm`, it uses what is already active |
| dependencies | `node_modules/.bin/electron-builder` executable (`npm ci`) | nothing is installed for you |
| bundled `omp` | **only when the checkout bundles a harness binary**: `../vendors/oh-my-pi/releases/v18.16.0/omp-darwin-<arch>` + `SHA256SUMS.txt` | `mac.extraResources` copies it; a fresh clone does **not** have it. On a checkout without that mapping the item reads `n/a — this checkout does not bundle a harness binary` |
| Electron download | `ELECTRON_MIRROR` reachable (HEAD, 15 s timeout) | electron-builder cannot reach github.com from here |
| Xcode CLT | `xcode-select -p` returns a developer dir | native modules (`node-pty`, `zeromq`, `koffi`) |
| `lipo` | on `PATH` | arch assertion in preflight **and** in `after-pack` |
| disk | **> 20 GiB** free on the volume holding `release/` | `node_modules`, `out/`, and an app bundle that carries the 215 MB `omp` |
| arch | requested arch == host arch | cross-arch local builds are unsupported, see trap 5 |

On this workstation the node requirement fails out of the box: Homebrew's `node` is
**22.22.2** while `.nvmrc` wants **24.15.0**. Activate the nvm toolchain first —

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"   # measured here; any 24.x works
node -v                                                     # must print v24.*
```

`--check` accepts any `24.x` and says so (`major 24; .nvmrc pins v24.15.0 — active
toolchain kept, not switched`). It never runs `nvm use`, because a script that mutates the
caller's toolchain is worse than one that refuses.

## 3 · Exact commands

The script refuses to build unless the fallback is acknowledged. `--arm64` is the only arch
that can be built on an arm64 Mac.

```bash
cd vclaw-desktop
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"

bash scripts/release/build-local.sh --check                  # must exit 0 first
VCLAW_ALLOW_LOCAL_BUILD=1 bash scripts/release/build-local.sh --arm64
```

That runs, in order: the same preflight · `npm run build` (`tsc --noEmit` × 5 + electron-vite
build) · `electron-builder --mac --arm64 --dir --publish never` with
`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` exported · a re-verification of the
packaged app binary's `lipo` slice, plus — when the checkout bundles a harness binary — a
re-verification of `release/mac-arm64/VClaw.app/Contents/Resources/harness/bin/omp` (sha256 +
`lipo`) · one line

```
ARTEFACT(not-evidence): <app path> <sha256 of the bundled omp, or "absent"> <lipo -archs of the app binary>
```

x64 is the same command with `--x64`, and it **only runs on an Intel host** (trap 5). On this
arm64 workstation `--check --x64` fails the `arch` item by design; use
`build-remote.sh --x64` for the Intel artefact.

Manual equivalent, if you need to see the steps separately:

```bash
npm run build
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
./node_modules/.bin/electron-builder --mac --arm64 --dir --publish never
```

## 4 · What to verify afterwards

**A zero exit from `electron-builder` is not the check.** A stale or half-swapped bundle can
exit 0 while the process ran the wrong thing (the same class of failure as a stale deployed
bundle that "looks healthy" and writes nothing). `build-local.sh` therefore re-derives the
facts from the packaged bytes. When the checkout bundles a harness binary these four checks,
not the exit code, are the result; without one, the script prints
`omp      n/a — this checkout does not bundle a harness binary` and checks 3/4 still apply.

1. **`after-pack` line** (only when the checkout bundles a harness binary) in the builder
   output — the build fails if it is missing, the digest differs, or `lipo` reports the wrong
   slice: `after-pack: bundled omp verified (sha256 d4a10d97488d…, arm64)`.
2. **Packaged binary on disk** (only when bundled) — 215,642,256 B for arm64, mode `0755`:
   ```bash
   shasum -a 256 release/mac-arm64/VClaw.app/Contents/Resources/harness/bin/omp
   stat -f '%z %Lp' release/mac-arm64/VClaw.app/Contents/Resources/harness/bin/omp
   lipo -archs release/mac-arm64/VClaw.app/Contents/Resources/harness/bin/omp   # arm64
   ```
3. **Runtime smoke** — the packaged app must write the readiness marker and exit 0:
   ```bash
   M="$(mktemp -d)"
   release/mac-arm64/VClaw.app/Contents/MacOS/VClaw \
     --packaged-smoke="$M/ready.json" --user-data-dir="$M/ud" ; echo "rc=$?"
   ```
   The marker fires at ~1.4 s. A `providers:catalog … status -1` line in that run is a
   shutdown race in the smoke harness, not a defect (`omp models` needs ~2.5 s).
4. **Cleanup** — `release/` is gitignored and throwaway: `rm -rf release`. Do not carry it
   forward; there is no supported path from a local `.app` to a release.

## 5 · Why these artefacts are not evidence

- **Not the sanctioned builder.** The repo rule names the remote host as the builder; a local
  result says nothing about what that host would produce (different node, different Xcode,
  different `npm`).
- **Unsigned and ad-hoc.** No Developer ID identity is used, and `after-pack` re-signs
  ad-hoc after flipping fuses. Gatekeeper rejects the `.app` on any other machine.
- **`--dir` only.** No `.dmg`, no `.zip`, no notarisation, no update feed — so the two things
  releases actually fail on (notarisation, updater metadata) are untested by construction.
- **A dirty tree yields a non-reproducible bundle.** `build-local.sh` warns, but cannot make
  uncommitted work reproducible.

If a release needs an artefact, it comes from the remote flow or it does not exist.

## 6 · Known traps

### Trap 1 — node 25 (or 22) is not node 24

The remote host's *default* node is v25.8.0, but the release flow never uses it:
`build-remote.sh` prepends `~/build/toolchain/node-v24.15.0-darwin-arm64` and refuses to
start unless `node -v` is exactly v24.15.0 (`docs/BUILD_REMOTE.md`). Locally, `.nvmrc`
(24.15.0) is the contract and `engines.node` is `>=24.15.0`; this fallback accepts any 24.x.
Homebrew's node here is **22.22.2** and fails immediately. A node **25** also exists on some
machines and is *outside* npm 12's supported range — do not "just use the newest". Activate a
24.x from nvm, as in §2.

### Trap 2 — electron-builder cannot download Electron from github.com here

`⨯ connect ETIMEDOUT 20.205.243.166:443`. electron-builder 26.15.7 fetches `electron` via
`got`; github.com is not routable from this workstation. Without the mirror the build stalls
and then dies. `build-local.sh` exports
`ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"` (override with the env var) and
`--check` probes it with a HEAD request first.

### Trap 3 — a fresh clone has no `omp` binaries (only if the tree bundles one)

If the checkout maps `harness/bin` in `build.mac.extraResources` (member/vizmaster tree; not
this one), a fresh clone's `../vendors/oh-my-pi/releases/v18.16.0/` is gitignored and empty:
`after-pack` then fails the build (`resources/harness/bin/omp is missing — was
mac.extraResources applied?`). A stale or truncated binary fails there too, on the sha256 or
the `lipo` slice, so the failure is loud — what it does *not* catch is a *correct* binary for
the wrong arch, which trap 5 turns into a broken bundle. Both binaries are published at

```
https://vmaker-pi.TAILNET_REDACTED/forgejo/chatek/oh-my-pi/releases/download/v18.16.0/
```

Expected values (2026-11-04): arm64 `215,642,256` B
`d4a10d97488d6054d2b18198bd24f461079952c7e0fb75ba66336ca0df0cb99e`; x64 `227,570,128` B
`abd62d315b66314f0f635d537407037e7b0d06782513d8035669db5ef744242d`. `build-remote.sh` syncs
the same set to the host — reuse it rather than hand-copying. The path **must stay a
sibling** of `vclaw-desktop` (`../vendors/…`); the `extraResources.from` glob and
`after-pack.cjs` both resolve it relative to the repo root.

### Trap 4 — `--dir` is not `--mac`

`mac.notarize` is `true` in `package.json`, and a plain `electron-builder --mac --arm64`
builds `dmg`/`zip` targets and then tries to sign and notarise — which fails on a machine
with no Developer ID identity and no notarisation credentials. Only `--dir --publish never`
is the local target: it produces the `.app`, runs `after-pack`, and stops. Do not "fix" a
notarisation error by adding credentials locally; that is the remote flow's job.

Related: on a tree that bundles a harness binary, `after-pack.cjs` reads `context.arch` as
electron-builder's numeric enum (ia32=0, x64=1, armv7l=2, arm64=3, universal=4) to pick the
expected slice. This checkout does not bundle one, so its `after-pack.cjs` only flips fuses;
no arch-enum assertion runs here.

### Trap 5 — cross-arch builds are refused on purpose

`--x64` on arm64 would package host-arch native modules (`node-pty`, `zeromq`, `koffi`) into
an x64 bundle. `--dir` gives you no `npm rebuild --arch` step, so the app would be broken in
ways the structural checks cannot see. `build-local.sh` therefore fails the `arch` preflight
item when the requested arch differs from `uname -m`. Build x64 on an x64 host, or use
`build-remote.sh --x64`.

### Trap 6 — unsigned / ad-hoc signing

With no identity, electron-builder skips signing and `after-pack` re-signs the bundle
**ad-hoc** after flipping fuses (`resetAdHocDarwinSignature: true`). The `.app` launches on
the machine that built it; after any transfer it carries a quarantine attribute and Gatekeeper
refuses it (`xattr -dr com.apple.quarantine` is a local workaround, never a release step).
An update feed signed this way cannot be consumed by shipped installs.

---

**See also:** `docs/BUILD_REMOTE.md` (primary flow), `docs/RELEASE_BUILD_HOST.md` (host
facts and the rsync/npm traps that motivated moving packaging off the workstation),
`scripts/release/after-pack.cjs` (the assertions a successful packaging must satisfy).
