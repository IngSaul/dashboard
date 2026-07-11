import type { IconSource } from './widgets'

/**
 * Search engine types (002-widget-dashboard Polish). See
 * `specs/002-widget-dashboard/data-model.md#searchsource--searchresult` and
 * `contracts/search-engine-contract.md`. Not persisted — sources register
 * in memory with `searchEngine` at startup; results are computed per
 * keystroke.
 */

export type SearchSourceKind = 'web' | 'shortcut' | 'command'

export interface SearchSource {
  id: string
  label: string
  kind: SearchSourceKind
  /** MUST be synchronous and side-effect-free (no network calls) — `searchEngine.query()` must never block waiting on I/O. */
  match: (query: string) => SearchResult[]
}

export interface SearchResult {
  id: string
  sourceId: string
  label: string
  description?: string
  icon?: IconSource
  /** Performs the actual navigation/action — `searchEngine` itself never navigates or mutates state directly. */
  onSelect: () => void
}
