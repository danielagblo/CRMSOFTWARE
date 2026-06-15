'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useSiteSettings } from '@/components/SiteSettingsProvider'
import PageHeader from '@/components/PageHeader'
import type { ThemeColors } from '@/lib/siteSettings'

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
]

const timezoneOptions = [
  'Africa/Accra',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
]

const currencyOptions = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES']

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="block font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-10 rounded border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none" />
      </div>
    </label>
  )
}

export default function SiteCustomisationClient() {
  const { settings, updateSettings, saveThemePreset, applyThemePreset, deleteThemePreset } = useSiteSettings()
  const [themeName, setThemeName] = useState(`${settings.companyName} Theme`)
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl || '')

  const activeTheme = useMemo(
    () => settings.savedThemes.find((theme) => theme.id === settings.activeThemeId) || null,
    [settings.activeThemeId, settings.savedThemes],
  )

  const onLogoSelect = async (file: File | null) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setLogoPreview(result)
      updateSettings({ logoUrl: result })
      toast.success('Logo updated for this browser profile.')
    }
    reader.onerror = () => toast.error('Could not read the selected logo.')
    reader.readAsDataURL(file)
  }

  const updateColors = (patch: Partial<ThemeColors>) => {
    updateSettings((current) => ({
      ...current,
      colors: {
        ...current.colors,
        ...patch,
      },
    }))
  }

  const handleSave = () => {
    saveThemePreset(themeName)
    toast.success('Organization settings saved.')
  }

  return (
    <div className="min-h-screen bg-(--light-blue)/45">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
        <div className="space-y-6">
          <PageHeader
            eyebrow="Organization"
            title="Site Customisation"
            description="Update your branding, theme, and local preferences. This is the organization settings foundation for multi-tenancy."
          />

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-slate-700">Company name</span>
                  <input
                    value={settings.companyName}
                    onChange={(event) => updateSettings({ companyName: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500"
                  />
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-slate-700">Currency sign</span>
                  <select
                    value={settings.currencySymbol}
                    onChange={(event) => updateSettings({ currencySymbol: event.target.value.toUpperCase() })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-slate-700">Timezone</span>
                  <select
                    value={settings.timezone}
                    onChange={(event) => updateSettings({ timezone: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500"
                  >
                    {timezoneOptions.map((timezone) => (
                      <option key={timezone} value={timezone}>{timezone}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="block font-medium text-slate-700">Language</span>
                  <select
                    value={settings.language}
                    onChange={(event) => updateSettings({ language: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500"
                  >
                    {languageOptions.map((language) => (
                      <option key={language.value} value={language.value}>{language.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <ColorField label="Background" value={settings.colors.background} onChange={(value) => updateColors({ background: value })} />
                  <ColorField label="Foreground" value={settings.colors.foreground} onChange={(value) => updateColors({ foreground: value })} />
                  <ColorField label="Dark Blue" value={settings.colors.darkBlue} onChange={(value) => updateColors({ darkBlue: value })} />
                  <ColorField label="Light Blue" value={settings.colors.lightBlue} onChange={(value) => updateColors({ lightBlue: value })} />
                  <ColorField label="Lighter Blue" value={settings.colors.lighterBlue} onChange={(value) => updateColors({ lighterBlue: value })} />
                  <ColorField label="Dark Brown" value={settings.colors.darkBrown} onChange={(value) => updateColors({ darkBrown: value })} />
                </div>
              </div>

              <label className="space-y-2 text-sm block">
                <span className="block font-medium text-slate-700">Company logo</span>
                <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Company logo preview" className="h-full w-full object-contain p-2" width={64} height={64} unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">Logo</div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onLogoSelect(event.target.files?.[0] || null)}
                    className="block text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-(--dark-blue) file:px-4 file:py-2 file:text-sm file:font-medium file:text-(--white) hover:file:bg-(--dark-blue)/85"
                  />
                </div>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xl bg-(--dark-blue) px-4 py-2.5 text-sm font-medium text-(--white) shadow-sm transition-colors hover:bg-(--dark-blue)/85"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => saveThemePreset(themeName)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Save Theme
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ themeMode: settings.themeMode === 'dark' ? 'light' : 'dark' })}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Toggle Theme
                </button>
              </div>
            </div>

            <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current theme</div>
                <div className="mt-2 text-xl font-semibold text-slate-900">{activeTheme?.name || `${settings.companyName} Theme`}</div>
                <div className="mt-1 text-sm text-slate-500">{settings.themeMode === 'dark' ? 'Dark mode' : 'Light mode'}</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview</div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl bg-slate-100">
                      {settings.logoUrl ? <Image src={settings.logoUrl} alt="Logo preview" className="h-full w-full object-contain p-2" width={48} height={48} unoptimized /> : null}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-(--dark-blue)">{settings.companyName}</div>
                      <div className="text-sm text-slate-500">{settings.currencySymbol} 1,250.00 preview</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved themes</div>
                <div className="mt-3 space-y-3">
                  {settings.savedThemes.length === 0 ? (
                    <p className="text-sm text-slate-500">No saved themes yet. Save one after adjusting your brand colours.</p>
                  ) : settings.savedThemes.map((theme) => (
                    <div key={theme.id} className={`rounded-2xl border p-4 ${theme.id === settings.activeThemeId ? 'border-(--dark-blue) bg-(--light-blue)/35' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">{theme.name}</div>
                          <div className="text-xs text-slate-500">{theme.mode} • {new Date(theme.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => applyThemePreset(theme.id)} className="text-xs font-semibold text-(--dark-blue) hover:underline">Apply</button>
                          <button type="button" onClick={() => deleteThemePreset(theme.id)} className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <label className="space-y-2 text-sm block">
                <span className="block font-medium text-slate-700">Theme name</span>
                <input
                  value={themeName}
                  onChange={(event) => setThemeName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-indigo-500"
                  placeholder={`${settings.companyName} Theme`}
                />
              </label>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
