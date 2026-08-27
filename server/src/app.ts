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

export interface BuildAppDeps {
  db: Database.Database
  cookieSecure: boolean
  sessionTtl: SessionTtlConfig
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
  })
  registerDashboardRoutes(app, { db: deps.db, authenticate })

  app.get('/healthz', async (_request, reply) => {
    try {
      deps.db.prepare('SELECT 1').get()
      return { status: 'ok' }
    } catch {
      return reply.code(503).send({ status: 'unavailable' })
    }
  })

  return app
}
