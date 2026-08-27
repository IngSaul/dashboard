# Creating the first administrator account

The dashboard has no self-service registration — every account is created
either by the automatic bootstrap described here (the first admin) or by an
existing administrator (see [managing-users.md](./managing-users.md)).

## How it works

On every backend startup, before the HTTP server starts accepting requests,
it checks whether any account with `role = 'admin'` already exists:

- **If none exists**, it creates one using the `ADMIN_USERNAME` and
  `ADMIN_PASSWORD` environment variables.
- **If one already exists**, this is a no-op — the env vars are ignored.

This means `ADMIN_USERNAME`/`ADMIN_PASSWORD` only matter the very first time
the backend starts against an empty database. Changing them afterward (e.g.
in your `.env` file) has no effect on the existing admin account.

## Docker Compose

1. Copy `.env.example` to `.env` at the repo root and set real values:

   ```env
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=a-real-password-here
   ```

2. Start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Visit the dashboard and log in with those credentials.

## Local development (without Docker)

Export the same two variables before starting the backend:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=a-real-password-here npm run dev --workspace=server
```

## If you need to reset the admin account

There is no password-change endpoint in this release (see
[managing-users.md](./managing-users.md) for why, and the recovery path).
The simplest reset is to delete the admin's row directly from the SQLite
database (see [backup-restore.md](./backup-restore.md) for how to open it)
and restart the backend — bootstrap will recreate it from the current
`ADMIN_USERNAME`/`ADMIN_PASSWORD`.
