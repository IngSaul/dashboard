import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { IconSource } from '../types/widgets'

/**
 * Mirrors data-model.md's `SearchSource`/`SearchResult` shapes ahead of
 * `searchEngine` itself, which lands in Polish (see tasks.md — wiring
 * `SearchBar`/`CommandPalette` to real sources "enhances stories already
 * delivered," it isn't required by any user story on its own). Defining the
 * result shape now means this slice's state shape doesn't change when that
 * work lands — only `results`' population does.
 */
export interface SearchResult {
  id: string
  sourceId: string
  label: string
  description?: string
  icon?: IconSource
  onSelect: () => void
}

const EMPTY_RESULTS: SearchResult[] = []

/**
 * `SearchState` slice skeleton: current query, `CommandPalette` open/closed,
 * and (for now, always empty) results — no `SearchSource` is registered yet.
 * Ephemeral: never persisted.
 */
export interface SearchState {
  query: string
  /** Always empty until `searchEngine` is wired in (Polish phase). */
  results: SearchResult[]
  isPaletteOpen: boolean
  setQuery(query: string): void
  openPalette(): void
  closePalette(): void
  togglePalette(): void
}

const SearchContext = createContext<SearchState | undefined>(undefined)

export interface SearchProviderProps {
  children: ReactNode
}

export function SearchProvider({ children }: SearchProviderProps) {
  const [query, setQuery] = useState('')
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  const openPalette = useCallback(() => setIsPaletteOpen(true), [])

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false)
    setQuery('')
  }, [])

  const togglePalette = useCallback(() => setIsPaletteOpen((previous) => !previous), [])

  const value = useMemo<SearchState>(
    () => ({
      query,
      results: EMPTY_RESULTS,
      isPaletteOpen,
      setQuery,
      openPalette,
      closePalette,
      togglePalette,
    }),
    [query, isPaletteOpen, openPalette, closePalette, togglePalette],
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
