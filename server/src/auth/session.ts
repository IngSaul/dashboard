import { createHash, randomBytes } from 'node:crypto'
import type Database from 'better-sqlite3'
import type { UserRole } from '../types.js'

/** How often `touchSession` actually writes to the DB, regardless of how often it's called — avoids a write per request. */
const TOUCH_THROTTLE_MS = 60 * 60 * 1000

export interface SessionTtlConfig {
  idleTtlDays: number
  absoluteTtlDays: number
}

export interface CreatedSession {
  /** The raw token — set in the cookie. Never stored; only its hash is persisted. */
  token: string
  expiresAt: string
}

export interface ValidatedSession {
  sessionId: number
  userId: number
  role: UserRole
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function computeExpiresAt(createdAt: Date, lastSeenAt: Date, ttl: SessionTtlConfig): string {
  const idleExpiry = lastSeenAt.getTime() + ttl.idleTtlDays * 24 * 60 * 60 * 1000
  const absoluteExpiry = createdAt.getTime() + ttl.absoluteTtlDays * 24 * 60 * 60 * 1000
  return new Date(Math.min(idleExpiry, absoluteExpiry)).toISOString()
}

/** Creates a new session row for `userId`, returning the raw token (for the cookie) — never persisted in plaintext. */
export function createSession(
  db: Database.Database,
  userId: number,
  ttl: SessionTtlConfig,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {},
): CreatedSession {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const nowIso = now.toISOString()
  const expiresAt = computeExpiresAt(now, now, ttl)

  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(hashToken(token), userId, nowIso, nowIso, expiresAt, meta.userAgent ?? null, meta.ipAddress ?? null)

  return { token, expiresAt }
}

/** Looks up a session by its raw token, returning `null` if it's missing, expired, or the token doesn't hash to a known session. */
export function validateSessionToken(db: Database.Database, token: string): ValidatedSession | null {
  const row = db
    .prepare(
      `SELECT sessions.id AS sessionId, sessions.user_id AS userId, sessions.expires_at AS expiresAt, users.role AS role
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?`,
    )
    .get(hashToken(token)) as { sessionId: number; userId: number; expiresAt: string; role: UserRole } | undefined

  if (!row) {
    return null
  }
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    return null
  }
  return { sessionId: row.sessionId, userId: row.userId, role: row.role }
}

/**
 * Extends a session's expiry (sliding idle window, capped by the absolute
 * TTL), but only writes if more than `TOUCH_THROTTLE_MS` has passed since
 * `last_seen_at` — keeps this off the hot path of every single request.
 */
export function touchSession(db: Database.Database, sessionId: number, ttl: SessionTtlConfig): void {
  const row = db
    .prepare('SELECT created_at AS createdAt, last_seen_at AS lastSeenAt FROM sessions WHERE id = ?')
    .get(sessionId) as { createdAt: string; lastSeenAt: string } | undefined
  if (!row) {
    return
  }

  const now = new Date()
  if (now.getTime() - new Date(row.lastSeenAt).getTime() < TOUCH_THROTTLE_MS) {
    return
  }

  const nowIso = now.toISOString()
  const expiresAt = computeExpiresAt(new Date(row.createdAt), now, ttl)
  db.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?').run(nowIso, expiresAt, sessionId)
}

/** Deletes a session by its raw token — used for logout. A no-op (not an error) if the token doesn't match any row. */
export function deleteSessionByToken(db: Database.Database, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
}

/** Deletes every session whose `expires_at` has already passed. Called on an interval, not per-request. */
export function sweepExpiredSessions(db: Database.Database): number {
  const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString())
  return result.changes
}
