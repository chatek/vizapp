#!/usr/bin/env node
/**
 * Member integration seam contract, v1 (kept for old pins) and v2 (the default).
 *
 * The fork serves member apps (first: VizMaster) that build a branded vertical
 * from a PINNED main commit: they snapshot this tree, copy in their payload,
 * and perform anchored insertions into the files listed below (see
 * VizMaster/scripts/integrate-vcclaw.mjs — the consumer this v1 contract was
 * extracted from, measured 2026-10-22). An upstream merge that reformats or
 * renames an anchor breaks those builds; this verifier turns that failure into
 * a fork-side red at merge time instead of a member-side break at the next pin
 * bump.
 *
 * Zero dependencies: importable (verifyMemberSeams) and CLI-runnable.
 *
 *   node scripts/release/member-seams.mjs [--root <vclaw checkout>] [--contract <1|2>]
 *
 * Change rules:
 *   - An anchor may be renamed only by bumping the contract version and
 *     recording the rename in FORK.md in the same commit.
 *   - Members pin main commits; this verifier is the gate that keeps pinned
 *     builds integrable across upstream merges.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * @typedef {object} MemberSeam
 * @property {string} id
 * @property {string} file
 * @property {string} [anchor]
 * @property {readonly string[]} [anyOf]
 * @property {string} [jsonPath]
 * @property {string} [expect]
 * @property {string} [why]
 *
 * @typedef {object} MemberContract
 * @property {number} version
 * @property {string} [date]
 * @property {readonly string[]} [consumers]
 * @property {readonly MemberSeam[]} seams
 * @property {readonly object[]} [retired]
 * @property {readonly object[]} [documentedNotPatched]
 */

export const MEMBER_SEAMS_V1 = {
  version: 1,
  date: '2026-10-22',
  consumers: ['VizMaster scripts/integrate-vcclaw.mjs (apps/VizMaster)'],
  seams: [
    {
      id: 'index-store-import',
      file: 'electron/main/index.ts',
      anchor: "import { type JsonStateStore, openDesktopStateStore, StateCompatibilityError, StateMigrationError } from './store'",
      why: 'integration inserts the defaultProject + vizshare imports immediately after this line',
    },
    {
      id: 'index-state-store-call',
      file: 'electron/main/index.ts',
      anchor: '  const stateStore = await openDesktopStateStore(userDataPath)',
      why: 'integration appends the ensureDefaultProject and startVizShare calls after this line',
    },
    {
      id: 'index-harness-import',
      file: 'electron/main/index.ts',
      anyOf: ["import { HarnessDiscoveryService, reconcileActiveHarness } from './harness-discovery'", "import { HarnessDiscoveryService } from './harness-discovery'"],
      why: 'integration rewrites the first form into the second when routing reconciliation through ensureHarness',
    },
    {
      id: 'index-harness-reconcile-call',
      file: 'electron/main/index.ts',
      anchor: 'reconcileActiveHarness(stateStore,',
      why: 'integration replaces it with ensureHarness(stateStore, for the OMP-only member build; absence fails the integration --check routing assertion',
    },
    {
      id: 'projects-store-import',
      file: 'electron/main/projects.ts',
      anchor: "import type { FolderIdentity, JsonStateStore, PersistedProject } from './store'",
      why: 'integration inserts the singleProjectFilter import after this line',
    },
    {
      id: 'projects-list-return',
      file: 'electron/main/projects.ts',
      anchor: "return sortProjects(records, 'recent')",
      why: 'integration wraps it with singleProjectFilter(...) for the single-project member build',
    },
    {
      id: 'package-extra-resources',
      file: 'package.json',
      jsonPath: 'build.extraResources',
      expect: 'array',
      why: 'integration appends { from: "vendor/vizmaster", to: "vizmaster" } so electron-builder ships the member payload',
    },
  ],
  documentedNotPatched: [
    {
      id: 'harness-ids',
      file: 'src/types/api.ts',
      what: "HARNESS_IDS = ['omp', 'prime', 'pi']",
      note: 'behavioral seam: member builds restrict the harness set through reconciliation, not by editing this constant; a future generic profile loader would consume it',
    },
    {
      id: 'third-party-manifest-key',
      file: 'electron/main/plugins/catalog.ts',
      what: 'manifest key `vclaw` with legacy `gooeypi` fallback',
      note: 'member plugin packages identify themselves through this key',
    },
  ],
}

/**
 * Contract v2 — the three behavioural seams became DATA.
 *
 * v1 made a member build rewrite `reconcileActiveHarness`, wrap the project list, and append an
 * `ensureDefaultProject` call. Those three edits were the source of two user-visible defects
 * (a three-harness selector in a product that supports one; no project seeded on first launch),
 * were untestable here, and re-bet on every upstream merge. A product profile expresses the same
 * decisions as data the app reads, so v2 retires them.
 *
 * Retired, not lost: v1 stays exported above so a member pinning an older commit still verifies
 * against what that commit promised.
 */
export const MEMBER_SEAMS_V2 = {
  version: 2,
  date: '2026-11-01',
  consumers: ['VizMaster scripts/integrate-vcclaw.mjs (drop the three behavioural edits)'],
  seams: [
    {
      id: 'index-store-import',
      file: 'electron/main/index.ts',
      anchor: "import { type JsonStateStore, openDesktopStateStore, StateCompatibilityError, StateMigrationError } from './store'",
      why: 'integration inserts member module imports (e.g. vizshare) immediately after this line — genuinely new CODE still needs an anchor',
    },
    {
      id: 'package-extra-resources',
      file: 'package.json',
      jsonPath: 'build.extraResources',
      expect: 'array',
      why: 'a member payload ships through this array; the product payload also uses it (product/payload)',
    },
    {
      id: 'product-profile',
      file: 'product/profile.json',
      expect: 'file',
      why: 'the build-time product decision (harness set, identity, default project); a member keeps its own profile file and passes --profile',
    },
  ],
  retired: [
    { id: 'index-harness-reconcile-call', replacedBy: 'product profile `harnesses`', was: 'rewrote reconcileActiveHarness into ensureHarness for the OMP-only build' },
    { id: 'projects-list-return', replacedBy: 'product profile `defaultProject` (seed one project; no filtered list)', was: 'wrapped sortProjects in singleProjectFilter' },
    { id: 'index-state-store-call', replacedBy: 'electron/main/default-project.ts called by bootstrap for every product', was: 'appended an ensureDefaultProject call' },
  ],
  documentedNotPatched: [
    {
      id: 'harness-ids',
      file: 'src/types/api.ts',
      what: "HARNESS_IDS = ['omp', 'prime', 'pi']",
      note: 'the full vocabulary; a product narrows the OFFERED set through its profile, never by editing this constant',
    },
    {
      id: 'third-party-manifest-key',
      file: 'electron/main/plugins/catalog.ts',
      what: 'manifest key `vclaw` with legacy `gooeypi` fallback',
      note: 'member plugin packages identify themselves through this key',
    },
  ],
}

/** @param {MemberContract} contract */
export function verifyMemberSeams(root, contract = MEMBER_SEAMS_V2) {
  const results = []
  let ok = true
  for (const seam of contract.seams) {
    const path = resolve(root, seam.file)
    let passed = false
    let detail = ''
    try {
      if (seam.expect === 'file') {
        passed = existsSync(path)
        detail = passed ? 'file present' : 'file missing'
      } else if (seam.jsonPath) {
        const parsed = JSON.parse(readFileSync(path, 'utf8'))
        const value = seam.jsonPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), parsed)
        passed = Array.isArray(value)
        detail = Array.isArray(value) ? 'array' : `expected an array at ${seam.jsonPath}`
      } else {
        const content = readFileSync(path, 'utf8')
        const needles = seam.anyOf ?? [seam.anchor]
        const hit = needles.find((needle) => content.includes(needle))
        passed = hit !== undefined
        detail = passed ? 'anchor found' : 'anchor not found'
      }
    } catch (error) {
      detail = `unreadable: ${error instanceof Error ? error.message : String(error)}`
    }
    ok = ok && passed
    results.push({ id: seam.id, file: seam.file, ok: passed, detail })
  }
  return { version: contract.version, ok, results }
}

/** @param {MemberContract} contract */
export function reportMemberSeams(root, contract = MEMBER_SEAMS_V2) {
  const report = verifyMemberSeams(root, contract)
  for (const row of report.results) {
    console.error(`${row.ok ? 'ok  ' : 'FAIL'} ${row.id} (${row.file}) — ${row.detail}`)
  }
  console.error(`member-seams v${report.version}: ${report.ok ? 'all seams present' : 'CONTRACT BREACH'}`)
  return report
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const rootIndex = process.argv.indexOf('--root')
  const root = rootIndex >= 0 && process.argv[rootIndex + 1] ? resolve(process.argv[rootIndex + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const contractIndex = process.argv.indexOf('--contract')
  const requested = contractIndex >= 0 ? Number(process.argv[contractIndex + 1]) : 2
  const contract = requested === 1 ? MEMBER_SEAMS_V1 : MEMBER_SEAMS_V2
  const report = reportMemberSeams(root, contract)
  process.exit(report.ok ? 0 : 1)
}
