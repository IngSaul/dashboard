import type Database from 'better-sqlite3'

/**
 * Creates the schema if it doesn't already exist. Hand-rolled `CREATE TABLE
 * IF NOT EXISTS` DDL rather than a migration framework — three tables total,
 * per plan.md's "keep it simple to maintain" constraint. Safe to call on
 * every startup (production) and once per test database (`:memory:`).
 */
export function migrate(db: Database.Database): void {
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
}
