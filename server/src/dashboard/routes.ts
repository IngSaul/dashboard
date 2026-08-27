import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { validateDashboardConfigPayload } from './schema.js'
import { getConfigForUser, upsertConfigForUser } from './repository.js'
import type { Authenticate } from '../plugins/authenticate.js'

export interface DashboardRouteDeps {
  db: Database.Database
  authenticate: Authenticate
}

export function registerDashboardRoutes(app: FastifyInstance, deps: DashboardRouteDeps): void {
  const { db, authenticate } = deps

  app.get('/dashboard', { preHandler: authenticate }, async (request, reply) => {
    const record = getConfigForUser(db, request.user!.id)
    if (!record) {
      return reply.code(404).send({ error: 'not found' })
    }
    return reply.code(200).send(JSON.parse(record.configJson) as unknown)
  })

  app.put('/dashboard', { preHandler: authenticate }, async (request, reply) => {
    const validated = validateDashboardConfigPayload(request.body)
    if (!validated.ok) {
      return reply.code(400).send({ error: validated.error })
    }
    const record = upsertConfigForUser(db, request.user!.id, validated.json, validated.schemaVersion)
    return reply.code(200).send({ updatedAt: record.updatedAt })
  })
}
