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

  it('updates the query and computes results via searchEngine (unscoped — every registered source)', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    act(() => {
      result.current.setQuery('gmail')
    })

    expect(result.current.query).toBe('gmail')
    // `tests/setup.ts` registers the real built-in sources (web/shortcuts/
    // commands), so a query matching a default shortcut's label returns at
    // least that result — this is no longer the pre-searchEngine skeleton.
    expect(result.current.results.some((r) => r.label === 'Gmail')).toBe(true)
  })

  it('resets the selection index whenever the query changes', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    act(() => {
      result.current.setQuery('gmail')
      result.current.setSelectedIndex(2)
    })
    expect(result.current.selectedIndex).toBe(2)

    act(() => {
      result.current.setQuery('calendar')
    })
    expect(result.current.selectedIndex).toBe(0)
  })

  it('returns no results for an empty or whitespace-only query', () => {
    const { result } = renderHook(() => useSearchState(), { wrapper })

    act(() => {
      result.current.setQuery('   ')
    })

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
