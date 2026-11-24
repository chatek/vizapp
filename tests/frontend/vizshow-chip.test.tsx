// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VizshowChip } from '../../src/components/VizshowChip'
import { openVizshow, parseVizshowHref, setVizshowNavigator } from '../../src/lib/vizshow-open'
import { MarkdownText } from '../../src/components/MarkdownText'
import type { PrimeWorkApi, VizshowSnapshot } from '../../src/types/api'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const stubWindow = window as unknown as { prime?: Partial<PrimeWorkApi> }
const snapshot = (overrides: Partial<VizshowSnapshot> = {}): VizshowSnapshot => ({
  latest: { id: '2026-11-07T12-04-31-quadratic-functions-9f2c', status: 'done', entry: 'index.html', prompt: 'solve it' },
  builds: 3,
  port: 47_361,
  baseUrl: 'http://127.0.0.1:47361',
  ...overrides,
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete stubWindow.prime
  setVizshowNavigator(null)
  vi.restoreAllMocks()
})

describe('vizshow links', () => {
  it('accepts only a build id in the vizshow scheme', () => {
    expect(parseVizshowHref('vizshow://2026-11-07T12-04-31-x-9f2c')).toBe('2026-11-07T12-04-31-x-9f2c')
    expect(parseVizshowHref('vizshow://build-1/')).toBe('build-1')
    for (const href of ['vizshow://', 'vizshow://../etc', 'vizshow://a/b', 'https://x/vizshow://a', 'build-1']) {
      expect(parseVizshowHref(href), href).toBeNull()
    }
  })

  it('resolves a build through the bridge and hands the URL to the navigator', async () => {
    const url = vi.fn(async () => ({ ok: true as const, url: 'http://127.0.0.1:1/b/', build: snapshot().latest! }))
    stubWindow.prime = { vizshow: { url } as unknown as PrimeWorkApi['vizshow'] }
    const navigate = vi.fn()
    setVizshowNavigator(navigate)

    await expect(openVizshow('vizshow://b')).resolves.toBe(true)
    expect(url).toHaveBeenCalledWith('b')
    expect(navigate).toHaveBeenCalledWith('http://127.0.0.1:1/b/')
  })

  it('does nothing when main has no such build or no navigator is installed', async () => {
    type UrlResult = { ok: true; url: string; build: NonNullable<VizshowSnapshot['latest']> } | { ok: false; error: string }
    const url = vi.fn(async (): Promise<UrlResult> => ({ ok: false, error: 'unknown_build' }))
    stubWindow.prime = { vizshow: { url } as unknown as PrimeWorkApi['vizshow'] }
    setVizshowNavigator(vi.fn())
    await expect(openVizshow('missing')).resolves.toBe(false)

    const navigate = vi.fn()
    setVizshowNavigator(null)
    url.mockResolvedValue({ ok: true as const, url: 'http://127.0.0.1:1/b/', build: snapshot().latest! })
    await expect(openVizshow('b')).resolves.toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('renders a vizshow link as a real anchor and opens it on click', async () => {
    const url = vi.fn(async () => ({ ok: true as const, url: 'http://127.0.0.1:1/b/', build: snapshot().latest! }))
    stubWindow.prime = { vizshow: { url } as unknown as PrimeWorkApi['vizshow'] }
    const navigate = vi.fn()
    setVizshowNavigator(navigate)

    await act(async () => root.render(<MarkdownText text="See [the show](vizshow://b) for details." />))

    const anchor = container.querySelector('a') as HTMLAnchorElement | null
    expect(anchor, 'a vizshow link must not be swallowed as an unsupported link').not.toBeNull()
    expect(anchor?.getAttribute('href')).toBe('vizshow://b')

    await act(async () => {
      anchor?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    expect(url).toHaveBeenCalledWith('b')
    expect(navigate).toHaveBeenCalledWith('http://127.0.0.1:1/b/')
  })
})

describe('vizshow chip', () => {
  const render = (props: Partial<Parameters<typeof VizshowChip>[0]> = {}) => act(() => root.render(
    <VizshowChip
      snapshot={snapshot()}
      fresh={false}
      pending={false}
      onOpenLatest={vi.fn()}
      onOpenPreview={vi.fn(async () => ({ ok: true as const, url: 'http://localhost:5174/' }))}
      {...props}
    />,
  ))

  it('names the latest build and announces a fresh one', () => {
    render({ fresh: true })
    const chip = container.querySelector('.vizshow-chip--build') as HTMLButtonElement
    expect(chip.textContent).toContain('VizShow · …c-functions-9f2c')
    expect(chip.className).toContain('is-fresh')
    expect(chip.querySelector('.vizshow-chip__fresh')?.textContent).toBe('new')
    expect(chip.getAttribute('title')).toBe('solve it')
  })

  it('offers the live project beside it and navigates on success', async () => {
    const navigate = vi.fn()
    setVizshowNavigator(navigate)
    render()

    const preview = container.querySelector('.vizshow-chip--preview') as HTMLButtonElement
    expect(preview.getAttribute('aria-label')).toBe('Open the public Viz preview')

    await act(async () => {
      preview.click()
      await Promise.resolve()
    })
    expect(navigate).toHaveBeenCalledWith('http://localhost:5174/')
  })

  it('shows a localized failure when the preview cannot start', async () => {
    render({ onOpenPreview: vi.fn(async () => ({ ok: false as const, error: 'no_project' })) })
    const preview = container.querySelector('.vizshow-chip--preview') as HTMLButtonElement

    await act(async () => {
      preview.click()
      await Promise.resolve()
    })
    expect(container.querySelector('.vizshow-chip__error')?.textContent).toBe('The project preview did not start')
  })

  it('renders only the preview chip when no build exists yet', () => {
    render({ snapshot: snapshot({ latest: null, builds: 0 }) })
    expect(container.querySelector('.vizshow-chip--build')).toBeNull()
    expect(container.querySelectorAll('.vizshow-chip')).toHaveLength(1)
  })
})
