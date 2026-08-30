import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyPragmas } from '../src/db/connection.js'
import { getExpectedSchemaVersion, getSchemaVersion, migrate } from '../src/db/migrate.js'
import { MIGRATIONS } from '../src/db/migrations.js'

describe('migrate', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applyPragmas(db)
    migrate(db)
  })

  it('creates the users, sessions, and dashboard_configs tables, plus its own ledger', () => {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence' ORDER BY name",
      )
      .all() as Array<{ name: string }>
    expect(tables.map((t) => t.name)).toEqual([
      'dashboard_configs',
      'schema_migrations',
      'sessions',
      'users',
    ])
  })

  it('enforces case-insensitive unique usernames', () => {
    db.prepare(
      "INSERT INTO users (username, password_hash) VALUES ('Alice', 'hash')",
    ).run()
    expect(() =>
      db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice', 'hash2')").run(),
    ).toThrow()
  })

  it('enforces unique session token hashes', () => {
    const user = db
      .prepare("INSERT INTO users (username, password_hash) VALUES ('bob', 'hash') RETURNING id")
      .get() as { id: number }
    db.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
       VALUES ('tok', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`,
    ).run(user.id)
    expect(() =>
      db
        .prepare(
          `INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
           VALUES ('tok', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`,
        )
        .run(user.id),
    ).toThrow()
  })

  it('cascades session and dashboard_config deletion when a user is deleted', () => {
    const user = db
      .prepare("INSERT INTO users (username, password_hash) VALUES ('carol', 'hash') RETURNING id")
      .get() as { id: number }
    db.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at)
       VALUES ('tok2', ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z')`,
    ).run(user.id)
    db.prepare(
      "INSERT INTO dashboard_configs (user_id, config_json, schema_version, updated_at) VALUES (?, '{}', 1, '2026-01-01T00:00:00.000Z')",
    ).run(user.id)

    db.prepare('DELETE FROM users WHERE id = ?').run(user.id)

    expect(db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(user.id)).toEqual([])
    expect(db.prepare('SELECT * FROM dashboard_configs WHERE user_id = ?').all(user.id)).toEqual([])
  })

  describe('versioning', () => {
    it('records what it applied, in order', () => {
      const rows = db
        .prepare('SELECT id, name FROM schema_migrations ORDER BY id')
        .all() as Array<{ id: number; name: string }>
      expect(rows.map((row) => row.id)).toEqual([1, 2])
      expect(getSchemaVersion(db)).toBe(2)
    })

    it('reports version 0 for a database that has never been migrated', () => {
      const fresh = new Database(':memory:')
      expect(getSchemaVersion(fresh)).toBe(0)
    })

    it('is a no-op when run again, and never applies a migration twice', () => {
      const before = db.prepare('SELECT id, applied_at FROM schema_migrations ORDER BY id').all()
      migrate(db)
      migrate(db)
      const after = db.prepare('SELECT id, applied_at FROM schema_migrations ORDER BY id').all()
      expect(after).toEqual(before)
    })

    it('applies a newly appended migration to an already-migrated database', () => {
      migrate(db, [
        ...MIGRATIONS,
        {
          id: 3,
          name: 'test-only marker',
          up(target) {
            target.exec('CREATE TABLE marker (id INTEGER PRIMARY KEY)')
          },
        },
      ])

      expect(getSchemaVersion(db)).toBe(3)
      expect(
        db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='marker'").get(),
      ).toBeDefined()
    })

    it('records nothing when a migration throws, so it is retried rather than skipped', () => {
      const boom = {
        id: 3,
        name: 'explodes',
        up() {
          throw new Error('boom')
        },
      }
      expect(() => migrate(db, [...MIGRATIONS, boom])).toThrow(/boom/)
      expect(getSchemaVersion(db)).toBe(2)
    })

    it('rolls back a partially-applied schema change, not just its ledger row', () => {
      // Succeeds at its first statement and fails at its second. SQLite has
      // transactional DDL, so the per-migration transaction must undo the
      // table that was already created — otherwise a retry would meet a
      // half-built schema and fail differently every time.
      const partial = {
        id: 3,
        name: 'fails halfway through',
        up(target: Database.Database) {
          target.exec('CREATE TABLE half_applied (id INTEGER PRIMARY KEY)')
          target.exec('CREATE TABLE half_applied (id INTEGER PRIMARY KEY)')
        },
      }
      const fresh = new Database(':memory:')
      applyPragmas(fresh)

      expect(() => migrate(fresh, [...MIGRATIONS, partial])).toThrow()

      expect(
        fresh.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='half_applied'").get(),
      ).toBeUndefined()
      // The migrations before it stand; only the failed one was undone.
      expect(getSchemaVersion(fresh)).toBe(2)
    })
  })

  /**
   * The case that actually matters in production: a database created before
   * migrations existed, holding real rows. It must adopt the ledger and gain
   * the new column without losing anything.
   */
  describe('an existing database created before migrations existed', () => {
    /** Byte-for-byte the DDL the old `migrate()` used to run. */
    function createLegacyDatabase(): Database.Database {
      const legacy = new Database(':memory:')
      applyPragmas(legacy)
      legacy.exec(`
        CREATE TABLE users (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          username           TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash      TEXT NOT NULL,
          role               TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
          failed_login_count INTEGER NOT NULL DEFAULT 0,
          locked_until       TEXT NULL,
          created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );
        CREATE TABLE sessions (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          token_hash    TEXT NOT NULL UNIQUE,
          user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at    TEXT NOT NULL,
          last_seen_at  TEXT NOT NULL,
          expires_at    TEXT NOT NULL,
          user_agent    TEXT NULL,
          ip_address    TEXT NULL
        );
        CREATE TABLE dashboard_configs (
          user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          config_json    TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          updated_at     TEXT NOT NULL
        );
      `)
      return legacy
    }

    it('adopts the ledger and adds the revision column without touching existing data', () => {
      const legacy = createLegacyDatabase()
      const user = legacy
        .prepare("INSERT INTO users (username, password_hash) VALUES ('dave', 'hash') RETURNING id")
        .get() as { id: number }
      legacy
        .prepare(
          `INSERT INTO dashboard_configs (user_id, config_json, schema_version, updated_at)
           VALUES (?, '{"version":1,"keep":"me"}', 1, '2026-01-01T00:00:00.000Z')`,
        )
        .run(user.id)

      expect(getSchemaVersion(legacy)).toBe(0)
      migrate(legacy)
      expect(getSchemaVersion(legacy)).toBe(2)

      const row = legacy
        .prepare('SELECT config_json AS configJson, revision FROM dashboard_configs WHERE user_id = ?')
        .get(user.id) as { configJson: string; revision: number }
      expect(row.configJson).toBe('{"version":1,"keep":"me"}')
      // Pre-existing rows start at 0, so the next write bumps them to 1 and
      // a client that never saw a revision simply sends no precondition.
      expect(row.revision).toBe(0)
      expect(legacy.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 1 })
    })

    it('is idempotent against an already-upgraded legacy database', () => {
      const legacy = createLegacyDatabase()
      migrate(legacy)
      expect(() => migrate(legacy)).not.toThrow()
      expect(getSchemaVersion(legacy)).toBe(2)
    })
  })

  describe('guards', () => {
    it('reports what it applied, so a deploy can log it instead of migrating silently', () => {
      const fresh = new Database(':memory:')
      applyPragmas(fresh)

      const result = migrate(fresh)

      expect(result.from).toBe(0)
      expect(result.to).toBe(2)
      expect(result.applied.map((entry) => entry.id)).toEqual([1, 2])
    })

    it('reports an empty run against an already-current database', () => {
      const result = migrate(db)
      expect(result).toEqual({ from: 2, to: 2, applied: [] })
    })

    /**
     * The shape a rolled-back deployment takes: an image is upgraded, it
     * migrates, then the image is rolled back. Silently doing nothing would
     * leave the old build reading a schema it knows nothing about, so this
     * stops instead.
     */
    it('refuses to run against a database migrated by a newer build', () => {
      db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        99,
        'from a newer build',
        '2026-01-01T00:00:00.000Z',
      )

      expect(() => migrate(db)).toThrow(/newer than this build knows about \(2\)/)
      // And says what to do about it.
      expect(() => migrate(db)).toThrow(/backup/)
    })

    it('rejects a duplicate migration id rather than silently skipping the second one', () => {
      const duplicate = { id: 2, name: 'also two', up: () => {} }
      expect(() => migrate(db, [...MIGRATIONS, duplicate])).toThrow(/Duplicate migration id 2/)
    })

    it('rejects a migration id that is not a positive integer', () => {
      expect(() => migrate(db, [{ id: 0, name: 'zero', up: () => {} }])).toThrow(/Invalid migration id/)
      expect(() => migrate(db, [{ id: -1, name: 'negative', up: () => {} }])).toThrow(/Invalid migration id/)
      expect(() => migrate(db, [{ id: 1.5, name: 'fractional', up: () => {} }])).toThrow(
        /Invalid migration id/,
      )
    })

    it('validates the migration list before touching the database', () => {
      const fresh = new Database(':memory:')
      applyPragmas(fresh)

      expect(() => migrate(fresh, [{ id: 0, name: 'zero', up: () => {} }])).toThrow()

      // Nothing was created — not even the ledger.
      expect(
        fresh.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get(),
      ).toBeUndefined()
    })

    it('applies migrations in id order regardless of how the list is written', () => {
      const fresh = new Database(':memory:')
      applyPragmas(fresh)
      const order: number[] = []

      migrate(fresh, [
        { id: 3, name: 'third', up: () => void order.push(3) },
        { id: 1, name: 'first', up: () => void order.push(1) },
        { id: 2, name: 'second', up: () => void order.push(2) },
      ])

      expect(order).toEqual([1, 2, 3])
    })

    it('knows the version this build expects, independently of any database', () => {
      expect(getExpectedSchemaVersion()).toBe(2)
      expect(getExpectedSchemaVersion([{ id: 7, name: 'x', up: () => {} }])).toBe(7)
      expect(getExpectedSchemaVersion([])).toBe(0)
    })
  })
})
