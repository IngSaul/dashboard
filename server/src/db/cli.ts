import { loadEnv } from '../env.js'
import { openDatabase } from './connection.js'
import { getExpectedSchemaVersion, getSchemaVersion, migrate } from './migrate.js'

/**
 * Applies pending migrations to the configured database and reports the
 * result, without starting the server.
 *
 * The server migrates on startup anyway, so this is not how migrations
 * normally run. It exists for the two moments where you need the schema
 * *without* the app: checking which version a database is actually on, and
 * rehearsing an upgrade against a copy of the data before doing it for real
 * (see docs/backup-restore.md and docs/database-migrations.md).
 *
 *   node server/dist/db/cli.js          # apply and report
 *   node server/dist/db/cli.js --check  # report only, change nothing
 */
function main(): void {
  const checkOnly = process.argv.includes('--check')
  const env = loadEnv()
  const db = openDatabase(env.DATABASE_PATH)
  const expected = getExpectedSchemaVersion()

  try {
    if (checkOnly) {
      const current = getSchemaVersion(db)
      console.info(`${env.DATABASE_PATH}: schema version ${current}, this build expects ${expected}`)
      if (current !== expected) {
        console.info(
          current < expected
            ? 'Pending migrations. Run without --check, or start the server, to apply them.'
            : 'This database is ahead of this build; see docs/database-migrations.md.',
        )
      }
      // A pending migration is information, not a failure: the server would
      // apply it on the next start. Only a database ahead of this build is
      // a state a deploy should stop on.
      process.exitCode = current > expected ? 1 : 0
      return
    }

    const result = migrate(db)
    if (result.applied.length === 0) {
      console.info(`${env.DATABASE_PATH}: already at schema version ${result.to}, nothing to do`)
      return
    }
    console.info(
      `${env.DATABASE_PATH}: migrated ${result.from} -> ${result.to}\n` +
        result.applied.map((entry) => `  applied ${entry.id} (${entry.name})`).join('\n'),
    )
  } finally {
    db.close()
  }
}

try {
  main()
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
