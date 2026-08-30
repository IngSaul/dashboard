import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { applyPragmas } from '../src/db/connection.js'
import { migrate } from '../src/db/migrate.js'
import { bootstrapAdmin } from '../src/db/bootstrapAdmin.js'
import { buildApp } from '../src/app.js'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../src/auth/cookie.js'

const TTL = { idleTtlDays: 30, absoluteTtlDays: 90 }
const CREDENTIALS = { username: 'admin', password: 'admin-password-123' }

/**
 * The session cookie's attributes are the other half of TD-01: `env.ts`
 * guarantees a production deployment *asks* for a Secure cookie, and these
 * pin that the flag actually reaches the wire, alongside the `HttpOnly` and
 * `SameSite` attributes that were already correct.
 */
describe('session cookie', () => {
  describe('options', () => {
    it('is HttpOnly, SameSite=Lax and root-scoped regardless of transport', () => {
      for (const secure of [true, false]) {
        expect(sessionCookieOptions(secure)).toMatchObject({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure,
        })
      }
    })

    it('carries an expiry only when one is given', () => {
      const expires = new Date('2030-01-01T00:00:00.000Z')
      expect(sessionCookieOptions(true, expires)).toMatchObject({ expires })
      expect(sessionCookieOptions(true)).not.toHaveProperty('expires')
    })
  })

  describe('on a real login response', () => {
    let db: Database.Database
    let app: FastifyInstance | null = null

    beforeEach(async () => {
      db = new Database(':memory:')
      applyPragmas(db)
      migrate(db)
      await bootstrapAdmin(db, CREDENTIALS)
    })

    afterEach(async () => {
      await app?.close()
      app = null
    })

    async function loginSetCookie(cookieSecure: boolean): Promise<string> {
      app = await buildApp({ db, cookieSecure, sessionTtl: TTL, logger: false })
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: CREDENTIALS,
      })
      expect(response.statusCode).toBe(200)
      const header = response.headers['set-cookie']
      const value = Array.isArray(header) ? header[0] : header
      if (!value) {
        throw new Error('expected a Set-Cookie header')
      }
      return value
    }

    it('sets Secure when the deployment terminates TLS', async () => {
      const cookie = await loginSetCookie(true)
      expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`)
      expect(cookie).toContain('Secure')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).toContain('Path=/')
    })

    it('omits Secure on a plain-HTTP development deployment, where it would be dropped', async () => {
      const cookie = await loginSetCookie(false)
      expect(cookie).not.toContain('Secure')
      expect(cookie).toContain('HttpOnly')
    })
  })
})
