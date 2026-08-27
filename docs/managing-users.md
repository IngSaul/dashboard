# Managing users

## Roles

Two roles exist: `admin` and `user`. The only difference today is that
`admin` accounts can create new accounts (below); there is no other
permission distinction.

## Creating an additional account

There is no user-management screen in this release — an administrator
creates accounts via the API, while logged in (the session cookie
authorizes the request):

```bash
curl -X POST http://<your-dashboard-host>/api/auth/users \
  -H "Content-Type: application/json" \
  -b "dashboard_session=<your admin session cookie value>" \
  -d '{"username": "someone", "password": "a-real-password", "role": "user"}'
```

The easiest way to get a valid session cookie value is your browser's dev
tools (Application/Storage → Cookies) while logged in as an admin, or by
logging in with `curl -c cookies.txt` first:

```bash
curl -c cookies.txt -X POST http://<your-dashboard-host>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "<admin password>"}'

curl -b cookies.txt -X POST http://<your-dashboard-host>/api/auth/users \
  -H "Content-Type: application/json" \
  -d '{"username": "someone", "password": "a-real-password", "role": "user"}'
```

A duplicate username is rejected with `409 Conflict`; a non-admin session
attempting this is rejected with `403 Forbidden`.

The new account can log in immediately with the username/password you gave
it, and starts with its own independent dashboard configuration (defaults,
or its own migrated local settings on first login — see the spec's User
Story 4).

## What's intentionally not included in this release

- **Self-registration** — accounts are always admin-created, by design.
- **Listing, editing, or deleting users** — not exposed via API or UI yet;
  if you need this, query/edit the `users` table directly in the SQLite
  database (see [backup-restore.md](./backup-restore.md) for locating it).
- **Password change/reset** — the recovery path for a lost admin password is
  documented in [first-admin.md](./first-admin.md). For a non-admin account,
  an administrator can currently only recreate it (delete the row, have the
  user "sign up" again via `POST /auth/users`) since there is no
  password-reset endpoint yet.

These are documented, deliberate limitations for this pass, not oversights
— see `specs/003-auth-persistence/spec.md`'s Assumptions section.
