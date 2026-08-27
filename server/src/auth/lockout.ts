import type Database from 'better-sqlite3'

/** Consecutive failures before an account is locked (spec FR-014). */
const MAX_FAILED_ATTEMPTS = 10
/** Lockout duration once the threshold is hit (spec FR-014). */
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

export interface LockStatus {
  locked: boolean
  retryAfterSeconds: number
}

/** Reports whether `userId` is currently locked out, and if so, how many seconds remain. */
export function isLocked(db: Database.Database, userId: number): LockStatus {
  const row = db.prepare('SELECT locked_until AS lockedUntil FROM users WHERE id = ?').get(userId) as
    | { lockedUntil: string | null }
    | undefined
  if (!row?.lockedUntil) {
    return { locked: false, retryAfterSeconds: 0 }
  }
  const remainingMs = new Date(row.lockedUntil).getTime() - Date.now()
  if (remainingMs <= 0) {
    return { locked: false, retryAfterSeconds: 0 }
  }
  return { locked: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) }
}

/**
 * Records one failed login attempt. On the 10th consecutive failure, locks
 * the account for 15 minutes. Returns the resulting lock status so the
 * caller can decide what to tell the client.
 */
export function recordFailedLogin(db: Database.Database, userId: number): LockStatus {
  const row = db
    .prepare('SELECT failed_login_count AS failedLoginCount FROM users WHERE id = ?')
    .get(userId) as { failedLoginCount: number } | undefined
  const nextCount = (row?.failedLoginCount ?? 0) + 1

  if (nextCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
    db.prepare('UPDATE users SET failed_login_count = ?, locked_until = ? WHERE id = ?').run(
      nextCount,
      lockedUntil,
      userId,
    )
    return { locked: true, retryAfterSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) }
  }

  db.prepare('UPDATE users SET failed_login_count = ? WHERE id = ?').run(nextCount, userId)
  return { locked: false, retryAfterSeconds: 0 }
}

/** Resets the failure counter and any lock on a successful login. */
export function clearLockout(db: Database.Database, userId: number): void {
  db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?').run(userId)
}
