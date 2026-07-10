/**
 * Storage abstraction `configStore` (and everything built on it) depends on,
 * instead of calling `window.localStorage` directly. See
 * `specs/002-widget-dashboard/contracts/storage-provider-contract.md`.
 *
 * All methods are synchronous, matching how `configStore` already used
 * `localStorage` before this abstraction existed — this keeps first-paint
 * config reads zero-latency and requires no call-site changes. A future
 * remote/cloud provider would keep a synchronous local cache and reconcile
 * asynchronously in the background rather than making this interface async.
 */
export interface StorageProvider {
  /** Returns the deserialized value for `key`, or `undefined` if missing or unreadable. Never throws. */
  get<T>(key: string): T | undefined
  /** Persists `value` under `key`. Never throws; failures degrade silently. */
  set<T>(key: string, value: T): void
  /** Removes `key`. Never throws. */
  remove(key: string): void
}
