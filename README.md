# Personal Browser Dashboard

A distraction-free start page that replaces your browser's default new-tab
page: search, current date/time, weather, and configurable shortcut cards
grouped by category — no ads, no feeds. Built with React, TypeScript, and
Vite, with a small Fastify + SQLite backend for real accounts and per-user
persistence, deployable via Docker Compose in a homelab.

See [specs/001-browser-dashboard/spec.md](specs/001-browser-dashboard/spec.md)
and [specs/003-auth-persistence/spec.md](specs/003-auth-persistence/spec.md)
for the full feature specifications and
[CLAUDE.md](CLAUDE.md) for project conventions and workflow.

## Features

- Global search with a configurable destination
- Live date/time and current weather (non-blocking; degrades gracefully when
  unavailable)
- Shortcut cards grouped into categories: add, edit, remove, and reorder
- Light/dark/system theme, remembered across sessions
- Full keyboard navigation and accessible labels/focus states
- Desktop-first responsive layout with tablet support
- Real accounts (username/password), with a session that survives closing
  and reopening the browser — no need to log in every visit
- Per-account dashboard configuration, persisted server-side; a
  pre-existing browser-only configuration is migrated to your account
  automatically on first login

## Getting Started

### Prerequisites

- Node.js and npm (see `package.json`/`server/package.json` for the
  toolchain versions this was built against).
- For the backend: a C/C++ build toolchain is only needed if npm can't fetch
  prebuilt native binaries for `better-sqlite3`/`argon2` for your platform —
  usually unnecessary.

### Install

```bash
npm install
```

Installs both the frontend and the `server` npm workspace.

### Run in development

Two processes, in separate terminals:

```bash
# Terminal 1 — backend (needs at least these two env vars)
ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me npm run dev --workspace=server

# Terminal 2 — frontend (proxies /api/* to the backend, see vite.config.ts)
npm run dev
```

Opens the dashboard with hot module reloading at the URL Vite prints
(default `http://localhost:5173`). Log in with the `ADMIN_USERNAME`/
`ADMIN_PASSWORD` you set — see [docs/first-admin.md](docs/first-admin.md).

### Build for production

```bash
npm run build                    # frontend: type-checks + dist/
npm run build --workspace=server # backend: type-checks + server/dist/
```

Preview the frontend production build locally with `npm run preview` (the
backend must be running separately, and won't be proxied to unless you also
configure a reverse proxy — this is what `docker compose` sets up for you,
see below).

### Lint and format

```bash
npm run lint        # check
npm run lint:fix     # check and auto-fix
```

### Tests

```bash
npm test             # frontend unit + integration tests (Vitest)
npm run test:server  # backend tests (Vitest)
npm run test:watch   # frontend watch mode
npm run test:e2e     # end-to-end tests (Playwright; starts both dev servers)
npm run test:e2e:ui  # Playwright UI mode
```

## Running with Docker Compose (recommended for a homelab)

```bash
cp .env.example .env   # then edit ADMIN_USERNAME/ADMIN_PASSWORD
docker compose up -d --build
```

Visit `http://<host>:8080`. See:

- [docs/first-admin.md](docs/first-admin.md) — bootstrapping the first account
- [docs/environment-variables.md](docs/environment-variables.md) — full env var reference
- [docs/backup-restore.md](docs/backup-restore.md) — backing up/restoring `./data/dashboard.sqlite3`
- [docs/managing-users.md](docs/managing-users.md) — creating additional accounts

`docker compose down` followed by `docker compose up -d` preserves all
accounts, sessions, and dashboard configurations — the database lives in a
bind-mounted `./data` directory, untouched by container recreation.

## Using it as your new-tab page

Once deployed (Docker Compose, or your own reverse proxy in front of the
built frontend + backend), point your browser's new-tab setting at its URL.
Browser-specific new-tab override steps vary by browser/extension and are
outside this repo's scope.

## Project Structure

```
src/
├── components/   # reusable UI, including auth/ (LoginScreen, AuthGate) and glass/ (design system)
├── config/       # typed defaults and validation/repair (defaults.ts, schema.ts)
├── features/dashboard/  # composition shell (Dashboard.tsx, Dashboard.css)
├── services/     # business logic (configStore, search, weather, shortcuts, categories, theme,
│                 #   auth/ AuthClient + migration, storage/ StorageProvider + Local/RemoteStorageProvider)
├── state/        # React context providers, including AuthProvider
├── types/        # shared domain types
└── utils/        # dateTime, validation, keyboard helpers

server/           # Fastify + SQLite backend (npm workspace) — auth, sessions, per-user config storage
├── src/          # app.ts, auth/, dashboard/, db/, plugins/
└── test/         # Vitest route/unit tests

tests/
├── unit/         # business logic tests (Vitest)
├── integration/  # component interaction tests (Testing Library)
├── e2e/          # browser-level tests (Playwright)
└── fixtures/     # shared test fixtures

docker/           # nginx.conf (reverse proxy for the frontend image)
docs/             # first-admin, environment-variables, backup-restore, managing-users
```

Shortcuts, categories, search destination, weather preference, theme, and
every other dashboard preference are typed and validated
(`config/schema.ts`), and persist to the backend per account (see
[specs/003-auth-persistence/data-model.md](specs/003-auth-persistence/data-model.md)) —
nothing personal is hardcoded into components. See
[specs/001-browser-dashboard/data-model.md](specs/001-browser-dashboard/data-model.md)
for the dashboard configuration's own data model, which this feature wraps
rather than redesigns.
