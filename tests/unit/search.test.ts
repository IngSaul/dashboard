import { describe, expect, it } from 'vitest'
import { buildSearchUrl } from '../../src/services/search'
import type { SearchPreference } from '../../src/types/dashboard'

/**
 * `search.ts` does not exist yet (built in T026); these tests define its
 * contract and are expected to fail to resolve until then.
 */

const searchPreference: SearchPreference = {
  providerName: 'Example Search',
  searchUrlTemplate: 'https://search.example.com/?q={query}',
  openBehavior: 'currentTab',
}

describe('buildSearchUrl', () => {
  it('builds a destination URL with the encoded query for a non-empty search', () => {
    expect(buildSearchUrl(searchPreference, 'react hooks')).toBe(
      'https://search.example.com/?q=react%20hooks',
    )
  })

  it('trims surrounding whitespace before encoding', () => {
    expect(buildSearchUrl(searchPreference, '  cats  ')).toBe(
      'https://search.example.com/?q=cats',
    )
  })

  it('percent-encodes reserved characters safely', () => {
    expect(buildSearchUrl(searchPreference, 'a&b=c')).toBe(
      'https://search.example.com/?q=a%26b%3Dc',
    )
  })

  it('returns null for an empty query without building a URL', () => {
    expect(buildSearchUrl(searchPreference, '')).toBeNull()
  })

  it('returns null for a whitespace-only query', () => {
    expect(buildSearchUrl(searchPreference, '   ')).toBeNull()
  })
})
