import type Database from 'better-sqlite3'
import { hashPassword } from '../auth/password.js'

/**
 * Idempotent admin bootstrap: inserts the admin row from `ADMIN_USERNAME`/
 * `ADMIN_PASSWORD` only if no `role='admin'` row exists yet. Never an HTTP
 * endpoint — this only ever runs at process startup (`index.ts`).
 */
export async function bootstrapAdmin(
  db: Database.Database,
  credentials: { username: string; password: string },
): Promise<void> {
  const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (existingAdmin) {
    return
  }

  const passwordHash = await hashPassword(credentials.password)
  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run(
    credentials.username,
    passwordHash,
  )
}
