#!/usr/bin/env node
/**
 * Publish a member build's handoff bundle to the PUBLIC staging prefix.
 *
 * WHY STAGING AND NOT AN ACTIONS ARTIFACT: the consumer (VizMaster) must pull with zero
 * credentials, and Actions artifacts require GitHub auth. The upload credential stays in this job.
 *
 * Layout (append-only, one prefix per build):
 *   s3://<bucket>/staging/member/<member>/<release>/<vclaw-sha>/<arch>/
 *     <artifact>.dmg, <artifact>.zip, BUILD.json, SHA256SUMS, tuple.json
 *
 * Staging lives OUTSIDE the published tree (`vclaw-desktop/`): a stale stage can never be mistaken
 * for a release, and the consumer's publisher is the only writer to its `releases/` tree.
 *
 * The staged SHA256SUMS is a CLAIM: the consumer re-verifies every digest, runs its own mount
 * assert and codesign check, and publishes only to its immutable host.
 *
 * Dirty is a REFUSAL, not a field. BUILD.json must carry the boolean false for `dirty` and
 * `vclawDirty` before tuple.json is written, so the tuple can only ever say clean.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'

export const STAGING_ROOT = 'staging/member'
export const PUBLIC_BASE = 'https://assets.vclawhub.com'
const MEMBER_ID = /^[a-z0-9][a-z0-9-]*$/
const FULL_SHA = /^[0-9a-f]{40}$/
const ARCHITECTURES = new Set(['arm64', 'x64'])

class Refusal extends Error {}

/**
 * The immutable key for one build: member, release id, the full vclaw sha, and the arch. Two
 * builds of the same release against different vclaw commits get different prefixes, and a re-run
 * of the same build hits the overwrite refusal instead of changing a published digest.
 */
export function stagingPrefix({ member, release, vclawSha, arch }) {
  if (typeof member !== 'string' || !MEMBER_ID.test(member)) throw new Error(`invalid member id: ${member}`)
  if (typeof release !== 'string' || release.trim() === '' || /[/\\\s]/.test(release) || release === '.' || release === '..') {
    throw new Error(`invalid release id: ${release}`)
  }
  if (typeof vclawSha !== 'string' || !FULL_SHA.test(vclawSha)) throw new Error('vclaw sha must be a full 40-character lowercase hex sha')
  if (!ARCHITECTURES.has(arch)) throw new Error(`unsupported arch: ${arch}`)
  return `${STAGING_ROOT}/${member}/${release.trim()}/${vclawSha}/${arch}`
}

/** The vclaw-side tuple. `dirty` is only ever written after assertCleanBuild has refused otherwise. */
export function handoffTuple({ sha, branch }) {
  if (typeof sha !== 'string' || !FULL_SHA.test(sha)) throw new Error('tuple sha must be a full 40-character lowercase hex sha')
  if (typeof branch !== 'string' || branch.trim() === '' || /[\r\n]/.test(branch)) throw new Error('tuple branch is required')
  return { sha, branch: branch.trim(), dirty: false }
}

/** Dirty is a refusal: a missing or non-boolean flag fails, and a string 'false' is not false. */
export function assertCleanBuild(buildInfo) {
  if (!buildInfo || typeof buildInfo !== 'object' || Array.isArray(buildInfo)) throw new Error('BUILD.json is not an object')
  if (buildInfo.dirty !== false) throw new Refusal('refusing a dirty build: BUILD.json dirty must be the boolean false')
  if (buildInfo.vclawDirty !== false) throw new Refusal('refusing a dirty vclaw tree: BUILD.json vclawDirty must be the boolean false')
  if (typeof buildInfo.release !== 'string' || buildInfo.release.trim() === '') throw new Error('BUILD.json has no release id')
  return {
    release: buildInfo.release.trim(),
    vclawCommit: typeof buildInfo.vclawCommit === 'string' ? buildInfo.vclawCommit : '',
  }
}

/** The staged bundle: artifacts, both manifests, the digest claim and the tuple. */
export function stagedFiles(directory) {
  const names = readdirSync(directory)
  const artifacts = names.filter((name) => name.endsWith('.dmg') || name.endsWith('.zip')).sort()
  if (!names.some((name) => name.endsWith('.dmg'))) throw new Error('no .dmg in the handoff directory')
  if (!names.some((name) => name.endsWith('.zip'))) throw new Error('no .zip in the handoff directory')
  return [...artifacts, 'BUILD.json', 'SHA256SUMS', 'handoff.json', 'tuple.json']
}

/**
 * The flat handoff manifest the member publisher validates when present: both shas must be
 * prefixed by the corresponding `BUILD.json` commit, `builtAt` must agree, and `dirty` must be
 * false. Prefer the full 40-character keys the payload now emits; fall back to the short keys so
 * older payloads still produce a valid (prefix-checkable) manifest. Call only after
 * `assertCleanBuild`, which is what makes `dirty: false` earned rather than asserted.
 */
export function handoffManifest({ buildInfo, vclawSha, arch }) {
  if (!buildInfo || typeof buildInfo !== 'object' || Array.isArray(buildInfo)) throw new Error('BUILD.json is not an object')
  const vizmasterSha = buildInfo.vizmasterCommitFull ?? buildInfo.vizmasterCommit
  const builtAt = buildInfo.builtAt
  if (typeof vizmasterSha !== 'string' || vizmasterSha.trim() === '') throw new Error('BUILD.json has no vizmaster commit')
  if (typeof builtAt !== 'string' || builtAt.trim() === '') throw new Error('BUILD.json has no builtAt')
  if (typeof buildInfo.vizmasterCommit === 'string' && !vizmasterSha.trim().startsWith(buildInfo.vizmasterCommit)) {
    throw new Error(`BUILD.json vizmasterCommitFull ${vizmasterSha} does not start with vizmasterCommit ${buildInfo.vizmasterCommit}`)
  }
  return {
    vizmasterSha: vizmasterSha.trim(),
    vclawSha,
    arch,
    dirty: false,
    builtAt: builtAt.trim(),
  }
}

/**
 * Verify the digest claim before publishing it: every SHA256SUMS entry must match the local file,
 * and every artifact plus BUILD.json must be covered. A false claim is refused here rather than
 * handed to the consumer.
 */
export function verifyChecksums(directory, required) {
  const entries = new Map()
  for (const line of readFileSync(resolve(directory, 'SHA256SUMS'), 'utf8').split('\n')) {
    const match = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim())
    if (!match) continue
    const [, digest, rawName] = match
    entries.set(rawName.replace(/^\.\//, ''), digest)
  }
  if (entries.size === 0) throw new Error('SHA256SUMS has no entries')
  for (const [name, expected] of entries) {
    const path = resolve(directory, name)
    if (!existsSync(path)) throw new Error(`SHA256SUMS lists ${name} but the file is missing`)
    const actual = createHash('sha256').update(readFileSync(path)).digest('hex')
    if (actual !== expected) throw new Error(`SHA256SUMS digest mismatch for ${name}`)
  }
  for (const name of required) {
    if (!entries.has(name)) throw new Error(`SHA256SUMS does not cover ${name}`)
  }
  return entries
}

function contentType(name) {
  if (name.endsWith('.dmg')) return 'application/x-apple-diskimage'
  if (name.endsWith('.zip')) return 'application/zip'
  if (name.endsWith('.json')) return 'application/json'
  return 'text/plain'
}

function parseArgs(argv) {
  const values = new Map()
  const flags = new Set()
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`)
    const name = token.slice(2)
    if (name === 'dry-run') {
      flags.add(name)
      continue
    }
    if (!['dir', 'member', 'arch', 'vclaw-sha', 'branch'].includes(name)) throw new Error(`unknown flag: --${name}`)
    const value = argv[index + 1]
    if (value === undefined) throw new Error(`missing value for --${name}`)
    values.set(name, value)
    index += 1
  }
  return { values, flags }
}

function requiredEnv(env, names) {
  const missing = names.filter((name) => !env[name]?.trim())
  if (missing.length) throw new Error(`staging credentials are incomplete; missing ${missing.join(', ')}`)
}

function requireValue(values, name) {
  const value = values.get(name)
  if (!value) throw new Error(`missing --${name}`)
  return value
}

function aws(args, env) {
  const result = spawnSync('aws', args, { encoding: 'utf8', env: { ...process.env, ...env } })
  if (result.error) throw new Error(`cannot run aws: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`aws ${args[0]} failed (${result.status}): ${(result.stderr ?? '').trim()}`)
  return (result.stdout ?? '').trim()
}

export async function runStaging(argv, env = process.env, log = console.log) {
  const { values, flags } = parseArgs(argv)
  const directory = resolve(requireValue(values, 'dir'))
  const buildInfo = JSON.parse(readFileSync(resolve(directory, 'BUILD.json'), 'utf8'))
  const { release, vclawCommit } = assertCleanBuild(buildInfo)
  const vclawSha = requireValue(values, 'vclaw-sha')
  if (vclawCommit && !vclawSha.startsWith(vclawCommit)) {
    throw new Error(`--vclaw-sha ${vclawSha} does not match BUILD.json vclawCommit ${vclawCommit}`)
  }
  if (typeof buildInfo.vclawCommitFull === 'string' && buildInfo.vclawCommitFull !== vclawSha) {
    throw new Error(`--vclaw-sha ${vclawSha} does not match BUILD.json vclawCommitFull ${buildInfo.vclawCommitFull}`)
  }
  const arch = requireValue(values, 'arch')
  const tuple = handoffTuple({ sha: vclawSha, branch: requireValue(values, 'branch') })
  const handoff = handoffManifest({ buildInfo, vclawSha, arch })
  const prefix = stagingPrefix({
    member: requireValue(values, 'member'),
    release,
    vclawSha,
    arch,
  })
  writeFileSync(resolve(directory, 'tuple.json'), `${JSON.stringify(tuple, null, 2)}\n`)
  writeFileSync(resolve(directory, 'handoff.json'), `${JSON.stringify(handoff, null, 2)}\n`)

  const files = stagedFiles(directory)
  verifyChecksums(
    directory,
    files.filter((name) => !['tuple.json', 'handoff.json', 'SHA256SUMS'].includes(name)),
  )
  const publicBase = `${PUBLIC_BASE}/${prefix}`
  if (flags.has('dry-run')) {
    log(`staging prefix: ${prefix}`)
    log(`public base: ${publicBase}`)
    for (const name of files) log(`  ${name}`)
    return
  }

  const stagingEnv = {
    R2_BUCKET: env.R2_BUCKET,
    R2_ENDPOINT: env.R2_ENDPOINT,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
  }
  requiredEnv(stagingEnv, ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'])
  const endpoint = stagingEnv.R2_ENDPOINT.trim()
  const awsEnv = {
    AWS_ACCESS_KEY_ID: stagingEnv.R2_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: stagingEnv.R2_SECRET_ACCESS_KEY,
    AWS_DEFAULT_REGION: env.R2_REGION || 'auto',
  }

  const keyCount = aws(['s3api', 'list-objects-v2', '--bucket', stagingEnv.R2_BUCKET.trim(), '--prefix', `${prefix}/`, '--query', 'KeyCount', '--output', 'text', '--endpoint-url', endpoint], awsEnv)
  if (Number.parseInt(keyCount, 10) > 0) {
    throw new Refusal(`refusing to overwrite immutable staging prefix s3://${stagingEnv.R2_BUCKET}/${prefix}/ (${keyCount} object(s) exist)`)
  }

  for (const name of files) {
    aws(
      [
        's3',
        'cp',
        resolve(directory, name),
        `s3://${stagingEnv.R2_BUCKET}/${prefix}/${name}`,
        '--content-type',
        contentType(name),
        '--cache-control',
        'public, max-age=31536000, immutable',
        '--only-show-errors',
        '--endpoint-url',
        endpoint,
      ],
      awsEnv,
    )
    log(`  up   ${name}`)
  }

  for (const name of files) {
    const response = await fetch(`${publicBase}/${name}`, { method: 'HEAD' })
    if (!response.ok) throw new Error(`staged object is not fetchable: ${publicBase}/${name} (${response.status})`)
  }
  log(`staged ${files.length} file(s) at ${publicBase}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runStaging(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(error instanceof Refusal ? 3 : 1)
  })
}
