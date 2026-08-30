import type Database from 'better-sqlite3'

/**
 * The ordered history of this database's schema.
 *
 * Appending is the only allowed edit: once a migration has run against a
 * real database, changing it means two deployments disagree about what
 * "version 3" contains, and neither can tell. Fixes go in a new entry.
 *
 * `id` is the version. `up` runs inside a transaction, so a migration that
 * throws leaves the database exactly as it was.
 */
export interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'initial schema',
    /**
     * Deliberately still `IF NOT EXISTS`. This is what lets a database
     * created before migrations existed adopt them: the tables are already
     * there, this runs as a no-op, and the row it records tells every later
     * migration it can rely on them.
     */
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id                 INTEGER PRIMARY KEY AUTOINCREMENT,
          username           TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash      TEXT NOT NULL,
          role               TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
          failed_login_count INTEGER NOT NULL DEFAULT 0,
          locked_until       TEXT NULL,
          created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          token_hash    TEXT NOT NULL UNIQUE,
          user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at    TEXT NOT NULL,
          last_seen_at  TEXT NOT NULL,
          expires_at    TEXT NOT NULL,
          user_agent    TEXT NULL,
          ip_address    TEXT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

        CREATE TABLE IF NOT EXISTS dashboard_configs (
          user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          config_json    TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          updated_at     TEXT NOT NULL
        );
      `)
    },
  },
  {
    id: 2,
    name: 'dashboard config revision',
    /**
     * Optimistic concurrency for `PUT /dashboard`. Existing rows start at
     * revision 0 and are bumped by their next write, so a client holding a
     * config it fetched before this migration simply sends no precondition
     * and is treated exactly as it was.
     */
    up(db) {
      const columns = db.prepare('PRAGMA table_info(dashboard_configs)').all() as { name: string }[]
      if (columns.some((column) => column.name === 'revision')) {
        return
      }
      db.exec('ALTER TABLE dashboard_configs ADD COLUMN revision INTEGER NOT NULL DEFAULT 0')
    },
  },
]
