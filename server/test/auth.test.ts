import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { applyPragmas } from '../src/db/connection.js'
import { migrate } from '../src/db/migrate.js'
import { bootstrapAdmin } from '../src/db/bootstrapAdmin.js'
import { buildApp } from '../src/app.js'

const TTL = { idleTtlDays: 30, absoluteTtlDays: 90 }

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader
  if (!header) {
    throw new Error('expected a Set-Cookie header')
  }
  return header.split(';')[0]!
}

describe('auth routes', () => {
  let db: Database.Database
  let app: FastifyInstance

  beforeEach(async () => {
    db = new Database(':memory:')
    applyPragmas(db)
    migrate(db)
    await bootstrapAdmin(db, { username: 'admin', password: 'admin-password-123' })
    app = await buildApp({ db, cookieSecure: false, sessionTtl: TTL, logger: false })
  })

  afterEach(async () => {
    await app.close()
    vi.useRealTimers()
  })

  it('logs in with correct credentials, sets a session cookie, and returns the user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'admin-password-123' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: expect.any(Number), username: 'admin', role: 'admin' })
    const cookie = response.cookies.find((c) => c.name === 'dashboard_session')
    expect(cookie).toBeDefined()
    expect(cookie!.httpOnly).toBe(true)
    expect(cookie!.sameSite).toBe('Lax')
  })

  it('rejects a wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'wrong-password' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('rejects an unknown username', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'nobody', password: 'whatever123' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('locks the account after 10 consecutive failures', async () => {
    for (let i = 0; i < 9; i += 1) {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'admin', password: 'wrong-password' },
      })
    }
    const tenth = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'wrong-password' },
    })
    expect(tenth.statusCode).toBe(423)
    expect(tenth.json()).toMatchObject({ retryAfterSeconds: expect.any(Number) })

    const attemptWithCorrectPassword = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'admin-password-123' },
    })
    expect(attemptWithCorrectPassword.statusCode).toBe(423)
  })

  it('GET /auth/me reflects the logged-in session and 401s without one', async () => {
    const unauthenticated = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(unauthenticated.statusCode).toBe(401)

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'admin-password-123' },
    })
    const cookie = extractSessionCookie(login.headers['set-cookie'])

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toEqual({ id: expect.any(Number), username: 'admin', role: 'admin' })
  })

  it('POST /auth/logout clears the cookie and invalidates the session', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'admin-password-123' },
    })
    const cookie = extractSessionCookie(login.headers['set-cookie'])

    const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: { cookie } })
    expect(logout.statusCode).toBe(204)

    const meAfterLogout = await app.inject({ method: 'GET', url: '/auth/me', headers: { cookie } })
    expect(meAfterLogout.statusCode).toBe(401)
  })

  describe('POST /auth/users', () => {
    async function loginAsAdmin(): Promise<string> {
      const login = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'admin', password: 'admin-password-123' },
      })
      return extractSessionCookie(login.headers['set-cookie'])
    }

    it('lets an admin create a user, who can then log in', async () => {
      const adminCookie = await loginAsAdmin()

      const create = await app.inject({
        method: 'POST',
        url: '/auth/users',
        headers: { cookie: adminCookie },
        payload: { username: 'seconduser', password: 'second-user-password', role: 'user' },
      })
      expect(create.statusCode).toBe(201)
      expect(create.json()).toEqual({ id: expect.any(Number), username: 'seconduser', role: 'user' })

      const login = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'seconduser', password: 'second-user-password' },
      })
      expect(login.statusCode).toBe(200)
    })

    it('rejects a non-admin caller with 403', async () => {
      const adminCookie = await loginAsAdmin()
      await app.inject({
        method: 'POST',
        url: '/auth/users',
        headers: { cookie: adminCookie },
        payload: { username: 'regularuser', password: 'regular-user-password', role: 'user' },
      })
      const regularLogin = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { username: 'regularuser', password: 'regular-user-password' },
      })
      const regularCookie = extractSessionCookie(regularLogin.headers['set-cookie'])

      const attempt = await app.inject({
        method: 'POST',
        url: '/auth/users',
        headers: { cookie: regularCookie },
        payload: { username: 'thirduser', password: 'third-user-password', role: 'user' },
      })
      expect(attempt.statusCode).toBe(403)
    })

    it('rejects a duplicate username with 409', async () => {
      const adminCookie = await loginAsAdmin()
      const attempt = await app.inject({
        method: 'POST',
        url: '/auth/users',
        headers: { cookie: adminCookie },
        payload: { username: 'admin', password: 'irrelevant123', role: 'user' },
      })
      expect(attempt.statusCode).toBe(409)
    })
  })

  it('GET /healthz reports ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/healthz' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
