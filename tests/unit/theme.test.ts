import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { loadDashboardConfig, saveDashboardConfig } from '../../src/services/configStore'
import {
  createThemePreference,
  loadThemeGroups,
  resolveThemeMode,
  saveAppearanceGroup,
  saveThemeGroup,
} from '../../src/services/theme'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `theme.ts` does not exist yet (built in T051); these tests define its
 * pure resolution contract and are expected to fail to resolve until then.
 * `resolveThemeMode` decides the active light/dark mode; the thin,
 * matchMedia-reading orchestrator that calls it lives in the same module
 * but isn't unit-tested directly (mirrors weather.ts's pure-resolver split).
 */

describe('resolveThemeMode', () => {
  it('resolves an explicit light preference to light regardless of system preference', () => {
    expect(resolveThemeMode('light', true)).toBe('light')
    expect(resolveThemeMode('light', false)).toBe('light')
  })

  it('resolves an explicit dark preference to dark regardless of system preference', () => {
    expect(resolveThemeMode('dark', true)).toBe('dark')
    expect(resolveThemeMode('dark', false)).toBe('dark')
  })

  it('resolves a system preference using the current system setting', () => {
    expect(resolveThemeMode('system', true)).toBe('dark')
    expect(resolveThemeMode('system', false)).toBe('light')
  })
})

describe('createThemePreference', () => {
  it('builds a persistable preference with mode and resolvedMode', () => {
    expect(createThemePreference('system', true)).toEqual({ mode: 'system', resolvedMode: 'dark' })
    expect(createThemePreference('light', true)).toEqual({ mode: 'light', resolvedMode: 'light' })
    expect(createThemePreference('dark', false)).toEqual({ mode: 'dark', resolvedMode: 'dark' })
  })
})

describe('loadThemeGroups/saveThemeGroup/saveAppearanceGroup (002-widget-dashboard)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('reads the default theme and appearance groups when storage is empty', () => {
    const groups = loadThemeGroups()

    expect(groups.theme).toEqual({ mode: 'system' })
    expect(groups.appearance).toEqual({ accentColor: '#2563eb', density: 'comfortable' })
  })

  it('persists a theme group update without touching the appearance group', () => {
    const config = createDefaultDashboardConfig()
    config.themePreferences.appearance = { accentColor: '#ff0000', density: 'compact' }
    saveDashboardConfig(config)

    saveThemeGroup({ mode: 'dark' })

    const groups = loadThemeGroups()
    expect(groups.theme).toEqual({ mode: 'dark' })
    expect(groups.appearance).toEqual({ accentColor: '#ff0000', density: 'compact' })
  })

  it('persists an appearance group update without touching the theme group', () => {
    const config = createDefaultDashboardConfig()
    config.themePreferences.theme = { mode: 'light' }
    saveDashboardConfig(config)

    saveAppearanceGroup({ accentColor: '#00ff00', density: 'compact' })

    const groups = loadThemeGroups()
    expect(groups.theme).toEqual({ mode: 'light' })
    expect(groups.appearance).toEqual({ accentColor: '#00ff00', density: 'compact' })
  })

  it('leaves the other four ThemePreferences groups untouched', () => {
    const config = createDefaultDashboardConfig()
    config.themePreferences.wallpaper = { ...config.themePreferences.wallpaper, blurPx: 20 }
    config.themePreferences.glass = { intensity: 'high', borderStrength: 'visible' }
    config.themePreferences.animations = { reducedMotion: 'always', transitionSpeed: 'off' }
    config.themePreferences.accessibility = {
      contrastBoost: true,
      focusRingStyle: 'high-visibility',
      fontScale: 1.2,
    }
    saveDashboardConfig(config)

    saveThemeGroup({ mode: 'dark' })

    const persisted = loadDashboardConfig()
    expect(persisted.themePreferences.wallpaper).toEqual(config.themePreferences.wallpaper)
    expect(persisted.themePreferences.glass).toEqual(config.themePreferences.glass)
    expect(persisted.themePreferences.animations).toEqual(config.themePreferences.animations)
    expect(persisted.themePreferences.accessibility).toEqual(config.themePreferences.accessibility)
  })
})
