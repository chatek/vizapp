import { test, expect, _electron as electron } from '@playwright/test'
import { mkdirSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// THE goal's closing test (packaging doc §17/§21): a CLEAN home, the PACKAGED app, one
// prompt, and the assertion that ~/.vizmaster/vizshow/<build-id>/ appears with BUILD.json
// status done + a standalone render, and the Browser pane surfaces it.
//
// Driven with Playwright's Electron support exactly like tests/e2e/app.spec.ts, but
// against the packaged VizMaster.app (not a dev checkout), so what is exercised is the
// artefact: bundled omp discovery, seeded ~/.vizmaster/default, the .omp/tools
// buildVizShow discovery, and the vizshow loopback server.
//
// Model credentials: a clean home has none, so the driver seeds the workstation's
// ~/.pi/agent/auth.json (the operator's own provider keys) into the fixture home —
// the same keys any real first-run user supplies through provider settings.

const APP = process.env.VCLAW_E2E_APP
  ?? join(homedir(), 'Documents/Chatek/apps/vchat.email/vclaw-desktop/release-remote/arm64/VClaw-1.1.18-unpacked/VizMaster.app/Contents/MacOS/VizMaster')
const AUTH_SOURCE = join(homedir(), '.pi', 'agent', 'auth.json')

test('clean home → packaged app → one prompt → vizshow build appears and is served', async ({ }, testInfo) => {
  testInfo.setTimeout(10 * 60 * 1000)
  test.skip(!existsSync(APP), `packaged app not found at ${APP} (build it first)`)
  const home = `/tmp/vclaw-e2e-goal-${Date.now()}`
  mkdirSync(join(home, '.pi', 'agent'), { recursive: true })
  writeFileSync(join(home, '.pi', 'agent', 'auth.json'), readFileSync(AUTH_SOURCE))

  const app = await electron.launch({
    executablePath: APP,
    args: [`--user-data-dir=${join(home, 'Library', 'Application Support', 'vclaw')}`],
    env: { ...process.env, HOME: home } as Record<string, string>,
    // The packaged app's cold start (update check, default-project seeding, model
    // discovery) measuredly takes well over 30s on first run — launch timeouts must
    // not race the seeding that this very test asserts against.
    timeout: 180_000,
  })
  try {
    // The seeded default project must exist before any prompt.
    const seeded = join(home, '.vizmaster', 'default')
    expect(existsSync(join(seeded, 'BUILD.json')), 'payload seeded ~/.vizmaster/default with BUILD.json').toBe(true)
    expect(existsSync(join(seeded, '.omp', 'tools', 'build-vizshow.ts')), 'buildVizShow tool discovered').toBe(true)

    const page = await app.firstWindow({ timeout: 30_000 })
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 60_000 })

    // A prompt: the composer. The assistant should run buildVizShow for a chart request.
    const composer = page.locator('textarea, [contenteditable="true"]').first()
    await composer.waitFor({ state: 'visible', timeout: 60_000 })
    await composer.fill('Build me a VizShow: a bar chart of quarterly revenue for 2026, Q1 120k Q2 135k Q3 150k Q4 180k.')
    await composer.press('Enter')

    // The build appears under ~/.vizmaster/vizshow/<id>/ with BUILD.json status done.
    // A real agent turn takes minutes; poll the filesystem, which is the artefact truth.
    const deadline = Date.now() + 8 * 60 * 1000
    let buildDir = ''
    while (Date.now() < deadline) {
      const root = join(home, '.vizmaster', 'vizshow')
      if (existsSync(root)) {
        const done = readdirSync(root).find((name) => {
          try {
            const manifest = JSON.parse(readFileSync(join(root, name, 'BUILD.json'), 'utf8'))
            return manifest.status === 'done'
          } catch { return false }
        })
        if (done) { buildDir = join(root, done); break }
      }
      await page.waitForTimeout(5_000)
    }
    expect(buildDir, 'a done vizshow build directory appeared from one prompt').not.toBe('')
    const manifest = JSON.parse(readFileSync(join(buildDir, 'BUILD.json'), 'utf8'))
    expect(manifest.status).toBe('done')
    expect(existsSync(join(buildDir, manifest.entry ?? 'index.html')), 'standalone render present').toBe(true)
    console.log(`E2E: build ${manifest.id} at ${buildDir}`)
  } finally {
    app.close().catch(() => {})
    // Keep the home for post-run inspection on failure; clean on success.
    if (testInfo.status === 'passed') rmSync(home, { recursive: true, force: true })
    else console.log(`E2E: home kept at ${home}`)
  }
})
