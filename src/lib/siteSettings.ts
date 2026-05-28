export type ThemeMode = 'light' | 'dark'

export type ThemeColors = {
  background: string
  foreground: string
  darkBlue: string
  lightBlue: string
  lighterBlue: string
  lightBrown: string
  darkBrown: string
}

export type SavedTheme = {
  id: string
  name: string
  mode: ThemeMode
  colors: ThemeColors
  createdAt: string
}

export type SiteSettings = {
  companyName: string
  logoUrl: string | null
  timezone: string
  currencySymbol: string
  language: string
  themeMode: ThemeMode
  colors: ThemeColors
  activeThemeId: string | null
  savedThemes: SavedTheme[]
}

export const SITE_SETTINGS_STORAGE_KEY = 'crm-site-settings'

export const DEFAULT_THEME_COLORS: ThemeColors = {
  background: '#ffffff',
  foreground: '#171717',
  darkBlue: '#032a42',
  lightBlue: '#d1e2f3',
  lighterBlue: '#f0f0dc',
  lightBrown: '#f0d8b6',
  darkBrown: '#b3926f',
}

export const DARK_THEME_COLORS: ThemeColors = {
  background: '#0f172a',
  foreground: '#e2e8f0',
  darkBlue: '#e2e8f0',
  lightBlue: '#1e293b',
  lighterBlue: '#111827',
  lightBrown: '#475569',
  darkBrown: '#f59e0b',
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  companyName: 'CRM Pro',
  logoUrl: null,
  timezone: 'Africa/Accra',
  currencySymbol: 'GHS',
  language: 'en',
  themeMode: 'light',
  colors: DEFAULT_THEME_COLORS,
  activeThemeId: null,
  savedThemes: [],
}

export function mergeThemeColors(colors?: Partial<ThemeColors> | null): ThemeColors {
  return {
    ...DEFAULT_THEME_COLORS,
    ...(colors || {}),
  }
}

export function normalizeSiteSettings(input?: Partial<SiteSettings> | null): SiteSettings {
  return {
    ...DEFAULT_SITE_SETTINGS,
    ...(input || {}),
    colors: mergeThemeColors(input?.colors),
    savedThemes: Array.isArray(input?.savedThemes)
      ? input.savedThemes.map((theme) => ({
          ...theme,
          colors: mergeThemeColors(theme.colors),
        }))
      : [],
  }
}

export function loadSiteSettings(): SiteSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_SETTINGS
  }

  const raw = window.localStorage.getItem(SITE_SETTINGS_STORAGE_KEY)
  if (!raw) {
    return DEFAULT_SITE_SETTINGS
  }

  try {
    return normalizeSiteSettings(JSON.parse(raw) as Partial<SiteSettings>)
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
}

export function saveSiteSettings(settings: SiteSettings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function buildCssVariables(settings: SiteSettings) {
  const colors = settings.themeMode === 'dark' ? {
    ...settings.colors,
    background: DARK_THEME_COLORS.background,
    foreground: DARK_THEME_COLORS.foreground,
  } : settings.colors

  return {
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--dark-blue': colors.darkBlue,
    '--light-blue': colors.lightBlue,
    '--lighter-blue': colors.lighterBlue,
    '--light-brown': colors.lightBrown,
    '--dark-brown': colors.darkBrown,
  } as Record<string, string>
}

export function applySiteSettingsToDocument(settings: SiteSettings) {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.dataset.theme = settings.themeMode
  root.style.colorScheme = settings.themeMode

  const variables = buildCssVariables(settings)
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function formatCurrency(
  value: number | string | null | undefined,
  currencySymbol = DEFAULT_SITE_SETTINGS.currencySymbol,
) {
  if (value === null || value === undefined || value === '') {
    return `0.00 ${currencySymbol}`
  }

  const numeric = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (!Number.isFinite(numeric)) {
    return `0.00 ${currencySymbol}`
  }

  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencySymbol}`
}
