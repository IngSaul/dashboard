import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyPragmas } from '../src/db/connection.js'
import { migrate } from '../src/db/migrate.js'
import {
  createSession,
  deleteSessionByToken,
  sweepExpiredSessions,
  touchSession,
  validateSessionToken,
} from '../src/auth/session.js'

const TTL = { idleTtlDays: 30, absoluteTtlDays: 90 }

function insertUser(db: Database.Database, username: string): number {
  const row = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, 'hash') RETURNING id")
    .get(username) as { id: number }
  return row.id
}

describe('session', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applyPragmas(db)
    migrate(db)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a session that validates successfully', () => {
    const userId = insertUser(db, 'alice')
    const { token } = createSession(db, userId, TTL)

    const validated = validateSessionToken(db, token)

    expect(validated).toEqual({ sessionId: expect.any(Number), userId, role: 'user' })
  })

  it('rejects an unknown token', () => {
    expect(validateSessionToken(db, 'not-a-real-token')).toBeNull()
  })

  it('rejects an expired token', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const userId = insertUser(db, 'bob')
    const { token } = createSession(db, userId, { idleTtlDays: 1, absoluteTtlDays: 90 })

    vi.setSystemTime(new Date('2026-01-03T00:00:00.000Z'))

    expect(validateSessionToken(db, token)).toBeNull()
  })

  it('touchSession extends expiry up to the absolute cap but no further', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const userId = insertUser(db, 'carol')
    const { token } = createSession(db, userId, { idleTtlDays: 30, absoluteTtlDays: 40 })
    const validated = validateSessionToken(db, token)
    expect(validated).not.toBeNull()

    // 35 days later: within the 40-day absolute cap, well past the throttle window.
    vi.setSystemTime(new Date('2026-02-05T00:00:00.000Z'))
    touchSession(db, validated!.sessionId, { idleTtlDays: 30, absoluteTtlDays: 40 })

    const row = db
      .prepare('SELECT expires_at AS expiresAt FROM sessions WHERE id = ?')
      .get(validated!.sessionId) as { expiresAt: string }
    // Absolute cap: 2026-01-01 + 40 days = 2026-02-10, which is earlier than
    // the sliding idle expiry (2026-02-05 + 30 days), so the cap wins.
    expect(new Date(row.expiresAt).toISOString()).toBe(new Date('2026-02-10T00:00:00.000Z').toISOString())
  })

  it('does not write on touchSession within the throttle window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const userId = insertUser(db, 'dave')
    const { token } = createSession(db, userId, TTL)
    const validated = validateSessionToken(db, token)!
    const before = db
      .prepare('SELECT last_seen_at AS lastSeenAt FROM sessions WHERE id = ?')
      .get(validated.sessionId) as { lastSeenAt: string }

    vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'))
    touchSession(db, validated.sessionId, TTL)

    const after = db
      .prepare('SELECT last_seen_at AS lastSeenAt FROM sessions WHERE id = ?')
      .get(validated.sessionId) as { lastSeenAt: string }
    expect(after.lastSeenAt).toBe(before.lastSeenAt)
  })

  it('deleteSessionByToken invalidates the session immediately', () => {
    const userId = insertUser(db, 'erin')
    const { token } = createSession(db, userId, TTL)

    deleteSessionByToken(db, token)

    expect(validateSessionToken(db, token)).toBeNull()
  })

  it('sweepExpiredSessions removes only expired rows', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const userId = insertUser(db, 'frank')
    createSession(db, userId, { idleTtlDays: 1, absoluteTtlDays: 90 })
    createSession(db, userId, { idleTtlDays: 60, absoluteTtlDays: 90 })

    vi.setSystemTime(new Date('2026-01-03T00:00:00.000Z'))
    const removed = sweepExpiredSessions(db)

    expect(removed).toBe(1)
    const remaining = db.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number }
    expect(remaining.count).toBe(1)
  })
})
