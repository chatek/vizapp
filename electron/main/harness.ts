import { join, win32 } from 'node:path'

import type { HarnessId } from '../../src/types/api'

/**
 * Static description of one agent harness: how its executable is discovered
 * and where its agent state lives on disk. Discovery itself stays in
 * process-utils (`harnessExecutableCandidates`/`findHarnessExecutable`) so
 * every harness shares the same absolute-path and X_OK rules.
 */
export interface HarnessDescriptor {
  id: HarnessId
  productName: string
  agentName: string
  executableName: (platform: NodeJS.Platform) => string
  /** Environment override for the executable; only absolute paths are honored. */
  binaryEnvVar: string
  /** Directories under process.resourcesPath (as path segments) that may bundle the executable. */
  bundledResourceDirs: readonly (readonly string[])[]
  /** Harness-specific locations beyond the shared package-manager and system directories. */
  candidateDirs: (platform: NodeJS.Platform, home: string, env: NodeJS.ProcessEnv) => string[]
  /** Official npm `.cmd` shim on Windows and the package entrypoint below `<shim dir>\node_modules`. */
  windowsNpmShim?: { shim: string; entrypoint: readonly string[] }
  /** Home-relative state root for this harness; OMP's is product-profile-scoped. */
  agentDir: (home: string) => string
  sessionRoot: (home: string) => string
}

export const HARNESSES: Record<HarnessId, HarnessDescriptor> = {
  prime: {
    id: 'prime',
    productName: 'Prime Work',
    agentName: 'Prime Agent',
    executableName: (platform) => platform === 'win32' ? 'prime-agent.exe' : 'prime-agent',
    binaryEnvVar: 'PRIME_AGENT_BINARY',
    bundledResourceDirs: [['agent'], ['agent', 'bin']],
    candidateDirs: (platform, home, env) => platform === 'win32' ? [] : [
      join(env.XDG_DATA_HOME ?? join(home, '.local', 'share'), 'prime-agent-node', 'current', 'bin'),
    ],
    windowsNpmShim: { shim: 'prime-agent.cmd', entrypoint: ['prime-agent', 'dist', 'bundle', 'cli.js'] },
    agentDir: (home) => join(home, '.prime', 'agent'),
    sessionRoot: (home) => join(home, '.prime', 'agent', 'sessions'),
  },
  omp: {
    id: 'omp',
    productName: 'OMP Work',
    agentName: 'OMP',
    executableName: (platform) => platform === 'win32' ? 'omp.exe' : 'omp',
    binaryEnvVar: 'OMP_BINARY',
    // vizmaster (mac-only) bundles the OMP binary from the vendored oh-my-pi fork's release
    // set: ../vendors/oh-my-pi/releases/<pin>/omp-darwin-${arch}, wired through
    // build.mac.extraResources as resources/harness/bin/omp. Discovery order #3 (packaged
    // resources) finds it before PATH, so VClaw always launches the OMP version it validated.
    bundledResourceDirs: [['harness', 'bin']],
    candidateDirs: (platform, _home, env) => {
      if (platform === 'win32') return env.LOCALAPPDATA ? [win32.join(env.LOCALAPPDATA, 'omp')] : []
      return env.PI_INSTALL_DIR ? [env.PI_INSTALL_DIR] : []
    },
    agentDir: (home) => join(home, ompStateDirectory(), 'agent'),
    sessionRoot: (home) => join(home, ompStateDirectory(), 'agent', 'sessions'),
  },
  pi: {
    id: 'pi',
    productName: 'Pi Work',
    agentName: 'Pi',
    executableName: (platform) => platform === 'win32' ? 'pi.exe' : 'pi',
    binaryEnvVar: 'PI_BINARY',
    bundledResourceDirs: [],
    candidateDirs: (platform, home, env) => platform === 'win32' ? [] : [
      join(env.XDG_DATA_HOME ?? join(home, '.local', 'share'), 'pi-node', 'current', 'bin'),
    ],
    windowsNpmShim: { shim: 'pi.cmd', entrypoint: ['@earendil-works', 'pi-coding-agent', 'dist', 'cli.js'] },
    agentDir: (home) => join(home, '.pi', 'agent'),
    sessionRoot: (home) => join(home, '.pi', 'agent', 'sessions'),
  },
}

/**
 * Home-relative directory holding OMP state for a product profile. The generic
 * app (id 'vclaw') keeps the harness's own ~/.omp layout byte-for-byte; a
 * member product isolates ALL of its OMP state — app-side paths and the
 * child's own writes — under ~/.<profile-id> instead.
 */
export function ompStateDirName(profileId: string): string {
  return profileId === 'vclaw' ? '.omp' : `.${profileId}`
}

let ompStateDir: string = ompStateDirName('vclaw')

/**
 * Pins the OMP state directory from the active product profile. Called once at
 * startup, after the profile loads and before any harness state (session
 * roots, plugin discovery, child spawn environments) is resolved.
 */
export function setOmpStateDirectory(profileId: string): void {
  ompStateDir = ompStateDirName(profileId)
}

/** The pinned OMP state directory, relative to the user's home. */
export function ompStateDirectory(): string {
  return ompStateDir
}
