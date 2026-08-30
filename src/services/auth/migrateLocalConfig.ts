import { DASHBOARD_CONFIG_STORAGE_KEY, loadDashboardConfig } from '../configStore'
import type { DashboardFetchOutcome } from './AuthClient'
import type { DashboardConfiguration } from '../../types/dashboard'

export interface MigrationDecision {
  /** The config to treat as this account's initial configuration. */
  config: DashboardConfiguration
  /** `true` when this decision must still be uploaded via `PUT /dashboard` (nothing existed server-side yet). */
  needsUpload: boolean
  /** `true` only when `config` came from a pre-existing local browser configuration — drives the one-time toast and the local-key rename. */
  migratedFromLocal: boolean
  /**
   * The server revision `config` is based on, or `null` when that could not
   * be established. `0` means "the account has no configuration yet", which
   * is a real, checkable precondition: two tabs racing to seed the same new
   * account cannot both win.
   */
  revision: number | null
}

function hasRawLocalConfig(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

/**
 * Decides what a user's initial `DashboardConfiguration` should be right
 * after login, from the `GET /dashboard` outcome (spec FR-016/FR-017).
 * Gated purely on server state, never on inspecting `localStorage` first —
 * an existing server row always wins and is never touched.
 *
 * Reuses `loadDashboardConfig()` (and, transitively, the existing
 * `repairDashboardConfig`) rather than reimplementing repair logic here:
 * at the point this runs, `defaultStorageProvider` is still backed by
 * `LocalStorageProvider` (the swap to `RemoteStorageProvider` happens after
 * this decision resolves), so `loadDashboardConfig()` reads real
 * `localStorage` and already falls back to `createDefaultDashboardConfig()`
 * when nothing was stored — identical to what a fresh account needs anyway.
 */
export function decideMigration(outcome: DashboardFetchOutcome): MigrationDecision {
  if (outcome.kind === 'found') {
    return {
      config: outcome.config,
      needsUpload: false,
      migratedFromLocal: false,
      revision: outcome.revision,
    }
  }

  if (outcome.kind === 'not-found') {
    return {
      config: loadDashboardConfig(),
      needsUpload: true,
      migratedFromLocal: hasRawLocalConfig(),
      // The account has no row yet, and saying so is a precondition the
      // server can check — not an assumption.
      revision: 0,
    }
  }

  // 'error': degrade gracefully — don't block the auth gate forever on a
  // transient failure to load config; defaults render so the dashboard is
  // usable. `revision: null` is the important part: this tab never learned
  // what the account's real configuration is, so it must not write over it.
  return { config: loadDashboardConfig(), needsUpload: false, migratedFromLocal: false, revision: null }
}

/** Renames (never deletes) the local key once its content is safely persisted server-side — a zero-cost safety net, not the migration's actual idempotency guard (that's the server-state check in `decideMigration`). */
export function renameMigratedLocalConfig(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY)
    if (raw === null) {
      return
    }
    window.localStorage.setItem(`${DASHBOARD_CONFIG_STORAGE_KEY}.migrated.${new Date().toISOString()}`, raw)
    window.localStorage.removeItem(DASHBOARD_CONFIG_STORAGE_KEY)
  } catch {
    // Best-effort only — the account's config is already safely on the
    // server at this point regardless of whether this cleanup succeeds.
  }
}
