import { loadDashboardConfig } from './configStore'
import { defaultSearchEngine } from './searchEngine'
import type { SearchPreference } from '../types/dashboard'
import type { SearchResult } from '../types/search'

const QUERY_PLACEHOLDER = '{query}'

/**
 * Builds the destination URL for a search query using the configured
 * provider template. Returns `null` for empty/whitespace-only queries so
 * callers can skip navigation entirely (FR-002, FR-003).
 */
export function buildSearchUrl(preference: SearchPreference, rawQuery: string): string | null {
  const query = rawQuery.trim()
  if (query.length === 0) {
    return null
  }
  return preference.searchUrlTemplate.replace(QUERY_PLACEHOLDER, encodeURIComponent(query))
}

function navigateTo(url: string, preference: SearchPreference): void {
  if (preference.openBehavior === 'newTab') {
    window.open(url, '_blank', 'noopener')
  } else {
    window.location.assign(url)
  }
}

/**
 * Registers the existing web-search behavior (T093) as a `"web"`
 * `SearchSource`, preserving the exact feature-001 behavior unchanged —
 * `match()` reads the current `searchPreference` fresh on every call (a
 * synchronous local read, not a network call) so a settings change takes
 * effect on the very next keystroke.
 */
export function registerWebSearchSource(): void {
  defaultSearchEngine.registerSource({
    id: 'web',
    label: 'Web Search',
    kind: 'web',
    match(query): SearchResult[] {
      const preference = loadDashboardConfig().searchPreference
      const url = buildSearchUrl(preference, query)
      if (url === null) {
        return []
      }
      return [
        {
          id: 'web-search',
          sourceId: 'web',
          label: `Search the web for "${query.trim()}"`,
          onSelect: () => navigateTo(url, preference),
        },
      ]
    },
  })
}
