import { DASHBOARD_CONFIG_STORAGE_KEY } from '../configStore'
import { createConfigSyncEngine, type ConfigWriteResult, type SyncState } from './configSyncEngine'
import type { AuthClient } from '../auth/AuthClient'
import type { DashboardConfiguration } from '../../types/dashboard'
import type { StorageProvider } from './StorageProvider'

/** Trailing debounce window — see spec FR-009/SC-006 and research.md's `RemoteStorageProvider` notes. */
const DEFAULT_DEBOUNCE_MS = 1000
/** Upper bound on how long a burst of rapid changes can delay a save. */
const DEFAULT_MAX_WAIT_MS = 5000

export interface RemoteStorageProviderOptions {
  authClient: Pick<AuthClient, 'putDashboard'>
  /** The account this session writes for. Every `PUT` carries it, and the server refuses to apply a write to anyone else. */
  accountId: number
  /**
   * The revision `initialConfig` was read at, sent with every write so the
   * server can refuse one built on a state it has moved past.
   *
   * `null` means this tab never established what it is based on — the
   * config came from a failed hydration rather than from the server. Such a
   * session deliberately never writes: it cannot prove it would not be
   * erasing somebody else's work.
   */
  revision: number | null
  debounceMs?: number
  maxWaitMs?: number
  retryDelaysMs?: number[]
  /** Notified on every sync transition, so the UI can show that a change is still unsaved. */
  onSyncStateChange?: (state: SyncState) => void
}

/**
 * A remote config session: a `StorageProvider` bound to one account, with an
 * explicit end.
 *
 * The lifetime matters because the provider owns background work — timers, a
 * `pagehide` listener, an `online` listener, and in-flight requests — that
 * outlives the login it was created for unless something stops it. It
 * previously had no way to be stopped at all, so a write queued by one
 * account could fire after that account logged out, carrying whatever
 * session cookie the browser had by then.
 */
export interface RemoteStorageSession extends StorageProvider {
  /**
   * Sends anything outstanding immediately and resolves with whether the
   * account's configuration is now fully saved. Call it *before*
   * invalidating the session (logout) so the user's last change is saved
   * while their own cookie is still valid.
   *
   * Makes a single attempt: the caller is on a path that cannot wait out a
   * backoff sequence.
   */
  flushPending(): Promise<boolean>
  /**
   * Ends the session: cancels timers, removes listeners, aborts anything
   * still in flight, and permanently stops the session from writing again.
   * Idempotent.
   *
   * Deliberately does *not* flush: after this point the browser's cookie may
   * already belong to somebody else, so a pending write must be dropped
   * rather than sent. `flushPending()` is the caller's way to save it first.
   */
  dispose(): void
  getSyncState(): SyncState
  /** For assertions and diagnostics — the account this session writes for. */
  readonly accountId: number
}

/**
 * `StorageProvider` backed by the server's `/dashboard` endpoint — the
 * seam `specs/002-widget-dashboard/contracts/storage-provider-contract.md`
 * anticipated. `get`/`set`/`remove` stay synchronous (reading/writing an
 * in-memory cache) so `configStore`'s call sites need no changes; `set()`
 * additionally hands the new value to the sync engine, which owns every
 * decision about when it actually reaches the server.
 *
 * Only `DASHBOARD_CONFIG_STORAGE_KEY` is ever actually synced to the server
 * — it is the only key any call site passes to `defaultStorageProvider`
 * today. Any other key is cached in-memory only, as a safe default for
 * code that hasn't been written yet rather than a real sync path.
 */
export function createRemoteStorageProvider(
  initialConfig: DashboardConfiguration,
  options: RemoteStorageProviderOptions,
): RemoteStorageSession {
  const {
    authClient,
    accountId,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    maxWaitMs = DEFAULT_MAX_WAIT_MS,
    retryDelaysMs,
    onSyncStateChange,
  } = options

  const cache = new Map<string, unknown>([[DASHBOARD_CONFIG_STORAGE_KEY, initialConfig]])
  const abortController = new AbortController()
  let disposed = false
  let revision = options.revision
  /** Whether an unhealthy state has been reported since the last success, so recovery is logged once rather than never. */
  let loggedFailure = false

  /** Translates the transport's answer into the few things the engine can act on. */
  async function attemptWrite(
    value: DashboardConfiguration,
    opts: { keepalive?: boolean },
  ): Promise<ConfigWriteResult> {
    if (revision === null) {
      // No proven base state, so any write is a blind overwrite. Reported as
      // a conflict because it is the same situation from the user's side:
      // this tab is not in step with the server and only a reload fixes it.
      return { kind: 'conflict' }
    }
    const result = await authClient.putDashboard(value, {
      accountId,
      revision,
      signal: abortController.signal,
      ...opts,
    })
    switch (result.kind) {
      case 'saved':
        revision = result.revision
        return { kind: 'saved' }
      case 'conflict':
        // The revision is deliberately *not* advanced: this session's config
        // is still the stale one, so adopting the server's revision would
        // only let it overwrite the newer state on the next attempt.
        return {
          kind: 'conflict',
          detail: `another writer is at revision ${result.revision}; this tab has ${String(revision)}`,
        }
      case 'unavailable':
        return { kind: 'retry', detail: 'server unreachable or erroring' }
      case 'aborted':
        return { kind: 'aborted' }
      // A dead session and a refused payload are both permanent: no amount
      // of retrying makes this account's cookie valid again, or this body
      // acceptable. The session is torn down by `AuthProvider` in the first
      // case (see its `onUnauthenticated`).
      case 'unauthenticated':
        return { kind: 'fatal', detail: 'session no longer valid' }
      case 'rejected':
        return { kind: 'fatal', detail: `server refused the configuration (HTTP ${result.status})` }
    }
  }

  /**
   * The one place this app says anything about sync out loud.
   *
   * A dashboard that quietly stops saving is the failure mode worth being
   * able to diagnose, and "it isn't saving" alone is unanswerable — a dead
   * network, a refused payload and another tab having saved first need
   * different responses. One line per transition into an unhealthy state,
   * with the reason and the attempt count, is enough to tell them apart from
   * a console the user can paste. Recovery is logged once so the record does
   * not end on a failure that has since resolved.
   *
   * Deliberately not a logging framework, not remote reporting, and silent
   * while everything is fine.
   */
  function reportSyncState(state: SyncState): void {
    const detail = state.lastFailure?.detail ?? 'no detail'
    if (state.status === 'retrying') {
      console.warn(
        `[dashboard sync] save failed (attempt ${state.failedAttempts}), will retry — ${detail}`,
      )
    } else if (state.status === 'error') {
      console.warn(
        `[dashboard sync] giving up after ${state.failedAttempts} attempt(s) — ${detail}. ` +
          'Your changes are still in this tab.',
      )
    } else if (state.status === 'conflict') {
      console.warn(`[dashboard sync] this tab is out of date — ${detail}. Reload to see the current version.`)
    } else if (state.status === 'idle' && state.failedAttempts === 0 && loggedFailure) {
      console.info('[dashboard sync] saved; back in sync')
      loggedFailure = false
    }
    if (state.status !== 'idle' && state.status !== 'saving') {
      loggedFailure = true
    }
    onSyncStateChange?.(state)
  }

  const engine = createConfigSyncEngine<DashboardConfiguration>({
    write: attemptWrite,
    debounceMs,
    maxWaitMs,
    ...(retryDelaysMs !== undefined ? { retryDelaysMs } : {}),
    onStateChange: reportSyncState,
  })

  /** Best-effort final save if the tab is closing mid-debounce — see spec FR-009's "closed browser doesn't lose the last change." */
  function flushOnPageHide(): void {
    void engine.flush({ keepalive: true, singleAttempt: true })
  }

  /**
   * The reason `offline` is not a status of its own: coming back online is
   * the only thing the app would do differently, and it can just do it.
   */
  function retryOnReconnect(): void {
    engine.retryNow()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushOnPageHide)
    window.addEventListener('online', retryOnReconnect)
  }

  return {
    accountId,

    get<T>(key: string): T | undefined {
      return cache.has(key) ? (cache.get(key) as T) : undefined
    },

    set<T>(key: string, value: T): void {
      cache.set(key, value)
      if (key === DASHBOARD_CONFIG_STORAGE_KEY && !disposed) {
        // A disposed session still answers reads from its cache, but must
        // never queue another write against a cookie it no longer owns.
        engine.write(value as unknown as DashboardConfiguration)
      }
    },

    remove(key: string): void {
      cache.delete(key)
    },

    flushPending(): Promise<boolean> {
      return engine.flush({ singleAttempt: true })
    },

    getSyncState(): SyncState {
      return engine.getState()
    },

    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      engine.dispose()
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', flushOnPageHide)
        window.removeEventListener('online', retryOnReconnect)
      }
      abortController.abort()
    },
  }
}
