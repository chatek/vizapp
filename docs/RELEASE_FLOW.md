# Release flow — branch, build, publish

**Status:** the model below is the current one (2026-11-05). Where a number here disagrees
with a newer measurement, the newer measurement wins — update this file in the same change
that moves it.

**Companions:** [BUILD.md](BUILD.md) (the only place "where and how do I build" is answered),
[RELEASE_HOSTING.md](RELEASE_HOSTING.md) (the updater feed), [MEMBER_BUILD.md](MEMBER_BUILD.md)
(member verticals), [BUILD_REMOTE.md](BUILD_REMOTE.md) (host facts and per-build provenance).

---

## 1 · Branch doctrine

**`main` is the single long-lived branch.** The generic product is whatever `main` packages.
A member vertical is not a branch of this repo: the member rides `main` at a **pinned commit**
and expresses its branding as a product profile (`product/<member>.json`, `FORK.md`), not as
anchored code edits.

`origin/vizmaster` is **legacy and retiring**. Do not cut a release from it and do not treat it
as a build target; `main` is the only branch the release flow reads. Historical branches
(`feat/product-profiles`, `builder/*`, `vclaw/*`) are ancestors of `main` and carry nothing the
release flow needs.

## 2 · Build

Builds come **only** from the remote host, and the procedure lives in exactly one place:
[BUILD.md](BUILD.md) → [BUILD_REMOTE.md](BUILD_REMOTE.md). A local build is an explicitly
opt-in fallback whose output prints `ARTEFACT(not-evidence)` ([BUILD_LOCAL.md](BUILD_LOCAL.md));
it never becomes a release asset.

```
 pick the commit on main (clean worktree)
      │
      ▼
 scripts/release/build-remote.sh --arm64 --x64        host: _MAC_HOST_, 0 signing identities
      ├─ git bundle over tailscale ssh                (the host cannot clone from Forgejo)
      ├─ npm ci + npm run build:bundle                (npm ci alone leaves out/ absent)
      ├─ electron-builder --mac --<arch> --dir        ELECTRON_MIRROR required: no github.com
      └─ pull back → release-remote/<arch>/{VClaw-<arch>-app.zip, BUILD.json, verify.txt, build.log}
      ▼
 the union of BUILD.json + zip digests is the artefact's identity
```

One writer per `release-remote/<arch>/` at a time, and one writer per host output directory:
two builds in the same `~/build/vclaw/vclaw-desktop/release/` overwrite each other.

## 3 · Publish

**The publisher is the workstation, not CI.** Driver: `scripts/release/release-forgejo.sh` —
it builds through `build-remote.sh`, so it is still the host that compiles.

```bash
bash scripts/release/release-forgejo.sh --arm64 --x64 --dry-run   # steps 1-5, prints the exact calls
bash scripts/release/release-forgejo.sh --arm64 --x64             # draft release, both arches
bash scripts/release/release-forgejo.sh --arm64 --tag v1.1.17 --publish
```

What it does, aborting loudly at each step:

1. **preflight** — clean tracked tree, `HEAD` equal to the `origin` tip of the branch,
   `build-remote.sh --check` for the requested arches, a readable token
   (`FORGEJO_TOKEN`, else `FORGEJO_TOKEN_FILE`, default `<repo>/../.prime/forgejo-token`), and
   a repository whose Releases unit is enabled.
2. **build** — `build-remote.sh` per arch ([BUILD_REMOTE.md](BUILD_REMOTE.md)).
3. **provenance** — commit, bytes, zip sha256 and OMP digest are re-read from
   `release-remote/<arch>/BUILD.json`, never re-derived; every arch must agree on the commit
   (and on the OMP release when the checkout bundles one).
4. **signing probe** — identity count and the packaged app's authority are read on the host, so
   the label cannot be assumed; today it is always `unsigned`.
5. **stage** — the app zip (published name carries `-unsigned` while unsigned),
   `BUILD-<arch>.json`, a merged `SHA256SUMS.txt`, and `tuple.json`.
6. **tag** — annotated, at `HEAD`, default `v<package.json version>+<short sha>`; refused if the
   tag already exists at a different commit, pushed to `origin` **and** `github` explicitly
   (this submodule has no fan-out), never forced.
7. **release** — `POST /api/v1/repos/chatek/vclaw-app/releases`; **draft unless `--publish`**,
   and the body states `unsigned=yes` and why.
8. **upload** — each staged asset, checked against the server's reported size.
9. **verify by re-fetch** — served size equals local size for every asset, and `SHA256SUMS.txt`
   is re-downloaded and compared byte for byte.

Then hand the release URL to the VizMaster lane. Their intake compares a `handoff.json` against
the payload `BUILD.json`, mount-asserts, checks identity, and **refuses unsigned input** — see
§5 and §6. The manual flow has no `handoff.json` producer yet (`publish-member-staging.mjs` is
called by the GitHub-hosted member job), so a handoff without one gives their intake nothing to
compare.

`chatek/vclaw-app` is also this checkout's `origin` remote (`BUILD.json` → `source.remote`
records the URL it fetched, not a claim of canon). GitHub `chatek/vclaw-desktop` receives the
tag, not the release assets.

## 4 · What "released" means — evidence vs not-evidence

A release is a **triple**, and all three must be reported together:

| part | source |
|---|---|
| source commit | the full 40-hex commit in `release-remote/<arch>/BUILD.json` |
| output | the uploaded zip's sha256 and byte count, from that same `BUILD.json` |
| pinned OMP (**only** when the checkout bundles `harness/bin`) | release `v18.16.0`, the `omp-darwin-<arch>` digest in `BUILD.json`; otherwise `BUILD.json` carries `"omp": null` |

- What counts as evidence — and why a local build, a file name, or a hash from another run does
  not — is answered once, in [BUILD.md](BUILD.md) §Artefact-of-record rule. Do not restate it
  per file.
- The triple above comes from the **uploading run**: **zips are not bit-reproducible**, so a
  sha256 from an earlier build of the same commit is not this artefact's identity.
- A clean worktree is not a runnable artefact: mode bits and signing are not in git.

## 5 · Blocked today

| blocked | why | consequence |
|---|---|---|
| Forgejo Actions as a build path | no darwin runner; the instance cannot reach github.com to fetch actions | every build is the manual remote-host flow; do not document a CI path |
| signing / notarisation | **0 codesigning identities** on the host and on the workstation | `package.mjs --public` refuses; only `--qa` artefacts exist; releases carry `unsigned` and default to draft |
| cloning Forgejo on the build host | host tailnet does not contain the Forgejo box; the name resolves to a fake-ip | source travels as a git bundle over `tailscale ssh` |
| member handoff acceptance | the consumer's signature gate refuses unsigned input | a handoff cannot be accepted until §5 row 2 is resolved |

## 6 · Member releases

A member build is a profile build — `VCLAW_PROFILE=product/<member>.json` for the `.app` flow,
`package.mjs --member <id> --profile product/<member>.json` for the dmg/zip flow. The member
rides `main` at a pinned sha, and the payload `BUILD.json` it hands over is produced by the
member repo, not by this one. Procedure and contract: [MEMBER_BUILD.md](MEMBER_BUILD.md),
`FORK.md` §"Member integration seam contract (v2)".

**Not covered by the release driver:** `release-forgejo.sh` stages the `.app` zip only, with no
`.dmg` and no `handoff.json`. A member handoff that mount-asserts a dmg needs the dmg/zip flow
([RELEASE_BUILD_HOST.md](RELEASE_BUILD_HOST.md)) and a manifest producer
([RELEASE_HOSTING.md](RELEASE_HOSTING.md) §"Member handoff staging") — that path is not wired
to the manual publisher yet.
