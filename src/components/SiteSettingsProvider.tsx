'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  applySiteSettingsToDocument,
  loadSiteSettings,
  normalizeSiteSettings,
  saveSiteSettings,
  type SavedTheme,
  type SiteSettings,
  type ThemeColors,
} from '@/lib/siteSettings'

type SiteSettingsContextValue = {
  settings: SiteSettings
  ready: boolean
  updateSettings: (patch: Partial<SiteSettings> | ((current: SiteSettings) => SiteSettings)) => void
  toggleTheme: () => void
  saveThemePreset: (name?: string) => void
  applyThemePreset: (themeId: string) => void
  deleteThemePreset: (themeId: string) => void
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined)

function createThemeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `theme-${Date.now()}`
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(() => loadSiteSettings())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loaded = loadSiteSettings()
    window.requestAnimationFrame(() => {
      setSettings(loaded)
      applySiteSettingsToDocument(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    saveSiteSettings(settings)
    applySiteSettingsToDocument(settings)
  }, [ready, settings])

  const updateSettings = (patch: Partial<SiteSettings> | ((current: SiteSettings) => SiteSettings)) => {
    setSettings((current) => {
      const next = typeof patch === 'function' ? patch(current) : normalizeSiteSettings({ ...current, ...patch })
      return next
    })
  }

  const toggleTheme = () => {
    setSettings((current) => ({
      ...current,
      themeMode: current.themeMode === 'dark' ? 'light' : 'dark',
    }))
  }

  const saveThemePreset = (name?: string) => {
    setSettings((current) => {
      const themeName = (name || `${current.companyName} Theme`).trim() || `${current.companyName} Theme`
      const theme: SavedTheme = {
        id: createThemeId(),
        name: themeName,
        mode: current.themeMode,
        colors: current.colors,
        createdAt: new Date().toISOString(),
      }

      return {
        ...current,
        activeThemeId: theme.id,
        savedThemes: [theme, ...current.savedThemes.filter((item) => item.name !== theme.name)],
      }
    })
  }

  const applyThemePreset = (themeId: string) => {
    setSettings((current) => {
      const selected = current.savedThemes.find((theme) => theme.id === themeId)
      if (!selected) return current

      return {
        ...current,
        activeThemeId: selected.id,
        themeMode: selected.mode,
        colors: selected.colors,
      }
    })
  }

  const deleteThemePreset = (themeId: string) => {
    setSettings((current) => {
      const savedThemes = current.savedThemes.filter((theme) => theme.id !== themeId)
      return {
        ...current,
        savedThemes,
        activeThemeId: current.activeThemeId === themeId ? null : current.activeThemeId,
      }
    })
  }

  const value = useMemo<SiteSettingsContextValue>(() => ({
    settings,
    ready,
    updateSettings,
    toggleTheme,
    saveThemePreset,
    applyThemePreset,
    deleteThemePreset,
  }), [ready, settings])

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext)
  if (!context) {
    throw new Error('useSiteSettings must be used within SiteSettingsProvider')
  }

  return context
}

export type { ThemeColors }
