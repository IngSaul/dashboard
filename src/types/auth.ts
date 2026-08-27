/**
 * Auth domain types. Mirrors the server's `AuthenticatedUser` shape
 * (server/src/types.ts) — see specs/003-auth-persistence/data-model.md.
 */

export type UserRole = 'admin' | 'user'

/** Returned by `GET /auth/me` and `POST /auth/login` — never carries password/session material. */
export interface AuthenticatedUser {
  id: number
  username: string
  role: UserRole
}

/** Drives `AuthGate`'s render choice (loading / LoginScreen / children) — spec FR-008. */
export type AuthState =
  | { status: 'checking' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthenticatedUser }

/** Posted to `POST /auth/login` — never persisted client-side, not even transiently (spec FR-019). */
export interface LoginCredentials {
  username: string
  password: string
}
