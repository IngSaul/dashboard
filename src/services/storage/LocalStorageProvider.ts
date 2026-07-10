import type { StorageProvider } from './StorageProvider'

/**
 * `StorageProvider` backed by `window.localStorage`, with a per-key
 * in-memory fallback used only when a real storage call fails (quota
 * exceeded, storage disabled, private-browsing restrictions, `window`/
 * `localStorage` unavailable, etc.).
 *
 * The fallback is intentionally per-key and self-healing rather than a
 * single global "storage is unavailable" switch: every `set()` still
 * attempts real storage first, and a key falls back to the in-memory map
 * only for that failing write, clearing the fallback again the next time a
 * write to that key succeeds. This keeps the provider usable for the rest
 * of the session (a set() followed by a get() always returns the written
 * value, even if storage is broken) without permanently abandoning real
 * storage the moment one call happens to fail.
 */
export function createLocalStorageProvider(): StorageProvider {
  const fallback = new Map<string, string>()

  function parse<T>(raw: string): T | undefined {
    try {
      return JSON.parse(raw) as T
    } catch {
      return undefined
    }
  }

  return {
    get<T>(key: string): T | undefined {
      if (fallback.has(key)) {
        const raw = fallback.get(key)
        return raw === undefined ? undefined : parse<T>(raw)
      }
      try {
        const raw = window.localStorage.getItem(key)
        return raw === null ? undefined : parse<T>(raw)
      } catch {
        return undefined
      }
    },

    set<T>(key: string, value: T): void {
      const raw = JSON.stringify(value)
      try {
        window.localStorage.setItem(key, raw)
        fallback.delete(key)
      } catch {
        fallback.set(key, raw)
      }
    },

    remove(key: string): void {
      fallback.delete(key)
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Nothing further to degrade to: the key is already gone from the
        // in-memory fallback above, which is the best this provider can do.
      }
    },
  }
}

/** Shared instance used by `configStore` by default. */
export const defaultStorageProvider: StorageProvider = createLocalStorageProvider()
