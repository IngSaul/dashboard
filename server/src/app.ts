import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type Database from 'better-sqlite3'
import type { SessionTtlConfig } from './auth/session.js'
import { createAuthenticate } from './plugins/authenticate.js'
import { registerAuthRoutes } from './auth/routes.js'
import { registerDashboardRoutes } from './dashboard/routes.js'
import { getSchemaVersion } from './db/migrate.js'

/** Mirrors `env.ts`'s `LOGIN_RATE_LIMIT_MAX` default, for callers (tests) that build an app without a parsed env. */
const DEFAULT_LOGIN_RATE_LIMIT_MAX = 20

export interface BuildAppDeps {
  db: Database.Database
  cookieSecure: boolean
  sessionTtl: SessionTtlConfig
  /** Max `POST /auth/login` attempts per IP per minute (`env.ts`'s `LOGIN_RATE_LIMIT_MAX`). Defaults to the same 20 the env schema does, so tests that don't care can omit it. */
  loginRateLimitMax?: number
  /** Defaults to `true`; route tests pass `false` to keep test output clean. */
  logger?: boolean
}

/**
 * Builds (but does not `listen()`) the Fastify app. Used both by production
 * bootstrap (`index.ts`) and by route tests via `app.inject()` against an
 * injected `:memory:` database — see server/test/auth.test.ts.
 */
export async function buildApp(deps: BuildAppDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: deps.logger ?? true })

  await app.register(cookie)
  // Same-origin deployment (nginx proxies /api/* to this service) — no
  // cross-origin requests are expected, so CORS is closed rather than
  // configured with an allow-list. See research.md §6.
  await app.register(cors, { origin: false })
  await app.register(helmet)
  await app.register(rateLimit, { global: false })

  const authenticate = createAuthenticate(deps.db, deps.sessionTtl)

  registerAuthRoutes(app, {
    db: deps.db,
    cookieSecure: deps.cookieSecure,
    sessionTtl: deps.sessionTtl,
    authenticate,
    loginRateLimitMax: deps.loginRateLimitMax ?? DEFAULT_LOGIN_RATE_LIMIT_MAX,
  })
  registerDashboardRoutes(app, { db: deps.db, authenticate })

  app.get('/healthz', async (_request, reply) => {
    try {
      deps.db.prepare('SELECT 1').get()
      // The applied schema version travels with the health check because it
      // is otherwise only knowable by opening the database file — which is
      // exactly what you cannot do while diagnosing a container that is
      // behaving oddly after a deploy.
      return { status: 'ok', schemaVersion: getSchemaVersion(deps.db) }
    } catch {
      return reply.code(503).send({ status: 'unavailable' })
    }
  })

  return app
}
