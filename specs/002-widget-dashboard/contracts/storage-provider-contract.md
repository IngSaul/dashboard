# Storage Provider Contract

Defines the `StorageProvider` interface that `configStore` depends on, and the
guarantees `LocalStorageProvider` (the only implementation shipped in this
feature) must uphold. See
[data-model.md](../data-model.md#storageprovider-infrastructure-interface-not-a-domain-entity)
for the interface shape.

## Interface guarantees

- All three methods (`get`, `set`, `remove`) are **synchronous** — no
  `Promise`, no `async`/`await` at the call site. This is a deliberate
  constraint (see [research.md §13](../research.md#13-storageprovider-abstraction)):
  it keeps first-paint config reads zero-latency and requires no changes to
  how `configStore` is already called throughout the codebase.
- `get<T>(key)` returns `undefined` for a missing key — it MUST NOT throw for
  "key not found." `configStore` is responsible for applying the relevant
  default when it receives `undefined`.
- `set`/`remove` MUST NOT throw for a normal write/delete. Any underlying
  failure (e.g. storage quota exceeded) MUST be caught internally by the
  provider and degrade to a no-op-with-warning rather than propagate an
  exception into `configStore`'s callers — a full or unavailable storage
  backend must never crash a dashboard render.

## LocalStorageProvider

- Wraps `window.localStorage` directly: `get` does `JSON.parse` on the stored
  string (returning `undefined` on parse failure, never throwing), `set` does
  `JSON.stringify` then `setItem`, `remove` does `removeItem`.
- If `window.localStorage` is unavailable (privacy mode, storage disabled),
  `LocalStorageProvider` MUST fall back to an in-memory `Map`-backed store for
  the session, silently, so the dashboard remains fully usable within that
  session — preferences simply won't survive a reload, which is preferable to
  a broken dashboard.

## Migration path (not implemented in this feature)

- A future `CloudStorageProvider`/`RemoteSyncProvider` would implement the
  same synchronous interface by serving `get()` from a local in-memory cache
  (hydrated asynchronously in the background after first paint) and having
  `set()` write to that cache immediately while triggering a best-effort
  background sync — this keeps the interface's synchronous contract intact
  without this feature needing to build that provider now.
- `configStore`'s call sites require **zero changes** to support a future
  provider swap — only the `StorageProvider` instance passed to `configStore`
  changes.
