import { DASHBOARD_CONFIG_STORAGE_KEY } from '../configStore'
import type { AuthClient } from '../auth/AuthClient'
import type { DashboardConfiguration } from '../../types/dashboard'
import type { StorageProvider } from './StorageProvider'

/** Trailing debounce window — see spec FR-009/SC-006 and research.md's `RemoteStorageProvider` notes. */
const DEFAULT_DEBOUNCE_MS = 1000
/** Upper bound on how long a burst of rapid changes can delay a save. */
const DEFAULT_MAX_WAIT_MS = 5000

export interface RemoteStorageProviderOptions {
  authClient: Pick<AuthClient, 'putDashboard'>
  debounceMs?: number
  maxWaitMs?: number
}

/**
 * `StorageProvider` backed by the server's `/dashboard` endpoint — the
 * seam `specs/002-widget-dashboard/contracts/storage-provider-contract.md`
 * anticipated. `get`/`set`/`remove` stay synchronous (reading/writing an
 * in-memory cache) so `configStore`'s call sites need no changes; `set()`
 * additionally schedules a debounced background `PUT /dashboard`.
 *
 * Only `DASHBOARD_CONFIG_STORAGE_KEY` is ever actually synced to the server
 * — it is the only key any call site passes to `defaultStorageProvider`
 * today. Any other key is cached in-memory only, as a safe default for
 * code that hasn't been written yet rather than a real sync path.
 */
export function createRemoteStorageProvider(
  initialConfig: DashboardConfiguration,
  options: RemoteStorageProviderOptions,
): StorageProvider {
  const { authClient, debounceMs = DEFAULT_DEBOUNCE_MS, maxWaitMs = DEFAULT_MAX_WAIT_MS } = options

  const cache = new Map<string, unknown>([[DASHBOARD_CONFIG_STORAGE_KEY, initialConfig]])

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  let pending: DashboardConfiguration | null = null

  function clearTimers(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer !== null) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
  }

  function flush(): void {
    if (pending === null) {
      return
    }
    const value = pending
    pending = null
    clearTimers()
    // A failed background save must not crash the UI — the next set() call
    // schedules another attempt with whatever the latest value is by then.
    void authClient.putDashboard(value).catch(() => {})
  }

  function scheduleFlush(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(flush, debounceMs)
    if (maxWaitTimer === null) {
      maxWaitTimer = setTimeout(flush, maxWaitMs)
    }
  }

  /** Best-effort final save if the tab is closing mid-debounce — see spec FR-009's "closed browser doesn't lose the last change." */
  function flushOnPageHide(): void {
    if (pending === null) {
      return
    }
    const value = pending
    pending = null
    clearTimers()
    void authClient.putDashboard(value, { keepalive: true }).catch(() => {})
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushOnPageHide)
  }

  return {
    get<T>(key: string): T | undefined {
      return cache.has(key) ? (cache.get(key) as T) : undefined
    },
    set<T>(key: string, value: T): void {
      cache.set(key, value)
      if (key === DASHBOARD_CONFIG_STORAGE_KEY) {
        pending = value as unknown as DashboardConfiguration
        scheduleFlush()
      }
    },
    remove(key: string): void {
      cache.delete(key)
    },
  }
}
