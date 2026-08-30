import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { createUserBodySchema, loginBodySchema } from './schema.js'
import { hashPassword, verifyPassword } from './password.js'
import { clearLockout, isLocked, recordFailedLogin } from './lockout.js'
import { createSession, deleteSessionByToken, type SessionTtlConfig } from './session.js'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './cookie.js'
import { requireUser, type Authenticate } from '../plugins/authenticate.js'
import type { AuthenticatedUser, UserRole } from '../types.js'

interface UserRow {
  id: number
  username: string
  password_hash: string
  role: UserRole
}

export interface AuthRouteDeps {
  db: Database.Database
  cookieSecure: boolean
  sessionTtl: SessionTtlConfig
  authenticate: Authenticate
  /** Max `POST /auth/login` attempts per IP per minute — see `env.ts`'s `LOGIN_RATE_LIMIT_MAX`. */
  loginRateLimitMax: number
}

/**
 * A verify performed against a fixed, never-matching hash whenever the
 * username lookup fails — keeps the "unknown username" response roughly as
 * slow as the "known username, wrong password" response, so a client can't
 * distinguish account existence purely from response timing.
 */
const TIMING_SAFE_DECOY_HASH = await hashPassword('correct-horse-battery-staple-decoy-only')

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDeps): void {
  const { db, cookieSecure, sessionTtl, authenticate, loginRateLimitMax } = deps

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: loginRateLimitMax, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const parsed = loginBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid request' })
      }
      const { username, password } = parsed.data

      const user = db
        .prepare('SELECT id, username, password_hash, role FROM users WHERE username = ? COLLATE NOCASE')
        .get(username) as UserRow | undefined

      if (!user) {
        await verifyPassword(TIMING_SAFE_DECOY_HASH, password)
        return reply.code(401).send({ error: 'invalid credentials' })
      }

      const lockStatus = isLocked(db, user.id)
      if (lockStatus.locked) {
        return reply.code(423).send({ error: 'account locked', retryAfterSeconds: lockStatus.retryAfterSeconds })
      }

      const passwordValid = await verifyPassword(user.password_hash, password)
      if (!passwordValid) {
        const result = recordFailedLogin(db, user.id)
        if (result.locked) {
          return reply
            .code(423)
            .send({ error: 'account locked', retryAfterSeconds: result.retryAfterSeconds })
        }
        return reply.code(401).send({ error: 'invalid credentials' })
      }

      clearLockout(db, user.id)
      const userAgentHeader = request.headers['user-agent']
      const { token, expiresAt } = createSession(db, user.id, sessionTtl, {
        userAgent: typeof userAgentHeader === 'string' ? userAgentHeader : null,
        ipAddress: request.ip,
      })
      reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(cookieSecure, new Date(expiresAt)))

      const body: AuthenticatedUser = { id: user.id, username: user.username, role: user.role }
      return reply.code(200).send(body)
    },
  )

  app.post('/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME]
    if (token) {
      deleteSessionByToken(db, token)
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return reply.code(204).send()
  })

  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    const user = db
      .prepare('SELECT id, username, role FROM users WHERE id = ?')
      .get(requireUser(request).id) as { id: number; username: string; role: UserRole } | undefined
    if (!user) {
      return reply.code(401).send({ error: 'unauthenticated' })
    }
    return reply.code(200).send(user)
  })

  app.post('/auth/users', { preHandler: authenticate }, async (request, reply) => {
    if (requireUser(request).role !== 'admin') {
      return reply.code(403).send({ error: 'forbidden' })
    }
    const parsed = createUserBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid request' })
    }
    const { username, password, role } = parsed.data

    const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username)
    if (existing) {
      return reply.code(409).send({ error: 'username already exists' })
    }

    const passwordHash = await hashPassword(password)
    const inserted = db
      .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) RETURNING id')
      .get(username, passwordHash, role) as { id: number }

    const body: AuthenticatedUser = { id: inserted.id, username, role }
    return reply.code(201).send(body)
  })
}
