import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadDashboardConfig, saveDashboardConfig } from '../services/configStore'
import { resolveBackground, type ResolvedBackground } from '../services/backgroundEngine'
import {
  applyResolvedTheme,
  getSystemPrefersDark,
  resolveThemeMode,
  saveAppearanceGroup,
  saveThemeGroup,
} from '../services/theme'
import type { ResolvedThemeMode } from '../types/dashboard'
import type { ThemePreferences } from '../types/widgets'

/**
 * `ThemeState` slice: all six `ThemePreferences` groups plus their resolved,
 * ready-to-use values (see plan.md's Global State Architecture). `theme`/
 * `appearance` persist through `theme.ts` (T041); `wallpaper`/`glass`/
 * `animations`/`accessibility` persist directly against `configStore` here —
 * only `wallpaper` has enough resolution logic (source/overlay/blur/
 * gradient) to warrant its own service, `backgroundEngine` (T042).
 */
export interface ThemeState extends ThemePreferences {
  /** Reconciles `theme.mode` against the live OS preference when it is `'system'`. */
  resolvedMode: ResolvedThemeMode
  /** CSS-ready wallpaper values, resolved via `backgroundEngine.resolveBackground()`. */
  resolvedBackground: ResolvedBackground
  setTheme(theme: ThemePreferences['theme']): void
  setAppearance(appearance: ThemePreferences['appearance']): void
  setWallpaper(wallpaper: ThemePreferences['wallpaper']): void
  setGlass(glass: ThemePreferences['glass']): void
  setAnimations(animations: ThemePreferences['animations']): void
  setAccessibility(accessibility: ThemePreferences['accessibility']): void
}

const ThemeContext = createContext<ThemeState | undefined>(undefined)

function loadInitialThemePreferences(): ThemePreferences {
  return loadDashboardConfig().themePreferences
}

/** Persists a single `ThemePreferences` group, leaving the other five untouched — same scoped-write shape as `theme.ts`'s `saveThemeGroup`/`saveAppearanceGroup`, for the groups that don't have a dedicated service. */
function saveThemePreferencesGroup<K extends keyof ThemePreferences>(
  key: K,
  value: ThemePreferences[K],
): void {
  const config = loadDashboardConfig()
  saveDashboardConfig({ ...config, themePreferences: { ...config.themePreferences, [key]: value } })
}

export interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preferences, setPreferences] = useState<ThemePreferences>(loadInitialThemePreferences)
  const [prefersDark, setPrefersDark] = useState<boolean>(getSystemPrefersDark)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  const resolvedMode = useMemo(
    () => resolveThemeMode(preferences.theme.mode, prefersDark),
    [preferences.theme.mode, prefersDark],
  )

  useEffect(() => {
    applyResolvedTheme(resolvedMode)
  }, [resolvedMode])

  const resolvedBackground = useMemo(
    () => resolveBackground(preferences.wallpaper),
    [preferences.wallpaper],
  )

  const setTheme = useCallback((theme: ThemePreferences['theme']) => {
    saveThemeGroup(theme)
    setPreferences((previous) => ({ ...previous, theme }))
  }, [])

  const setAppearance = useCallback((appearance: ThemePreferences['appearance']) => {
    saveAppearanceGroup(appearance)
    setPreferences((previous) => ({ ...previous, appearance }))
  }, [])

  const setWallpaper = useCallback((wallpaper: ThemePreferences['wallpaper']) => {
    saveThemePreferencesGroup('wallpaper', wallpaper)
    setPreferences((previous) => ({ ...previous, wallpaper }))
  }, [])

  const setGlass = useCallback((glass: ThemePreferences['glass']) => {
    saveThemePreferencesGroup('glass', glass)
    setPreferences((previous) => ({ ...previous, glass }))
  }, [])

  const setAnimations = useCallback((animations: ThemePreferences['animations']) => {
    saveThemePreferencesGroup('animations', animations)
    setPreferences((previous) => ({ ...previous, animations }))
  }, [])

  const setAccessibility = useCallback((accessibility: ThemePreferences['accessibility']) => {
    saveThemePreferencesGroup('accessibility', accessibility)
    setPreferences((previous) => ({ ...previous, accessibility }))
  }, [])

  const value = useMemo<ThemeState>(
    () => ({
      ...preferences,
      resolvedMode,
      resolvedBackground,
      setTheme,
      setAppearance,
      setWallpaper,
      setGlass,
      setAnimations,
      setAccessibility,
    }),
    [
      preferences,
      resolvedMode,
      resolvedBackground,
      setTheme,
      setAppearance,
      setWallpaper,
      setGlass,
      setAnimations,
      setAccessibility,
    ],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the Provider/hook pair is the intended shape for this module (tasks.md T044).
export function useThemeState(): ThemeState {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeState must be used within a ThemeProvider')
  }
  return context
}
