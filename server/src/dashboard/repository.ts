import type Database from 'better-sqlite3'
import type { DashboardConfigRecord } from '../types.js'

/** Always scoped to `userId` — callers must pass the authenticated session's user id, never a client-supplied one (spec FR-007). */
export function getConfigForUser(db: Database.Database, userId: number): DashboardConfigRecord | null {
  const row = db
    .prepare(
      `SELECT user_id AS userId, config_json AS configJson, schema_version AS schemaVersion, updated_at AS updatedAt
       FROM dashboard_configs WHERE user_id = ?`,
    )
    .get(userId) as DashboardConfigRecord | undefined
  return row ?? null
}

/** Upserts the single row for `userId` — insert-or-replace, per data-model.md's "exactly one config per account." */
export function upsertConfigForUser(
  db: Database.Database,
  userId: number,
  configJson: string,
  schemaVersion: number,
): DashboardConfigRecord {
  const updatedAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO dashboard_configs (user_id, config_json, schema_version, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       config_json = excluded.config_json,
       schema_version = excluded.schema_version,
       updated_at = excluded.updated_at`,
  ).run(userId, configJson, schemaVersion, updatedAt)
  return { userId, configJson, schemaVersion, updatedAt }
}
