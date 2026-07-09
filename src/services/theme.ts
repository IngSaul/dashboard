import type { ResolvedThemeMode, ThemeMode, ThemePreference } from '../types/dashboard'

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
