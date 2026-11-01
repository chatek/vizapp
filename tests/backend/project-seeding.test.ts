import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ProjectService } from '../../electron/main/projects'
import { JsonStateStore } from '../../electron/main/store'

// The seeding API touches Electron only through `windowProvider`; stub the module so the
// service can be constructed outside a running app.
const electronMocks = vi.hoisted(() => ({ dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() } }))
vi.mock('electron', () => electronMocks)

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function setup(harness: 'omp' | 'prime' = 'omp') {
  const dir = mkdtempSync(join(tmpdir(), 'prime-work-seed-'))
  dirs.push(dir)
  const root = join(dir, 'VizMaster')
  mkdirSync(root)
  const store = new JsonStateStore(join(dir, 'state.json'))
  return { dir, root, store, service: new ProjectService(store, () => null, harness) }
}

describe('ProjectService seeding API', () => {
  test('ensureProject tags the record with THIS service harness and lists it', async () => {
    // A record tagged with a harness the product does not offer is invisible to that product
    // (records are harness-scoped), so seeding would look like a silent no-op.
    const { root, service } = setup('omp')
    const record = await service.ensureProject(root)
    expect(record.harness).toBe('omp')
    const listed = (await service.list()).filter((project) => project.path === record.path)
    expect(listed).toHaveLength(1)
  })

  test('seedStatus reports absent, then existing, and never dismissed for a live grant', async () => {
    const { root, service } = setup('omp')
    expect(await service.seedStatus(root)).toBe('absent')
    await service.ensureProject(root)
    expect(await service.seedStatus(root)).toBe('existing')
  })

  test('seedStatus calls a REMOVED project dismissed, so a seeder cannot resurrect it', async () => {
    const { root, service } = setup('omp')
    const record = await service.ensureProject(root)
    await service.remove(record.id)
    expect(await service.seedStatus(root)).toBe('dismissed')
  })

  test('restrictTo presents ONE project, without deleting the others', async () => {
    const { dir, root, service } = setup('omp')
    const other = join(dir, 'Another')
    mkdirSync(other)
    await service.ensureProject(root)
    await service.ensureProject(other)
    expect((await service.list()).length).toBe(2)

    await service.restrictTo(root)
    const presented = await service.list()
    expect(presented.map((project) => project.name)).toEqual(['VizMaster'])

    // The other grant survives: restoring multi-project mode shows it again, so a product filter
    // never costs the user data or the session history attached to it.
    await service.restrictTo(null)
    expect((await service.list()).length).toBe(2)
  })

  test('touchByFolder refreshes lastOpenedAt without creating a second record', async () => {
    const { root, service } = setup('omp')
    const record = await service.ensureProject(root)
    await service.touchByFolder(root)
    const after = (await service.list()).filter((project) => project.path === record.path)
    expect(after).toHaveLength(1)
    expect(after[0].lastOpenedAt >= record.lastOpenedAt).toBe(true)
  })
})
