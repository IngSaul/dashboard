import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider, useThemeState } from '../../../src/state/ThemeProvider'
import { loadDashboardConfig } from '../../../src/services/configStore'
import { clearDashboardStorage } from '../../fixtures/dashboardConfig'

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe('ThemeProvider / useThemeState', () => {
  beforeEach(() => {
    clearDashboardStorage()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    clearDashboardStorage()
    document.documentElement.removeAttribute('data-theme')
  })

  it('throws when used outside a ThemeProvider', () => {
    expect(() => renderHook(() => useThemeState())).toThrow(
      'useThemeState must be used within a ThemeProvider',
    )
  })

  it('exposes the default ThemePreferences groups and a resolved mode/background', () => {
    const { result } = renderHook(() => useThemeState(), { wrapper })

    expect(result.current.theme).toEqual({ mode: 'system' })
    expect(result.current.appearance.density).toBe('comfortable')
    expect(result.current.resolvedMode).toBe('light')
    expect(result.current.resolvedBackground.gradient).toMatch(/^linear-gradient\(/)
  })

  it('applies the resolved mode to the document root', () => {
    renderHook(() => useThemeState(), { wrapper })

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('persists a theme group update and reflects it in resolvedMode', () => {
    const { result } = renderHook(() => useThemeState(), { wrapper })

    act(() => {
      result.current.setTheme({ mode: 'dark' })
    })

    expect(result.current.theme).toEqual({ mode: 'dark' })
    expect(result.current.resolvedMode).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(loadDashboardConfig().themePreferences.theme).toEqual({ mode: 'dark' })
  })

  it('persists a wallpaper update without touching the theme group', () => {
    const { result } = renderHook(() => useThemeState(), { wrapper })

    act(() => {
      result.current.setWallpaper({ ...result.current.wallpaper, blurPx: 12 })
    })

    expect(result.current.wallpaper.blurPx).toBe(12)
    expect(result.current.resolvedBackground.filter).toBe('blur(12px)')
    const persisted = loadDashboardConfig()
    expect(persisted.themePreferences.wallpaper.blurPx).toBe(12)
    expect(persisted.themePreferences.theme).toEqual({ mode: 'system' })
  })

  it('persists an accessibility update scoped to that group only', () => {
    const { result } = renderHook(() => useThemeState(), { wrapper })

    act(() => {
      result.current.setAccessibility({
        contrastBoost: true,
        focusRingStyle: 'high-visibility',
        fontScale: 1.2,
      })
    })

    expect(result.current.accessibility).toEqual({
      contrastBoost: true,
      focusRingStyle: 'high-visibility',
      fontScale: 1.2,
    })
    const persisted = loadDashboardConfig()
    expect(persisted.themePreferences.accessibility.contrastBoost).toBe(true)
    expect(persisted.themePreferences.glass).toEqual(result.current.glass)
  })
})
