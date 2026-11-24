import { describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({
  app: {
    getAppPath: vi.fn(() => '/tmp/prime-work'),
    isPackaged: false,
    on: vi.fn(),
    quit: vi.fn(),
    requestSingleInstanceLock: vi.fn(() => false),
  },
  BrowserWindow: class {},
  dialog: { showMessageBoxSync: vi.fn() },
  Menu: { buildFromTemplate: vi.fn(() => ({ popup: vi.fn() })) },
  nativeImage: { createFromPath: vi.fn() },
  protocol: { registerSchemesAsPrivileged: vi.fn() },
  session: {},
  Tray: class {},
}))

vi.mock('electron', () => electron)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { extensionRuntimeEnvironment, type CapabilityExtensionPaths } from '../../electron/main/index'
import { OMP_RPC_ADAPTER, PI_RPC_ADAPTER, PRIME_RPC_ADAPTER } from '../../electron/main/agent-rpc'
import { extensionInjection } from '../../electron/main/extension-manifest'

const extensionPaths: CapabilityExtensionPaths = {
  schedule: '/app/extensions/omp-work-schedules.ts',
  browser: '/app/extensions/omp-work-browser.ts',
  askUser: '/app/extensions/omp-work-ask-user.ts',
  vclaw: '/app/extensions/vclaw-agent.js',
}

/** What the schedule and browser bridges hand every runtime of the harness. */
const scheduleBridgeEnvironment = {
  PRIME_WORK_SCHEDULE_URL: 'http://127.0.0.1:45001',
  PRIME_WORK_SCHEDULE_TOKEN: 'schedule-token',
  PRIME_WORK_SCHEDULE_SKILL_PATH: '/app/skills/prime-work-schedules',
}
const browserBridgeEnvironment = {
  PRIME_WORK_BROWSER_URL: 'http://127.0.0.1:45002',
  PRIME_WORK_BROWSER_TOKEN: 'browser-token',
  PRIME_WORK_BROWSER_EXTENSION_PATH: '/app/extensions/prime-work-browser.ts',
  PRIME_WORK_BROWSER_SKILL_PATH: '/app/skills/prime-work-browser',
}

describe('capability extension environment parity (OMP and pi)', () => {
  it('populates the three shared extension paths and strips the Prime-only skill paths', () => {
    const environment = extensionRuntimeEnvironment(scheduleBridgeEnvironment, () => browserBridgeEnvironment, extensionPaths)

    expect(environment.PRIME_WORK_SCHEDULE_EXTENSION_PATH).toBe('/app/extensions/omp-work-schedules.ts')
    expect(environment.PRIME_WORK_BROWSER_EXTENSION_PATH).toBe('/app/extensions/omp-work-browser.ts')
    expect(environment.PRIME_WORK_ASK_USER_EXTENSION_PATH).toBe('/app/extensions/omp-work-ask-user.ts')
    expect(environment.VCLAW_AGENT_EXTENSION_PATH).toBe('/app/extensions/vclaw-agent.js')
    expect(environment.VCLAW_MANAGES_ASK_USER).toBe('1')
    // VCLAW_MANAGES_OPEN_URL is deliberately NOT set: with no host-side link
    // router, precedence 1 would print a URL nothing opens. The extension's
    // best-effort opener is the single opener (vendor .md records both names).
    // The Prime-only --skill inputs never reach an extension-based harness.
    expect(environment.PRIME_WORK_SCHEDULE_SKILL_PATH).toBeUndefined()
    expect(environment.PRIME_WORK_BROWSER_SKILL_PATH).toBeUndefined()
    // The loopback-broker contract from both bridges is preserved untouched.
    expect(environment.PRIME_WORK_SCHEDULE_URL).toBe('http://127.0.0.1:45001')
    expect(environment.PRIME_WORK_SCHEDULE_TOKEN).toBe('schedule-token')
    expect(environment.PRIME_WORK_BROWSER_URL).toBe('http://127.0.0.1:45002')
    expect(environment.PRIME_WORK_BROWSER_TOKEN).toBe('browser-token')
  })

  it.each([
    ['omp', OMP_RPC_ADAPTER],
    ['pi', PI_RPC_ADAPTER],
  ] as const)('turns the shared environment into all four --extension injections for %s runtimes', (_harness, adapter) => {
    const environment = extensionRuntimeEnvironment(scheduleBridgeEnvironment, () => browserBridgeEnvironment, extensionPaths)
    const args = adapter.buildStartArgs({ cwd: '/work', environment })

    const injected: string[] = []
    for (let index = 0; index < args.length - 1; index += 1) {
      if (args[index] === '--extension') injected.push(args[index + 1])
    }
    expect(injected).toEqual([
      '/app/extensions/omp-work-schedules.ts',
      '/app/extensions/omp-work-browser.ts',
      '/app/extensions/omp-work-ask-user.ts',
      '/app/extensions/vclaw-agent.js',
    ])
    // Neither extension-based harness receives Prime's --skill injections.
    expect(args).not.toContain('--skill')
  })

  it('injects the Pi-only fast-mode compatibility extension without adding it to OMP', () => {
    const environment = {
      ...extensionRuntimeEnvironment(scheduleBridgeEnvironment, () => browserBridgeEnvironment, extensionPaths),
      VCLAW_PI_FAST_MODE_EXTENSION_PATH: '/app/extensions/pi-work-fast-mode.ts',
    }
    expect(PI_RPC_ADAPTER.buildStartArgs({ cwd: '/work', environment })).toContain('/app/extensions/pi-work-fast-mode.ts')
    expect(OMP_RPC_ADAPTER.buildStartArgs({ cwd: '/work', environment })).not.toContain('/app/extensions/pi-work-fast-mode.ts')
  })

  it('keeps standalone copies suppressed while omitting the bundled tool when disabled', () => {
    const environment = extensionRuntimeEnvironment(scheduleBridgeEnvironment, () => browserBridgeEnvironment, extensionPaths, false)
    expect(environment.VCLAW_MANAGES_ASK_USER).toBe('1')
    expect(environment.PRIME_WORK_ASK_USER_EXTENSION_PATH).toBeUndefined()
    for (const adapter of [OMP_RPC_ADAPTER, PI_RPC_ADAPTER]) {
      expect(adapter.buildStartArgs({ cwd: '/work', environment })).not.toContain(extensionPaths.askUser)
    }
  })

  it.each([
    ['omp', OMP_RPC_ADAPTER],
    ['pi', PI_RPC_ADAPTER],
  ] as const)('does not mint or inject a browser claim for %s when Browser is disabled', (_harness, adapter) => {
    const mintBrowserClaim = vi.fn(() => browserBridgeEnvironment)
    const environment = extensionRuntimeEnvironment(scheduleBridgeEnvironment, mintBrowserClaim, extensionPaths, true, false)
    expect(mintBrowserClaim).not.toHaveBeenCalled()
    expect(environment.PRIME_WORK_BROWSER_EXTENSION_PATH).toBeUndefined()
    expect(environment.PRIME_WORK_BROWSER_URL).toBeUndefined()
    expect(environment.PRIME_WORK_BROWSER_TOKEN).toBeUndefined()
    expect(adapter.buildStartArgs({ cwd: '/work', environment })).not.toContain(extensionPaths.browser)
  })

  it('injects the bundled ask_user extension into Prime interactive runtimes', () => {
    const args = PRIME_RPC_ADAPTER.buildStartArgs({
      cwd: '/work',
      environment: { PRIME_WORK_ASK_USER_EXTENSION_PATH: extensionPaths.askUser },
    })
    expect(args.slice(-2)).toEqual(['--extension', extensionPaths.askUser])
  })

  it.each([
    ['prime', PRIME_RPC_ADAPTER],
    ['omp', OMP_RPC_ADAPTER],
    ['pi', PI_RPC_ADAPTER],
  ] as const)('injects session collaboration into %s without accepting an unsafe path', (_harness, adapter) => {
    const args = adapter.buildStartArgs({ cwd: '/work', environment: { VCLAW_COLLABORATION_EXTENSION_PATH: '/app/extensions/omp-work-collaboration.ts' } })
    expect(args.slice(-2)).toEqual(['--extension', '/app/extensions/omp-work-collaboration.ts'])
    const unsafe = adapter.buildStartArgs({ cwd: '/work', environment: { VCLAW_COLLABORATION_EXTENSION_PATH: '--session-injection' } })
    expect(unsafe).not.toContain('--session-injection')
  })
})

describe('B5 class — the vclaw capability row is proven by its environment, per harness', () => {
  // B5 shipped a live defect: the manifest said Prime had a capability, the environment
  // disagreed, and only an E2E assertion caught it. The class rule is: every capability
  // row must be proven by its environment, per harness. These rows prove the vclaw row
  // the same way the ask_user rows prove theirs.
  const environment = extensionRuntimeEnvironment(scheduleBridgeEnvironment, () => browserBridgeEnvironment, extensionPaths)
  const adapters = [['omp', OMP_RPC_ADAPTER], ['pi', PI_RPC_ADAPTER], ['prime', PRIME_RPC_ADAPTER]] as const

  it.each(adapters)('%s receives the vclaw extension path from a real environment', (harness, adapter) => {
    // The manifest row itself must exist for this harness — B5 was a manifest that
    // claimed a capability the environment did not provide.
    expect(extensionInjection(harness, 'vclaw').environmentVariable).toBe('VCLAW_AGENT_EXTENSION_PATH')
    expect(environment.VCLAW_AGENT_EXTENSION_PATH).toBe('/app/extensions/vclaw-agent.js')
    const args = adapter.buildStartArgs({ cwd: '/work', environment })
    const injected = args.filter((_value, index) => index > 0 && args[index - 1] === '--extension')
    expect(injected).toContain('/app/extensions/vclaw-agent.js')
  })

  it.each(adapters)('%s stops receiving it when the environment loses the variable (mutation-proof)', (_harness, adapter) => {
    const withoutVclaw = { ...environment }
    delete withoutVclaw.VCLAW_AGENT_EXTENSION_PATH
    const injected = adapter.buildStartArgs({ cwd: '/work', environment: withoutVclaw })
    expect(injected).not.toContain('/app/extensions/vclaw-agent.js')
  })

  it('the shipped asset actually registers /vclaw for every built verb', () => {
    // The bundle is what a session loads; a row that injects a hollow or stale file is
    // the same B5 defect one layer deeper. Assert against the file we ship.
    const asset = readFileSync(join(process.cwd(), 'assets/extensions/vclaw-agent.js'), 'utf8')
    expect(asset).toContain('vclaw')
    for (const verb of ['status', 'doctor', 'signup', 'who', 'peers', 'send', 'inbox']) {
      expect(asset).toContain(verb)
    }
    expect(asset).toMatch(/unknown flag|unknown verb/)
  })
})
