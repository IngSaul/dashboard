import type { IconSource, MonitoringSourceConfig, Note, ThemePreferences, WidgetLayout } from './widgets'

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
  /** Resolved via `iconProvider` (002-widget-dashboard) — only ever set by an explicit create/(re)save, never during dashboard render. */
  icon?: IconSource
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
  /**
   * 002-widget-dashboard additions. New top-level keys on the same
   * persisted configuration object (not a parallel storage mechanism) —
   * see `specs/002-widget-dashboard/data-model.md`. `themePreference`
   * above (feature 001, mode + resolvedMode only) is left as-is;
   * `themePreferences` (plural) is the new, richer six-group structure
   * that `ThemeProvider` reads going forward.
   */
  widgetLayout: WidgetLayout
  themePreferences: ThemePreferences
  monitoringSourceConfig: MonitoringSourceConfig
  note: Note
}
