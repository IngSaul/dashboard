import { describe, expect, it } from 'vitest'
import { createThemePreference, resolveThemeMode } from '../../src/services/theme'

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
