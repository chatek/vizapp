# Building a member vertical of VClaw

For member apps that want a simplified, branded VClaw (first member: **VizMaster**).
This is the fork-side document of record for the branching solution agreed in sprint
`branched-dev-sprint` (2026-10-22; charter: `chatek/vchat.email` → `docs/BRANCHED_DEV_SPRINT.md`).

## WHAT — the solution in one paragraph

There is exactly **one long-lived branch: `main`** — the generic product for Pi / OMP /
Prime Agent users. A member vertical is **not a branch and not a fork**: the member's own
repo holds their customizations (branding, hidden surfaces, member payload, updater
channel), and their build driver **snapshots `main` at one pinned commit**, applies their
overlay, and packages their own installer. The member rides `main` as a dependency stream
and controls their own release train.

```
chatek/vclaw-desktop (this repo, branch main)          member repo (e.g. VizMaster)
└─ main @ <pinned commit>  ── rsync snapshot ──┐       ┌─ packaging/<member>/  (overlay modules)
                                               ├───────┤─ payload/            (member app bundle)
   seam contract: scripts/release/             │       └─ scripts/            (build driver, updater)
   member-seams.mjs must exit 0 ───────────────┘
                                               ▼
                              integrated snapshot ── electron-builder ──► member installer
                              (member productName / appId / publish config)      │
                                                                                 ▼
                                                          member updater channel (R2 / latest.json)
```

## WHY — this shape and not branches

| concern | branch-per-member | pinned-snapshot + overlay (chosen) |
|---|---|---|
| upstream merge cost | ×N (one merge per member branch) | **O(1)** — main only |
| who owns member identity | tangled into the fork | **the member's repo, under their gates** |
| release trains | coupled / confused | **one per member**, on their schedule |
| drift | compounds silently | bounded: pin + contract verifier |
| escape hatch | n/a (already branched) | branch-per-RELEASE from main, merge-forward, never branch-per-forever |

The fork's own discipline stays **track-and-merge** against upstream `am-will/gooey-pi`
(see `FORK.md`): the smaller our diff, the cheaper every future upstream release is to absorb.

## THE CONTRACT — what members may depend on

`FORK.md` §"Member integration seam contract (v1)" lists the exact anchors a member build
integrates against (imports / call sites in `electron/main/index.ts` and `projects.ts`,
`build.extraResources`, plus the documented behavioral seams `HARNESS_IDS` and the
`vclaw`/`gooeypi` manifest key). Rules:

- Verify a checkout before building: `node scripts/release/member-seams.mjs --root <checkout>`
  — exit 0 = all seams present (this is also `tests/member-seams.test.ts`, so upstream merges
  that break a member turn **this repo red**, not your build).
- Anchors are renamed only by a **contract version bump + a FORK.md note in the same commit**.
- Everything else in `main` may change freely between pins; that is the point of pinning.

## HOW — the member build, step by step

Reference implementation (measured working 2026-10-22, fork `e2a1f48`): VizMaster repo —
`packaging/vcclaw/` (overlay modules), `app/scripts/build-local.sh` (driver),
`scripts/integrate-vcclaw.mjs` (idempotent anchored integration + `--check` drift mode),
`app/scripts/verify-dmg.sh`, R2 updater channel. Read those before writing your own.

1. **Pin.** Choose a `main` commit; record it in your repo (release identity, build metadata).
   Verify: `node scripts/release/member-seams.mjs --root <checkout>` → exit 0.
2. **Snapshot.** rsync the checkout into a cache workdir with **anchored** excludes:
   `--exclude=/.git --exclude=/node_modules --exclude=/out --exclude=/release`. An unanchored
   `release` also drops `scripts/release/` and every later step fails (see
   `docs/RELEASE_BUILD_HOST.md`, trap 1). Never integrate into the canonical checkout; keep it
   clean — a dirty tracked tree must fail the build, not be stamped silently.
3. **Payload.** Bundle your member app (your `dist/`, your payload `package.json`) in your repo.
4. **Integrate** (in the snapshot, idempotently): copy the bundled payload to `product/payload/`
   and write your product profile → `product/<member>.json` (id, identity, harnesses,
   `defaultProject.from: 'product/payload'`). The static `{from: 'product/payload'}` extraResources
   entry ships it as `Resources/product/payload`; the legacy `vendor/<member>` +
   `{from: 'vendor/vizmaster', to: 'vizmaster'}` route is retired, and `package.mjs` refuses a
   profile whose `defaultProject.from` is anything else. `defaultProject.version` is rendered from
   the emitted tuple at package time, so a placeholder is correct. Copy overlay modules into
   `electron/main/`; apply the remaining anchored insertion (`index-store-import`); then run your
   integrator's `--check` — must be `ok: true`.
   **Contract v2 retired the three behavioural edits** (harness rewrite, project-list wrapper,
   `ensureDefaultProject` call): the profile expresses those as data. See `FORK.md`.
5. **Typecheck** the integrated snapshot: `npm ci && npm run typecheck` (toolchain pins:
   node 24.15.0 / npm 12.0.2 — `npm run toolchain:bootstrap`, see `FORK.md`).
6. **Identity.** `productName` / `appId` now come from the profile's `identity`, applied by
   `package.mjs`; a member build must still never inherit the generic publish target — the
   auto-updater would offer someone else's builds.
7. **Package.** Run this **on the remote build host** (`docs/BUILD_REMOTE.md`; a local artefact is
   not evidence, `docs/BUILD.md`), with the repo-pinned npm 12 on `PATH` for this step
   (`npm run toolchain:bootstrap`; node 24.15.0 ships npm 11 and `package.mjs` refuses it):
   `node scripts/release/package.mjs --qa --platform mac --arch <arch> --profile product/<member>.json`
   (the script derives the artifact name from the profile id and refuses a name/profile mismatch)
   (Windows: Windows-only runner; Linux targets per `FORK.md`; neither is published by the release
   flow). Verify the artifact (layout, identity, your release stamp
   `<memberVersion>+<date>.<shortSha>`), write `SHA256SUMS`, publish to **your** updater channel.
   The build that vclaw-desktop itself hands over is published as a **Forgejo release on
   `chatek/vclaw-app`** with its `BUILD.json` (`docs/RELEASE_FLOW.md` §3). That handoff is
   **blocked today** on two counts: the consumer's intake compares a `handoff.json` to
   `BUILD.json`, mount-asserts, checks identity, and refuses unsigned input, while no machine in
   this estate holds a codesigning identity and the manual flow has no `handoff.json` producer
   (`publish-member-staging.mjs` is called by the GitHub-hosted member job, which the release flow
   does not run).
8. **Update the pin** whenever you want newer `main`; re-run the seam verifier in whatever gate
   you own (there is no CI in this repo that runs it for you) so a contract change is caught
   before a release, not during one.

Estate rules that bind every member build: macOS app builds of record run **only on the
remote build host** (`_MAC_HOST_`, `docs/BUILD_REMOTE.md`) — local unsigned `--dir` builds are
smoke/QA only and print `ARTEFACT(not-evidence)` (`docs/BUILD_LOCAL.md`); the two-flow entry
point is `docs/BUILD.md`. **Nobody signs today**: 0 codesigning identities exist on the host and
on the workstation, there are no CI secrets to hold one, and Forgejo Actions cannot build this
repo. Signed/notarized member artefacts therefore remain an open blocker (`FORK.md` §Open items),
and a member artefact is `unsigned` with its release defaulting to draft.

## If a seam breaks

The verifier names the seam. Either pin an older commit while you migrate, or move your
anchors to the new contract version (its version bump and the FORK.md note tell you what
changed). If a member need genuinely cannot be expressed as overlay + manifest + profile
data, the escalation is a **branch-per-release** cut from `main` (short-lived,
merge-forward) — agreed with the first member, never branch-per-forever.
