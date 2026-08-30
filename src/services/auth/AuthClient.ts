import type { AuthenticatedUser, LoginCredentials, UserRole } from '../../types/auth'
import type { DashboardConfiguration } from '../../types/dashboard'

const BASE_URL = '/api'

/**
 * Names the account a write is *intended for*, independently of whichever
 * session cookie the browser happens to attach when the request actually
 * goes out. The server rejects a mismatch (see `server/src/dashboard/
 * routes.ts`), which is what stops a write scheduled by one account from
 * landing in the next account to log in on the same browser.
 */
export const ACCOUNT_HEADER = 'X-Dashboard-Account'

export type LoginOutcome =
  | { kind: 'success'; user: AuthenticatedUser }
  | { kind: 'invalid-credentials' }
  | { kind: 'locked'; retryAfterSeconds: number }
  | { kind: 'error' }

export type DashboardFetchOutcome =
  /** `revision` is what a later write echoes back as its precondition. */
  | { kind: 'found'; config: DashboardConfiguration; revision: number }
  | { kind: 'not-found' }
  | { kind: 'error' }

/** Reads the strong `ETag` the dashboard routes answer with. `null` when absent or unparsable. */
function parseRevision(response: Response): number | null {
  const etag = response.headers.get('ETag')
  if (etag === null) {
    return null
  }
  const parsed = Number(etag.trim().replace(/^W\//, '').replace(/^"(.*)"$/, '$1'))
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Why a dashboard write did or didn't land. A bare boolean could not tell
 * "try again in a moment" apart from "this will never work", which is the
 * distinction the sync engine needs to decide between retrying and stopping.
 */
export type DashboardWriteResult =
  /** Stored; `revision` is the one the next write must be based on. */
  | { kind: 'saved'; revision: number }
  /**
   * Somebody else — another tab, another device — saved since this config
   * was read, so applying it would erase their work. `revision` is what the
   * server currently holds.
   */
  | { kind: 'conflict'; revision: number }
  /** The session is gone; `onUnauthenticated` has already fired. Retrying cannot help. */
  | { kind: 'unauthenticated' }
  /** The server refused this payload (bad shape, wrong account). Retrying the same bytes cannot help. */
  | { kind: 'rejected'; status: number }
  /** Network failure or a server-side error. The same payload may well succeed shortly. */
  | { kind: 'unavailable' }
  /** The caller aborted it — a disposed session, not a failure. */
  | { kind: 'aborted' }

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
          const revision = parseRevision(response)
          const config = await parseJson<DashboardConfiguration>(response)
          // A 200 without a usable ETag means this client cannot prove what
          // its edits are based on, which is indistinguishable from not
          // having loaded the config at all as far as safe writing goes.
          return revision === null ? { kind: 'error' } : { kind: 'found', config, revision }
        }
        if (response.status === 404) {
          return { kind: 'not-found' }
        }
        return { kind: 'error' }
      } catch {
        return { kind: 'error' }
      }
    },

    /**
     * Persists `config` for `opts.accountId`.
     *
     * - `keepalive: true` lets a final save started from a `pagehide`
     *   handler survive page teardown (spec FR-009's "close mid-drag doesn't
     *   lose the last change").
     * - `signal` lets a disposed config session abort a write it no longer
     *   owns (see `RemoteStorageProvider`'s `dispose`).
     * - `accountId` binds the write to the account that scheduled it; the
     *   server refuses to apply it to anyone else.
     * - `revision` is the state this config was composed on top of, sent as
     *   `If-Match`. The server refuses the write if that is no longer the
     *   current state rather than silently overwriting whoever got there
     *   first.
     */
    async putDashboard(
      config: DashboardConfiguration,
      opts: {
        keepalive?: boolean
        signal?: AbortSignal
        accountId?: number
        revision?: number
      } = {},
    ): Promise<DashboardWriteResult> {
      const headers: Record<string, string> = {}
      if (opts.accountId !== undefined) {
        headers[ACCOUNT_HEADER] = String(opts.accountId)
      }
      if (opts.revision !== undefined) {
        headers['If-Match'] = `"${opts.revision}"`
      }
      try {
        const response = await request('/dashboard', {
          method: 'PUT',
          body: JSON.stringify(config),
          ...(Object.keys(headers).length > 0 ? { headers } : {}),
          ...(opts.keepalive !== undefined ? { keepalive: opts.keepalive } : {}),
          ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
        })
        if (response.status === 200) {
          const revision = parseRevision(response)
          const body = await parseJson<{ revision?: number }>(response)
          return { kind: 'saved', revision: revision ?? body.revision ?? 0 }
        }
        if (response.status === 409) {
          const revision = parseRevision(response)
          const body = await parseJson<{ revision?: number }>(response)
          return { kind: 'conflict', revision: revision ?? body.revision ?? 0 }
        }
        if (response.status === 401) {
          return { kind: 'unauthenticated' }
        }
        // 5xx is the server having a bad moment, not a bad request: the same
        // payload is worth sending again.
        if (response.status >= 500) {
          return { kind: 'unavailable' }
        }
        return { kind: 'rejected', status: response.status }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return { kind: 'aborted' }
        }
        return { kind: 'unavailable' }
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
