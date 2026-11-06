#!/usr/bin/env node
// Tag-move assert — the guard for re-pointing an ALREADY-PUSHED release tag.
//
// Background (packaging §19/§20): v1.1.18's tag was moved once after billing killed
// every run for its first target. That move was safe for exactly two measurable
// reasons: no run was in flight, and no release assets had been published. Moving a
// tag that lacks either property is a provenance defect: a run in flight may publish
// artifacts for the OLD target after the tag points elsewhere, and published assets
// silently stop matching the tag's target.
//
// The assert is therefore: a tag may move only when (a) no workflow run it triggered
// is in a non-terminal status, and (b) no GitHub Release for it carries published
// assets. Creating a brand-new tag is always fine — this guards MOVES only.

import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const TERMINAL_STATUSES = new Set(['completed', 'failure', 'success', 'cancelled', 'skipped'])
const RELEASE_WORKFLOW = 'release.yml'
const GH_TIMEOUT_MS = 30_000

/**
 * Pure verdict over the two facts the assert needs. Testable without the network.
 *
 * @param {{runs: Array<{status: string, headBranch?: string, event?: string}>, release?: {assets: unknown[]}}} state
 *   runs: workflow runs for the tag (status as gh reports: queued/in_progress/waiting/completed…).
 *   release: the GitHub release for the tag, if one exists.
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function tagMoveVerdict(state) {
  const runs = state.runs ?? []
  const inFlight = runs.filter((run) => !TERMINAL_STATUSES.has(String(run.status).toLowerCase()))
  if (inFlight.length > 0) {
    return {
      ok: false,
      reason: `${inFlight.length} workflow run(s) for this tag are still in flight (${inFlight.map((r) => r.status).join(', ')}) — a run may publish artifacts for the old target after the tag moves. Wait for conclusion or cancel them first.`,
    }
  }
  const assets = state.release?.assets ?? []
  if (assets.length > 0) {
    return {
      ok: false,
      reason: `the GitHub Release for this tag already carries ${assets.length} published asset(s) — moving the tag leaves consumed bytes pointing at a target they no longer match. Cut a new version instead.`,
    }
  }
  return { ok: true }
}

function ghJson(args) {
  return JSON.parse(
    execFileSync('gh', args, { encoding: 'utf8', timeout: GH_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 }),
  )
}

/** Collects the verdict inputs from the live repo (network). */
export function collectTagState(tag) {
  const runs = ghJson([
    'run', 'list', '--workflow', RELEASE_WORKFLOW, '--limit', '100', '--json', 'status,conclusion,headBranch,event,headSha',
  ]).filter((run) => run.headBranch === tag || run.event === 'push' && run.headSha === tag)
  let release
  try {
    release = ghJson(['release', 'view', tag, '--json', 'assets,tagName'])
  } catch {
    release = undefined // no release for the tag yet — that is the normal pre-publish state
  }
  return { runs, release }
}

export function assertTagMove(tag, state = collectTagState(tag)) {
  if (!/^v\d+\.\d+\.\d+/.test(tag)) throw new Error(`not a release tag: ${tag}`)
  const verdict = tagMoveVerdict(state)
  if (!verdict.ok) throw new Error(`refusing to move tag ${tag}: ${verdict.reason}`)
  return { tag, ...verdict }
}

function invokedAsScript() {
  if (!process.argv[1]) return true
  return import.meta.url === pathToFileURL(resolve(process.argv[1])).href
}

if (invokedAsScript()) {
  const tag = process.argv[2]
  if (!tag) {
    console.error('usage: node scripts/release/assert-tag-move.mjs <tag> — refuses if the tag cannot safely be re-pointed')
    process.exit(2)
  }
  // A tag that does not exist remotely yet is a CREATE, not a move: always fine.
  let exists = true
  try {
    execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { encoding: 'utf8', timeout: GH_TIMEOUT_MS })
  } catch {
    exists = false
  }
  const remote = execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { encoding: 'utf8', timeout: GH_TIMEOUT_MS }).trim()
  if (remote === '') {
    console.log(`assert-tag-move: ${tag} does not exist on the remote — creating, not moving. OK.`)
    process.exit(0)
  }
  assertTagMove(tag)
  console.log(`assert-tag-move: ${tag} may move (no runs in flight, no published assets).`)
}
