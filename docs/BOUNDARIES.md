# Lane boundaries — who owns what, and what a handoff is

**This page is canonical for lane ownership.** Every other document describes its own lane and
links here instead of restating the boundary. If a sentence elsewhere disagrees with this page,
this page wins and the other document is the defect.

Work is split into three lanes, plus one thing no lane owns. They share exactly one artefact:
**a Forgejo release URL on `chatek/vclaw-app`**. Nothing else crosses.

## 1 · The lane map

| lane | owns | produces | responsibility ends at | never touches |
|---|---|---|---|---|
| **Build lane** — `vclaw-desktop` (this repo), `chatek/vclaw-app` | the repo's code and its branch doctrine (**operator note, 2026-11-05:** `main` stays the generic product and the only branch the parent repo records; `vizmaster` is the long-running member vertical, its own world — supersedes the earlier "main is the only long-lived branch" ruling, kept as dated history); the build drivers (`scripts/release/build-remote.sh`, `package.mjs`); the seam contract (`scripts/release/member-seams.mjs`); member profiles (`product/<member>.json`); the publisher (`scripts/release/release-forgejo.sh`); the **provenance format** | the unsigned `.dmg` + `.app` `.zip` per arch, `BUILD-<arch>.json`, `SHA256SUMS.txt`, `tuple.json` on a release page | **the Forgejo releases page.** Once the URL answers anonymously, the build is done | the member repo, the member's integrator, the consumer's publisher, the landing site, vchat3 |
| **VizMaster lane** — `vizmaster-lead` | the member repo (`chatek/vizmaster`), its integrator/overlay, its intake gates, its own host and updater channel, the landing render | a published VizMaster build on `assets.vizmaster.app` and the rendered landing | its own `releases/` tree and site | this repo. It holds **no** files here, offers **no** build inputs, and is never asked to run a build |
| **Deploy lane** — vchat3 | `services/vchat3-node/` in the parent repo `chance/vchat.email`: `node-deploy.sh` (GATE1 → GATE2 → GATE1b → GATE3 → stage → verify → swap), `rollback.sh`, the pre-push gates | the running node, proven by `PUSHED → PULLED → gates → DONE rc=0` | the deployed service | desktop builds. A desktop release does not deploy vchat3, and a vchat3 deploy does not ship the app |
| **Estate signing** | **nobody.** 0 codesigning identities exist on the builder (`_MAC_HOST_`) and on the workstation, and no lane may obtain one on its own | nothing today | — | — |

### Why the build lane stops at the releases page

- The builder **cannot reach** Forgejo or github.com (netmap / fake-ip), so it cannot publish;
  the workstation publishes. That split is already the boundary in miniature.
- The consumer verifies against its **own** gates. Anything this lane does past the release page
  is work the consumer must re-do or distrust.
- The two lanes' failures are different failures. A broken release is ours; a broken intake,
  mount assert, pin choice or landing is theirs. Mixing them is how a green build gets described
  as "blocked".

### The one real coupling to the deploy lane

The parent repo records this repo as a submodule pointing at
`git@github.com:chatek/vclaw-desktop.git` (`.gitmodules`). So a parent push that bumps the desktop
gitlink needs the desktop commit to exist **on GitHub**, not only on Forgejo — a recursive clone
of the parent cannot resolve a gitlink whose commit was never pushed there. The build lane pushes
both remotes for exactly this reason. Everything else about vchat3 belongs to the deploy lane:
`git push` → GitHub webhook → `git pull` → `node-deploy.sh`, and a refusal is the system working.

## 2 · The handoff

**A handoff is a release URL, and only a release URL.**

1. The build lane publishes (see [RELEASE_FLOW.md](RELEASE_FLOW.md) §3) and hands over
   `https://REDACTED_INTERNAL_FORGE/forgejo/chatek/vclaw-app/releases/tag/<tag>`.
2. A **valid** handoff is a release that answers **anonymously** — the page 200 and every
   `…/releases/download/<tag>/<asset>` 200/206 with no token — and carries, per arch, the `.dmg`
   and the `.app` `.zip` plus `BUILD-<arch>.json`, a merged `SHA256SUMS.txt` and `tuple.json`.
3. The receiving lane fetches, verifies (size + digest against `SHA256SUMS.txt`, `hdiutil verify`
   on the dmg), asserts, publishes to its own host and renders its landing. **Every one of those
   steps is the receiving lane's.**
4. Provenance is read from the release, never re-derived: `BUILD-<arch>.json` names the full
   40-hex commit and the digest of the bytes that run produced.

**A draft is not a handoff.** Drafts 404 for anonymous fetches, so publishing to a draft and
declaring a handoff is a silent no-op. Flip to a published or explicitly-`prerelease` release
first, then hand over the URL (see [RELEASE_FLOW.md](RELEASE_FLOW.md) §3 for the flip).

**Provenance format is the build lane's.** `BUILD-<arch>.json`, `SHA256SUMS.txt` and `tuple.json`
are emitted by the driver that built the bytes. A consumer that wants different keys asks this
lane to change the **driver**, in this repo, in a reviewed commit — it does not get to define a
second manifest that this lane then has to satisfy.

## 3 · What each lane may ask of the others

| from → to | legitimate | answer to anything else |
|---|---|---|
| consumer → build lane | *build at sha X*; *add arch Y*; *this artifact is broken* (with the failing gate, the tag and the sha) | the release URL |
| build lane → consumer | *your fetch of `<tag>` returns …*; *which arch are you missing?* | nothing — the build lane does not audit their intake, publisher or landing |
| build lane → deploy lane | *the parent gitlink bump needs this desktop commit on GitHub* | nothing — it does not edit `services/vchat3-node/`, `/etc/…`, or a deploy gate |
| deploy lane → build lane | *ship a desktop build for `<sha>`* | nothing — a deploy does not gate a release and a release does not gate a deploy |
| any lane → estate signing | *we need a Developer ID* (a request **to the operator**) | a lane inventing an identity, or refusing to hand over because none exists |

Rule: **no lane may require another lane to run steps outside its own reach.** If a handoff seems
to need that, the request is wrong, not the boundary.

## 4 · Anti-patterns, with the correct move

| anti-pattern | why it is wrong | do this instead |
|---|---|---|
| asking a lane for credentials it does not own — the consumer demanding a Developer ID from the build lane, the build lane demanding `R2_*` for the consumer's host, anyone "just signing it locally" | signing is an estate credential; no lane holds one and none may mint one | hand over unsigned; the signature question goes to the operator ([RELEASE_FLOW.md](RELEASE_FLOW.md) §5) |
| blocking a handoff on a downstream intake bug — "the release is not done because their gate refuses `dirty: false`" | their gate is their code; the release is already on the page and public | report the defect to that lane, keep the release, mark it handed over |
| treating a draft as a handoff | a draft is invisible without credentials, so nothing downstream can consume it | publish or mark `prerelease`, then verify 200/206 anonymously |
| letting a consumer dictate provenance format | two manifests for one artefact means the release stops being self-describing | change the driver here, in a reviewed commit; consumers read `BUILD-<arch>.json` + `tuple.json` |
| reading `dirty` **absence** as `dirty: true` | older manifests omit the key; absence is *unknown*, and every consumer that guessed "dirty" refused a clean build | read the key when present, print `unknown` when absent, and never hardcode the refusal |
| reading a mirror as evidence | `chatek/*` are regular repos now; a mirror's tip can be frozen for weeks while the record repo moves | fetch the **record** remote and resolve the sha there; mirror tips are NOT-EVIDENCE |
| shipping a local build, or calling one "the build" | the local flow prints `ARTEFACT(not-evidence)` and exists to answer packaging questions | build on `_MAC_HOST_` ([BUILD.md](BUILD.md)) |
| producing a member artefact without the payload assert | the generic tree ships a README-only payload, so a "member" build can look fine and seed nothing | `--member` with a real payload; the pre-packaging assert refuses the placeholder ([MEMBER_BUILD.md](MEMBER_BUILD.md)) |
| documenting or planning a CI build path | Forgejo Actions has no darwin runner and the instance cannot fetch actions from github.com | the workstation publisher ([RELEASE_FLOW.md](RELEASE_FLOW.md) §3) |
| editing another lane's files to unblock yourself | that lane's in-flight work is not yours to commit, revert or re-format | message the lane; leave unrelated dirty files alone |

## 5 · Facts that keep the lanes separable (measured, not assumed)

- **Forgejo Actions cannot build this repo** — no `darwin` runner, and the instance cannot fetch
  actions from github.com (`000` timeout; `api.github.com` answers 200). There is no CI build
  path to plan.
- **The builder cannot reach the remotes.** `_MAC_HOST_` reaches neither Forgejo nor github.com,
  so source travels as a git bundle over `tailscale ssh` and publishing happens on the
  workstation.
- **`tailscale ssh` masks remote exit codes** — drivers and any lane reading a remote build must
  use the in-band `__VCLAW_RC__` marker, not `$?`.
- **Anonymous fetch is the handoff test**, and it is the *only* test: the Forgejo REST API answers
  404 anonymously on this instance, so an intake built on the API sees nothing.
- **One writer per output directory** — `release-remote/<arch>/` and the host's
  `~/build/vclaw/vclaw-desktop/release/` each take one build at a time.

## 6 · Where each question is answered (do not restate these elsewhere)

| question | page |
|---|---|
| who owns what, what a handoff is, what may be asked | **this page** |
| where and how do I build | [BUILD.md](BUILD.md) → [BUILD_REMOTE.md](BUILD_REMOTE.md) / [BUILD_LOCAL.md](BUILD_LOCAL.md) |
| how do I publish | [RELEASE_FLOW.md](RELEASE_FLOW.md) §3 |
| what proves provenance | [BUILD_REMOTE.md](BUILD_REMOTE.md) §Provenance (three different files are called `BUILD.json`) |
| how does a member vertical get built | [MEMBER_BUILD.md](MEMBER_BUILD.md) |
| where does the updater feed live | [RELEASE_HOSTING.md](RELEASE_HOSTING.md) |
| what is blocked, and by whom | [RELEASE_FLOW.md](RELEASE_FLOW.md) §5 |
| how does code reach vchat3 | the parent repo's `docs/CICD_handoff.md` and `skills/deploy-vchat/` |

## 7 · When the boundary is unclear

Ask which lane produces the bytes the question is about.

- If the answer is "this repo's build host" → build lane, and the deliverable is a release URL.
- If the answer is "the member repo" → member lane, and this repo supplies only the pinned commit
  and the seam contract.
- If the answer is "the deployed node" → deploy lane, and the parent repo is the entry point.
- If the answer is "a signature" → the operator, because no lane owns one.

A question that needs two lanes to answer is usually a question about the **release page**, which
both lanes can read without asking each other anything.
