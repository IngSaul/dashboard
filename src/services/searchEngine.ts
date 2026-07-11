import type { SearchResult, SearchSource, SearchSourceKind } from '../types/search'

/**
 * The single service behind both search-like entry points (`SearchBar`,
 * `CommandPalette`) and any future quick-action surface. See
 * contracts/search-engine-contract.md.
 */
export interface QueryOptions {
  kinds?: SearchSourceKind[]
}

export interface SearchEngine {
  /**
   * Registers a source. Registering a duplicate `id` throws in
   * development (a coding error to catch early) but is a silent no-op in
   * production — the first registration wins, mirroring
   * `widgetRegistry`'s duplicate-registration behavior.
   */
  registerSource(source: SearchSource): void
  /** No-op if `id` isn't registered. */
  unregisterSource(id: string): void
  /**
   * Calls `match(input)` on every registered source (optionally filtered
   * by `kinds`) and returns a merged, ranked result set. Ranking is
   * deterministic: sources are evaluated in registration order and each
   * source's own result order is preserved — no randomness, no
   * time-based tie-breaking. An empty/whitespace-only `input` always
   * returns an empty set, never every possible result from every source.
   * A source whose `match()` throws is treated as returning zero results
   * for that call — isolated so it can never break another source's
   * results or the caller.
   */
  query(input: string, options?: QueryOptions): SearchResult[]
}

export function createSearchEngine(): SearchEngine {
  const sources = new Map<string, SearchSource>()

  return {
    registerSource(source) {
      if (sources.has(source.id)) {
        if (import.meta.env.DEV) {
          throw new Error(`searchEngine: source "${source.id}" is already registered`)
        }
        return
      }
      sources.set(source.id, source)
    },

    unregisterSource(id) {
      sources.delete(id)
    },

    query(input, options = {}) {
      if (input.trim().length === 0) {
        return []
      }
      const kinds = options.kinds
      const results: SearchResult[] = []
      for (const source of sources.values()) {
        if (kinds && !kinds.includes(source.kind)) {
          continue
        }
        try {
          results.push(...source.match(input))
        } catch (error) {
          console.error(`searchEngine: source "${source.id}" match() threw`, error)
        }
      }
      return results
    },
  }
}

/** Shared instance the running app registers built-in sources into (`src/services/searchSources.ts`). */
export const defaultSearchEngine: SearchEngine = createSearchEngine()
