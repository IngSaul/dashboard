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

/** One entry of the "today" hourly forecast row; `time` is an ISO 8601 timestamp in the location's local timezone (Open-Meteo `timezone=auto`). */
export interface HourlyForecastEntry {
  time: string
  temperature: number
  weatherCode: number
}

export interface WeatherSummary {
  status: WeatherStatus
  locationLabel?: string
  temperature?: number
  temperatureMax?: number
  temperatureMin?: number
  condition?: string
  /** Raw WMO weather code from the provider, used by `WeatherIllustration` to pick an illustration — kept separate from `condition`'s human-readable text. */
  weatherCode?: number
  observedAt?: string
  message?: string
  /** Upcoming hours of today, only populated when the provider returned hourly data (`browserLocation` mode). */
  hourlyForecast?: HourlyForecastEntry[]
}

// Shortcuts

export interface Shortcut {
  id: string
  label: string
  url: string
  /** Every shortcut always belongs to a real category — never left unset; falls back to "General" (see `resolveGeneralCategory`). Only ever changes via an explicit edit — never as a side effect of reordering. */
  categoryId: string
  description?: string
  /** Resolved via `iconProvider` (002-widget-dashboard) — only ever set by an explicit create/(re)save, never during dashboard render. */
  icon?: IconSource
  /**
   * The single source of truth for shortcut order across the whole
   * dashboard — one flat, globally-ordered sequence. A category is only a
   * filter over this sequence (via `categoryId`); there is no separate
   * per-category order stored anywhere. "Todas" renders every shortcut
   * sorted by `globalOrder`; a filtered category view renders the same
   * sorted sequence with non-matching shortcuts removed.
   */
  globalOrder: number
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
