import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SearchProvider, useSearchState } from '../../../src/state/SearchProvider'

function wrapper({ children }: { children: ReactNode }) {
  return <SearchProvider>{children}</SearchProvider>
}

describe('SearchProvider / useSearchState', () => {
  it('throws when used outside a SearchProvider', () => {
    expect(() => renderHook(() => useSearchState())).toThrow(
      'useSearchState must be used within a SearchProvider',
    )
  })

  it('starts with an empty query, no results, and the palette closed', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isPaletteOpen).toBe(false)
  })

  it('updates the query but always returns empty results (no sources wired yet)', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    act(() => {
      result.current.setQuery('gmail')
    })

    expect(result.current.query).toBe('gmail')
    expect(result.current.results).toEqual([])
  })

  it('opens and closes the palette, clearing the query on close', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    act(() => {
      result.current.setQuery('gmail')
      result.current.openPalette()
    })
    expect(result.current.isPaletteOpen).toBe(true)

    act(() => {
      result.current.closePalette()
    })
    expect(result.current.isPaletteOpen).toBe(false)
    expect(result.current.query).toBe('')
  })

  it('toggles the palette open state', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    act(() => {
      result.current.togglePalette()
    })
    expect(result.current.isPaletteOpen).toBe(true)

    act(() => {
      result.current.togglePalette()
    })
    expect(result.current.isPaletteOpen).toBe(false)
  })
})
