import type { FastifyReply, FastifyRequest } from 'fastify'
import type Database from 'better-sqlite3'
import { touchSession, validateSessionToken, type SessionTtlConfig } from '../auth/session.js'
import { SESSION_COOKIE_NAME } from '../auth/cookie.js'
import type { RequestUser } from '../types.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: RequestUser
  }
}

export type Authenticate = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

/**
 * The authenticated user of a route registered behind `authenticate`.
 *
 * `request.user` is optional in the type because it is optional in reality:
 * it is only set for routes that actually registered the preHandler. Call
 * sites used to assert that away with `!`, which turns a wiring mistake — a
 * new authenticated route added without the preHandler — into a `TypeError`
 * somewhere deeper in the handler, or worse, a query against `undefined`.
 * Failing here says exactly what is wrong.
 */
export function requireUser(request: FastifyRequest): RequestUser {
  const user = request.user
  if (!user) {
    throw new Error('route handler reached without the `authenticate` preHandler')
  }
  return user
}

/**
 * `preHandler` factory: reads the session cookie, validates it, and attaches
 * `request.user`. Any missing/invalid/expired session responds `401` and
 * short-circuits the route handler — the single point every authenticated
 * endpoint funnels through (see contracts/api-contract.md's cookie section).
 */
export function createAuthenticate(db: Database.Database, sessionTtl: SessionTtlConfig): Authenticate {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = request.cookies[SESSION_COOKIE_NAME]
    const validated = token ? validateSessionToken(db, token) : null
    if (!validated) {
      await reply.code(401).send({ error: 'unauthenticated' })
      return
    }
    touchSession(db, validated.sessionId, sessionTtl)
    request.user = { id: validated.userId, role: validated.role }
  }
}
