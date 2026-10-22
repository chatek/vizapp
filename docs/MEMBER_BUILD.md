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
2. **Snapshot.** rsync the checkout into a cache workdir (exclude `.git`, `node_modules`,
   `out`, `release`). Never integrate into the canonical checkout; keep it clean — a dirty
   tracked tree must fail the build, not be stamped silently.
3. **Payload.** Bundle your member app (your `dist/`, your payload `package.json`) in your repo.
4. **Integrate** (in the snapshot, idempotently): copy payload → `vendor/<member>/`; append
   `{ "from": "vendor/<member>", "to": "<member>" }` to `build.extraResources`; copy overlay
   modules into `electron/main/`; apply the anchored insertions/rewrites from the contract;
   then run your integrator's `--check` — must be `ok: true`.
5. **Typecheck** the integrated snapshot: `npm ci && npm run typecheck` (toolchain pins:
   node 24.15.0 / npm 12.0.2 — `npm run toolchain:bootstrap`, see `FORK.md`).
6. **Identity.** Override `productName` / `appId` / `publish` for YOUR product at build time
   (electron-builder config override or your overlay). **Never leave the inherited publish
   target on a member build** — the auto-updater would offer someone else's builds.
7. **Package.** `npx electron-builder --mac dmg --<arch> --publish never` per arch
   (Windows: Windows-only runner; Linux targets per `FORK.md`). Verify the artifact
   (layout, identity, your release stamp `<memberVersion>+<date>.<shortSha>`), write
   `SHA256SUMS`, publish to **your** updater channel.
8. **Update the pin** whenever you want newer `main`; re-run the seam verifier as part of
   your CI so a contract change is caught before a release, not during one.

Estate rules that bind every member build: macOS app builds of record run **only on the
remote build host** (`_MAC_HOST_`) — local unsigned `--dir` builds are smoke/QA only;
signed/notarized artifacts need the CI secrets (Apple Developer ID — open item in `FORK.md`).

## If a seam breaks

The verifier names the seam. Either pin an older commit while you migrate, or move your
anchors to the new contract version (its version bump and the FORK.md note tell you what
changed). If a member need genuinely cannot be expressed as overlay + manifest + profile
data, the escalation is a **branch-per-release** cut from `main` (short-lived,
merge-forward) — agreed with the first member, never branch-per-forever.
