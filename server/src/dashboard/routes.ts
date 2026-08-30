import type { FastifyInstance } from 'fastify'
import type Database from 'better-sqlite3'
import { validateDashboardConfigPayload } from './schema.js'
import { getConfigForUser, upsertConfigForUser } from './repository.js'
import { requireUser, type Authenticate } from '../plugins/authenticate.js'

export interface DashboardRouteDeps {
  db: Database.Database
  authenticate: Authenticate
}

/**
 * Names the account a write was *composed for*. The browser attaches
 * whichever session cookie is current when a request actually leaves, which
 * is not necessarily the account that scheduled it: a debounced write queued
 * by one user can fire after that user logged out and another logged in on
 * the same browser. Comparing this header against the session's own user id
 * turns that from a silent cross-account overwrite into a refused request.
 *
 * Mirrors `ACCOUNT_HEADER` in `src/services/auth/AuthClient.ts`. Optional:
 * a caller that omits it (curl, the e2e suite's raw API calls) is trusted to
 * mean "whoever this cookie belongs to", exactly as before.
 */
export const ACCOUNT_HEADER = 'x-dashboard-account'

/**
 * `GET` answers with the stored revision as a strong `ETag`; `PUT` echoes it
 * back as `If-Match` to say "I composed this on top of that state".
 *
 * Without it, two tabs of the same account are a straight last-writer-wins
 * race: the second one to save silently erases whatever the first did,
 * because both sent a complete configuration document built from the same
 * starting point.
 *
 * A `PUT` with no `If-Match` keeps the old behaviour deliberately — a caller
 * that never read a revision (curl, a script) is trusted to mean "replace
 * whatever is there".
 */
function parseIfMatch(header: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(header) ? header[0] : header
  if (raw === undefined) {
    return undefined
  }
  const unquoted = raw.trim().replace(/^W\//, '').replace(/^"(.*)"$/, '$1')
  const parsed = Number(unquoted)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

function etagFor(revision: number): string {
  return `"${revision}"`
}

export function registerDashboardRoutes(app: FastifyInstance, deps: DashboardRouteDeps): void {
  const { db, authenticate } = deps

  app.get('/dashboard', { preHandler: authenticate }, async (request, reply) => {
    const record = getConfigForUser(db, requireUser(request).id)
    if (!record) {
      return reply.code(404).send({ error: 'not found' })
    }
    return reply
      .code(200)
      .header('ETag', etagFor(record.revision))
      .send(JSON.parse(record.configJson) as unknown)
  })

  app.put('/dashboard', { preHandler: authenticate }, async (request, reply) => {
    const sessionUserId = requireUser(request).id
    const intendedAccount = request.headers[ACCOUNT_HEADER]
    if (typeof intendedAccount === 'string' && intendedAccount !== String(sessionUserId)) {
      request.log.warn(
        { sessionUserId, intendedAccount },
        'rejected a dashboard write addressed to a different account',
      )
      return reply.code(403).send({ error: 'write addressed to a different account' })
    }

    const validated = validateDashboardConfigPayload(request.body)
    if (!validated.ok) {
      return reply.code(400).send({ error: validated.error })
    }

    const expectedRevision = parseIfMatch(request.headers['if-match'])
    const outcome = upsertConfigForUser(
      db,
      sessionUserId,
      validated.json,
      validated.schemaVersion,
      expectedRevision,
    )

    if (!outcome.ok) {
      // Somebody — another tab, another device — saved in between. The
      // client's document was composed on top of a state that no longer
      // exists, so applying it would erase that other save without a trace.
      // Refuse, and hand back the revision it would need to be based on.
      //
      // RFC 9110 would call this 412 for a failed `If-Match`; 409 is used
      // deliberately, as the more accurate description of *why* the
      // precondition failed and the code the frontend already branches on.
      request.log.info(
        { sessionUserId, expectedRevision, currentRevision: outcome.currentRevision },
        'rejected a dashboard write based on a stale revision',
      )
      return reply
        .code(409)
        .header('ETag', etagFor(outcome.currentRevision))
        .send({ error: 'revision conflict', revision: outcome.currentRevision })
    }

    return reply
      .code(200)
      .header('ETag', etagFor(outcome.record.revision))
      .send({ updatedAt: outcome.record.updatedAt, revision: outcome.record.revision })
  })
}
