# Release blockers — vclaw-desktop

Written 2026-10-31 so these survive the session that found them. Every row below is a
measurement, not a recollection: the command or test output that proves it is quoted, and the
file is named. If a row's state has moved, change the row and say what you measured — a row
nobody can re-check is not a register entry.

Context: the agent SDK now reaches this app **pre-packaged**. Nothing installs it at runtime
(`curl -fsSL https://vclawhub.com/join.ts | bun - …` is not part of the desktop's install path):
`electron/main/extension-manifest.ts` injects `assets/extensions/vclaw-agent.js` into every
harness, and that file is a vendored build of agent-sdk's pi-extension bundle. The artifact is
produced by the agent-sdk lane (`vchat-email-9d3b41`); this app consumes it by digest.

| # | Blocker | Class | State |
|---|---|---|---|
| B1 | `npm test` red: the shipped-extension gates did not know bundles exist | code (desktop) | **fixed**, measured green |
| B2 | No pin gate: the prepackaged artifact shipped unverified | code (desktop) | **fixed**, measured green |
| B3 | `npm run check` red: generated bundle was linted, plus a pre-existing format break on HEAD | code (desktop) | **fixed**, `check` exit 0 |
| B4 | `package-member` release job breaks 7 release-chain gates | code (**member lane**), decision needed | **open** — see "who decides" |
| B5 | Prime Work never received the SDK bundle — `/vclaw` was dead there | code (desktop) | **fixed**, measured in a real Electron run |

---

## B1 — `npm test` red: two shipped-extension gates did not know the bundle exists

**NAMING + EVIDENCE.** Measured: `npx vitest run tests/backend/shipped-extension-contracts.test.ts`
→ `Tests 2 failed | 3 passed`:

```
Missing registration contract for vclaw-agent.js: expected undefined to be defined
  ❯ tests/backend/shipped-extension-contracts.test.ts:142
expected [ 'omp-work-ask-user.ts', …(6) ] to deeply equal [ 'omp-work-ask-user.ts', …(5) ]
  + "vclaw-agent.js"                       ❯ tests/backend/shipped-extension-contracts.test.ts:190
```

and `npx vitest run tests/coverage-inventory.test.ts` → `expected [ …(7) ] to deeply equal [ …(6) ]`
(the shipped-extension inventory list at `tests/coverage-inventory.test.ts:94-101` predates the
bundle). Root cause, one class in three places: every inventory derived "shipped extensions" by
`entry.name.endsWith('.ts')`, and the contract fixtures modelled a host with tools only.

**CLASS.** Code we fix. `npm test` red means `release:verify` red, so this blocked the release.

**PLAN.** Measured what the bundle actually needs before changing anything: it initializes against
`api.registerCommand` and `api.on` only — no `registerTool`, no `typebox` — registering 7 commands
(`vclaw`, `vchat-onboard`, `vchat-status`, `vchat-connect`, `vchat-claim-status`, `vchat-directory`,
`vchat-family`) and 3 events (`turn_end`, `session_start`, `session_shutdown`), 0 ms, no timers.
Both real hosts do inject commands and events: prime's `ExtensionAPI` declares
`registerCommand`/`on` (`node_modules/prime-agent/dist/core/extensions/types.d.ts`) and OMP's
extension API writes to `extension.commands`
(`registerCommand(e,t){this.extension.commands.set(e,{name:e,...t})}` inside
`@oh-my-pi/pi-coding-agent/dist/cli.js`). So the **fixtures** were the incomplete model, not the
injection. Changes: model `registerCommand`/`on` on the prime and OMP fixtures; add the measured
registration row for `vclaw-agent.js`; derive the shipped inventory from sources *and* bundles;
isolate `HOME`/`XDG_CONFIG_HOME` for the vclaw rows (a joined machine carries a real
`~/.config/vclaw/credentials.json`, and a contract test must not read it); exclude the bundle from
line coverage through the documented `COVERAGE_TECHNICAL_EXCLUSIONS` mechanism with two named
compensating verifications instead of instrumenting minified bytes.

**VERIFIED.** `tests/backend/shipped-extension-contracts.test.ts` 5/5, `tests/coverage-inventory.test.ts`
7/7, and those plus the pin test 18/18 together. The registration row is now the thing that fails
loudly when a bundle bump changes the surface — re-measure it, do not guess it.

**STATUS.** Fixed 2026-10-31 in `7fb35e2` (submodule detached-HEAD commit; parent gitlink not yet bumped). Files:
`tests/backend/shipped-extension-contracts.test.ts`, `tests/coverage-inventory.test.ts`,
`scripts/release/coverage-inventory.ts`.

---

## B2 — No pin gate: the prepackaged artifact shipped unverified

**NAMING + EVIDENCE.** `grep -rn "vclawhub-agent\|0f39a164\|1294f04e" tests scripts package.json` →
**zero matches**. The only record of the pin was prose in `vendor/vclawhub-agent-1.5.0.md`, and
`vendor:verify-patches` passes it *trivially* (the note says "Unpatched: base == patched, no
`.patch`, `vendor:verify-patches` passes trivially"). So the shipped bundle could be replaced,
rebuilt, or left stale and every gate stayed green. Measured at the time: the three copies were
identical — `0f39a164…` (tarball, 1,373,351 B) in both `agent-sdk/` and `vendor/`, and
`1294f04e3d4cccfe…` (913,513 B) for the tarball's `dist/pi-extension/index.bundled.js`,
`agent-sdk/dist/pi-extension/`, and the shipped asset. Correct bytes, no guard.

**CLASS.** Code we fix — and this is the load-bearing gate after the prepackaging decision, because
the join pipe was previously the only thing that fetched the SDK.

**The gate's first real drift, same hour.** `04d485e` ("re-vendor agent-sdk 0cfa1a68 — the wrapper
exit-1 hole closed") landed while this work was in review. The pin test failed immediately with
`Vendored agent archive checksum mismatch: …/vendor/vclawhub-agent-1.5.0.tgz is 0cfa1a68…`, and the
note's own tarball line still described `0f39a164…`/1,373,351 B while the table below it had been
updated — a provenance record that no longer matched its file. Both corrected from the shipped bytes:
archive `0cfa1a68…` (1,374,980 B, 377 files), extension bundle **unchanged** at `1294f04e…` (the
wrapper change was CLI-only, proven by extraction), so the registration contract held across the
bump — which is the whole point of splitting "digest moved" from "surface moved".

**PLAN.** (1) Pin both artifacts in `scripts/release/dependency-pins.json`
`artifacts.vclawhub-agent`: archive sha256 + size, and `shipped` {path, `from` (archive member),
sha256, size}. (2) `scripts/release/vendor-agent-pins.mjs` verifies digests, sizes, and — by
extracting the archive — that the shipped bundle **is** the archive member renamed, never rebuilt;
a renamed member is reported as such rather than as `ENOENT`. (3) `npm run vendor:verify-patches`
calls it, so `release:verify:package` runs it. (4) The release tests learn that `artifacts` is a
third pin registry (a `vendor/*.tgz` pinned there counts as pinned) and that any artifact row must
carry a digest.

**VERIFIED.** `npx vitest run tests/release-vendor-agent.test.ts` → 6/6 (happy path; tampered bytes;
stale size; renamed member; pins file without the row; note-vs-pin agreement).
`node scripts/release/verify-vendor-patches.mjs` →
`vendor/vclawhub-agent-1.5.0.tgz: archive member is byte-identical to assets/extensions/vclaw-agent.js (1294f04e3d4c…)`.
`tests/release-scripts.test.ts` pin tests: both pass.

**STATUS.** Fixed 2026-10-31 in `7fb35e2`. Bump procedure is in the build plan below.

---

## B3 — `npm run check` red: generated bundle linted, plus a format break that predates this work

**NAMING + EVIDENCE.** `npm run check` → `Found 144 errors. Found 787 warnings.` and
`npx biome lint … assets/extensions/vclaw-agent.js` reproduces *all* of them from that one file.
Separately: `scripts/release/member-seams.mjs` fails `format:check` **on HEAD** — the file is
unmodified in the working tree and `git show HEAD:scripts/release/member-seams.mjs` fails the same
check, so `check` has been red since `e2a1f48` (2026-10-22, "seams: member integration contract v1").

**CLASS.** Code we fix (one config line + a formatter run on a formatting-only diff).

**PLAN.** `scripts/release/biome.json` excludes `!assets/extensions/*.js` — the class rule, because
authored extensions here are `.ts` and every `.js` in that directory is a generated bundle (the
inventory test pins the set). Ran `biome format --write` on `member-seams.mjs`; the diff joins lines
and normalises quotes only (4 insertions, 11 deletions, string values unchanged).

**VERIFIED.** `npm run check` → `Checked 412 files … No fixes applied.` + `Checked 29 files … No fixes applied.`, **exit 0**.

**STATUS.** Fixed 2026-10-31 in `7fb35e2`.

---

## B4 — `package-member` release job breaks 7 release-chain gates (open, not this lane's to design)

**NAMING + EVIDENCE.** Full suite under the pinned Node major (`v24.19.0`):
`Tests 7 failed | 1928 passed`. All 7 are about the job added at
`.github/workflows/release.yml:203` (`needs:` at :455):

```
package-member: expected '${{ inputs.member_ref }}' to be '${{ needs.validate.outputs.sha }}'
expected [ Array(6) ] to deeply equal [ Array(5) ]        ← job-id table, "package-member" extra
expected 41 to be less than 40                            ← a secrets.* reference inside a run step
validation-documentation: expected [ …(7) ] to deeply equal [ …(3) ]   ← docs/validation.md table
```

(The same run under Node 22.22.2 also fails 4 npm-toolchain tests; those are **environmental** —
`Node.js >=24.15.0 is required (found v22.22.2)` — and pass under 24.)

**CLASS.** Code — owned by the member-integration lane (`e2a1f48`), with one genuine decision.

**PLAN / WHO DECIDES.** The decision: a member build must package the SHA that `validate` resolved
(`needs.validate.outputs.sha`), not a caller-supplied `member_ref` — otherwise the artifact in a
release is not the commit the rest of the release verified. Whoever owns the member program
confirms or rejects that, then: pin the job to the validated SHA, keep credentials out of `run:`
steps, and add the job to the CI/release tables in `docs/validation.md` plus the tests' expected
lists. Until then `npm test` is red and the release cannot pass `quality`.

**STATUS.** Open 2026-10-31. Reported, not silently re-pinned: relaxing those assertions would
delete the guarantee they exist for.

**ROUTING (2026-10-31).** Recorded as **`docs/BACKLOG.md` C20** in the estate register (parent repo,
commit `b283b19d`, owner: member-integration lane `e2a1f48`), carrying this framing: a member build
must package the SHA `validate` resolved, secrets stay out of `run:`, and the job joins the
validation tables. It is **not** an operator decision and is not parked in an operator register.
The lane has no fabric identity to message directly (18 agents enumerated, none is the member lane),
so the two registers point at each other and the acceptance is written here:

- `.github/workflows/release.yml` `package-member` takes its SHA from `needs.validate.outputs.sha`
  and fails closed if that output is empty;
- no `secrets.*` reference appears inside a `run:` step of that job;
- `docs/validation.md` gains the `package-member` row in both the CI and release tables;
- `npx vitest run tests/release-scripts.test.ts tests/validation-documentation.test.ts` is green.

---

## B5 — Prime Work never received the SDK bundle (`/vclaw` was dead there)

**NAMING + EVIDENCE.** Found by the new injection assertion, not by reading code: the hermetic E2E
failed with

```
Expected value: ".../assets/extensions/vclaw-agent.js"
Received array: ["--mode", "rpc", "--cwd", …, "--provider", "fixture", "--model", "fixture-model", …]
  ❯ tests/e2e/app.spec.ts:1888   (Prime Work smoke › round-trips a grouped Prime ask_user questionnaire)
```

`1 failed, 65 passed` — OMP and Pi passed the same assertion, Prime did not. Cause:
`electron/main/index.ts:978-990` builds the Prime runtime environment inline and set
`PRIME_WORK_ASK_USER_EXTENSION_PATH` but never `VCLAW_AGENT_EXTENSION_PATH`, while OMP and Pi get it
from `extensionRuntimeEnvironment` (`index.ts:511`). `extensionInjections('prime')` therefore found no
path and appended no `--extension`. The manifest (`extension-manifest.ts:22`) and the contract test both
said Prime had the capability; only the environment disagreed, so nothing failed until a test looked at
the argv a real harness received.

**CLASS.** Code we fix — shipped-behaviour defect: `/vclaw` was unreachable in Prime Work.

**PLAN.** Add `VCLAW_AGENT_EXTENSION_PATH: vclawAgentExtensionPath` to the Prime provider (Prime's
`ExtensionAPI` declares `registerCommand`/`on` — the bundle's entire surface — so no further
adaptation is needed). The E2E assertion at all three harnesses is the regression gate.

**VERIFIED.** `npx playwright test -g "ask_user"` → **3 passed** (Prime 4.1 s, OMP 2.9 s, Pi 2.9 s),
each asserting `--extension …/vclaw-agent.js` in the argv the runtime actually received.
`npx vitest run tests/backend` → 1218 passed (no env-shape contract broken).

**STATUS.** Fixed 2026-10-31 in `7fb35e2`. Files: `electron/main/index.ts`,
`tests/e2e/app.spec.ts`.

---

## Build plan — agent-sdk ships pre-packaged (refined 2026-10-31)

The pivot is: **the desktop never installs the SDK; it embeds one pinned build and injects it as a
harness extension.** That makes three things the build's business: the artifact's provenance, the
extension surface it registers, and the fact that it is injected on every harness.

### P0 — gates that exist now (done this session)

- Pin + provenance: digests for archive and shipped bundle, archive-member equality, wired into
  `vendor:verify-patches` (B2).
- Surface contract: measured registrations asserted per host fixture, `HOME` isolated (B1).
- Injection proven in the E2E suite: `tests/e2e/app.spec.ts` asserts
  `--extension <cwd>/assets/extensions/vclaw-agent.js` reaches the runtime for **prime, omp and pi**
  (three sites, alongside the existing ask-user assertions). This is what caught B5 — Prime was
  silently missing the bundle — so it is the gate that would have found the defect without anyone
  reading `index.ts`.
- `check` and `test` gates green (B1, B3).

### P1 — the artifact handoff contract with the agent-sdk lane

An SDK build is accepted by digest only. Accept it when all four hold, and record them in
`vendor/vclawhub-agent-<version>.md` + the pins row:

1. `dist/agent.js.sha256` present and matching the tarball.
2. `npm run verify:pack` (SDK) passes — prefer it over a bare `npm pack`.
3. The build ran completely: `npm run build` is `tsc && build:extensions` in agent-sdk, so the CLI
   and the extension cannot disagree. A tarball whose `dist/pi-extension/index.bundled.js` does not
   match the source build is rejected by the pin test.
4. Re-vendor as a **rename, never a rebuild**: copy the tarball, set `shipped.sha256` from the
   archive member, then run `npm run vendor:verify-patches`.

Bump checklist (each step has a check, so a partial bump fails rather than ships):
`npm pack` in agent-sdk → copy tarball into `vendor/` → update `dependency-pins.json`
(`sha256`, `size`, `shipped.sha256`, `shipped.size`) → update the note → `npm run vendor:verify-patches`
→ `npx vitest run tests/backend/shipped-extension-contracts.test.ts` (fails if the surface changed;
re-measure the registrations, don't widen them) → `npm run check`.

### P2 — drive `/vclaw` through a real harness (the E2E this decision actually needs)

Today the bundle is **executed** by the contract test against modelled host surfaces, and **injected**
for real in the hermetic E2E, but never invoked in a live harness. Acceptance for the prepackaged
path: with an isolated `HOME` and no identity, `/vclaw status --json` returns the labelled degraded
envelope and the command exits 4; with a claimed identity (stub vgate) it returns identity + fabric
state. Prerequisite to name explicitly: a real `omp`/`pi` binary on the E2E image and a temp `HOME`
per run — neither exists in the hermetic fixture today, which is why this is P2 and not P0.

### P3 — documentation truth

`README.md` and `docs/*` describe harness installation as the user's step; that stays true (the SDK
is not a harness), but no vclaw-desktop document may imply the join pipe provisions the desktop's
agent. The desktop's SDK story is: vendored bundle in `assets/extensions/`, pinned, injected. If a
future doc needs the provenance, it cites `vendor/vclawhub-agent-<version>.md` and the pins row.
