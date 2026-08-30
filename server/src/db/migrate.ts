import type Database from 'better-sqlite3'
import { MIGRATIONS, type Migration } from './migrations.js'

export interface MigrationResult {
  /** Schema version before this run. `0` for a database that had never been migrated. */
  from: number
  /** Schema version after this run. */
  to: number
  /** Migrations applied by this run, in the order they ran. Empty when the database was already current. */
  applied: { id: number; name: string }[]
}

/**
 * Applies every migration the database has not seen yet, in order, once
 * each.
 *
 * This replaces a single block of idempotent `CREATE TABLE IF NOT EXISTS`
 * DDL. That block was fine for one fixed schema and nothing else: it could
 * create tables but never alter them, so the first column that needed adding
 * had nowhere to go. Recording what has run is what makes the schema
 * something that can evolve rather than only be created.
 *
 * Safe to call on every startup, and safe against a database created before
 * this existed — see migration 1's note.
 */
export function migrate(
  db: Database.Database,
  migrations: Migration[] = MIGRATIONS,
): MigrationResult {
  assertUsableMigrations(migrations)

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as { id: number }[]).map((row) => row.id),
  )
  const from = applied.size === 0 ? 0 : Math.max(...applied)

  const ordered = [...migrations].sort((first, second) => first.id - second.id)
  assertNotAheadOfCode(from, ordered)

  const record = db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)')
  const ran: { id: number; name: string }[] = []

  for (const migration of ordered) {
    if (applied.has(migration.id)) {
      continue
    }
    // One transaction per migration: a failure rolls back its schema change
    // *and* its bookkeeping row together, so a half-applied migration can
    // never be recorded as done.
    db.transaction(() => {
      migration.up(db)
      record.run(migration.id, migration.name, new Date().toISOString())
    })()
    ran.push({ id: migration.id, name: migration.name })
  }

  return { from, to: getSchemaVersion(db), applied: ran }
}

/**
 * Two ids can only disagree about what a version means. A duplicate would
 * also fail silently rather than loudly: the second entry looks "already
 * applied" and is skipped, so its schema change never runs and nothing says
 * so.
 */
function assertUsableMigrations(migrations: Migration[]): void {
  const seen = new Set<number>()
  for (const migration of migrations) {
    if (!Number.isInteger(migration.id) || migration.id < 1) {
      throw new Error(`Invalid migration id ${String(migration.id)} (${migration.name}): expected a positive integer`)
    }
    if (seen.has(migration.id)) {
      throw new Error(`Duplicate migration id ${migration.id} (${migration.name})`)
    }
    seen.add(migration.id)
  }
}

/**
 * Refuses to run against a database migrated by a *newer* build than this
 * one — the shape a rolled-back deployment takes.
 *
 * Doing nothing would be worse than failing: `migrate` would find every
 * migration it knows already applied, report success, and leave the app
 * reading a schema it has no knowledge of. Since migrations only move
 * forward, the honest answer is to stop and say so.
 */
function assertNotAheadOfCode(currentVersion: number, ordered: Migration[]): void {
  const highestKnown = ordered.at(-1)?.id ?? 0
  if (currentVersion > highestKnown) {
    throw new Error(
      `Database schema version ${currentVersion} is newer than this build knows about (${highestKnown}). ` +
        'This usually means a newer version of the app ran against this database and was then rolled back. ' +
        'Deploy the newer build again, or restore a backup taken before the upgrade (docs/backup-restore.md).',
    )
  }
}

/** Highest migration id this database has applied; `0` for an empty one. Useful for diagnostics and tests. */
export function getSchemaVersion(db: Database.Database): number {
  const tableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'")
    .get()
  if (!tableExists) {
    return 0
  }
  const row = db.prepare('SELECT MAX(id) AS version FROM schema_migrations').get() as {
    version: number | null
  }
  return row.version ?? 0
}

/** The schema version this build expects — the highest migration it ships. */
export function getExpectedSchemaVersion(migrations: Migration[] = MIGRATIONS): number {
  return migrations.reduce((highest, migration) => Math.max(highest, migration.id), 0)
}
