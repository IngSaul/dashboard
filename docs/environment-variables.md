# Environment variables (backend)

All read once at backend startup (`server/src/env.ts`), validated, and never
read directly from `process.env` anywhere else in the backend. Set them via
Docker Compose's `.env` file (copy `.env.example`) or exported shell
variables for local development.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ADMIN_USERNAME` | Yes | — | Only takes effect on the very first startup against an empty database. See [first-admin.md](./first-admin.md). |
| `ADMIN_PASSWORD` | Yes | — | Minimum 8 characters. Same one-time-effect caveat as above. |
| `COOKIE_SECURE` | No | `false` | Set to `true` only once the deployment sits behind your own TLS-terminating reverse proxy. A `Secure` cookie is silently dropped by browsers over plain HTTP — leave `false` for a plain-HTTP LAN deployment. |
| `SESSION_IDLE_TTL_DAYS` | No | `30` | A session stays valid as long as it's used at least once within this many days (sliding). |
| `SESSION_ABSOLUTE_TTL_DAYS` | No | `90` | Hard cap on a session's total lifetime, even with continuous daily use. |
| `DATABASE_PATH` | No | `./data/dashboard.sqlite3` | Where the SQLite file lives. In Docker Compose this is set to `/data/dashboard.sqlite3`, matching the bind-mounted `./data:/data` volume — see [backup-restore.md](./backup-restore.md). |
| `PORT` | No | `3210` | The backend's listen port. Not published to the host in Docker Compose — only `frontend`'s nginx reaches it over the internal network. |
| `NODE_ENV` | No | `development` | Standard Node environment flag; Docker Compose sets `production`. |

## Frontend

The frontend has no auth-related environment variables of its own — it
always talks to `/api/*` on its own origin (see `vite.config.ts`'s dev
proxy and `docker/nginx.conf`'s production proxy), so there is nothing to
configure for a different backend host/port.
