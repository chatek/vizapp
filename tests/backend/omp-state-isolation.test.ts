import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HARNESSES, ompStateDirName, ompStateDirectory, setOmpStateDirectory } from '../../electron/main/harness'
import { safeChildEnvironment } from '../../electron/main/process-utils'
import { ompSessionRoot } from '../../electron/main/sessions/omp'
import { PluginService } from '../../electron/main/plugins'
import { discoverPlugins } from '../../electron/main/plugins/catalog'

const ENV_KEYS_UNDER_TEST = [
  'OMP_PROFILE', 'PI_PROFILE', 'PI_CODING_AGENT_DIR',
  'XDG_DATA_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME', 'PI_CONFIG_DIR',
] as const

const savedEnv: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const key of ENV_KEYS_UNDER_TEST) {
    savedEnv[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  setOmpStateDirectory('vclaw')
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

const dirs: string[] = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })
const temp = () => { const dir = mkdtempSync(join(tmpdir(), 'omp-state-')); dirs.push(dir); return dir }

describe('OMP state directory mapping', () => {
  it('keeps the generic profile on the harness-owned .omp root', () => {
    expect(ompStateDirName('vclaw')).toBe('.omp')
    expect(ompStateDirectory()).toBe('.omp')
  })

  it('isolates a member product under .<profile-id>', () => {
    expect(ompStateDirName('vizmaster')).toBe('.vizmaster')
    setOmpStateDirectory('vizmaster')
    expect(ompStateDirectory()).toBe('.vizmaster')
  })

  it('restores the generic root when re-pinned', () => {
    setOmpStateDirectory('vizmaster')
    setOmpStateDirectory('vclaw')
    expect(ompStateDirectory()).toBe('.omp')
  })
})

describe('harness descriptor state paths', () => {
  it('resolves the generic profile under ~/.omp', () => {
    const home = '/home/operator'
    expect(HARNESSES.omp.agentDir(home)).toBe(join(home, '.omp', 'agent'))
    expect(HARNESSES.omp.sessionRoot(home)).toBe(join(home, '.omp', 'agent', 'sessions'))
  })

  it('resolves the vizmaster profile under ~/.vizmaster', () => {
    setOmpStateDirectory('vizmaster')
    const home = '/home/operator'
    expect(HARNESSES.omp.agentDir(home)).toBe(join(home, '.vizmaster', 'agent'))
    expect(HARNESSES.omp.sessionRoot(home)).toBe(join(home, '.vizmaster', 'agent', 'sessions'))
  })
})

describe('OMP session root', () => {
  it('reads the generic profile from ~/.omp', () => {
    expect(ompSessionRoot()).toBe(join(homedir(), '.omp', 'agent', 'sessions'))
  })

  it('reads the vizmaster profile from ~/.vizmaster', () => {
    setOmpStateDirectory('vizmaster')
    expect(ompSessionRoot()).toBe(join(homedir(), '.vizmaster', 'agent', 'sessions'))
  })
})

describe('PluginService default agent directory', () => {
  const agentDirSeen = async (): Promise<string> => {
    const seen: string[] = []
    const service = new PluginService(null, async (path) => path, {
      harness: 'omp',
      discover: async (agentDir) => {
        seen.push(agentDir)
        return { skills: [], warnings: [] }
      },
    })
    await service.list()
    expect(seen.length).toBeGreaterThan(0)
    return seen[0]
  }

  it('defaults the omp harness to ~/.omp/agent', async () => {
    await expect(agentDirSeen()).resolves.toBe(join(homedir(), '.omp', 'agent'))
  })

  it('defaults the omp harness to ~/.vizmaster/agent for the vizmaster profile', async () => {
    setOmpStateDirectory('vizmaster')
    await expect(agentDirSeen()).resolves.toBe(join(homedir(), '.vizmaster', 'agent'))
  })
})

describe('OMP plugin catalog paths', () => {
  it('discovers user skills, plugin packages, and the plugin lock under the profile state root', async () => {
    const root = temp()
    const stateDir = join(root, '.vizmaster')
    const agentDir = join(stateDir, 'agent')
    mkdirSync(join(stateDir, 'skills', 'greet'), { recursive: true })
    writeFileSync(join(stateDir, 'skills', 'greet', 'SKILL.md'), '---\nname: greet\ndescription: Greets\n---\n\nHello\n')
    mkdirSync(join(stateDir, 'plugins', 'node_modules', 'viz-pkg'), { recursive: true })
    writeFileSync(join(stateDir, 'plugins', 'node_modules', 'viz-pkg', 'package.json'), JSON.stringify({ name: 'viz-pkg', version: '1.0.0' }))
    // The lock file OMP itself writes and VClaw coordinates installs through.
    writeFileSync(join(stateDir, 'plugins', 'omp-plugins.lock.json'), JSON.stringify({ plugins: { 'viz-pkg': {} } }))

    const catalog = await discoverPlugins(agentDir, undefined, null, 'omp')

    const skill = catalog.skills.find((item) => item.kind === 'skill' && item.name === 'greet')
    expect(skill?.path).toBe(realpathSync(join(stateDir, 'skills', 'greet', 'SKILL.md')))
    const pluginPackage = catalog.skills.find((item) => item.kind === 'package' && item.name === 'viz-pkg')
    // Surfacing the package proves the lock file was read from the profile root:
    // without a runtime lock entry a manifest without omp/pi records is skipped.
    expect(pluginPackage?.source).toBe('viz-pkg')
    expect(pluginPackage?.enabled).toBe(true)
    // And nothing leaks toward the host state root.
    expect(catalog.skills.some((item) => item.path?.includes('/.omp/'))).toBe(false)
  })
})

describe('safeChildEnvironment OMP isolation', () => {
  it('passes host redirect variables through unchanged for the generic profile', () => {
    process.env.OMP_PROFILE = 'work'
    process.env.PI_CODING_AGENT_DIR = '/custom/agent'
    process.env.XDG_DATA_HOME = '/custom/xdg'
    const env = safeChildEnvironment()
    expect(env.OMP_PROFILE).toBe('work')
    expect(env.PI_CODING_AGENT_DIR).toBe('/custom/agent')
    expect(env.XDG_DATA_HOME).toBe('/custom/xdg')
    expect(env.PI_CONFIG_DIR).toBeUndefined()
  })

  it('pins PI_CONFIG_DIR to the profile root and clears every state redirect for vizmaster', () => {
    setOmpStateDirectory('vizmaster')
    process.env.OMP_PROFILE = 'work'
    process.env.PI_PROFILE = 'work'
    process.env.PI_CODING_AGENT_DIR = '/custom/agent'
    process.env.XDG_DATA_HOME = '/custom/xdg'
    process.env.XDG_STATE_HOME = '/custom/state'
    process.env.XDG_CACHE_HOME = '/custom/cache'
    process.env.OMP_WORKTREE_DIR = '/custom/wt'
    process.env.PI_NATIVES_DIR = '/custom/natives'

    const env = safeChildEnvironment()

    expect(env.PI_CONFIG_DIR).toBe('.vizmaster')
    for (const key of ['OMP_PROFILE', 'PI_PROFILE', 'PI_CODING_AGENT_DIR', 'XDG_DATA_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME', 'OMP_WORKTREE_DIR', 'PI_NATIVES_DIR']) {
      expect(env[key]).toBeUndefined()
    }
    // Isolation is policy: extras cannot reintroduce a redirect either.
    const withExtras = safeChildEnvironment({ OMP_PROFILE: 'work', PI_CONFIG_DIR: '.evil' })
    expect(withExtras.PI_CONFIG_DIR).toBe('.vizmaster')
    expect(withExtras.OMP_PROFILE).toBeUndefined()
  })

  it('keeps unrelated env passthrough intact for the isolated child', () => {
    setOmpStateDirectory('vizmaster')
    const env = safeChildEnvironment({ CUSTOM_BRIDGE: 'on' })
    expect(env.CUSTOM_BRIDGE).toBe('on')
    expect(env.HOME).toBe(process.env.HOME)
    expect(env.NO_COLOR).toBe('1')
  })
})
