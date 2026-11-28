// @vitest-environment jsdom
/// <reference types="vite/client" />

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PresenceChip } from '../../src/components/inspector/PresenceChip'
import { publishFabricPresence, subscribeFabricPresence } from '../../src/lib/events'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-28T12:00:00Z'))
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
})

function render(): void {
  act(() => root.render(<PresenceChip />))
}

function text(): string | null {
  return container.textContent
}

describe('PresenceChip', () => {
  it('renders nothing before any fabric:presence event', () => {
    render()
    expect(container.firstElementChild).toBeNull()
    expect(text()).toBe('')
  })

  it('renders an online entry as a filled dot with the handle', () => {
    render()
    act(() => publishFabricPresence([{ nodeId: 'nkey1234567890', handle: '@river-fox', online: true, lastSeenMs: Date.now() }]))
    expect(text()).toBe('● @river-fox')
    const chip = container.querySelector('.presence-chip.presence-online')
    expect(chip?.textContent).toBe('● @river-fox')
  })

  it('falls back to the short node id when the handle is absent', () => {
    render()
    act(() => publishFabricPresence([{ nodeId: 'nkey1234567890', handle: null, online: true, lastSeenMs: Date.now() }]))
    expect(text()).toBe('● nkey1234')
  })

  it('renders a stale entry as last seen, never offline', () => {
    render()
    const twoHoursAgo = Date.parse('2026-11-28T10:00:00Z')
    act(() => publishFabricPresence([{ nodeId: 'nkey', handle: '@river-fox', online: false, lastSeenMs: twoHoursAgo }]))
    expect(text()).toBe('○ last seen 2h ago')
    expect(text()).not.toContain('offline')
    expect(container.querySelector('.presence-online')).toBeNull()
  })

  it('says recently when the heartbeat age is unknown', () => {
    render()
    act(() => publishFabricPresence([{ nodeId: 'nkey', handle: '@river-fox', online: false, lastSeenMs: null }]))
    expect(container.firstElementChild).toBeNull()
    act(() => publishFabricPresence([{ nodeId: 'nkey', handle: '@river-fox', online: false, lastSeenMs: Number.NaN }]))
    expect(text()).toBe('○ last seen recently')
  })

  it('replaces state with the latest snapshot', () => {
    render()
    act(() => publishFabricPresence([{ nodeId: 'a', handle: '@old', online: true, lastSeenMs: Date.now() }]))
    act(() => publishFabricPresence([{ nodeId: 'b', handle: '@new', online: true, lastSeenMs: Date.now() }]))
    expect(text()).toBe('● @new')
  })

  it('stops delivering after unsubscribe', () => {
    const listener = vi.fn()
    const stop = subscribeFabricPresence(listener)
    act(() => publishFabricPresence([{ nodeId: 'a', handle: null, online: true, lastSeenMs: 0 }]))
    expect(listener).toHaveBeenCalledTimes(1)
    stop()
    act(() => publishFabricPresence([]))
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
