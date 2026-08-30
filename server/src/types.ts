/**
 * Domain types for the backend. Mirrors the entities in
 * specs/003-auth-persistence/data-model.md. No field uses `any`.
 */

export type UserRole = 'admin' | 'user'

/** Row shape of the `users` table. */
export interface User {
  id: number
  username: string
  passwordHash: string
  role: UserRole
  failedLoginCount: number
  lockedUntil: string | null
  createdAt: string
  updatedAt: string
}

/** Row shape of the `sessions` table. */
export interface Session {
  id: number
  tokenHash: string
  userId: number
  createdAt: string
  lastSeenAt: string
  expiresAt: string
  userAgent: string | null
  ipAddress: string | null
}

/** Row shape of the `dashboard_configs` table — `configJson` is opaque, unparsed by the server. */
export interface DashboardConfigRecord {
  userId: number
  configJson: string
  schemaVersion: number
  updatedAt: string
  /** Bumped on every successful write. The value clients echo back as `If-Match` to prove they saw the current state. */
  revision: number
}

/** Public-safe user shape returned by `/auth/me`, `/auth/login`, and `/auth/users` — never includes `passwordHash`. */
export interface AuthenticatedUser {
  id: number
  username: string
  role: UserRole
}

/** Attached to `request.user` by the `authenticate` plugin once a session cookie has been validated. */
export interface RequestUser {
  id: number
  role: UserRole
}
