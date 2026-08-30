# Environment variables (backend)

All read once at backend startup (`server/src/env.ts`), validated, and never
read directly from `process.env` anywhere else in the backend. Set them via
Docker Compose's `.env` file (copy `.env.example`) or exported shell
variables for local development.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ADMIN_USERNAME` | Yes | — | Only takes effect on the very first startup against an empty database. See [first-admin.md](./first-admin.md). |
| `ADMIN_PASSWORD` | Yes | — | Minimum 8 characters. Same one-time-effect caveat as above. |
| `COOKIE_SECURE` | **Yes in production** | `false` | Adds `Secure` to the session cookie. Only the exact strings `true`/`false` are accepted — `TRUE`, `1` or `yes` are startup errors, not an implicit `false`. **A backend with `NODE_ENV=production` refuses to start unless this is `true`** (see [Transport security](#transport-security) below). |
| `SESSION_IDLE_TTL_DAYS` | No | `30` | A session stays valid as long as it's used at least once within this many days (sliding). |
| `SESSION_ABSOLUTE_TTL_DAYS` | No | `90` | Hard cap on a session's total lifetime, even with continuous daily use. |
| `DATABASE_PATH` | No | `./data/dashboard.sqlite3` | Where the SQLite file lives. In Docker Compose this is set to `/data/dashboard.sqlite3`, matching the bind-mounted `./data:/data` volume — see [backup-restore.md](./backup-restore.md). Also read by the migration commands ([database-migrations.md](./database-migrations.md)). |
| `PORT` | No | `3210` | The backend's listen port. Not published to the host in Docker Compose — only `frontend`'s nginx reaches it over the internal network. |
| `LOGIN_RATE_LIMIT_MAX` | No | `20` | Max `POST /auth/login` attempts per IP per minute. Raise it only for an automated suite arriving from a single address — the Playwright suite sets it high because every worker logs in from loopback. |
| `NODE_ENV` | No | `development` | Standard Node environment flag; Docker Compose and `server/Dockerfile` both set `production`, which activates the transport requirements below. |

## Transport security

The session cookie is a bearer credential: anyone who reads it off the wire
is logged in as that user. It is `HttpOnly` and `SameSite=Lax` in every
environment, but only `Secure` — meaning the browser refuses to send it over
plain HTTP — when `COOKIE_SECURE=true`.

Three environments, three different expectations:

| | `NODE_ENV` | `COOKIE_SECURE` | Transport |
|---|---|---|---|
| Local development | `development` (default) | `false` (default) | Plain HTTP on `localhost`, no proxy |
| Test / Playwright | `test` | `false` | Plain HTTP on loopback |
| Production | `production` | **`true`, enforced** | HTTPS only, TLS terminated by Traefik |

In production the backend **fails to start** if `COOKIE_SECURE` is anything
other than `true`, naming the variable and what to do about it. This is
deliberate: a warning in a container log is easy to miss, and the failure
mode it guards against (a session cookie travelling in clear text) is
invisible until it has already happened. If you genuinely want a plain-HTTP
LAN deployment, run it with `NODE_ENV=development` rather than weakening the
production path.

### Traefik

`docker-compose.yml` publishes two routers for the frontend container:

- an HTTPS router on `TRAEFIK_HTTPS_ENTRYPOINT` (default `websecure`) with
  `tls=true` and `tls.certresolver=$TRAEFIK_CERT_RESOLVER`;
- an HTTP router on `TRAEFIK_HTTP_ENTRYPOINT` (default `web`) whose only
  behaviour is a permanent redirect to `https://`.

| Variable | Default | Notes |
|---|---|---|
| `DASHBOARD_HOST` | `dashboard.avalonnova.com` | Hostname both routers match on. |
| `TRAEFIK_HTTPS_ENTRYPOINT` | `websecure` | Must name an entrypoint in your Traefik **static** configuration. |
| `TRAEFIK_HTTP_ENTRYPOINT` | `web` | Same; used only for the redirect. |
| `TRAEFIK_CERT_RESOLVER` | `letsencrypt` | Must name an entry under `certificatesResolvers` in your Traefik static configuration. **Verify this before deploying** — a resolver that doesn't exist means no certificate, and with a `Secure` cookie that means nobody can log in. |

These are consumed by Docker Compose when it renders the container labels,
not by the backend — they never reach `env.ts`.

## Frontend

The frontend has no auth-related environment variables of its own — it
always talks to `/api/*` on its own origin (see `vite.config.ts`'s dev
proxy and `docker/nginx.conf`'s production proxy), so there is nothing to
configure for a different backend host/port.
