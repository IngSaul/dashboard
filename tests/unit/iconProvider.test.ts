import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearIconProviderCache, resolveIcon } from '../../src/services/iconProvider'

/**
 * `iconProvider.ts` does not exist yet (built in T085); these tests define
 * its fallback-chain/caching/CORS-timeout contract per
 * contracts/icon-provider-contract.md and are expected to fail to resolve
 * until then.
 *
 * Resolution only ever runs on explicit create/(re)save, never during
 * dashboard render or on a poll — that caller-side timing rule is
 * `WidgetSettings`'s responsibility (T088), not this service's; this file
 * tests `resolveIcon()`'s own fallback-chain/caching/timeout behavior in
 * isolation.
 *
 * Favicon checks go through a stubbed global `Image` (jsdom doesn't
 * actually load network images, and this technique — rather than `fetch`
 * — is also what the real implementation should use client-side, since
 * `<img>`-style loading isn't blocked by CORS for just rendering the way
 * `fetch()` would be for reading a cross-origin response body).
 */

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private _src = ''
  get src(): string {
    return this._src
  }
  set src(value: string) {
    this._src = value
    FakeImage.behavior(value, this)
  }
  static behavior: (src: string, image: FakeImage) => void = (_src, image) => image.onload?.()
}

function stubImage(behavior: (src: string, image: FakeImage) => void): void {
  FakeImage.behavior = behavior
  vi.stubGlobal('Image', FakeImage)
}

describe('resolveIcon', () => {
  beforeEach(() => {
    clearIconProviderCache()
    stubImage((_src, image) => image.onload?.())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('manual choices (steps 1 and 3)', () => {
    it('honors an explicit lucide choice immediately, without any fetch', async () => {
      const fetchSpy = vi.fn()
      global.fetch = fetchSpy as unknown as typeof fetch

      const icon = await resolveIcon('https://example.com', 'Example', {
        manualChoice: { provider: 'lucide', value: 'book-open' },
      })

      expect(icon).toMatchObject({ provider: 'lucide', value: 'book-open' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('honors an explicit custom-svg choice immediately', async () => {
      const icon = await resolveIcon('https://example.com', 'Example', {
        manualChoice: { provider: 'custom-svg', value: '<svg>mine</svg>' },
      })

      expect(icon).toMatchObject({ provider: 'custom-svg', value: '<svg>mine</svg>' })
    })

    it('does not downgrade an existing manual lucide icon when re-run without a new manual choice', async () => {
      const currentIcon = {
        provider: 'lucide' as const,
        value: 'book-open',
        resolvedAt: '2026-01-01T00:00:00.000Z',
      }

      const icon = await resolveIcon('https://github.com', 'GitHub', { currentIcon })

      expect(icon).toEqual(currentIcon)
    })

    it('does not downgrade an existing manual custom-svg icon when re-run', async () => {
      const currentIcon = {
        provider: 'custom-svg' as const,
        value: '<svg>mine</svg>',
        resolvedAt: '2026-01-01T00:00:00.000Z',
      }

      const icon = await resolveIcon('https://github.com', 'GitHub', { currentIcon })

      expect(icon).toEqual(currentIcon)
    })

    it('replaces an existing manual icon when a new manual choice is explicitly given', async () => {
      const currentIcon = {
        provider: 'lucide' as const,
        value: 'book-open',
        resolvedAt: '2026-01-01T00:00:00.000Z',
      }

      const icon = await resolveIcon('https://github.com', 'GitHub', {
        currentIcon,
        manualChoice: { provider: 'custom-svg', value: '<svg>new</svg>' },
      })

      expect(icon.provider).toBe('custom-svg')
      expect(icon.value).toBe('<svg>new</svg>')
    })
  })

  describe('simple-icons brand match (step 2)', () => {
    it('resolves a known brand domain to its Simple Icons SVG', async () => {
      const icon = await resolveIcon('https://github.com/anthropics', 'GitHub')

      expect(icon.provider).toBe('simple-icons')
      expect(icon.value).toContain('<svg')
    })

    it('matches regardless of a www. prefix or subpath', async () => {
      const icon = await resolveIcon('https://www.github.com/some/deep/path', 'GitHub')

      expect(icon.provider).toBe('simple-icons')
    })

    it('falls through to favicon discovery for an unknown domain', async () => {
      const icon = await resolveIcon('https://my-self-hosted-app.example.com', 'My App')

      expect(icon.provider).toBe('favicon')
    })
  })

  describe('favicon discovery (step 4)', () => {
    it('resolves to the origin favicon.ico when it loads successfully', async () => {
      const icon = await resolveIcon('https://unknown-brand.example.com', 'Example')

      expect(icon).toMatchObject({
        provider: 'favicon',
        value: 'https://unknown-brand.example.com/favicon.ico',
      })
    })

    it('caches a resolved favicon per origin, without re-checking on a second call', async () => {
      const checks: string[] = []
      stubImage((src, image) => {
        checks.push(src)
        image.onload?.()
      })

      await resolveIcon('https://unknown-brand.example.com/a', 'A')
      await resolveIcon('https://unknown-brand.example.com/b', 'B')

      expect(checks).toHaveLength(1)
    })

    it('falls through to fallback when the favicon fails to load (e.g. CORS/network error)', async () => {
      stubImage((_src, image) => image.onerror?.())

      const icon = await resolveIcon('https://blocked.example.com', 'Blocked Co')

      expect(icon.provider).toBe('fallback')
    })

    it('falls through to fallback when the favicon check times out, without hanging', async () => {
      vi.useFakeTimers()
      stubImage(() => {
        /* never calls onload/onerror — simulates a hung request */
      })

      const resultPromise = resolveIcon('https://slow.example.com', 'Slow Co', { timeoutMs: 3000 })
      await vi.advanceTimersByTimeAsync(3000)

      await expect(resultPromise).resolves.toMatchObject({ provider: 'fallback' })
    })
  })

  describe('fallback (step 5)', () => {
    beforeEach(() => {
      stubImage((_src, image) => image.onerror?.())
    })

    it('renders initials from a two-word label', async () => {
      const icon = await resolveIcon('https://blocked.example.com', 'Bakery ERP')

      expect(icon.provider).toBe('fallback')
      expect(icon.value).toBe('BE')
    })

    it('renders initials from a single-word label', async () => {
      const icon = await resolveIcon('https://blocked.example.com', 'Portainer')

      expect(icon.value).toBe('PO')
    })

    it('never throws, even for a blank label', async () => {
      await expect(resolveIcon('https://blocked.example.com', '   ')).resolves.toMatchObject({
        provider: 'fallback',
      })
    })
  })

  describe('resolvedAt', () => {
    it('stamps every result with an ISO timestamp', async () => {
      const icon = await resolveIcon('https://github.com', 'GitHub')

      expect(new Date(icon.resolvedAt).toString()).not.toBe('Invalid Date')
    })
  })
})
