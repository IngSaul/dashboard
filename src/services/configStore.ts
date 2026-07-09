import { repairDashboardConfig } from '../config/schema'
import type { DashboardConfiguration } from '../types/dashboard'

/** localStorage key for the persisted dashboard configuration. */
export const DASHBOARD_CONFIG_STORAGE_KEY = 'dashboard.config.v1'

/**
 * Loads the dashboard configuration from local storage, repairing or
 * defaulting when the stored value is missing, unparsable, or invalid.
 * Never throws: storage access failures (e.g. disabled storage, private
 * browsing restrictions) also fall back to a usable default configuration.
 */
export function loadDashboardConfig(): DashboardConfiguration {
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY)
    return repairDashboardConfig(raw === null ? undefined : JSON.parse(raw))
  } catch {
    return repairDashboardConfig(undefined)
  }
}

/**
 * Persists the dashboard configuration to local storage, stamping the save
 * time. Returns whether the save succeeded; callers must keep the dashboard
 * usable even when persistence fails (e.g. storage full or unavailable).
 */
export function saveDashboardConfig(config: DashboardConfiguration): boolean {
  try {
    const payload: DashboardConfiguration = {
      ...config,
      updatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(DASHBOARD_CONFIG_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}
