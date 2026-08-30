# Database migrations

The SQLite schema evolves through an ordered list of migrations, each
applied exactly once and recorded in a `schema_migrations` table. The
server applies pending migrations on every startup, so a normal deploy needs
no extra step.

## Why there is a migration system at all

The schema used to be one block of `CREATE TABLE IF NOT EXISTS` DDL run at
startup. That is fine for a schema that never changes, and nothing else: it
can create tables but never alter them, and it keeps no record of what it
has done. The first column that needed adding had nowhere to go.

The system that replaced it is deliberately small — a ledger table and an
ordered array. There is no migration framework, no separate tool, and no
generated files.

## Two different things called a "version"

| | Meaning |
|---|---|
| `schema_migrations.id` | The **database** schema version. Owned by the server; what this document is about. |
| `dashboard_configs.schema_version` | The **dashboard configuration** version (`DashboardConfiguration.version`), owned by the client. The server stores it and never interprets it. |

They are unrelated and move independently.

## Checking which version a database is on

```bash
# From a running deployment
curl -s http://backend:3210/healthz            # {"status":"ok","schemaVersion":2}

# Against a database file, without starting the server
npm run migrate:check --workspace=server
```

The server also logs the version — and any migrations it applied — on
startup.

`migrate:check` exits non-zero only when the database is *ahead* of the
build (see below). Pending migrations are reported but exit `0`: the server
would apply them on its next start, so that is information, not a failure.

## Applying migrations without starting the server

```bash
npm run migrate --workspace=server
```

Both commands read `DATABASE_PATH` from the same environment the server does
(see [environment-variables.md](./environment-variables.md)). Inside Docker:

```bash
docker compose exec backend node server/dist/db/cli.js --check
```

This is not how migrations normally run. It is for the two moments where you
want the schema without the app: checking a version, and rehearsing an
upgrade against a **copy** of the data before doing it for real. Take a
backup first — see [backup-restore.md](./backup-restore.md).

## Adding a migration

Append an entry to `MIGRATIONS` in `server/src/db/migrations.ts`:

```ts
{
  id: 3,
  name: 'short description',
  up(db) {
    db.exec('ALTER TABLE dashboard_configs ADD COLUMN example TEXT NOT NULL DEFAULT ""')
  },
}
```

Rules, all enforced at startup rather than left to review:

- **Append only.** Never edit a migration that has run against a real
  database: two deployments would then disagree about what version 3
  contains, and neither could tell. Fix it in a new entry.
- **Ids are unique positive integers.** A duplicate would fail *silently* —
  the second entry looks "already applied" and is skipped — so it throws
  instead.
- **Order comes from `id`, not array position.** The list is sorted before
  running.
- **Each migration runs in its own transaction**, together with its ledger
  row, so a failure can never leave a half-applied migration recorded as
  done. SQLite supports transactional DDL, so this covers `ALTER TABLE` too.
- **Give `ALTER TABLE ... ADD COLUMN` a default** when the column is
  `NOT NULL` — SQLite requires one, and existing rows need a value.

Migration 1 keeps its `IF NOT EXISTS` DDL on purpose: that is what lets a
database created before this system existed adopt the ledger silently and
then receive everything after it.

## A database newer than the build

If a database has a schema version higher than the highest migration the
running build ships, the server **refuses to start**:

```
Database schema version 3 is newer than this build knows about (2).
```

This is the shape a rolled-back deployment takes — an image is upgraded, it
migrates, then the image is rolled back. Doing nothing would be worse than
failing: every known migration looks applied, `migrate` would report success,
and the old build would read a schema it knows nothing about. Migrations only
move forward, so there is no automatic recovery. Either deploy the newer
build again, or restore a backup taken before the upgrade.
