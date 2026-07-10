import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SettingsProvider, useSettingsState } from '../../../src/state/SettingsProvider'
import { defaultEventBus } from '../../../src/services/eventBus'

function wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>
}

describe('SettingsProvider / useSettingsState', () => {
  it('throws when used outside a SettingsProvider', () => {
    expect(() => renderHook(() => useSettingsState())).toThrow(
      'useSettingsState must be used within a SettingsProvider',
    )
  })

  it('starts closed with no active section', () => {
    const { result } = renderHook(() => useSettingsState(), { wrapper })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.activeSection).toBeNull()
  })

  it('opens to a specific section', () => {
    const { result } = renderHook(() => useSettingsState(), { wrapper })

    act(() => {
      result.current.open('wallpaper')
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.activeSection).toBe('wallpaper')
  })

  it('closes without clearing the last active section', () => {
    const { result } = renderHook(() => useSettingsState(), { wrapper })

    act(() => {
      result.current.open('glass')
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.activeSection).toBe('glass')
  })

  it('opens to a section announced via eventBus, without importing SettingsDrawer directly', () => {
    const { result } = renderHook(() => useSettingsState(), { wrapper })

    act(() => {
      defaultEventBus.emit('settings:open-section', { section: 'accessibility' })
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.activeSection).toBe('accessibility')
  })
})
