import { loadDashboardConfig, saveDashboardConfig } from './configStore'
import { defaultStorageProvider } from './storage/LocalStorageProvider'
import type { StorageProvider } from './storage/StorageProvider'
import type { ResolvedThemeMode, ThemeMode, ThemePreference } from '../types/dashboard'
import type { ThemePreferences } from '../types/widgets'

/** Explicit light/dark always wins; `system` follows the OS preference. */
export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedThemeMode {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light'
  }
  return mode
}

/** Builds the persistable theme preference shape for a given mode selection. */
export function createThemePreference(mode: ThemeMode, prefersDark: boolean): ThemePreference {
  return { mode, resolvedMode: resolveThemeMode(mode, prefersDark) }
}

/** Reads the OS/browser dark-mode preference. Defaults to `false` where `matchMedia` is unavailable. */
export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark']

/** Cycles system -> light -> dark -> system, for a single toggle control. */
export function getNextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_CYCLE.indexOf(mode)
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'system'
}

/** Applies the resolved theme to the document root so CSS can react to it. */
export function applyResolvedTheme(resolvedMode: ResolvedThemeMode): void {
  document.documentElement.setAttribute('data-theme', resolvedMode)
}

// --- 002-widget-dashboard additions ---------------------------------------
//
// Persistence/access layer behind `ThemeState`'s `theme` and `appearance`
// `ThemePreferences` groups (see plan.md's Global State Architecture and
// data-model.md's `ThemePreferences`). The remaining four groups
// (`wallpaper`, `glass`, `animations`, `accessibility`) are read/written
// directly against `configStore` by `ThemeProvider` — `wallpaper` alone has
// enough resolution logic (source/overlay/blur/gradient) to warrant its own
// service, `backgroundEngine`.

export type ThemeGroups = Pick<ThemePreferences, 'theme' | 'appearance'>

/** Reads the persisted `theme` and `appearance` groups, repairing/defaulting via `configStore` like every other persisted section. */
export function loadThemeGroups(provider: StorageProvider = defaultStorageProvider): ThemeGroups {
  const config = loadDashboardConfig(provider)
  return { theme: config.themePreferences.theme, appearance: config.themePreferences.appearance }
}

/** Persists an update to the `theme` group, leaving every other `ThemePreferences` group untouched. */
export function saveThemeGroup(
  theme: ThemePreferences['theme'],
  provider: StorageProvider = defaultStorageProvider,
): void {
  const config = loadDashboardConfig(provider)
  saveDashboardConfig({ ...config, themePreferences: { ...config.themePreferences, theme } }, provider)
}

/** Persists an update to the `appearance` group, leaving every other `ThemePreferences` group untouched. */
export function saveAppearanceGroup(
  appearance: ThemePreferences['appearance'],
  provider: StorageProvider = defaultStorageProvider,
): void {
  const config = loadDashboardConfig(provider)
  saveDashboardConfig(
    { ...config, themePreferences: { ...config.themePreferences, appearance } },
    provider,
  )
}
