import { createDefaultDashboardConfig, DEFAULT_DASHBOARD_CONFIG_VERSION } from './defaults'
import type {
  DashboardConfiguration,
  ResolvedThemeMode,
  SearchOpenBehavior,
  SearchPreference,
  Shortcut,
  ShortcutCategory,
  ThemeMode,
  ThemePreference,
  WeatherLocationMode,
  WeatherPreference,
  WeatherUnits,
} from '../types/dashboard'

/**
 * Configuration validation and repair.
 *
 * Accepts an already-parsed but untrusted value (e.g. `JSON.parse` output
 * from `localStorage`) and always returns a complete, valid
 * `DashboardConfiguration`. Missing or malformed sections fall back to their
 * corresponding default; malformed individual records are dropped rather
 * than discarding the whole section. See `data-model.md` validation rules.
 */

const SEARCH_QUERY_PLACEHOLDER = '{query}'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isValidUrlString(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function isShortcutCategory(value: unknown): value is ShortcutCategory {
  if (!isPlainObject(value)) {
    return false
  }
  return (
    isNonEmptyTrimmedString(value.id) &&
    isNonEmptyTrimmedString(value.name) &&
    isFiniteNumber(value.order) &&
    isBoolean(value.isVisible) &&
    isNonEmptyTrimmedString(value.createdAt) &&
    isNonEmptyTrimmedString(value.updatedAt)
  )
}

export function isShortcut(value: unknown): value is Shortcut {
  if (!isPlainObject(value)) {
    return false
  }
  if (
    !isNonEmptyTrimmedString(value.id) ||
    !isNonEmptyTrimmedString(value.label) ||
    !isValidUrlString(value.url) ||
    !isFiniteNumber(value.order) ||
    !isNonEmptyTrimmedString(value.createdAt) ||
    !isNonEmptyTrimmedString(value.updatedAt)
  ) {
    return false
  }
  if (value.categoryId !== undefined && !isNonEmptyTrimmedString(value.categoryId)) {
    return false
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    return false
  }
  if (value.icon !== undefined && typeof value.icon !== 'string') {
    return false
  }
  return true
}

function repairThemePreference(
  raw: unknown,
  fallback: ThemePreference,
): ThemePreference {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const validModes: ThemeMode[] = ['light', 'dark', 'system']
  const validResolvedModes: ResolvedThemeMode[] = ['light', 'dark']
  const mode = validModes.includes(raw.mode as ThemeMode) ? (raw.mode as ThemeMode) : undefined
  const resolvedMode = validResolvedModes.includes(raw.resolvedMode as ResolvedThemeMode)
    ? (raw.resolvedMode as ResolvedThemeMode)
    : undefined
  if (!mode || !resolvedMode) {
    return fallback
  }
  return { mode, resolvedMode }
}

function repairSearchPreference(
  raw: unknown,
  fallback: SearchPreference,
): SearchPreference {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const validOpenBehaviors: SearchOpenBehavior[] = ['currentTab', 'newTab']
  const providerName = raw.providerName
  const searchUrlTemplate = raw.searchUrlTemplate
  const openBehavior = raw.openBehavior
  if (
    !isNonEmptyTrimmedString(providerName) ||
    !isNonEmptyTrimmedString(searchUrlTemplate) ||
    !searchUrlTemplate.includes(SEARCH_QUERY_PLACEHOLDER) ||
    !validOpenBehaviors.includes(openBehavior as SearchOpenBehavior)
  ) {
    return fallback
  }
  return {
    providerName,
    searchUrlTemplate,
    openBehavior: openBehavior as SearchOpenBehavior,
  }
}

function repairWeatherPreference(
  raw: unknown,
  fallback: WeatherPreference,
): WeatherPreference {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const validModes: WeatherLocationMode[] = ['configuredLocation', 'browserLocation']
  const validUnits: WeatherUnits[] = ['metric', 'imperial']
  const mode = raw.mode
  const units = raw.units
  const enabled = raw.enabled
  if (
    !validModes.includes(mode as WeatherLocationMode) ||
    !validUnits.includes(units as WeatherUnits) ||
    !isBoolean(enabled)
  ) {
    return fallback
  }
  if (raw.locationLabel !== undefined && !isNonEmptyTrimmedString(raw.locationLabel)) {
    return fallback
  }
  return {
    mode: mode as WeatherLocationMode,
    units: units as WeatherUnits,
    enabled,
    ...(raw.locationLabel !== undefined ? { locationLabel: raw.locationLabel as string } : {}),
  }
}

function repairCategories(raw: unknown): ShortcutCategory[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const seenIds = new Set<string>()
  const categories: ShortcutCategory[] = []
  for (const entry of raw) {
    if (!isShortcutCategory(entry) || seenIds.has(entry.id)) {
      continue
    }
    seenIds.add(entry.id)
    categories.push(entry)
  }
  return categories
}

function repairShortcuts(raw: unknown, validCategories: ShortcutCategory[]): Shortcut[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const validCategoryIds = new Set(validCategories.map((category) => category.id))
  const seenIds = new Set<string>()
  const shortcuts: Shortcut[] = []
  for (const entry of raw) {
    if (!isShortcut(entry) || seenIds.has(entry.id)) {
      continue
    }
    seenIds.add(entry.id)
    const categoryId =
      entry.categoryId !== undefined && validCategoryIds.has(entry.categoryId)
        ? entry.categoryId
        : undefined
    shortcuts.push({
      id: entry.id,
      label: entry.label,
      url: entry.url,
      order: entry.order,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(entry.description !== undefined ? { description: entry.description } : {}),
      ...(entry.icon !== undefined ? { icon: entry.icon } : {}),
    })
  }
  return shortcuts
}

/**
 * Validates and repairs an untrusted parsed value into a complete
 * `DashboardConfiguration`. Never throws.
 */
export function repairDashboardConfig(raw: unknown): DashboardConfiguration {
  const defaults = createDefaultDashboardConfig()

  if (!isPlainObject(raw) || raw.version !== DEFAULT_DASHBOARD_CONFIG_VERSION) {
    return defaults
  }

  const categories =
    'categories' in raw ? repairCategories(raw.categories) : defaults.categories
  const shortcuts =
    'shortcuts' in raw ? repairShortcuts(raw.shortcuts, categories) : defaults.shortcuts

  return {
    version: DEFAULT_DASHBOARD_CONFIG_VERSION,
    themePreference: repairThemePreference(raw.themePreference, defaults.themePreference),
    searchPreference: repairSearchPreference(raw.searchPreference, defaults.searchPreference),
    weatherPreference: repairWeatherPreference(raw.weatherPreference, defaults.weatherPreference),
    categories,
    shortcuts,
    updatedAt: isNonEmptyTrimmedString(raw.updatedAt) ? raw.updatedAt : defaults.updatedAt,
  }
}
