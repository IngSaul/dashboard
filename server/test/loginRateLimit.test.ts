import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { applyPragmas } from '../src/db/connection.js'
import { migrate } from '../src/db/migrate.js'
import { bootstrapAdmin } from '../src/db/bootstrapAdmin.js'
import { buildApp } from '../src/app.js'
import { loadEnv } from '../src/env.js'

const TTL = { idleTtlDays: 30, absoluteTtlDays: 90 }

const BASE_ENV = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin-password-123',
}

/**
 * `POST /auth/login`'s per-IP rate limit is deployment configuration, not a
 * constant: the Playwright suite drives one login per worker per project
 * from a single loopback address, which legitimately exceeds the
 * brute-force default without saying anything about production risk. These
 * tests pin both halves — the default a real deployment gets, and the fact
 * that an explicit value is actually honored.
 */
describe('login rate limit', () => {
  let db: Database.Database
  let app: FastifyInstance | null = null

  beforeEach(async () => {
    db = new Database(':memory:')
    applyPragmas(db)
    migrate(db)
    await bootstrapAdmin(db, { username: BASE_ENV.ADMIN_USERNAME, password: BASE_ENV.ADMIN_PASSWORD })
  })

  afterEach(async () => {
    await app?.close()
    app = null
  })

  it('defaults to 20 attempts per minute when the env var is absent', () => {
    expect(loadEnv({ ...BASE_ENV }).LOGIN_RATE_LIMIT_MAX).toBe(20)
  })

  it('coerces a configured value and rejects a non-positive one', () => {
    expect(loadEnv({ ...BASE_ENV, LOGIN_RATE_LIMIT_MAX: '500' }).LOGIN_RATE_LIMIT_MAX).toBe(500)
    expect(() => loadEnv({ ...BASE_ENV, LOGIN_RATE_LIMIT_MAX: '0' })).toThrow(
      /Invalid environment configuration/,
    )
  })

  it('429s the attempt after the configured maximum, whatever the credentials', async () => {
    const built = await buildApp({
      db,
      cookieSecure: false,
      sessionTtl: TTL,
      logger: false,
      loginRateLimitMax: 2,
    })
    app = built
    const attempt = () =>
      built.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'admin', password: 'admin-password-123' },
      })

    expect((await attempt()).statusCode).toBe(200)
    expect((await attempt()).statusCode).toBe(200)
    expect((await attempt()).statusCode).toBe(429)
  })

  it('applies the 20-attempt default when `buildApp` is given no explicit maximum', async () => {
    const built = await buildApp({ db, cookieSecure: false, sessionTtl: TTL, logger: false })
    app = built
    // Wrong password on an unknown username: no account to lock out, so the
    // only thing that can stop the 21st request is the rate limiter itself.
    const attempt = () =>
      built.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'nobody', password: 'nope' },
      })

    for (let i = 0; i < 20; i += 1) {
      expect((await attempt()).statusCode).toBe(401)
    }
    expect((await attempt()).statusCode).toBe(429)
  })
})
