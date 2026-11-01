# Release flow — branches, builds, and what "released" means

**Status:** measured 2026-11-01 from this tree. Every commit id, digest and state below was verified on disk, not
copied from a plan. If a number here disagrees with a newer build, the newer measurement wins — update this file in
the same change that moves it.

---

## 1 · Branches

```
 feat/product-profiles ──┐  (this branch)                    main
                         │                                    │
   cb32af7  profile replaces 3 anchored code patches          │
   daec25a  a product PRESENTS one project                    │
   f714f43  mkdir -p + lazy import (member-safe)              │
                         │                                    │
                         └────────── base ── 7af39cb ◄────────┘
                                              (== origin/main at the time of writing)

 builder/vclaw-sdk-9c5fab7b → 35f9530   (older commit, already an ancestor of main)
 vclaw/agent-sdk-gates      → 6052b84   (older commit, already an ancestor of main)
```

Rules that are not obvious:

- **A product is data, not a patch.** `scripts/release/member-seams.mjs` used to perform three anchored text edits
  for the VizMaster build. Those edits are exactly the two behaviours the operator reported as defects (three
  harnesses offered; no VizMaster default). The profile replaces them; the seam contract in `FORK.md` is what
  members are held to.
- **Seeding is not presenting.** Writing `~/VizMaster` on first launch while the list still shows every project is
  the reported defect. `"projects": "single"` filters at the listing boundary in `ProjectService`: one project
  presented, the others preserved for when the profile switches back.
- **Generic must stay generic.** A tree with no profile file packages as the generic product, with a warning. The
  profile module is imported lazily for exactly this reason: a static import made every member pin predating
  profiles fail with `ERR_MODULE_NOT_FOUND`.

## 2 · Build

```
 pick source commit (main, or a profile branch)
      │
      │ rsync with ANCHORED excludes: /.git /node_modules /out /release /test-results
      ▼                       (an unanchored `release` eats scripts/release/ and every build fails)
 ~/vclaw-desktop-build/          host: _MAC_HOST_ (headless, 0 code-signing identities)
      ├─ bootstrap-npm → npm 12.0.2
      ├─ npm ci → allowScripts installs the 9 native modules
      │            (esbuild, pty.node, koffi, zeromq, fsevents …)
      │            ⚠ exit 0 without them means "installed", not installed
      ▼
 electron-builder --mac --arm64
    --config.electronDist=node_modules/electron/dist   ← the host's github.com is a fake-ip
    identity=null  notarize=false                       ← --qa: UNSIGNED, Gatekeeper needs an override
      ├──► .app   (+ Resources/extensions/vclaw-agent.js = the pinned CLI extension)
      ├──► .dmg
      └──► .zip  (ditto when electron-builder's downloader dies late)
      ▼
 verify-package --mode qa --arch arm64
    integrity · contained app · native unpack allowlist · arch · Electron fuses · size budgets
    + artifact name ↔ packaged profile id   (mismatch FAILS instead of shipping quietly)
      ▼
 packaged smoke:  App --packaged-smoke=/tmp/m.json   → rc=0 + marker
    └─ headless host: the only runtime proof available; there is no screenshot
      ▼
 copy → build/  →  sha256 on BOTH sides (source → destination)
```

## 3 · Release

```
 A. CODE — submodule first, parent second, never the reverse
    vclaw-desktop <branch>  ──push──►  origin/<branch>
           │
           └─ parent repo: git add vclaw-desktop   (the gitlink moves to that commit)
                 └─ commit ──push──► parent main ──webhook──► vchat3 deploy hook
                        git pull --ff-only → node-deploy.sh
                        GATE1 masked drift → GATE2 hashes → GATE1b content →
                        GATE3 managed → stage → verify → atomic swap → read-back
                        (a refusal is the system working; fix the repo, never the host)

 B. BINARIES — a push NEVER installs one
    clean worktree @ the declared commit ──► release-built.sh <RELEASE.json>
           │                                   GOOS=linux GOARCH=amd64, vcs.modified=false
           ▼
     apply.sh --check ──► --stage ──► --apply
           ├─ backup <binary>.bak-<STAMP>
           ├─ 5 legs: pid + exe sha · on-disk sha · /health · NATS socket · config sha
           └─ any leg fails → restore + re-verify
```

## 4 · Identity — the filename lies, the digest does not

```
 VClaw-1.1.17-arm64.dmg          ← constant string, five builds have carried it in one day
   ├─ 0e78d6f3…  pre-allowScripts        superseded
   ├─ 9b149fc4…  generic v1              superseded (bytes exist nowhere)
   └─ 911519fa…  generic, rebuilt        current
 VClaw-1.1.17-vizmaster-arm64.dmg
   ├─ 59c8fe37…  v1: seeded, showed all projects   superseded
   └─ 49cec1b0…  v2: presents ONE project           current
```

A release is a **triple**, and all three must be reported together:

| part | current value |
|---|---|
| source commit | `f714f43` (product) / `7af39cb` (generic) |
| pinned CLI | tarball `9c5fab7b…` (927,341 B) · extension `cc3869b9…` (1,004,559 B) |
| output | dmg + zip sha256 and sizes |

## 4b · Who publishes, and from where (settled 2026-11-01)

```
 build/  ──────────────►  vizmaster-lead  ──────────────►  assets.vizmaster.app/releases/<version>/
 (desktop lane)            (publisher)                       (their own R2 bucket)
   the ONLY source            copies, does not rebuild          linked from https://vizmaster.app/
```

- **`build/` is the single source of published bytes.** The publisher does not build, re-package, or rename: it takes
  the latest pair from `vclaw-desktop/build/` and hosts it.
- **Hosting is the publisher's own R2 bucket.** Deploying to it is their call and their credential.
- **The publisher publishes a digest, not a filename.** A `.sha256` beside each artefact is part of the upload, because
  the filename is stable across builds while the bytes are not.
- A build is "delivered" when it is in `build/` with a reported triple (commit · pinned CLI · output digests);
  it is "published" only when the publisher says it is live at a URL that serves those digests.

## 5 · What "release ready" requires

1. `verify-package --mode qa` **PASSED with the current verifier**, on both archives.
2. packaged smoke `rc=0` with the marker carrying the expected `product` block (or none, for the generic build).
3. The extension inside the app equals the pinned bundle digest.
4. Digest compared **source → destination** before anyone opens the file.
5. For a public release: a signing identity. There is none on the build host today, so `--public` refuses; only
   `--qa` artefacts exist.
