import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS } from '@/lib/data'
import {
  confirmedPanelSettings,
  PANEL_SETTING_KEYS,
  type PanelSettingKey,
} from '@/lib/settings-state'
import type { AppSettings, InspectorTab, PrimeWorkApi } from '@/types/api'
import { themeForLocalTime } from '@/lib/theme-clock'

interface UseAppSettingsOptions {
  bridge: PrimeWorkApi | null
  reportError(error: unknown): void
}

export function useAppSettings({ bridge, reportError }: UseAppSettingsOptions) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [initialized, setInitialized] = useState(!bridge)
  const [sidebarOpen, setSidebarOpenState] = useState(true)
  const [inspectorOpen, setInspectorOpenState] = useState(true)
  const [terminalOpen, setTerminalOpenState] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('summary')
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const confirmedSettingsRef = useRef(settings)
  const settingsMutationRef = useRef(0)
  const settingsQueueRef = useRef<Promise<void>>(Promise.resolve())
  const transientPanelKeysRef = useRef<Set<PanelSettingKey>>(new Set())
  const inspectorTabTouchedRef = useRef(false)

  const setSidebarOpen = useCallback((value: boolean) => {
    transientPanelKeysRef.current.add('sidebarOpen')
    setSidebarOpenState(value)
  }, [])
  const setInspectorOpen = useCallback((value: boolean) => {
    transientPanelKeysRef.current.add('inspectorOpen')
    setInspectorOpenState(value)
  }, [])
  const setTerminalOpen = useCallback((value: boolean) => {
    transientPanelKeysRef.current.add('terminalOpen')
    setTerminalOpenState(value)
  }, [])

  const applySettings = useCallback((next: AppSettings, panelPatch: Partial<AppSettings>) => {
    settingsRef.current = next
    setSettings(next)
    if ('sidebarOpen' in panelPatch) setSidebarOpenState(next.sidebarOpen)
    if ('inspectorOpen' in panelPatch) setInspectorOpenState(next.inspectorOpen)
    if ('terminalOpen' in panelPatch) setTerminalOpenState(next.terminalOpen)
  }, [])

  const takeConfirmedPanelPatch = useCallback((next: AppSettings) => {
    const keys = PANEL_SETTING_KEYS.filter((key) => !transientPanelKeysRef.current.has(key))
    transientPanelKeysRef.current.clear()
    return confirmedPanelSettings(next, keys)
  }, [])

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const mutation = ++settingsMutationRef.current
    const previous = settingsRef.current
    for (const key of PANEL_SETTING_KEYS) if (key in patch) transientPanelKeysRef.current.delete(key)
    applySettings({ ...previous, ...patch }, patch)
    if (!bridge) {
      confirmedSettingsRef.current = settingsRef.current
      transientPanelKeysRef.current.clear()
      return
    }
    const operation = settingsQueueRef.current.catch(() => undefined).then(async () => {
      const saved = await bridge.settings.update(patch)
      confirmedSettingsRef.current = saved
      if (settingsMutationRef.current === mutation) applySettings(saved, takeConfirmedPanelPatch(saved))
    })
    settingsQueueRef.current = operation.catch(() => undefined)
    try {
      await operation
    } catch (error) {
      if (settingsMutationRef.current === mutation) applySettings(confirmedSettingsRef.current, takeConfirmedPanelPatch(confirmedSettingsRef.current))
      reportError(error)
    }
  }, [applySettings, bridge, reportError, takeConfirmedPanelPatch])

  const reconcileExternalSettings = useCallback(async <T extends { settings: AppSettings }>(
    operation: () => Promise<T | null>,
  ): Promise<T | null> => {
    // Start the external transaction only after locally queued settings have
    // persisted, so its returned snapshot cannot predate them.
    await settingsQueueRef.current
    const revision = settingsMutationRef.current
    const result = await operation()
    if (!result) return null
    confirmedSettingsRef.current = result.settings
    // A new optimistic mutation started while the external operation ran.
    // Keep it visible; its queued result will become the next authority.
    if (settingsMutationRef.current === revision) {
      transientPanelKeysRef.current.clear()
      applySettings(result.settings, result.settings)
    }
    return result
  }, [applySettings])

  useEffect(() => {
    if (!bridge) {
      setInitialized(true)
      return
    }
    setInitialized(false)
    let cancelled = false
    const startupRevision = settingsMutationRef.current
    void bridge.settings.get().then((value) => {
      if (cancelled || settingsMutationRef.current !== startupRevision) return
      confirmedSettingsRef.current = value
      applySettings(value, value)
      if (!inspectorTabTouchedRef.current) setInspectorTab(value.defaultInspectorTab)
    }).catch((error) => { if (!cancelled) reportError(error) }).finally(() => {
      if (!cancelled) setInitialized(true)
    })
    return () => { cancelled = true }
  }, [applySettings, bridge, reportError])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = (theme: 'light' | 'dark') => {
      document.documentElement.dataset.theme = theme
      void bridge?.app?.setTitleBarTheme?.(theme)?.catch(() => undefined)
    }
    // vizmaster (2026-11-07, operator): 'system' auto-tunes by the user's LOCAL TIME — light
    // 06:00–17:59, dark 18:00–05:59 — and re-evaluates every minute, so the app follows the
    // day without a manual toggle. The OS preference remains a hint for the boundary-less case
    // (a clock that cannot be read falls back to prefers-color-scheme). An explicit light/dark
    // choice is unchanged and always wins over the clock.
    applyTheme(settings.theme === 'system' ? themeForLocalTime(media) : settings.theme)
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
    const sync = () => {
      if (settings.theme === 'system') applyTheme(themeForLocalTime(media))
    }
    media.addEventListener('change', sync)
    // Minute-resolution re-tune: two checks a day are what actually change the answer,
    // but a minute tick keeps the switch within ~60s of the boundary with trivial cost.
    const clock = window.setInterval(sync, 60_000)
    return () => {
      media.removeEventListener('change', sync)
      window.clearInterval(clock)
    }
  }, [bridge, settings.reduceMotion, settings.theme])

  const selectInspectorTab = useCallback((tab: InspectorTab) => {
    inspectorTabTouchedRef.current = true
    setInspectorTab(tab)
  }, [])

  return {
    settings,
    initialized,
    sidebarOpen,
    setSidebarOpen,
    inspectorOpen,
    setInspectorOpen,
    terminalOpen,
    setTerminalOpen,
    inspectorTab,
    selectInspectorTab,
    updateSettings,
    reconcileExternalSettings,
  }
}
