import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyPragmas } from '../src/db/connection.js'
import { migrate } from '../src/db/migrate.js'
import { bootstrapAdmin } from '../src/db/bootstrapAdmin.js'
import { verifyPassword } from '../src/auth/password.js'

describe('bootstrapAdmin', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    applyPragmas(db)
    migrate(db)
  })

  it('creates exactly one admin user matching the configured credentials on an empty database', async () => {
    await bootstrapAdmin(db, { username: 'admin', password: 'super-secret-password' })

    const admins = db.prepare("SELECT * FROM users WHERE role = 'admin'").all() as Array<{
      username: string
      password_hash: string
    }>
    expect(admins).toHaveLength(1)
    expect(admins[0]!.username).toBe('admin')
    await expect(verifyPassword(admins[0]!.password_hash, 'super-secret-password')).resolves.toBe(true)
  })

  it('is a no-op when an admin already exists', async () => {
    await bootstrapAdmin(db, { username: 'admin', password: 'first-password' })
    await bootstrapAdmin(db, { username: 'someone-else', password: 'second-password' })

    const admins = db.prepare("SELECT username FROM users WHERE role = 'admin'").all() as Array<{
      username: string
    }>
    expect(admins).toHaveLength(1)
    expect(admins[0]!.username).toBe('admin')
  })
})
