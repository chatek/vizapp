import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * agent-sdk's `connectViaJWT` calls `process.exit(1)` when the fabric error-closes its
 * connection (it assumes a supervisor that restarts the agent). In vclaw-desktop that would kill
 * the user's running agents with the window, so the guard converts exactly that one call into a
 * logged connection failure — and nothing else. These cases pin the boundary.
 *
 * Each case gets a FRESH module instance: the guard installs at most once per process and
 * captures `process.exit` at install time, so a cached instance would test the previous case's
 * wrapper instead of the current spy.
 */
const exits: Array<number | undefined> = []

/** The three seams this spec drives; the module is re-imported per case, so no static import. */
interface GuardModule {
  installSdkExitGuard(): void
  armSdkExitGuard(): void
  disarmSdkExitGuard(): void
}

async function loadGuard(): Promise<GuardModule> {
  vi.resetModules()
  return import('../../electron/main/suggestions-service')
}

beforeEach(() => {
  exits.length = 0
  // Spied BEFORE the guard installs: the guard binds whatever `process.exit` is at that moment,
  // so the pass-through cases land here instead of on the real exit.
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    exits.push(code)
    return undefined as never
  }) as typeof process.exit)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('agent-sdk exit guard', () => {
  it('keeps the process alive when an armed connection reports exit(1), and logs the conversion', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { installSdkExitGuard, armSdkExitGuard, disarmSdkExitGuard } = await loadGuard()
    installSdkExitGuard()
    armSdkExitGuard()

    expect(() => process.exit(1)).not.toThrow()

    expect(exits).toEqual([])
    expect(error).toHaveBeenCalledWith(expect.stringContaining('fabric connection closed unexpectedly'))
    disarmSdkExitGuard()
  })

  it('installs exactly once, so a second install cannot stack wrappers', async () => {
    const { installSdkExitGuard } = await loadGuard()
    installSdkExitGuard()
    const wrapped = process.exit
    installSdkExitGuard()
    expect(process.exit).toBe(wrapped)
  })

  it('lets exit(0) through while armed', async () => {
    const { installSdkExitGuard, armSdkExitGuard, disarmSdkExitGuard } = await loadGuard()
    installSdkExitGuard()
    armSdkExitGuard()

    process.exit(0)

    expect(exits).toEqual([0])
    disarmSdkExitGuard()
  })

  it('lets every code other than 1 through while armed', async () => {
    const { installSdkExitGuard, armSdkExitGuard, disarmSdkExitGuard } = await loadGuard()
    installSdkExitGuard()
    armSdkExitGuard()

    process.exit(2)

    expect(exits).toEqual([2])
    disarmSdkExitGuard()
  })

  it('lets exit(1) through again once the connection has been drained', async () => {
    const { installSdkExitGuard, armSdkExitGuard, disarmSdkExitGuard } = await loadGuard()
    installSdkExitGuard()
    armSdkExitGuard()
    process.exit(1)
    expect(exits).toEqual([])

    disarmSdkExitGuard()
    process.exit(1)

    expect(exits).toEqual([1])
  })

  it('needs one disarm per arm before exits pass through again', async () => {
    const { installSdkExitGuard, armSdkExitGuard, disarmSdkExitGuard } = await loadGuard()
    installSdkExitGuard()
    armSdkExitGuard()
    armSdkExitGuard()

    disarmSdkExitGuard()
    process.exit(1)
    expect(exits).toEqual([])

    disarmSdkExitGuard()
    process.exit(1)
    expect(exits).toEqual([1])
  })
})
