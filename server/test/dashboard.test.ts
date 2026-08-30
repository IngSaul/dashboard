import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { applyPragmas } from '../src/db/connection.js'
import { migrate } from '../src/db/migrate.js'
import { hashPassword } from '../src/auth/password.js'
import { buildApp } from '../src/app.js'

const TTL = { idleTtlDays: 30, absoluteTtlDays: 90 }

function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
  const header = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader
  if (!header) {
    throw new Error('expected a Set-Cookie header')
  }
  const [cookie] = header.split(';')
  if (!cookie) {
    throw new Error(`expected a name=value pair in Set-Cookie: ${header}`)
  }
  return cookie
}

describe('dashboard routes', () => {
  let db: Database.Database
  let app: FastifyInstance

  beforeEach(async () => {
    db = new Database(':memory:')
    applyPragmas(db)
    migrate(db)
    const passwordHash = await hashPassword('password-one-123')
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('userone', ?, 'user')").run(
      passwordHash,
    )
    const passwordHashTwo = await hashPassword('password-two-123')
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES ('usertwo', ?, 'user')").run(
      passwordHashTwo,
    )
    app = await buildApp({ db, cookieSecure: false, sessionTtl: TTL, logger: false })
  })

  afterEach(async () => {
    await app.close()
  })

  async function loginAs(username: string, password: string): Promise<string> {
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { username, password } })
    return extractSessionCookie(login.headers['set-cookie'])
  }

  it('returns 404 for a user with no saved config yet', async () => {
    const cookie = await loginAs('userone', 'password-one-123')
    const response = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
    expect(response.statusCode).toBe(404)
  })

  it('rejects unauthenticated access', async () => {
    const response = await app.inject({ method: 'GET', url: '/dashboard' })
    expect(response.statusCode).toBe(401)
  })

  it('round-trips a PUT then GET for the same user', async () => {
    const cookie = await loginAs('userone', 'password-one-123')
    const config = { version: 1, theme: 'dark' }

    const put = await app.inject({ method: 'PUT', url: '/dashboard', headers: { cookie }, payload: config })
    expect(put.statusCode).toBe(200)
    expect(put.json()).toEqual({ updatedAt: expect.any(String), revision: expect.any(Number) })

    const get = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
    expect(get.statusCode).toBe(200)
    expect(get.json()).toEqual(config)
  })

  it('rejects a malformed dashboard payload', async () => {
    const cookie = await loginAs('userone', 'password-one-123')
    const response = await app.inject({
      method: 'PUT',
      url: '/dashboard',
      headers: { cookie },
      payload: { notAValidConfig: true },
    })
    expect(response.statusCode).toBe(400)
  })

  it('keeps two users fully isolated — neither can read or overwrite the other', async () => {
    const cookieOne = await loginAs('userone', 'password-one-123')
    const cookieTwo = await loginAs('usertwo', 'password-two-123')

    await app.inject({
      method: 'PUT',
      url: '/dashboard',
      headers: { cookie: cookieOne },
      payload: { version: 1, theme: 'light', owner: 'one' },
    })
    await app.inject({
      method: 'PUT',
      url: '/dashboard',
      headers: { cookie: cookieTwo },
      payload: { version: 1, theme: 'dark', owner: 'two' },
    })

    const getOne = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie: cookieOne } })
    const getTwo = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie: cookieTwo } })

    expect(getOne.json()).toEqual({ version: 1, theme: 'light', owner: 'one' })
    expect(getTwo.json()).toEqual({ version: 1, theme: 'dark', owner: 'two' })
  })

  describe('account precondition (TD-02)', () => {
    /**
     * A browser attaches whichever session cookie is current when a request
     * actually leaves, which need not be the account that composed it — a
     * debounced write queued before a logout can fire after somebody else
     * signs in. `X-Dashboard-Account` states the intended account so the
     * server can refuse rather than silently overwrite.
     */
    function userIdFor(username: string): number {
      const row = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as
        | { id: number }
        | undefined
      if (!row) {
        throw new Error(`no such user: ${username}`)
      }
      return row.id
    }

    it('refuses a write addressed to a different account, leaving both configs untouched', async () => {
      const oneCookie = await loginAs('userone', 'password-one-123')
      const twoCookie = await loginAs('usertwo', 'password-two-123')
      const oneId = userIdFor('userone')
      const twoId = userIdFor('usertwo')

      await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie: twoCookie, 'x-dashboard-account': String(twoId) },
        payload: { version: 1, owner: 'usertwo' },
      })

      // usertwo's cookie, but a payload composed for userone.
      const crossAccount = await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie: twoCookie, 'x-dashboard-account': String(oneId) },
        payload: { version: 1, owner: 'userone' },
      })

      expect(crossAccount.statusCode).toBe(403)
      expect(crossAccount.json()).toMatchObject({ error: 'write addressed to a different account' })

      // usertwo keeps their own config, and userone gained nothing.
      const twoAfter = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie: twoCookie } })
      expect(twoAfter.json()).toMatchObject({ owner: 'usertwo' })
      const oneAfter = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie: oneCookie } })
      expect(oneAfter.statusCode).toBe(404)
    })

    it('accepts a write addressed to the session own account', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      const response = await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie, 'x-dashboard-account': String(userIdFor('userone')) },
        payload: { version: 1, owner: 'userone' },
      })
      expect(response.statusCode).toBe(200)
    })

    it('still accepts a write with no account header, for callers that never had one', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      const response = await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie },
        payload: { version: 1, owner: 'userone' },
      })
      expect(response.statusCode).toBe(200)
    })

    it('rejects a mismatch before validating the body, so a bad payload cannot mask it', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      const response = await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie, 'x-dashboard-account': '9999' },
        payload: { nonsense: true },
      })
      expect(response.statusCode).toBe(403)
    })
  })

  /**
   * Optimistic concurrency (the audit's TD-03 "dos pestañas hacen last
   * writer wins sin aviso"). Two tabs of the same account each hold a whole
   * configuration document built from the same starting point, so whichever
   * saves second used to erase the first without either of them noticing.
   */
  describe('revision conflicts', () => {
    async function putWith(
      cookie: string,
      payload: Record<string, unknown>,
      ifMatch?: string,
    ) {
      return app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie, ...(ifMatch !== undefined ? { 'if-match': ifMatch } : {}) },
        payload,
      })
    }

    it('hands out the current revision as an ETag on both GET and PUT', async () => {
      const cookie = await loginAs('userone', 'password-one-123')

      const created = await putWith(cookie, { version: 1, note: 'first' })
      expect(created.statusCode).toBe(200)
      expect(created.headers.etag).toBe('"1"')
      expect(created.json()).toMatchObject({ revision: 1 })

      const read = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
      expect(read.headers.etag).toBe('"1"')
    })

    it('bumps the revision on every write', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      for (const expected of [1, 2, 3]) {
        const response = await putWith(cookie, { version: 1, n: expected })
        expect(response.json()).toMatchObject({ revision: expected })
      }
    })

    it('refuses a write based on a revision that is no longer current, and keeps the newer state', async () => {
      const cookie = await loginAs('userone', 'password-one-123')

      // Both tabs read revision 1.
      await putWith(cookie, { version: 1, from: 'seed' })
      const read = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
      const sharedEtag = read.headers.etag as string
      expect(sharedEtag).toBe('"1"')

      // Tab A saves first and wins.
      const tabA = await putWith(cookie, { version: 1, from: 'tab-a' }, sharedEtag)
      expect(tabA.statusCode).toBe(200)
      expect(tabA.json()).toMatchObject({ revision: 2 })

      // Tab B saves on top of the state it read, which no longer exists.
      const tabB = await putWith(cookie, { version: 1, from: 'tab-b' }, sharedEtag)
      expect(tabB.statusCode).toBe(409)
      expect(tabB.json()).toMatchObject({ error: 'revision conflict', revision: 2 })
      expect(tabB.headers.etag).toBe('"2"')

      // The decisive part: tab A's write is still there, untouched.
      const after = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
      expect(after.json()).toMatchObject({ from: 'tab-a' })
      expect(after.headers.etag).toBe('"2"')
    })

    it('lets the losing tab succeed once it rebases on the revision it was given', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      await putWith(cookie, { version: 1, from: 'seed' })
      await putWith(cookie, { version: 1, from: 'tab-a' }, '"1"')

      const conflicted = await putWith(cookie, { version: 1, from: 'tab-b' }, '"1"')
      expect(conflicted.statusCode).toBe(409)

      const retried = await putWith(cookie, { version: 1, from: 'tab-b' }, conflicted.headers.etag as string)
      expect(retried.statusCode).toBe(200)
      expect(retried.json()).toMatchObject({ revision: 3 })
    })

    it('accepts If-Match: "0" only while the account has no config yet', async () => {
      const cookie = await loginAs('userone', 'password-one-123')

      const first = await putWith(cookie, { version: 1, from: 'first' }, '"0"')
      expect(first.statusCode).toBe(200)

      // The row exists now, so "0" is stale.
      const second = await putWith(cookie, { version: 1, from: 'second' }, '"0"')
      expect(second.statusCode).toBe(409)
    })

    it('still accepts a write with no If-Match, for callers that never read a revision', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      await putWith(cookie, { version: 1, from: 'seed' })

      const unconditional = await putWith(cookie, { version: 1, from: 'curl' })
      expect(unconditional.statusCode).toBe(200)
      expect(unconditional.json()).toMatchObject({ revision: 2 })
    })

    it('keeps revisions independent per account', async () => {
      const oneCookie = await loginAs('userone', 'password-one-123')
      const twoCookie = await loginAs('usertwo', 'password-two-123')

      await putWith(oneCookie, { version: 1, owner: 'one' })
      await putWith(oneCookie, { version: 1, owner: 'one' })
      const two = await putWith(twoCookie, { version: 1, owner: 'two' })

      // usertwo's first write is revision 1, regardless of userone's history.
      expect(two.json()).toMatchObject({ revision: 1 })
    })

    it('ignores a malformed If-Match rather than treating it as revision 0', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      await putWith(cookie, { version: 1, from: 'seed' })

      // Garbage cannot be read as a precondition, so it is treated as absent
      // — the alternative is parsing it as 0 and 409ing every such request.
      const response = await putWith(cookie, { version: 1, from: 'garbage-etag' }, 'not-a-revision')
      expect(response.statusCode).toBe(200)
    })
  })

  /**
   * The route-level half of TD-06: an authenticated client sending a
   * hostile configuration is refused, and nothing is stored.
   */
  describe('rejecting an unsafe configuration over the wire', () => {
    it('400s a shortcut pointing at javascript:, and stores nothing', async () => {
      const cookie = await loginAs('userone', 'password-one-123')

      const response = await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie },
        payload: {
          version: 1,
          shortcuts: [
            {
              id: 's1',
              label: 'Trap',
              url: 'javascript:alert(1)',
              globalOrder: 0,
              createdAt: 'a',
              updatedAt: 'b',
            },
          ],
        },
      })

      expect(response.statusCode).toBe(400)
      const after = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
      expect(after.statusCode).toBe(404)
    })

    it('400s an icon carrying SVG markup', async () => {
      const cookie = await loginAs('userone', 'password-one-123')

      const response = await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie },
        payload: {
          version: 1,
          shortcuts: [
            {
              id: 's1',
              label: 'Example',
              url: 'https://example.com',
              globalOrder: 0,
              createdAt: 'a',
              updatedAt: 'b',
              icon: {
                provider: 'simple-icons',
                value: '<svg onload="alert(1)"></svg>',
                resolvedAt: 'c',
              },
            },
          ],
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('does not replace an already-stored safe config with a rejected one', async () => {
      const cookie = await loginAs('userone', 'password-one-123')
      await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie },
        payload: { version: 1, marker: 'safe' },
      })

      await app.inject({
        method: 'PUT',
        url: '/dashboard',
        headers: { cookie },
        payload: {
          version: 1,
          marker: 'hostile',
          shortcuts: [
            { id: 's1', label: 'x', url: 'javascript:alert(1)', globalOrder: 0, createdAt: 'a', updatedAt: 'b' },
          ],
        },
      })

      const after = await app.inject({ method: 'GET', url: '/dashboard', headers: { cookie } })
      expect(after.json()).toMatchObject({ marker: 'safe' })
    })
  })
})
