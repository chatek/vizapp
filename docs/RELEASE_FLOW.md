# Release flow — branch, build, publish

**Status:** the model below is the current one (2026-11-05). Where a number here disagrees
with a newer measurement, the newer measurement wins — update this file in the same change
that moves it.

**Companions:** [BUILD.md](BUILD.md) (the only place "where and how do I build" is answered),
[BOUNDARIES.md](BOUNDARIES.md) (lane ownership and the handoff rule),
[RELEASE_HOSTING.md](RELEASE_HOSTING.md) (the updater feed), [MEMBER_BUILD.md](MEMBER_BUILD.md)
(member verticals), [BUILD_REMOTE.md](BUILD_REMOTE.md) (host facts and per-build provenance).

---

## 1 · Branch doctrine

> **Operator note, 2026-11-05:** the ruling below ("`origin/vizmaster` is legacy and
> retiring") is superseded as of 2026-11-05: `vizmaster` is the long-running member vertical,
> its own world, kept as-is; `main` remains the generic product and the only branch the parent
> repo records. The paragraphs below are kept as dated history.

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
3. **provenance** — commit, bytes, dmg and zip sha256, and the OMP digest are re-read from
   `release-remote/<arch>/BUILD.json`, never re-derived; every arch must agree on the commit
   (and on the OMP release when the checkout bundles one).
4. **signing probe** — identity count and the packaged app's authority are read on the host, so
   the label cannot be assumed; today it is always `unsigned`.
5. **stage** — per arch, the `.dmg` and the app `.zip` (published names carry `-unsigned` while
   unsigned), plus one `BUILD-<arch>.json` each, a merged `SHA256SUMS.txt`, and `tuple.json`.
6. **tag** — annotated, at `HEAD`, default `v<package.json version>+<short sha>`; refused if the
   tag already exists at a different commit, pushed to `origin` **and** `github` explicitly
   (this submodule has no fan-out), never forced.
7. **release** — `POST /api/v1/repos/chatek/vclaw-desktop/releases`; **draft unless `--publish`**,
   and the body states `unsigned=yes` and why.
8. **upload** — each staged asset, checked against the server's reported size.
9. **verify by re-fetch** — served size equals local size for every asset, and `SHA256SUMS.txt`
   is re-downloaded and compared byte for byte.

Then hand the release URL (`…/releases/tag/<tag>`) to the VizMaster lane — that URL **is** the
handoff: a published (or explicitly `prerelease`) release that answers anonymously, with the
per-arch assets and provenance above. A **draft is not a handoff** (it 404s without a token), and
nothing downstream — their intake, their `handoff.json` expectations, their signature gate, their
publisher, their landing — is a precondition for calling the release done. The rule, the
legitimate cross-lane requests and the anti-patterns are [BOUNDARIES.md](BOUNDARIES.md) §2–§4.

`chatek/vclaw-desktop` is also this checkout's `origin` remote (`BUILD.json` → `source.remote`
records the URL it fetched, not a claim of canon). GitHub `chatek/vclaw-desktop` receives the
tag, not the release assets.

### 3.1 · Prerelease, and the anonymous surface

A **prerelease** publish (`draft=false, prerelease=true`) has no flag — the driver only knows
draft/publish. Create the draft, then flip it with
`PATCH /api/v1/repos/<repo>/releases/<id>` `{"draft":false,"prerelease":true}` (plus the body
line that says so): no re-tag, no re-upload, no rebuild.

Then prove the anonymous surface — with **no token**, the release page and every
`…/releases/download/<tag>/<asset>` URL must answer 200/206 and a re-downloaded dmg must hash to
its `SHA256SUMS.txt` digest. Measured on `v1.1.17+16871f5-vizmaster`: page 200, all five assets
206, dmg sha256 `e996dcf4…` equal to the staged file and `hdiutil verify VALID`, page carries the
`Pre-release` marker. The anonymous REST API (`/api/v1/repos/…/releases`, by tag and by id)
answered **404** on this instance, so the HTML page plus the download URLs are the anonymous
surface — do not build an intake on the API.

The token comes from `FORGEJO_TOKEN` or `<superproject>/.prime/forgejo-token`; it is handed to
curl in a 0600 config so it never appears on a command line or in any output.

### 3.2 · When the publish fails

| failure | what it means |
|---|---|
| `has uncommitted changes to tracked files` | commit or undo — the host builds a commit, not your working tree |
| `is not the tip of origin/<branch>` | push the branch, or check out the tip you mean to release |
| `--check failed on: <label>` | a host fault a build cannot repair (node, disk, mirror, profile); `checkout` / `omp …` / `SHA256SUMS.txt` failures are synced by the build |
| `Releases unit is disabled` | `PATCH /api/v1/repos/chatek/vclaw-desktop` with `{"has_releases":true}`, once, as an admin |
| `already exists at …` / `a release for … already exists` | tags and releases are never rewritten — pick another `--tag` |
| `served size … != local` | the upload truncated; the release is not trustworthy |
| `POST releases -> HTTP 403 … user should have a permission to write to a repo` | an `FORGEJO_TOKEN` in the environment won the precedence and is read-only (`GET /api/v1/user` returns no login); unset it so the scoped token file is used, or point `FORGEJO_TOKEN_FILE` at the write token |
| `no Forgejo token: …/.prime/forgejo-token is not readable` after setting `RELEASE_REPO_ROOT` | the token default follows the lane checkout the scripts live in, not the release tree — set `FORGEJO_TOKEN_FILE` explicitly if the two ever differ |

`RELEASE_REPO_ROOT` points the whole release at a **clean throwaway clone/worktree at HEAD** while
the scripts themselves are uncommitted in the lane's tree (the preflight still refuses a dirty
tree — that is the point; the override only says *which* clean tree is released, and the preflight
prints both). The tree it names must have `vendors/oh-my-pi/releases/v18.16.0` beside it, exactly
as in the lane checkout:

```bash
git clone --shared --no-checkout . /tmp/proof/vclaw-desktop
git -C /tmp/proof/vclaw-desktop checkout -B <branch> <HEAD>   # a branch whose tip IS that commit
git -C /tmp/proof/vclaw-desktop remote set-url origin https://REDACTED_INTERNAL_FORGE/chatek/vclaw-desktop
ln -s "$PWD/../vendors" /tmp/proof/vendors                    # the OMP release set, one level above
RELEASE_REPO_ROOT=/tmp/proof/vclaw-desktop \
  bash scripts/release/release-forgejo.sh --arm64 --member vizmaster --member-repo … --member-sha … --member-integrate v2
```

## 4 · What "released" means — evidence vs not-evidence

A release is a **triple**, and all three must be reported together:

| part | source |
|---|---|
| source commit | the full 40-hex commit in `release-remote/<arch>/BUILD.json` |
| output | the uploaded `.dmg` and `.zip` sha256 + byte counts, from that same `BUILD.json` |
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

Not blocked here, and not this lane's to fix: the consumer's intake refuses unsigned input and
compares a `handoff.json` this driver does not emit. A release is still handed over — as a URL —
and a consumer-side gate is answered by the consumer or the operator, never by this lane
acquiring a signing identity or a second provenance format ([BOUNDARIES.md](BOUNDARIES.md) §4).

## 6 · Member releases

A member build is a profile build — `VCLAW_PROFILE=product/<member>.json` for the `.app` flow,
`package.mjs --member <id> --profile product/<member>.json` for the dmg/zip flow. The member
rides `main` at a pinned sha, and the payload `BUILD.json` it hands over is produced by the
member repo, not by this one. Procedure and contract: [MEMBER_BUILD.md](MEMBER_BUILD.md),
`FORK.md` §"Member integration seam contract (v2)".

**What the driver publishes for a member build:** the same per-arch set as a generic release
(`.dmg` + `.zip` + `BUILD-<arch>.json` + merged `SHA256SUMS.txt` + `tuple.json`), with the
`member` block naming the member repo, 40-hex sha and payload digest as shown in
[BUILD_REMOTE.md](BUILD_REMOTE.md) §Member builds. No `handoff.json` is emitted — that manifest
belongs to the GitHub-hosted staging job ([RELEASE_HOSTING.md](RELEASE_HOSTING.md) §"Member
handoff staging"), which this publisher does not run. Provenance format is this lane's; a
consumer's manifest expectations are not an input to it.

