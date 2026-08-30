import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createAuthClient, type LoginOutcome } from '../services/auth/AuthClient'
import { decideMigration, renameMigratedLocalConfig } from '../services/auth/migrateLocalConfig'
import { DASHBOARD_CONFIG_STORAGE_KEY, loadDashboardConfig } from '../services/configStore'
import {
  createLocalStorageProvider,
  setActiveStorageProvider,
} from '../services/storage/LocalStorageProvider'
import {
  createRemoteStorageProvider,
  type RemoteStorageSession,
} from '../services/storage/RemoteStorageProvider'
import type { SyncState } from '../services/storage/configSyncEngine'
import type { AuthState, AuthenticatedUser, LoginCredentials } from '../types/auth'

/**
 * `AuthState` machine (`'checking' | 'unauthenticated' | 'authenticated'`)
 * plus the actions `LoginScreen`/logout UI need. `AppShell` is only ever
 * rendered once this reaches `'authenticated'` — see `AuthGate` — which is
 * the documented, deliberate exception to Constitution III recorded in
 * plan.md's Constitution Check (every existing state provider does a
 * synchronous whole-config read-modify-write via `configStore`, so mounting
 * against an un-hydrated remote config risks overwriting real account data
 * with defaults).
 */
/** Nothing outstanding, nothing failed — the state a session starts and ends in. */
const IDLE_SYNC_STATE: SyncState = { status: 'idle', failedAttempts: 0 }

export interface AuthContextValue {
  state: AuthState
  /**
   * How the signed-in account's configuration is getting to the server.
   * Surfaced here because `AuthProvider` owns the session that does the
   * writing, and because a persistence failure that nothing renders is a
   * failure that was silently discarded.
   */
  syncState: SyncState
  /** Set once, right after a first-login migration/seed upload; cleared by `dismissMigrationNotice` or automatically after a short delay. */
  migrationNotice: string | null
  dismissMigrationNotice: () => void
  login: (credentials: LoginCredentials) => Promise<LoginOutcome>
  logout: () => Promise<void>
  /** Re-queues the current configuration after `syncState.status` reached `'error'`. */
  retrySync: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const MIGRATION_NOTICE_TEXT = 'Tu configuración local se importó a tu cuenta.'
const MIGRATION_NOTICE_AUTO_DISMISS_MS = 6000

export interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({ status: 'checking' })
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<SyncState>(IDLE_SYNC_STATE)

  /**
   * The remote config session belonging to the account currently signed in,
   * or `null` when nobody is. Held in a ref rather than state because
   * nothing renders from it — it exists so every path that ends a session
   * (logout, session expiry, a superseded login, unmount) can actually stop
   * the background work that session owns.
   */
  const sessionRef = useRef<RemoteStorageSession | null>(null)

  /**
   * Increments on every event that invalidates the current session. An
   * in-flight `hydrateAndActivate` compares the generation it started with
   * against this before installing its session, so a hydration overtaken by
   * a logout or a `401` can never install a provider for a session that has
   * already ended.
   */
  const sessionGenerationRef = useRef(0)

  /**
   * Ends the active session — if any — and returns storage to the local
   * provider. Never flushes: callers that want the user's last change saved
   * must await `flushPending()` first, while that user's cookie is still
   * the one the browser will attach.
   */
  const endSession = useCallback(() => {
    sessionGenerationRef.current += 1
    sessionRef.current?.dispose()
    sessionRef.current = null
    setActiveStorageProvider(createLocalStorageProvider())
    setSyncState(IDLE_SYNC_STATE)
  }, [])

  const handleUnauthenticated = useCallback(() => {
    // The cookie behind this session is gone or rejected; anything the
    // session still had queued would go out under whoever logs in next.
    endSession()
    setState({ status: 'unauthenticated' })
  }, [endSession])

  // `handleUnauthenticated` reads refs, and this initializer runs during
  // render — but the callback is only ever *invoked* from a fetch response
  // handler inside `AuthClient.request`, never during render. The rule can't
  // see that separation between passing the function and calling it.
  // eslint-disable-next-line react-hooks/refs -- see above
  const [authClient] = useState(() => createAuthClient({ onUnauthenticated: handleUnauthenticated }))

  const dismissMigrationNotice = useCallback(() => setMigrationNotice(null), [])

  /**
   * Shared by the initial session check and a fresh login: resolves the
   * account's config (via `decideMigration`), swaps in a
   * `RemoteStorageProvider` hydrated with it, uploads it once if it's new,
   * and only then flips to `'authenticated'` — never before.
   */
  const hydrateAndActivate = useCallback(
    async (user: AuthenticatedUser) => {
      // Ending the previous session first means two logins can never leave
      // two live providers writing against the same browser.
      endSession()
      const generation = sessionGenerationRef.current

      const outcome = await authClient.getDashboard()
      if (generation !== sessionGenerationRef.current) {
        return
      }
      const decision = decideMigration(outcome)

      const session = createRemoteStorageProvider(decision.config, {
        authClient,
        accountId: user.id,
        revision: decision.revision,
        onSyncStateChange: (next) => {
          // Late transitions from a session that has already been replaced
          // must not repaint the current one's status.
          if (generation === sessionGenerationRef.current) {
            setSyncState(next)
          }
        },
      })
      sessionRef.current = session
      setActiveStorageProvider(session)

      if (decision.needsUpload) {
        // Seeded through the session rather than a bare `putDashboard`, so
        // the revision the server assigns is recorded where later writes
        // will look for it. Sending it directly left the session still
        // believing the account had no config, and its next write conflicted
        // with the one it had just made itself.
        session.set(DASHBOARD_CONFIG_STORAGE_KEY, decision.config)
        const uploaded = await session.flushPending()
        if (generation !== sessionGenerationRef.current) {
          return
        }
        if (uploaded && decision.migratedFromLocal) {
          renameMigratedLocalConfig()
          setMigrationNotice(MIGRATION_NOTICE_TEXT)
        }
      }

      setState({ status: 'authenticated', user })
    },
    [authClient, endSession],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const user = await authClient.me()
      if (cancelled) {
        return
      }
      if (!user) {
        setState({ status: 'unauthenticated' })
        return
      }
      await hydrateAndActivate(user)
    })()
    return () => {
      cancelled = true
    }
    // Runs once at mount — `authClient`/`hydrateAndActivate` are stable for the provider's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Unmount is the last event that can leave a session's timers, listener
  // and requests running with nothing left to receive them.
  useEffect(() => {
    return () => {
      sessionRef.current?.dispose()
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!migrationNotice) {
      return
    }
    const timer = setTimeout(dismissMigrationNotice, MIGRATION_NOTICE_AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [migrationNotice, dismissMigrationNotice])

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginOutcome> => {
      const outcome = await authClient.login(credentials)
      if (outcome.kind === 'success') {
        await hydrateAndActivate(outcome.user)
      }
      return outcome
    },
    [authClient, hydrateAndActivate],
  )

  const logout = useCallback(async () => {
    // Order matters. The pending write goes out first, while this account's
    // cookie is still the one the browser attaches, so logging out mid-edit
    // doesn't discard the edit. Only then is the session torn down — before
    // the logout round-trip, so nothing it owns can survive into the next
    // account's session.
    const session = sessionRef.current
    if (session) {
      await session.flushPending()
    }
    endSession()
    await authClient.logout()
    setState({ status: 'unauthenticated' })
  }, [authClient, endSession])

  const retrySync = useCallback(() => {
    sessionRef.current?.set(DASHBOARD_CONFIG_STORAGE_KEY, loadDashboardConfig())
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, syncState, migrationNotice, dismissMigrationNotice, login, logout, retrySync }),
    [state, syncState, migrationNotice, dismissMigrationNotice, login, logout, retrySync],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the Provider/hook pair is the intended shape for this module, matching every other state slice.
export function useAuthState(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider')
  }
  return context
}
