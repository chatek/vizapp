#!/usr/bin/env node
/**
 * Member integration seam contract, v1.
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
 *   node scripts/release/verify-member-seams.mjs [--root <vclaw checkout>]
 *
 * Change rules:
 *   - An anchor may be renamed only by bumping the contract version and
 *     recording the rename in FORK.md in the same commit.
 *   - Members pin main commits; this verifier is the gate that keeps pinned
 *     builds integrable across upstream merges.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const MEMBER_SEAMS_V1 = {
  version: 1,
  date: '2026-10-22',
  consumers: ['VizMaster scripts/integrate-vcclaw.mjs (VillageCity/VCC2/VizMaster)'],
  seams: [
    {
      id: 'index-store-import',
      file: 'electron/main/index.ts',
      anchor:
        "import { type JsonStateStore, openDesktopStateStore, StateCompatibilityError, StateMigrationError } from './store'",
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
      anyOf: [
        "import { HarnessDiscoveryService, reconcileActiveHarness } from './harness-discovery'",
        "import { HarnessDiscoveryService } from './harness-discovery'",
      ],
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
      what: "manifest key `vclaw` with legacy `gooeypi` fallback",
      note: 'member plugin packages identify themselves through this key',
    },
  ],
}

export function verifyMemberSeams(root) {
  const results = []
  let ok = true
  for (const seam of MEMBER_SEAMS_V1.seams) {
    const path = resolve(root, seam.file)
    let passed = false
    let detail = ''
    try {
      if (seam.jsonPath) {
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
  return { version: MEMBER_SEAMS_V1.version, ok, results }
}

export function reportMemberSeams(root) {
  const report = verifyMemberSeams(root)
  for (const row of report.results) {
    console.error(`${row.ok ? 'ok  ' : 'FAIL'} ${row.id} (${row.file}) — ${row.detail}`)
  }
  console.error(`member-seams v${report.version}: ${report.ok ? 'all seams present' : 'CONTRACT BREACH'}`)
  return report
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const rootIndex = process.argv.indexOf('--root')
  const root =
    rootIndex >= 0 && process.argv[rootIndex + 1]
      ? resolve(process.argv[rootIndex + 1])
      : resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const report = reportMemberSeams(root)
  process.exit(report.ok ? 0 : 1)
}
