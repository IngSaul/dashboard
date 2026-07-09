import type { SearchPreference } from '../types/dashboard'

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
