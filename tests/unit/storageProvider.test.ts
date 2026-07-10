import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalStorageProvider } from '../../src/services/storage/LocalStorageProvider'
import type { StorageProvider } from '../../src/services/storage/StorageProvider'

const KEY = 'storage-provider-test.value'

/**
 * jsdom's `Storage` methods are not interceptable with `vi.spyOn`, so
 * simulating a storage failure requires replacing `window.localStorage`
 * with a throwing stand-in for the duration of a single test (same
 * technique as `tests/unit/configStore.test.ts`).
 */
function withUnavailableLocalStorage(run: () => void): void {
  const originalLocalStorage = window.localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: () => {
        throw new Error('storage unavailable')
      },
      setItem: () => {
        throw new Error('storage unavailable')
      },
      removeItem: () => {
        throw new Error('storage unavailable')
      },
    },
    writable: true,
    configurable: true,
  })
  try {
    run()
  } finally {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  }
}

describe('LocalStorageProvider', () => {
  let provider: StorageProvider

  beforeEach(() => {
    provider = createLocalStorageProvider()
  })

  afterEach(() => {
    window.localStorage.removeItem(KEY)
  })

  it('returns undefined for a missing key', () => {
    expect(provider.get(KEY)).toBeUndefined()
  })

  it('round-trips a value through set/get', () => {
    provider.set(KEY, { count: 3 })

    expect(provider.get(KEY)).toEqual({ count: 3 })
  })

  it('persists to real window.localStorage on a normal write', () => {
    provider.set(KEY, { count: 3 })

    const raw = window.localStorage.getItem(KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? 'null')).toEqual({ count: 3 })
  })

  it('removes a key', () => {
    provider.set(KEY, { count: 3 })
    provider.remove(KEY)

    expect(provider.get(KEY)).toBeUndefined()
    expect(window.localStorage.getItem(KEY)).toBeNull()
  })

  it('returns undefined without throwing when stored JSON is malformed', () => {
    window.localStorage.setItem(KEY, '{not valid json')

    expect(() => provider.get(KEY)).not.toThrow()
    expect(provider.get(KEY)).toBeUndefined()
  })

  it('does not throw when the underlying storage is unavailable', () => {
    withUnavailableLocalStorage(() => {
      expect(() => provider.get(KEY)).not.toThrow()
      expect(() => provider.set(KEY, { count: 1 })).not.toThrow()
      expect(() => provider.remove(KEY)).not.toThrow()
    })
  })

  it('falls back to an in-memory value for the session when a write fails, and self-heals once storage recovers', () => {
    withUnavailableLocalStorage(() => {
      provider.set(KEY, { count: 5 })
      expect(provider.get(KEY)).toEqual({ count: 5 })
    })

    // Real storage is available again; the in-memory value from the failed
    // write is still readable (never lost), and the next successful write
    // clears the fallback so real storage becomes authoritative again.
    expect(provider.get(KEY)).toEqual({ count: 5 })

    provider.set(KEY, { count: 6 })
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? 'null')).toEqual({ count: 6 })
  })

  it('gives independent instances independent fallback state', () => {
    const other = createLocalStorageProvider()

    withUnavailableLocalStorage(() => {
      provider.set(KEY, { count: 9 })
    })

    expect(provider.get(KEY)).toEqual({ count: 9 })
    expect(other.get(KEY)).toBeUndefined()
  })
})
