import { useEffect, useRef, useState } from 'react'
import type { WorkspaceView } from '@/types/api'

export const INSPECTOR_MIN = 340
export const INSPECTOR_DEFAULT = 520
export const CHAT_MIN = 360
export const TERMINAL_MIN = 170
export const TERMINAL_DEFAULT = 310
export const WORKSPACE_ROW_MIN = 220
// vizmaster (2026-11-06, operator): the agent chat column defaults to 1/3 of the
// workspace row and the right (inspector/Browser) panel to 2/3; the split follows
// window resizes until the user drags it.
// v3 (2026-11-06): the ratio changed 50/50 -> chat 1/3 + inspector 2/3; a new key
// drops any width pinned under the old ratio so everyone starts at the new default.
const INSPECTOR_WIDTH_KEY = 'prime-work.inspector-width-v3'
export const SMALLEST_LAYOUT_BREAKPOINT = 720

const readPanelSize = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback
  const value = Number(window.localStorage.getItem(key))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

interface UsePanelLayoutOptions {
  sidebarOpen: boolean
  inspectorOpen: boolean
  setInspectorOpen(value: boolean): void
  closeSmallestPanels(patch: { sidebarOpen?: false; inspectorOpen?: false }): void
  terminalOpen: boolean
  view: WorkspaceView
}

export function usePanelLayout({
  sidebarOpen,
  inspectorOpen,
  setInspectorOpen,
  closeSmallestPanels,
  terminalOpen,
  view,
}: UsePanelLayoutOptions) {
  const [compactLayout, setCompactLayout] = useState(() => window.matchMedia('(max-width: 980px)').matches)
  const [smallestLayout, setSmallestLayout] = useState(() => window.matchMedia(`(max-width: ${SMALLEST_LAYOUT_BREAKPOINT}px)`).matches)
  const [smallestSidebarAllowed, setSmallestSidebarAllowed] = useState(false)
  const [smallestInspectorAllowed, setSmallestInspectorAllowed] = useState(false)
  const [inspectorWidth, setInspectorWidth] = useState(() => readPanelSize(INSPECTOR_WIDTH_KEY, INSPECTOR_DEFAULT))
  const [inspectorAuto, setInspectorAuto] = useState(() => typeof window === 'undefined' || !window.localStorage.getItem(INSPECTOR_WIDTH_KEY))
  const [workspaceRowWidth, setWorkspaceRowWidth] = useState(0)
  const [inspectorMax, setInspectorMax] = useState(660)
  const [terminalMax, setTerminalMax] = useState(520)
  const [terminalHeight, setTerminalHeight] = useState(() => readPanelSize('prime-work.terminal-height', TERMINAL_DEFAULT))
  const workspaceRowRef = useRef<HTMLDivElement>(null)
  const sessionWorkspaceRef = useRef<HTMLDivElement>(null)
  const compactRestoreRef = useRef<'inspector' | null>(null)
  const sidebarSuppressed = smallestLayout && sidebarOpen && !smallestSidebarAllowed
  const inspectorSuppressed = smallestLayout && inspectorOpen && !smallestInspectorAllowed
  const visibleSidebarOpen = sidebarOpen && !sidebarSuppressed
  const visibleInspectorOpen = inspectorOpen && !inspectorSuppressed

  useEffect(() => {
    const sync = () => {
      const smallestLayout = window.innerWidth <= SMALLEST_LAYOUT_BREAKPOINT
      setCompactLayout(window.innerWidth <= 980)
      setSmallestLayout(smallestLayout)
      if (smallestLayout) {
        setSmallestSidebarAllowed(false)
        setSmallestInspectorAllowed(false)
      }
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  useEffect(() => {
    if (!smallestLayout) return
    const patch: { sidebarOpen?: false; inspectorOpen?: false } = {}
    if (sidebarSuppressed) patch.sidebarOpen = false
    if (inspectorSuppressed) patch.inspectorOpen = false
    if (patch.sidebarOpen === false || patch.inspectorOpen === false) closeSmallestPanels(patch)
  }, [closeSmallestPanels, inspectorSuppressed, sidebarSuppressed, smallestLayout])

  useEffect(() => {
    if (compactLayout && visibleSidebarOpen && visibleInspectorOpen) {
      compactRestoreRef.current = 'inspector'
      setInspectorOpen(false)
    } else if (!compactLayout && compactRestoreRef.current === 'inspector' && visibleSidebarOpen && !visibleInspectorOpen) {
      compactRestoreRef.current = null
      setInspectorOpen(true)
    }
  }, [compactLayout, setInspectorOpen, visibleInspectorOpen, visibleSidebarOpen])

  useEffect(() => {
    if (!compactLayout || !visibleInspectorOpen) return
    const selectors = window.innerWidth <= SMALLEST_LAYOUT_BREAKPOINT
      ? '.conversation-pane, .terminal-drawer, .session-workspace > .resize-handle'
      : '.title-toolbar, .conversation-pane, .terminal-drawer, .session-workspace > .resize-handle'
    const targets = [...document.querySelectorAll<HTMLElement>(selectors)]
    for (const target of targets) target.inert = true
    return () => { for (const target of targets) target.inert = false }
  }, [compactLayout, terminalOpen, visibleInspectorOpen])

  useEffect(() => {
    const row = workspaceRowRef.current
    const workspace = sessionWorkspaceRef.current
    if (!row || !workspace) return
    const syncBounds = () => {
      if (!window.matchMedia('(max-width: 980px)').matches) {
        setInspectorMax(Math.max(INSPECTOR_MIN, row.clientWidth - CHAT_MIN))
        setWorkspaceRowWidth(row.clientWidth)
        if (inspectorAuto) setInspectorWidth(Math.max(INSPECTOR_MIN, Math.round((row.clientWidth * 2) / 3)))
      }
      setTerminalMax(Math.max(TERMINAL_MIN, workspace.clientHeight - WORKSPACE_ROW_MIN))
    }
    syncBounds()
    const observer = new ResizeObserver(syncBounds)
    observer.observe(row)
    observer.observe(workspace)
    return () => observer.disconnect()
  }, [inspectorAuto, inspectorOpen, terminalOpen, view])
  useEffect(() => setTerminalHeight((value) => Math.min(terminalMax, Math.max(TERMINAL_MIN, value))), [terminalMax])
  useEffect(() => { if (!inspectorAuto) window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(inspectorWidth)) }, [inspectorAuto, inspectorWidth])
  useEffect(() => { window.localStorage.setItem('prime-work.terminal-height', String(terminalHeight)) }, [terminalHeight])

  // A manual drag pins the width; before that the split stays an auto 1/3-2/3 that tracks resizes.
  const updateInspectorWidth = (value: number) => {
    setInspectorAuto(false)
    setInspectorWidth(value)
  }
  return {
    compactLayout,
    sidebarSuppressed,
    inspectorSuppressed,
    setSmallestSidebarAllowed,
    setSmallestInspectorAllowed,
    compactRestoreRef,
    inspectorWidth,
    inspectorAuto,
    inspectorAutoWidth: Math.max(INSPECTOR_MIN, Math.round((workspaceRowWidth * 2) / 3)),
    setInspectorWidth: updateInspectorWidth,
    terminalHeight,
    setTerminalHeight,
    inspectorMax,
    terminalMax,
    workspaceRowRef,
    sessionWorkspaceRef,
  }
}
