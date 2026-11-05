import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'
import { HARNESS_IDS } from '../src/types/api'
import {
  BUILT_IN_PROFILE,
  PRODUCT_HARNESS_IDS,
  defaultProjectPayloadPath,
  describeProductProfile,
  expandDefaultProjectTarget,
  loadProductProfile,
  type ProductProfile,
  type ProductProfileContext,
  ProductProfileError,
  productProfilePath,
  validateProductProfile,
} from '../electron/main/product-profile'

const memberProfile = {
  profileVersion: 1,
  id: 'vizmaster',
  identity: { productName: 'VizMaster', appId: 'app.vizmaster.desktop' },
  harnesses: ['omp'],
  defaultProject: { name: 'VizMaster', from: 'vendor/vizmaster', to: '~/.vizmaster/default', version: '1.0.0+20261029.7263596' },
}

function withTempProfile(contents: string | null, packaged = true): { context: ProductProfileContext; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'vclaw-profile-'))
  const context: ProductProfileContext = {
    isPackaged: packaged,
    resourcesPath: root,
    appPath: root,
  }
  if (contents !== null) {
    const path = productProfilePath(context)
    if (packaged) writeFileSync(path, contents)
    else {
      mkdirSync(join(root, 'product'), { recursive: true })
      writeFileSync(path, contents)
    }
  }
  return { context, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

describe('product profile validation', () => {
  test('the locally mirrored harness vocabulary cannot drift from HARNESS_IDS', () => {
    // product-profile.ts mirrors the list because the release scripts load it under plain Node,
    // where a runtime import of the .ts constant cannot resolve. This is the pin on that mirror.
    expect([...PRODUCT_HARNESS_IDS]).toEqual([...HARNESS_IDS])
  })

  test('accepts the generic profile and a member profile', () => {
    const generic = validateProductProfile({ profileVersion: 1, id: 'vclaw', harnesses: [...HARNESS_IDS] }, 'built-in')
    expect(generic.harnesses).toEqual([...HARNESS_IDS])
    expect(generic.defaultProject).toBeUndefined()

    const member = validateProductProfile(memberProfile, 'packaged')
    expect(member.id).toBe('vizmaster')
    expect(member.harnesses).toEqual(['omp'])
    expect(member.defaultProject?.to).toBe('~/.vizmaster/default')
  })

  test('refuses an unknown or empty harness set rather than silently narrowing', () => {
    expect(() => validateProductProfile({ profileVersion: 1, id: 'x', harnesses: ['codex'] }, 'packaged')).toThrow(ProductProfileError)
    expect(() => validateProductProfile({ profileVersion: 1, id: 'x', harnesses: ['codex'] }, 'packaged')).toThrow(/unknown harness/)
    expect(() => validateProductProfile({ profileVersion: 1, id: 'x', harnesses: [] }, 'packaged')).toThrow(/non-empty/)
    expect(() => validateProductProfile({ profileVersion: 1, id: 'x', harnesses: ['omp', 'omp'] }, 'packaged')).toThrow(/duplicate/)
  })

  test('refuses an unsupported profileVersion and a malformed id', () => {
    expect(() => validateProductProfile({ profileVersion: 2, id: 'x', harnesses: ['omp'] }, 'packaged')).toThrow(/profileVersion/)
    expect(() => validateProductProfile({ profileVersion: 1, id: 'Viz Master', harnesses: ['omp'] }, 'packaged')).toThrow(/must match/)
  })

  test('keeps the seeded payload inside Resources', () => {
    for (const from of ['/etc/passwd', '../outside', 'vendor/../../etc', '.']) {
      expect(() => validateProductProfile({ ...memberProfile, defaultProject: { ...memberProfile.defaultProject, from } }, 'packaged')).toThrow(ProductProfileError)
    }
  })

  test('refuses a seed target the project grant would reject anyway', () => {
    // grantProjectFolder refuses $HOME and volume roots (isBroadProjectRoot), so a bare "~"
    // would fail at first launch rather than at build time. Catch it at validation.
    for (const to of ['~', '~/', '/Users/someone/VizMaster']) {
      expect(() => validateProductProfile({ ...memberProfile, defaultProject: { ...memberProfile.defaultProject, to } }, 'packaged')).toThrow(ProductProfileError)
    }
  })

  test('a single-project product must name the project it presents', () => {
    // 'single' with nothing to seed would present an empty app forever.
    expect(() => validateProductProfile({ profileVersion: 1, id: 'x', harnesses: ['omp'], projects: 'single' }, 'packaged')).toThrow(/single.*requires a defaultProject/)
    expect(() => validateProductProfile({ ...memberProfile, projects: 'one' }, 'packaged')).toThrow(/expected "single" or "multiple"/)
    expect(validateProductProfile({ ...memberProfile, projects: 'single' }, 'packaged').projects).toBe('single')
  })

  test('refuses a default project harness the profile does not offer', () => {
    expect(() =>
      validateProductProfile({ ...memberProfile, defaultProject: { ...memberProfile.defaultProject, harness: 'pi' } }, 'packaged'),
    ).toThrow(/not offered/)
  })

  test('refuses a malformed app identity', () => {
    expect(() => validateProductProfile({ ...memberProfile, identity: { productName: 'X', appId: 'Not App' } }, 'packaged')).toThrow(/reverse-DNS/)
  })
})

describe('product profile resolution', () => {
  test('absent profile means the generic built-in, and says so', () => {
    const { context, cleanup } = withTempProfile(null)
    try {
      const profile = loadProductProfile(context)
      expect(profile).toEqual(BUILT_IN_PROFILE)
      expect(profile.source).toBe('built-in')
      expect(profile.harnesses).toEqual([...HARNESS_IDS])
    } finally {
      cleanup()
    }
  })

  test('a packaged build reads resources/product.json and reports itself packaged', () => {
    const { context, cleanup } = withTempProfile(JSON.stringify(memberProfile))
    try {
      const profile = loadProductProfile(context)
      expect(profile.source).toBe('packaged')
      expect(profile.id).toBe('vizmaster')
      expect(profile.path).toBe(join(context.resourcesPath, 'product.json'))
    } finally {
      cleanup()
    }
  })

  test('a development checkout reads product/profile.json', () => {
    const { context, cleanup } = withTempProfile(JSON.stringify(memberProfile), false)
    try {
      expect(productProfilePath(context)).toBe(join(context.appPath, 'product', 'profile.json'))
      expect(loadProductProfile(context).source).toBe('development')
    } finally {
      cleanup()
    }
  })

  test('malformed JSON fails loudly instead of degrading to the generic product', () => {
    const { context, cleanup } = withTempProfile('{ not json')
    try {
      expect(() => loadProductProfile(context)).toThrow(/Invalid product profile \(json\)/)
    } finally {
      cleanup()
    }
  })
})

describe('default project paths', () => {
  test('payload resolves against Resources when packaged, the repo root in development', () => {
    const profile = validateProductProfile(memberProfile, 'packaged')
    const packaged = { isPackaged: true, resourcesPath: '/res', appPath: '/app' }
    const development = { isPackaged: false, resourcesPath: '/res', appPath: '/app' }
    expect(defaultProjectPayloadPath(profile, packaged)).toBe(join('/res', 'vendor', 'vizmaster'))
    expect(defaultProjectPayloadPath(profile, development)).toBe(join('/app', 'vendor', 'vizmaster'))
    expect(defaultProjectPayloadPath(BUILT_IN_PROFILE, packaged)).toBeNull()
  })

  test('the seed target is home-relative, never the home directory itself', () => {
    const profile = validateProductProfile(memberProfile, 'packaged')
    expect(expandDefaultProjectTarget(profile, '/Users/someone')).toBe(join('/Users/someone', '.vizmaster', 'default'))
    expect(expandDefaultProjectTarget(BUILT_IN_PROFILE, '/Users/someone')).toBeNull()
  })

  test('the renderer-facing summary names the product without leaking paths', () => {
    const summary = describeProductProfile(validateProductProfile(memberProfile, 'packaged'))
    expect(summary).toEqual({
      id: 'vizmaster',
      source: 'packaged',
      harnesses: ['omp'],
      defaultProject: { name: 'VizMaster', version: '1.0.0+20261029.7263596' },
    })
    expect(JSON.stringify(summary)).not.toContain('vendor/vizmaster')
  })
})

describe('defaultProject.to — the home escape is refused at load, not at seeding', () => {
  const base = { profileVersion: 1, id: 'vizmaster', harnesses: ['omp'] }
  const build = (to: string) =>
    validateProductProfile(
      { ...base, defaultProject: { name: 'X', from: 'vendor/x', to, version: '1.0.0' } },
      'packaged',
    )

  test.each(['~/..', '~/../..', '~/a/../..', '~/x/../../etc', '~/a/../b', '~/VizMaster/', '~/./x', '~/..\\..', '~/a\\..\\b'])('refuses %s', (to) => {
    // `~/..` resolves to the home's PARENT, which isBroadProjectRoot does not refuse —
    // so the escape must die here, where the profile is the thing being trusted.
    expect(() => build(to)).toThrow(ProductProfileError)
  })

  test('accepts ~/VizMaster', () => {
    expect(build('~/VizMaster').defaultProject?.to).toBe('~/VizMaster')
  })

  test('accepts a nested home path without .. segments', () => {
    expect(build('~/work/vizmaster').defaultProject?.to).toBe('~/work/vizmaster')
  })
})

describe('the checked-in product profiles', () => {
  test('development and the member build run the SAME vizmaster posture', () => {
    // product/profile.json is what a dev checkout loads (productProfilePath); the member build
    // stages product/vizmaster.json through --profile. If the two drift, dev stops reproducing
    // what ships. Member staging never reads product/profile.json's CONTENT (release.yml passes
    // --profile product/$MEMBER_ID.json), so the file is free to carry the member posture.
    const devProfile = validateProductProfile(JSON.parse(readFileSync('product/profile.json', 'utf8')), 'development')
    const memberProfileJson = validateProductProfile(JSON.parse(readFileSync('product/vizmaster.json', 'utf8')), 'packaged')
    const posture = (profile: ProductProfile) => ({
      id: profile.id, identity: profile.identity, harnesses: profile.harnesses,
      projects: profile.projects, defaultProject: profile.defaultProject,
    })
    expect(posture(devProfile)).toEqual(posture(memberProfileJson))
    expect(devProfile.source).toBe('development')
    expect(memberProfileJson.source).toBe('packaged')
    for (const profile of [devProfile, memberProfileJson]) {
      expect(profile.id).toBe('vizmaster')
      expect(profile.harnesses).toEqual(['omp'])
      expect(profile.projects).toBe('single')
      expect(profile.defaultProject?.to).toBe('~/.vizmaster/default')
    }
  })
})
