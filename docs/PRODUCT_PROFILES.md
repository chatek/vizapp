# Product profiles — one desktop app, several products

Status: **implemented** (2026-11-01). Sections 1–3 are the analysis that produced it; section 11
records what actually landed and where the implementation had to differ from the sketch. Raised by the operator after
using the arm64 build: the shipped app offers three harnesses where the product wants one, and a
member product (VizMaster) cannot ship its own project as the default.

## 1. What was reported

| # | report | is really |
|---|---|---|
| 1 | the harness selector offers Pi / OMP / Prime; the product supports **OMP only** | the offered harness set is a *product* decision, but today it is derived purely from what is installed |
| 2 | the default project must be a **build-time config parameter** so a VizMaster build opens on VizMaster | there is no default-project concept in this repo at all; the member overlay injects one |

**One root cause.** Variant behaviour is currently delivered by *editing code*, not by data.
`scripts/release/member-seams.mjs` names the three edits the VizMaster build performs:

- `index-harness-reconcile-call` — rewrites `reconcileActiveHarness(...)` into `ensureHarness(...)`
  "for the OMP-only member build";
- `projects-list-return` — wraps `return sortProjects(records, 'recent')` in `singleProjectFilter(...)`;
- `index-state-store-call` — appends an `ensureDefaultProject(...)` call plus the vizshare import.

Anchored text edits are the most brittle of the available mechanisms: every upstream merge can
reformat an anchor, and each edit is a behaviour the fork cannot test. The operator's two reports
are exactly two of those three edits, viewed from the user's chair.

## 2. What exists today (measured, this tree)

**Harness offering** — pure executable detection, no product gate anywhere:

- `src/types/api.ts:90` — `AppMeta.harnesses: Record<HarnessId, HarnessStatus>`, filled by
  `HarnessDiscoveryService.refresh()` (`electron/main/harness-discovery.ts`).
- `src/components/Sidebar.tsx:278` — the entire selector:
  `HARNESS_SELECTOR_ORDER.filter((harness) => Boolean(harnesses?.[harness]?.path)).map(...)`.
  `HARNESS_SELECTOR_ORDER = ['pi','omp','prime']` (`src/lib/harness.ts:3`).
- `src/types/api.ts:66` — `HARNESS_IDS = ['omp','prime','pi'] as const`. `FORK.md` already calls
  this a **behavioural seam** ("documented, not patched").
- **`AppSettings.enabledHarnesses: HarnessId[]` already exists** — default `['omp','prime','pi']`
  (`electron/main/store.ts:123`), validated at `electron/main/settings-schedules.ts:76`, surfaced in
  settings (`src/pages/settings/contracts.ts:38`). The selector does not read it. It is inert today,
  which means the typed, persisted, already-validated slot for this decision is sitting unused.

**Projects** — no default, no seeding:

- Persisted in `prime-work-state-v4.json`, schema v4 (`electron/main/store.ts:30-32`), one
  `ProjectService` per harness; records carry `harness` and never cross (`projects.ts:145`).
- Creation is user-triggered only: `projects:add` → `ProjectService.add()` (`ipc.ts:243`) →
  `grantProjectFolder()` — which is **private** (`projects.ts:577`).
- Grant preconditions: the folder must exist, must not be a symlink, must not be a volume root or
  `$HOME` (`isBroadProjectRoot`, `projects.ts:22-40`).
- Removal writes the path into `state.dismissedProjectPaths` (`projects.ts:755`), which suppresses
  re-inference and silent re-adding. **Any seeding design must respect this or it will fight the user.**
- Startup selection: `selectStartupWorkspace` (`src/lib/workspace.ts:71`) →
  `findProjectForSession(...) ?? projects[0]`, over `sortProjects(records,'recent')`
  (`projects.ts:527`). There is **no persisted last-project**, so a freshly seeded project sorts first
  by construction until the user opens something else.
- Zero projects: `No matching work` (`Sidebar.tsx:319`), `Add your first project`
  (`ProjectsPage.tsx:12`), composer disabled with `Add a project to begin` (`Composer.tsx:769`).
  There is no onboarding wizard.
- **`defaultProject` / `ensureDefaultProject` do not exist in this repo** — they exist only in
  `chatek/vizmaster`'s overlay and as anchor text here.

**Build-time variant support** — naming and bytes only:

- `scripts/release/package.mjs --member <id>`: validates the id, renames artefacts
  `VClaw-<version>-<member>-<arch>`, and the payload is expected to be integrated *before* it runs.
- `build.extraResources` (`package.json`) ships `icon.png`, `skills`, `extensions`, `pets`.
- Nothing in the packaged app reads a variant config. `app.isPackaged`, `process.env`, and
  `extraMetadata` carry no product decision today.

## 3. Why the current shape keeps producing defects

An overlay that rewrites `reconcileActiveHarness` must know the *shape* of code it has never owned.
Three consequences, all observed:

1. **The behaviour is untestable in this repo.** Tests here run `main` as written; the `ensureHarness`
   path only exists inside a member snapshot, so it is exercised by nobody until release day.
2. **Two products diverge silently.** `singleProjectFilter` exists only in the member build — so
   "the app shows one project" is a claim about a tree that no CI here has ever seen.
3. **Every merge is a compatibility bet.** The seam verifier catches *renamed anchors*, not
   *changed semantics*, and cannot see an edit that applies cleanly but means something else.

The fix is not more seams. It is to stop expressing product decisions as code edits.

## 4. The proposal — a product profile, resolved at runtime

One JSON file, embedded in the package, **the only place a product differs**:

```jsonc
// resources/product.json
{
  "profileVersion": 1,
  "id": "vizmaster",                  // must equal the member id in the artifact name
  "identity": { "productName": "VClaw", "appId": "com.vclaw.desktop" }, // member keeps the generic identity (2026-11-05 ruling)
  "harnesses": ["omp"],               // the offered set — a product decision
  "defaultProject": {
    "name": "VizMaster",
    "from": "product/payload",       // fixed v2 payload dir; the build refuses any other value
    "to": "~/VizMaster",              // expanded at run time, never baked absolute
    "version": "0.0.0+unrendered"     // placeholder: package.mjs renders the payload release
  }
}
```

The generic product ships the same file with `id: "vclaw"`,
`harnesses: ["omp", "prime", "pi"]`, and **no** `defaultProject` — the narrowing is a property of a
member product, not of the app (decided 2026-11-01, §9). Always shipping a profile — rather than "absent means generic" — keeps one code
path that CI exercises in every build.

**Resolution order, fail-closed:**

1. `resources/product.json` if present (packaged), else `product/profile.json` (dev).
2. Absent → the built-in generic profile, and **log that it is built-in**, so a packaging mistake is
   visible rather than silent.
3. Present but invalid (unknown harness id, `defaultProject.harness` not in `harnesses`, `id` with
   illegal characters, `from` escaping Resources) → **refuse to start** with a named error. A product
   profile is a build-time input; a malformed one is a build defect and must not degrade into
   "looks generic".

**Where it is consumed (four points, no others):**

| point | file | change |
|---|---|---|
| load + validate | new `electron/main/product-profile.ts` | read, validate, resolve payload paths against `process.resourcesPath`; expose `ProductProfile` |
| harness offering | `harness-discovery.ts` + `AppMeta` | intersect discovered harnesses with `profile.harnesses`; the selector then needs **no change at all** because it already filters by `harnesses[h].path` |
| first-run project | new `electron/main/default-project.ts`, called in `bootstrap()` after the per-harness services exist | materialize payload → grant → select |
| renderer fallback | `src/lib/workspace.ts:71` | prefer the seeded project when no session is active and the user has not chosen |

The selector is the pleasant part: `Sidebar.tsx:278` already renders "discovered ∩ available". An
OMP-only product needs no renderer edit — only a truthfully narrow `harnesses` map. With one
harness the switch control collapses to a static brand mark.

`enabledHarnesses` in settings stays as the **user's** preference inside the product's allowed set;
the profile is the **product's** set. Intersection, product first. That keeps the existing typed
setting meaningful instead of replacing it with a second source of truth.

## 5. The default project, in detail (this is where the bugs are)

Seeding is stateful, so the design is explicit about every state:

```
boot:
  profile.defaultProject?
    no  -> nothing (generic product)
    yes -> payload present at Resources/<from>?
             no  -> warn, continue as generic (never half-seed)
             yes -> already recorded for that path?  -> touch, select, done
                    path in dismissedProjectPaths?   -> SUPPRESS (user deleted it)
                    else -> materialize, stamp BUILD.json, grant, select
```

Rules that make it survivable:

1. **Never resurrect.** `ProjectService.remove()` writes `dismissedProjectPaths`; seeding must treat
   that as a tombstone. Otherwise the app re-creates the project the user just deleted, every launch.
2. **Upgrade without data loss.** If `~/VizMaster/BUILD.json` exists with a different `version`,
   refresh the payload while preserving user-owned subtrees (`lessons/`, `node_modules/`, `.git`) —
   the contract the current overlay already implements; it belongs here, where it can be tested.
3. **Grant through the service, not through the store.** `grantProjectFolder` is private
   (`projects.ts:577`). Add a public `ProjectService.ensureProject(path)` that reuses
   `captureFolderIdentity` + the same record shape; writing `state.projects.push(...)` by hand in a
   seeder is a second implementation of the schema and will drift.
4. **Tag the record with the profile's harness.** A record created as `prime` is invisible in an
   `omp`-only build (`projects.ts:145`) — the failure would look like "seeding silently did nothing".
5. **Respect the grant preconditions.** `~/VizMaster` is fine; `$HOME` and volume roots are refused
   (`isBroadProjectRoot`), so `to` must never be bare `~`.
6. **Dev and CI:** not packaged ⇒ no `process.resourcesPath` payload ⇒ the seeder no-ops and says so.
   The hermetic E2E runs the same code with a fixture profile pointing at a temp payload, so the
   path is covered without shipping VizMaster in the generic build.

## 6. Build wiring

`package.mjs` gains `--profile <path>` (default `product/profile.json`):

- validate the profile **before** packaging, and derive the artifact name from `profile.id`
  — `--member` becomes shorthand for `--profile` and the two can never disagree;
- copy the profile to `resources/product.json` via `build.extraResources` (already the mechanism);
- `productName` / `appId` come from `profile.identity`, so a member build can never inherit the
  generic identity (and therefore never inherits its `userData` directory or its update channel —
  two products sharing `com.vclaw.desktop` would share `prime-work-state-v4.json` and fight over
  projects).

**Assertion in `verify-package`, not a convention:** a packaged app whose artifact name says
`-vizmaster-` must carry `product.json` with `id: "vizmaster"`, and any profile with
`harnesses: ["omp"]` must not advertise others. This is the same class of check as the shipped-
extension digest added today: prove the bytes agree with the claim, in the verifier.

## 7. Effect on the seam contract (v2)

| seam (v1) | fate |
|---|---|
| `index-harness-reconcile-call` (`ensureHarness` rewrite) | **retired** — the profile's `harnesses` decides |
| `projects-list-return` (`singleProjectFilter` wrap) | **retired** — a product with one project seeds one; there is no hard filter, so user-added projects keep working |
| `index-state-store-call` (append `ensureDefaultProject`) | **retired** — `default-project.ts` is called by `bootstrap()` for every product |
| `index-store-import` (insert member modules, e.g. vizshare) | **kept** — genuinely new code still needs an anchor across a pinned snapshot |
| `package-extra-resources` | **kept**, now also carries `product.json` |

Member snapshots get simpler and the fork gets testable behaviour. Retiring an anchor requires a
contract-version bump and a `FORK.md` note in the same commit, per the existing rule.

## 8. Test plan

| level | case |
|---|---|
| unit | profile validation: unknown harness id, `defaultProject.harness ∉ harnesses`, `id` illegal, `from` escaping Resources, missing file ⇒ generic + notice |
| unit | seeder: payload absent ⇒ no-op; recorded ⇒ touch only; dismissed ⇒ suppressed; version change ⇒ refresh preserving user dirs; wrong harness ⇒ visible error |
| unit | resolution: profile ∩ user preference; product set wins |
| renderer | selector renders exactly `profile.harnesses ∩ detected`; single harness ⇒ no menu affordance |
| verifier | artifact-name ↔ `profile.id` contradiction; profile present in Resources; extension digest (already added) |
| e2e | hermetic run with a fixture profile ⇒ one harness entry, seeded project selected, composer enabled |

## 9. Open decisions (need the operator, not a default)

1. **Scope of "OMP only" — DECIDED (2026-11-01, operator): member products only.** The generic
   product keeps all three harnesses; a member profile narrows to `["omp"]`.

   Consequence worth stating: **the arm64 artefact delivered today is the generic build**, so under
   this decision its selector legitimately shows three. The report that the selector should offer
   only OMP describes the *member product*, and that behaviour arrives by building with a profile —
   not by changing the app. A product build is a different artefact (different `appId`, own state
   directory, own update channel), which is precisely why it must not be produced by editing code at
   packaging time.
2. **Default project path and name** for the VizMaster product (`~/VizMaster` assumed), and whether
   the payload should also be offered as a template for a second project.
3. **Update channel** per product — `profile.identity.appId` isolates state, but the `publish` target
   must also be per product or a member build will offer generic builds.

## 10. What I would do first

1. `product/profile.json` (generic) + `product-profile.ts` + `AppMeta.product` — no behaviour change
   until the profile is read, so it can land and be verified alone.
2. Make the selector honour `profile.harnesses` and rebuild the artefact with `harnesses: ["omp"]`,
   which closes report #1 with no renderer change.
3. `ProjectService.ensureProject()` + `default-project.ts` + tombstone handling, then a fixture
   profile in the hermetic E2E — which closes report #2 and gives VizMaster a build that needs no
   anchored `ensureDefaultProject` at all.
4. Contract v2: retire the three seams, note it in `FORK.md`, tell `vizmaster-lead` their integrator
   loses three edits (they keep the module anchor).

## 11. What landed (and the three places the sketch was wrong)

Implemented on `feat/product-profiles`. The parts that matched the sketch: `product/profile.json` +
`electron/main/product-profile.ts` (validate/load/describe, fail-closed), profile in `AppMeta`,
harness offering through `offeredHarnesses()`, `ProjectService.seedStatus/touchByFolder/ensureProject`,
`electron/main/default-project.ts`, `package.mjs --profile` deriving the artifact name from `id`,
and `verify-package` asserting name ↔ profile agreement.

**Wrong in the sketch, corrected during implementation:**

1. **The payload did not need a new extraResources row per build.** The sketch implied the profile
   would drive `build.extraResources`; electron-builder takes that statically, and its CLI cannot
   append array entries sanely. The convention is instead `product/payload` — always shipped, empty
   for the generic product — which is exactly the v1 rule ("payload integrated before packaging")
   with a fixed path. A member profile's `defaultProject.from` must be `product/payload`; the v2
   integrator copies the bundled payload there and `package.mjs` refuses any other value. The
   legacy `vendor/<member>` + `{from: 'vendor/vizmaster', to: 'vizmaster'}` route is retired. The
   selected profile is staged as `product/profile.active.json` and shipped as
   `resources/product.json`, because the extraResources entry is static too.
2. **The seeder had to be non-destructive by construction.** An earlier subagent version read
   `lessons/node_modules/.git` as text and then removed the target before restoring them — that
   destroys the user's data on a real tree. The shipped version never deletes: user-owned top-level
   directories are filtered out of `fs.cp`, so the worst case is stale files, not lost work.
3. **`reconcileActiveHarness` needed one extra rule.** Nulling non-offered harnesses is enough when
   something is installed, but with nothing detected a user upgrading from a generic build would keep
   `activeHarness: 'prime'` in a product that cannot show it. The reconciler now falls back to the
   product's first harness.
4. **The harness vocabulary cannot be imported by the release scripts.** Node's ESM cannot resolve an
   extensionless runtime import from `api.ts`, so `product-profile.ts` mirrors `HARNESS_IDS` and a test
   pins the mirror — a duplicate guarded by a test rather than a silent second source.

Acceptance evidence is in section 12.
