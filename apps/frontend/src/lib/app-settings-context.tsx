'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export interface AppSettings {
  appName: string
  tagline: string
  logoUrl: string | null
}

const defaults: AppSettings = {
  appName: 'BimbelApp',
  tagline: 'Manajemen Bimbel',
  logoUrl: null,
}

const AppSettingsContext = createContext<{
  settings: AppSettings
  reload: () => void
}>({ settings: defaults, reload: () => {} })

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaults)

  const load = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const res = await fetch(`${apiUrl}/app-settings/public`)
      if (!res.ok) return
      const json = await res.json()
      if (json?.data) {
        setSettings({
          appName: json.data.appName ?? defaults.appName,
          tagline: json.data.tagline ?? defaults.tagline,
          logoUrl: json.data.logoUrl ?? null,
        })
      }
    } catch {
      // silently keep defaults
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <AppSettingsContext.Provider value={{ settings, reload: load }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  return useContext(AppSettingsContext)
}
