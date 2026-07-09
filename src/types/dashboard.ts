/**
 * Dashboard domain types.
 *
 * Mirrors the entities and validation-relevant shapes described in
 * `specs/001-browser-dashboard/data-model.md`. All date/time fields are ISO
 * 8601 strings.
 */

// Theme

export type ThemeMode = 'light' | 'dark' | 'system'

export type ResolvedThemeMode = 'light' | 'dark'

export interface ThemePreference {
  mode: ThemeMode
  resolvedMode: ResolvedThemeMode
}

// Search

export type SearchOpenBehavior = 'currentTab' | 'newTab'

export interface SearchPreference {
  providerName: string
  searchUrlTemplate: string
  openBehavior: SearchOpenBehavior
}

// Weather

export type WeatherLocationMode = 'configuredLocation' | 'browserLocation'

export type WeatherUnits = 'metric' | 'imperial'

export interface WeatherPreference {
  mode: WeatherLocationMode
  locationLabel?: string
  units: WeatherUnits
  enabled: boolean
}

export type WeatherStatus = 'loading' | 'available' | 'unavailable' | 'disabled'

export interface WeatherSummary {
  status: WeatherStatus
  locationLabel?: string
  temperature?: number
  condition?: string
  observedAt?: string
  message?: string
}

// Shortcuts

export interface Shortcut {
  id: string
  label: string
  url: string
  categoryId?: string
  description?: string
  icon?: string
  order: number
  createdAt: string
  updatedAt: string
}

// Shortcut categories

export interface ShortcutCategory {
  id: string
  name: string
  order: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

// Dashboard configuration

export interface DashboardConfiguration {
  version: number
  themePreference: ThemePreference
  searchPreference: SearchPreference
  weatherPreference: WeatherPreference
  shortcuts: Shortcut[]
  categories: ShortcutCategory[]
  updatedAt: string
}
