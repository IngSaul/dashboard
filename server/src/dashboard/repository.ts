import type Database from 'better-sqlite3'
import type { DashboardConfigRecord } from '../types.js'

/** Always scoped to `userId` — callers must pass the authenticated session's user id, never a client-supplied one (spec FR-007). */
export function getConfigForUser(db: Database.Database, userId: number): DashboardConfigRecord | null {
  const row = db
    .prepare(
      `SELECT user_id AS userId, config_json AS configJson, schema_version AS schemaVersion,
              updated_at AS updatedAt, revision AS revision
       FROM dashboard_configs WHERE user_id = ?`,
    )
    .get(userId) as DashboardConfigRecord | undefined
  return row ?? null
}

export type UpsertOutcome =
  | { ok: true; record: DashboardConfigRecord }
  /** `expectedRevision` did not match what is stored — somebody else wrote first. */
  | { ok: false; currentRevision: number }

/**
 * Upserts the single row for `userId` — insert-or-replace, per
 * data-model.md's "exactly one config per account" — bumping `revision`.
 *
 * When `expectedRevision` is given, the write only applies if the stored
 * revision still matches it. The check and the write share one SQL
 * statement (`WHERE revision = ?`) rather than a read followed by a write,
 * so two requests interleaving between the two cannot both decide they are
 * up to date.
 */
export function upsertConfigForUser(
  db: Database.Database,
  userId: number,
  configJson: string,
  schemaVersion: number,
  expectedRevision?: number,
): UpsertOutcome {
  const updatedAt = new Date().toISOString()
  const existing = db
    .prepare('SELECT revision FROM dashboard_configs WHERE user_id = ?')
    .get(userId) as { revision: number } | undefined

  if (expectedRevision !== undefined && (existing?.revision ?? 0) !== expectedRevision) {
    return { ok: false, currentRevision: existing?.revision ?? 0 }
  }

  if (!existing) {
    db.prepare(
      `INSERT INTO dashboard_configs (user_id, config_json, schema_version, updated_at, revision)
       VALUES (?, ?, ?, ?, 1)`,
    ).run(userId, configJson, schemaVersion, updatedAt)
    return { ok: true, record: { userId, configJson, schemaVersion, updatedAt, revision: 1 } }
  }

  const updated = db
    .prepare(
      `UPDATE dashboard_configs
       SET config_json = ?, schema_version = ?, updated_at = ?, revision = revision + 1
       WHERE user_id = ?${expectedRevision !== undefined ? ' AND revision = ?' : ''}
       RETURNING revision`,
    )
    .get(
      ...(expectedRevision !== undefined
        ? [configJson, schemaVersion, updatedAt, userId, expectedRevision]
        : [configJson, schemaVersion, updatedAt, userId]),
    ) as { revision: number } | undefined

  if (!updated) {
    const current = db
      .prepare('SELECT revision FROM dashboard_configs WHERE user_id = ?')
      .get(userId) as { revision: number } | undefined
    return { ok: false, currentRevision: current?.revision ?? 0 }
  }

  return {
    ok: true,
    record: { userId, configJson, schemaVersion, updatedAt, revision: updated.revision },
  }
}
