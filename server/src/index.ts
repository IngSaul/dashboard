import { loadEnv } from './env.js'
import { openDatabase } from './db/connection.js'
import { migrate } from './db/migrate.js'
import { bootstrapAdmin } from './db/bootstrapAdmin.js'
import { sweepExpiredSessions } from './auth/session.js'
import { buildApp } from './app.js'

/** Expired-session sweep interval — small table, no external cron process needed (research.md §4). */
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000

async function main(): Promise<void> {
  const env = loadEnv()

  const db = openDatabase(env.DATABASE_PATH)
  const migration = migrate(db)
  if (migration.applied.length > 0) {
    console.info(
      `Database schema migrated ${migration.from} -> ${migration.to}: ` +
        migration.applied.map((entry) => `${entry.id} (${entry.name})`).join(', '),
    )
  } else {
    console.info(`Database schema up to date at version ${migration.to}`)
  }
  await bootstrapAdmin(db, { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD })

  setInterval(() => sweepExpiredSessions(db), SWEEP_INTERVAL_MS).unref()

  const app = await buildApp({
    db,
    cookieSecure: env.COOKIE_SECURE,
    sessionTtl: {
      idleTtlDays: env.SESSION_IDLE_TTL_DAYS,
      absoluteTtlDays: env.SESSION_ABSOLUTE_TTL_DAYS,
    },
    loginRateLimitMax: env.LOGIN_RATE_LIMIT_MAX,
  })

  await app.listen({ host: '0.0.0.0', port: env.PORT })
}

main().catch((error: unknown) => {
  console.error('Fatal startup error:', error)
  process.exit(1)
})
