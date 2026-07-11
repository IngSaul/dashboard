import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultSearchEngine } from '../services/searchEngine'
import type { SearchResult } from '../types/search'

/**
 * `SearchState` slice: `CommandPalette`'s query, computed `searchEngine`
 * results (unscoped — every registered source), open/closed state, and the
 * keyboard-navigable selection index. `SearchBar` is a separate, always-
 * visible, single-instance control with its own local query state (scoped
 * to `web`/`shortcut` kinds) — it doesn't need this shared slice the way
 * `CommandPalette` does (invoked from anywhere, via a keyboard shortcut).
 * Ephemeral: never persisted.
 */
export interface SearchState {
  query: string
  results: SearchResult[]
  isPaletteOpen: boolean
  /** Keyboard-navigable index into `results`, per `utils/keyboard.ts`'s roving pattern. */
  selectedIndex: number
  setQuery(query: string): void
  setSelectedIndex(index: number): void
  openPalette(): void
  closePalette(): void
  togglePalette(): void
}

const SearchContext = createContext<SearchState | undefined>(undefined)

export interface SearchProviderProps {
  children: ReactNode
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [query, setQueryState] = useState('')
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const results = useMemo<SearchResult[]>(
    () => (query.trim() === '' ? [] : defaultSearchEngine.query(query)),
    [query],
  )

  const setQuery = useCallback((next: string) => {
    setQueryState(next)
    setSelectedIndex(0)
  }, [])

  const openPalette = useCallback(() => setIsPaletteOpen(true), [])

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false)
    setQueryState('')
    setSelectedIndex(0)
  }, [])

  const togglePalette = useCallback(() => setIsPaletteOpen((previous) => !previous), [])

  const value = useMemo<SearchState>(
    () => ({
      query,
      results,
      isPaletteOpen,
      selectedIndex,
      setQuery,
      setSelectedIndex,
      openPalette,
      closePalette,
      togglePalette,
    }),
    [query, results, isPaletteOpen, selectedIndex, setQuery, openPalette, closePalette, togglePalette],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the Provider/hook pair is the intended shape for this module (tasks.md T048).
export function useSearchState(): SearchState {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchState must be used within a SearchProvider')
  }
  return context
}
