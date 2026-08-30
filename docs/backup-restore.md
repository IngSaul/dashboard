# Backing up and restoring the database

All accounts, sessions, and dashboard configurations live in one SQLite
file, bind-mounted from the host at `./data/dashboard.sqlite3` (relative to
the repo root where `docker-compose.yml` lives). `docker compose down` and
container recreation never touch this directory — only `docker compose down
-v` (which this deployment has no named volumes for, so it wouldn't apply
here) or manually deleting `./data` would.

## Backup

The database uses SQLite's WAL mode, so while the backend is running you
may also see `dashboard.sqlite3-wal` and `dashboard.sqlite3-shm` alongside
the main file — back up all three together:

```bash
# Safest: stop the backend first so nothing is mid-write.
docker compose stop backend
cp -a ./data ./data-backup-$(date +%Y%m%d-%H%M%S)
docker compose start backend
```

Copying while the backend is running is usually fine too (SQLite's WAL mode
is designed for this), but stopping it first removes any doubt for a
homelab backup script you don't want to babysit.

## Restore

```bash
docker compose down
rm -rf ./data
cp -a ./data-backup-<timestamp> ./data
docker compose up -d
```

## A note on file ownership

The backend container runs as `root` inside the container (a deliberate
simplicity trade-off — see `specs/003-auth-persistence/plan.md`), so files
it creates under `./data` on the host are owned by `root`. If your backup
tooling runs as a regular user, you may need `sudo` to read/copy them, or to
run backup/cleanup commands inside a throwaway container, e.g.:

```bash
docker run --rm -v "$(pwd)/data:/data" alpine sh -c "tar -C /data -czf - ." > backup.tar.gz
```

## Moving to a different host

The `./data` directory is entirely self-contained — copy it to the new
host's repo checkout in the same relative location and run
`docker compose up -d`.

## Before a schema upgrade

A release that changes the database schema migrates it in place on first
startup, and migrations only move forward — there is no automatic downgrade.
Take a backup first, and see
[database-migrations.md](./database-migrations.md) for how to check which
schema version a database is on and how to rehearse an upgrade against a
copy.
