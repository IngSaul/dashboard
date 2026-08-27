import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Opens the production SQLite database at `databasePath`, creating its
 * parent directory if needed (e.g. the Docker bind-mounted `/data`).
 * Tests never call this — they construct `new Database(':memory:')` directly
 * and pass it into `buildApp()`.
 */
export function openDatabase(databasePath: string): Database.Database {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true })
  }
  const db = new Database(databasePath)
  applyPragmas(db)
  return db
}

/** Shared PRAGMAs for both the production connection and `:memory:` test databases. */
export function applyPragmas(db: Database.Database): void {
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = WAL')
}
