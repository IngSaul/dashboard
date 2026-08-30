# Diagnosing configuration sync

Dashboard configuration is saved to the server in the background: a change
schedules a write, one write is in flight at a time, failures are retried
with backoff, and nothing is discarded silently. When something does go
wrong, this is where to look.

## What the user sees

Nothing, while it is working — a badge that appears on every keystroke would
be noise. An indicator appears at the bottom of the screen only when this
tab's copy and the server's have come apart:

| Message | Meaning | What to do |
|---|---|---|
| *Guardando cambios… sin conexión con el servidor* | A write failed and is being retried. | Usually nothing; it recovers by itself, and retries immediately when the browser reports it is back online. |
| *No se pudieron guardar tus cambios* | Retries are exhausted. The changes are still in the tab. | Use **Reintentar**. If it keeps failing, check the backend. |
| *Esta pestaña está desactualizada* | Another tab or device saved first, or this tab never managed to load the account's configuration. | **Recargar**. Unsaved changes in this tab are lost — that is the trade for never overwriting the newer version. |

Hovering the indicator shows the specific reason.

## In the browser console

Every transition into an unhealthy state logs one line prefixed
`[dashboard sync]`, with the reason and the attempt count, and recovery logs
one line so the record does not end on a failure that has since resolved:

```
[dashboard sync] save failed (attempt 1), will retry — server unreachable or erroring
[dashboard sync] giving up after 6 attempt(s) — server refused the configuration (HTTP 400). Your changes are still in this tab.
[dashboard sync] this tab is out of date — another writer is at revision 12; this tab has 3. Reload to see the current version.
[dashboard sync] saved; back in sync
```

Nothing is logged while syncing is healthy, so anything with that prefix is
worth reading. Asking for a copy of the console is usually enough to tell the
three failure modes apart — they need different responses and look identical
from the outside.

## On the server

The backend logs with Fastify's default JSON logger, to stdout:

```bash
docker compose logs -f backend
```

Two lines are specific to persistence:

- `rejected a dashboard write addressed to a different account` — a write
  arrived carrying a session cookie for one account and an
  `X-Dashboard-Account` header naming another. Refused with `403`. This
  should not happen in normal use; it is the guard against a queued write
  outliving the session that made it.
- `rejected a dashboard write based on a stale revision` — the ordinary
  two-tab conflict, refused with `409`. The `expectedRevision` and
  `currentRevision` fields say how far apart the two writers were.

The startup line reports the applied schema version, and `/healthz` returns
it — see [database-migrations.md](./database-migrations.md).

## What is deliberately not here

No metrics endpoint, no remote error reporting, no analytics. The failure
worth diagnosing is "a dashboard quietly stopped saving", and a console line
plus a container log answers it for a single-user homelab deployment. If this
ever runs for other people, that calculation changes.
