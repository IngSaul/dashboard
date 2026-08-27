import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createAuthClient, type LoginOutcome } from '../services/auth/AuthClient'
import { decideMigration, renameMigratedLocalConfig } from '../services/auth/migrateLocalConfig'
import {
  createLocalStorageProvider,
  setActiveStorageProvider,
} from '../services/storage/LocalStorageProvider'
import { createRemoteStorageProvider } from '../services/storage/RemoteStorageProvider'
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
export interface AuthContextValue {
  state: AuthState
  /** Set once, right after a first-login migration/seed upload; cleared by `dismissMigrationNotice` or automatically after a short delay. */
  migrationNotice: string | null
  dismissMigrationNotice: () => void
  login: (credentials: LoginCredentials) => Promise<LoginOutcome>
  logout: () => Promise<void>
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

  const handleUnauthenticated = useCallback(() => {
    setState({ status: 'unauthenticated' })
  }, [])

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
      const outcome = await authClient.getDashboard()
      const decision = decideMigration(outcome)

      setActiveStorageProvider(createRemoteStorageProvider(decision.config, { authClient }))

      if (decision.needsUpload) {
        const uploaded = await authClient.putDashboard(decision.config)
        if (uploaded && decision.migratedFromLocal) {
          renameMigratedLocalConfig()
          setMigrationNotice(MIGRATION_NOTICE_TEXT)
        }
      }

      setState({ status: 'authenticated', user })
    },
    [authClient],
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
    await authClient.logout()
    setActiveStorageProvider(createLocalStorageProvider())
    setState({ status: 'unauthenticated' })
  }, [authClient])

  const value = useMemo<AuthContextValue>(
    () => ({ state, migrationNotice, dismissMigrationNotice, login, logout }),
    [state, migrationNotice, dismissMigrationNotice, login, logout],
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
