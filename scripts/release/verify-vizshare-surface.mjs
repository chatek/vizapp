#!/usr/bin/env node
// Fail-closed assertion that the landed vizshare agent-identity surface is present.
//
// Why: the shared VizApp checkout has repeatedly reverted to a pre-step-2/3 state
// (deleted electron/main/vizshare/agent-{assertion-store,token-source}.ts and a broker
// without the push route) with no commit behind it — a checkout/clean operation aimed at
// the shared tree. A build made from such a tree silently ships without the agent
// assertion supply and the dual-mode token source. This check runs in every build
// preflight so the replay fails loudly instead of producing a bad artefact.
//
//   node scripts/release/verify-vizshare-surface.mjs [--root <repo>]
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REQUIRED_FILES = ['electron/main/vizshare/agent-assertion-store.ts', 'electron/main/vizshare/agent-token-source.ts']
const REQUIRED_SNIPPETS = [
  { file: 'electron/main/vizshare/broker.ts', snippet: '/v1/agent-assertion', what: 'the agent-assertion push route' },
  { file: 'electron/main/vizshare/agent-token-source.ts', snippet: 'PREFER_AGENT_ASSERTION', what: 'the dual-mode rollback switch' },
]

/** @param {string} root @returns {{ok: boolean, problems: string[]}} */
export function verifyVizshareSurface(root) {
  const problems = []
  for (const relative of REQUIRED_FILES) {
    const path = join(root, relative)
    if (!existsSync(path)) problems.push(`missing ${relative}`)
  }
  for (const { file, snippet, what } of REQUIRED_SNIPPETS) {
    const path = join(root, file)
    if (!existsSync(path)) {
      problems.push(`missing ${file} (${what})`)
      continue
    }
    if (!readFileSync(path, 'utf8').includes(snippet)) {
      problems.push(`${file} no longer contains ${snippet} (${what})`)
    }
  }
  return { ok: problems.length === 0, problems }
}

function main() {
  const rootFlag = process.argv.indexOf('--root')
  const here = dirname(fileURLToPath(import.meta.url))
  const root = resolve(rootFlag === -1 ? join(here, '..', '..') : process.argv[rootFlag + 1])
  const { ok, problems } = verifyVizshareSurface(root)
  if (!ok) {
    console.error(`vizshare surface check FAILED in ${root}:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    console.error('This is the recurring shared-tree replay, not a code change: restore from HEAD')
    console.error('(git restore --source=HEAD -- electron/main/vizshare) and rebuild.')
    process.exit(1)
  }
  console.log('vizshare surface: ok (step-2 store + step-3 token source + broker route present)')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
