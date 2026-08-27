import type { AuthenticatedUser, LoginCredentials, UserRole } from '../../types/auth'
import type { DashboardConfiguration } from '../../types/dashboard'

const BASE_URL = '/api'

export type LoginOutcome =
  | { kind: 'success'; user: AuthenticatedUser }
  | { kind: 'invalid-credentials' }
  | { kind: 'locked'; retryAfterSeconds: number }
  | { kind: 'error' }

export type DashboardFetchOutcome =
  | { kind: 'found'; config: DashboardConfiguration }
  | { kind: 'not-found' }
  | { kind: 'error' }

export type CreateUserOutcome =
  | { kind: 'success'; user: AuthenticatedUser }
  | { kind: 'forbidden' }
  | { kind: 'conflict' }
  | { kind: 'error' }

export interface AuthClientOptions {
  /**
   * Called whenever any request receives a `401` — the single point that
   * lets `AuthProvider` transition to `'unauthenticated'` from any call
   * site, not just the initial session check (spec FR-005). A `401` from
   * `/auth/login` itself (a normal wrong-password outcome, not a session
   * becoming invalid) also triggers this, but harmlessly: the caller is
   * already in the `'unauthenticated'` state showing `LoginScreen` at that
   * point, so the transition is a no-op.
   */
  onUnauthenticated?: () => void
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

/** Typed fetch wrapper for the backend's auth + dashboard-config endpoints. Never touches `localStorage`/`sessionStorage` — the session lives entirely in the `HttpOnly` cookie (spec FR-019). */
export function createAuthClient(options: AuthClientOptions = {}) {
  const { onUnauthenticated } = options

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    // Fastify's default JSON body parser rejects a `Content-Type:
    // application/json` request with an empty body (e.g. logout, which has
    // no payload) — only attach the header when there's an actual body to parse.
    const headers = init.body !== undefined ? { 'Content-Type': 'application/json', ...init.headers } : init.headers
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      ...(headers !== undefined ? { headers } : {}),
    })
    if (response.status === 401) {
      onUnauthenticated?.()
    }
    return response
  }

  return {
    async login(credentials: LoginCredentials): Promise<LoginOutcome> {
      try {
        const response = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
        if (response.status === 200) {
          return { kind: 'success', user: await parseJson<AuthenticatedUser>(response) }
        }
        if (response.status === 423) {
          const body = await parseJson<{ retryAfterSeconds: number }>(response)
          return { kind: 'locked', retryAfterSeconds: body.retryAfterSeconds }
        }
        if (response.status === 401) {
          return { kind: 'invalid-credentials' }
        }
        return { kind: 'error' }
      } catch {
        return { kind: 'error' }
      }
    },

    async logout(): Promise<void> {
      try {
        await request('/auth/logout', { method: 'POST' })
      } catch {
        // Best-effort: the caller resets local auth state regardless of
        // whether the server round-trip actually succeeded.
      }
    },

    /** Never throws — a network failure is indistinguishable from "no session" to the caller (spec FR-008 must not hang on a startup network hiccup). */
    async me(): Promise<AuthenticatedUser | null> {
      try {
        const response = await request('/auth/me')
        if (response.status !== 200) {
          return null
        }
        return await parseJson<AuthenticatedUser>(response)
      } catch {
        return null
      }
    },

    async getDashboard(): Promise<DashboardFetchOutcome> {
      try {
        const response = await request('/dashboard')
        if (response.status === 200) {
          return { kind: 'found', config: await parseJson<DashboardConfiguration>(response) }
        }
        if (response.status === 404) {
          return { kind: 'not-found' }
        }
        return { kind: 'error' }
      } catch {
        return { kind: 'error' }
      }
    },

    /** `keepalive: true` lets a final save started from a `pagehide` handler survive page teardown (spec FR-009's "close mid-drag doesn't lose the last change"). */
    async putDashboard(config: DashboardConfiguration, opts: { keepalive?: boolean } = {}): Promise<boolean> {
      try {
        const response = await request('/dashboard', {
          method: 'PUT',
          body: JSON.stringify(config),
          ...(opts.keepalive !== undefined ? { keepalive: opts.keepalive } : {}),
        })
        return response.status === 200
      } catch {
        return false
      }
    },

    async createUser(input: { username: string; password: string; role: UserRole }): Promise<CreateUserOutcome> {
      try {
        const response = await request('/auth/users', { method: 'POST', body: JSON.stringify(input) })
        if (response.status === 201) {
          return { kind: 'success', user: await parseJson<AuthenticatedUser>(response) }
        }
        if (response.status === 403) {
          return { kind: 'forbidden' }
        }
        if (response.status === 409) {
          return { kind: 'conflict' }
        }
        return { kind: 'error' }
      } catch {
        return { kind: 'error' }
      }
    },
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>
