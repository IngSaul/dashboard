import { repairDashboardConfig } from '../config/schema'
import { defaultStorageProvider } from './storage/LocalStorageProvider'
import type { StorageProvider } from './storage/StorageProvider'
import type { DashboardConfiguration } from '../types/dashboard'

/** localStorage key for the persisted dashboard configuration. */
export const DASHBOARD_CONFIG_STORAGE_KEY = 'dashboard.config.v1'

/**
 * Loads the dashboard configuration via the given `StorageProvider`
 * (defaults to the shared `localStorage`-backed provider), repairing or
 * defaulting when the stored value is missing, unparsable, or invalid.
 * Never throws: the provider itself never throws, per its contract.
 */
export function loadDashboardConfig(
  provider: StorageProvider = defaultStorageProvider,
): DashboardConfiguration {
  return repairDashboardConfig(provider.get<DashboardConfiguration>(DASHBOARD_CONFIG_STORAGE_KEY))
}

/**
 * Persists the dashboard configuration via the given `StorageProvider`
 * (defaults to the shared `localStorage`-backed provider), stamping the
 * save time.
 *
 * Returns `void`, not a success flag: per `StorageProvider`'s contract, a
 * write always "succeeds" from the caller's perspective — it either reaches
 * real storage or is remembered in the provider's in-memory fallback for the
 * rest of the session, and the caller has no action to take differently in
 * either case. (The pre-`StorageProvider` version of this function returned
 * a `boolean`; nothing in the app read it — see `Dashboard.tsx`.)
 */
export function saveDashboardConfig(
  config: DashboardConfiguration,
  provider: StorageProvider = defaultStorageProvider,
): void {
  const payload: DashboardConfiguration = {
    ...config,
    updatedAt: new Date().toISOString(),
  }
  provider.set(DASHBOARD_CONFIG_STORAGE_KEY, payload)
}
