/**
 * Gets the user's latest configuration to the server, exactly once, in
 * order, without ever dropping it on the floor.
 *
 * Extracted from `RemoteStorageProvider` because "when and how does a value
 * reach the server" is a different job from "what does a `StorageProvider`
 * look like", and only the former has interesting failure modes. Nothing
 * here touches the DOM, `fetch`, or a config shape — the write itself is
 * injected — so every ordering and retry rule below is directly testable.
 *
 * The rules it enforces:
 *
 * - **One write in flight at a time.** Two `PUT`s can otherwise reach the
 *   server in the opposite order to the one they were issued in, and the
 *   older one wins. Serialising removes the race rather than compensating
 *   for it, so there is no reordering to detect or repair.
 * - **Only the latest value matters.** Changes made while a write is in
 *   flight replace the value waiting to go next; intermediate states are
 *   never worth a round trip of their own.
 * - **A value is only forgotten once the server confirms it.** A failure
 *   keeps it and schedules another attempt, so a change cannot be lost to a
 *   dropped connection.
 * - **Failure is reported, never swallowed.** Every transition is published
 *   to `onStateChange`, including giving up.
 */

/**
 * What the injected writer says about an attempt. Deliberately not HTTP:
 * the engine only needs "done", "worth trying again", and "stop".
 */
export type ConfigWriteResult =
  | { kind: 'saved' }
  /** Transient — the same value is worth sending again after a delay. */
  | { kind: 'retry'; detail?: string }
  /** Permanent — retrying this value cannot succeed. */
  | { kind: 'fatal'; detail?: string }
  /**
   * This value was composed on top of a state the server has since moved
   * past. Retrying is not just useless but harmful: it would overwrite
   * whoever got there first. Only a fresh read can resolve it.
   */
  | { kind: 'conflict'; detail?: string }
  /** The caller cancelled it; not a failure, and not worth retrying. */
  | { kind: 'aborted' }

export type SyncStatus =
  /** Everything the user has changed is on the server. */
  | 'idle'
  /** A write is in flight. */
  | 'saving'
  /** The last attempt failed and another is scheduled — including while offline. */
  | 'retrying'
  /** Attempts are exhausted or the write was refused. The value is still held. */
  | 'error'
  /**
   * This tab's copy is behind the server's. Nothing further is sent, because
   * anything it sent would erase a newer state — the user has to be shown
   * the situation instead. Terminal for the session's lifetime.
   */
  | 'conflict'

export interface SyncState {
  status: SyncStatus
  /** Consecutive failed attempts for the value currently waiting to be saved. */
  failedAttempts: number
  /**
   * Why the most recent attempt failed, if one has since the last success.
   *
   * Without this, "my changes are not saving" is unanswerable: the status
   * alone cannot tell a dead network apart from a rejected payload apart
   * from another tab having saved first, and those need different responses
   * from the user. Cleared on success.
   */
  lastFailure?: { detail: string; at: string }
}

/** Backoff between retries, in milliseconds. Its length is also the attempt budget. */
const DEFAULT_RETRY_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000]

export interface ConfigSyncEngineOptions<T> {
  /** Performs one write attempt. Must never throw — return `{ kind: 'retry' }` instead. */
  write: (value: T, opts: { keepalive?: boolean }) => Promise<ConfigWriteResult>
  /** Trailing debounce window: how long a burst of changes is collapsed for. */
  debounceMs: number
  /** Hard ceiling on how long a continuous burst can delay a write. */
  maxWaitMs: number
  retryDelaysMs?: number[]
  onStateChange?: (state: SyncState) => void
}

export interface ConfigSyncEngine<T> {
  /** Records the latest desired value and schedules it. Cheap and synchronous. */
  write(value: T): void
  /**
   * Sends whatever is outstanding right now, bypassing the debounce, and
   * resolves once nothing is left unsaved (`true`) or the attempt budget ran
   * out (`false`). `singleAttempt` is for callers that cannot afford backoff
   * — logout and page teardown.
   */
  flush(opts?: { keepalive?: boolean; singleAttempt?: boolean }): Promise<boolean>
  /** Wakes a scheduled retry early — e.g. the browser just came back online. */
  retryNow(): void
  getState(): SyncState
  /** Stops everything. The engine never writes again. Idempotent. */
  dispose(): void
}

export function createConfigSyncEngine<T>(options: ConfigSyncEngineOptions<T>): ConfigSyncEngine<T> {
  const { write: performWrite, debounceMs, maxWaitMs, onStateChange } = options
  const retryDelays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS

  /** The latest value not yet confirmed by the server. `null` means everything is saved. */
  let desired: { value: T } | null = null
  let disposed = false
  let failedAttempts = 0
  let status: SyncStatus = 'idle'
  let lastFailure: { detail: string; at: string } | null = null

  /**
   * Once set, this engine is out of date and stays that way. Every later
   * change is still remembered, so nothing the user typed is thrown away,
   * but none of it is sent: it would all be built on the same stale base.
   */
  let conflicted = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  let pump: Promise<void> | null = null
  /** Resolves the current backoff sleep early (a new change, `retryNow`, or disposal). */
  let wakeRetry: (() => void) | null = null
  /**
   * Set while a caller that cannot wait — logout, page teardown — is
   * flushing. It cuts the *running* drain short after its current attempt
   * instead of letting the caller inherit a full backoff sequence, which
   * would otherwise block a logout for the length of the retry schedule.
   */
  let stopRetrying = false

  function currentState(): SyncState {
    return {
      status,
      failedAttempts,
      ...(lastFailure !== null ? { lastFailure } : {}),
    }
  }

  function publish(next: SyncStatus): void {
    if (next === status) {
      return
    }
    status = next
    onStateChange?.(currentState())
  }

  function recordFailure(detail: string | undefined): void {
    lastFailure = { detail: detail ?? 'unknown', at: new Date().toISOString() }
  }

  function clearScheduleTimers(): void {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    if (maxWaitTimer !== null) {
      clearTimeout(maxWaitTimer)
      maxWaitTimer = null
    }
  }

  function schedule(): void {
    if (disposed || conflicted) {
      return
    }
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => void startPump(), debounceMs)
    if (maxWaitTimer === null) {
      maxWaitTimer = setTimeout(() => void startPump(), maxWaitMs)
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        wakeRetry = null
        resolve()
      }, ms)
      wakeRetry = () => {
        clearTimeout(timer)
        wakeRetry = null
        resolve()
      }
    })
  }

  /**
   * Drains `desired` until it is saved, permanently refused, or out of
   * attempts. Only ever one of these runs — that is what serialises writes.
   */
  async function drain(opts: { keepalive?: boolean; singleAttempt?: boolean }): Promise<void> {
    const budget = opts.singleAttempt === true ? 1 : retryDelays.length + 1
    let attemptsForValue = 0

    while (!disposed && desired !== null) {
      const inFlight = desired
      publish('saving')

      const result = await performWrite(
        inFlight.value,
        opts.keepalive === true ? { keepalive: true } : {},
      )
      if (disposed) {
        return
      }

      if (result.kind === 'saved') {
        // Only clear it if nothing newer arrived while this was in flight —
        // otherwise the newer value would be silently forgotten.
        if (desired === inFlight) {
          desired = null
          failedAttempts = 0
          lastFailure = null
          publish('idle')
          return
        }
        attemptsForValue = 0
        failedAttempts = 0
        continue
      }

      if (result.kind === 'aborted') {
        return
      }

      if (result.kind === 'conflict') {
        conflicted = true
        clearScheduleTimers()
        recordFailure(result.detail)
        publish('conflict')
        return
      }

      if (result.kind === 'fatal') {
        failedAttempts += 1
        recordFailure(result.detail)
        publish('error')
        return
      }

      attemptsForValue += 1
      failedAttempts += 1
      recordFailure(result.detail)
      if (stopRetrying || attemptsForValue >= budget) {
        // Out of attempts, but `desired` is deliberately kept: the next
        // change (or `retryNow`) resumes from the latest value rather than
        // starting from a state the server never received.
        //
        // A single-attempt run is never the final word — its caller either
        // disposes the engine straight after, or re-arms the normal
        // schedule — so it reports "still trying", not "gave up".
        publish(opts.singleAttempt === true || stopRetrying ? 'retrying' : 'error')
        return
      }

      publish('retrying')
      await sleep(retryDelays[Math.min(attemptsForValue - 1, retryDelays.length - 1)] ?? 0)
    }
  }

  function startPump(opts: { keepalive?: boolean; singleAttempt?: boolean } = {}): Promise<void> {
    clearScheduleTimers()
    if (disposed || conflicted || desired === null) {
      return pump ?? Promise.resolve()
    }
    if (pump) {
      return pump
    }
    const running = drain(opts).finally(() => {
      if (pump === running) {
        pump = null
      }
    })
    pump = running
    return running
  }

  return {
    write(value: T): void {
      if (disposed) {
        return
      }
      // Kept even while conflicted: the value is what the user currently
      // sees, and discarding it would be exactly the silent data loss this
      // engine exists to prevent. It simply is not sent.
      desired = { value }
      if (conflicted) {
        return
      }
      // A fresh change is a fresh intent: it gets a full retry budget, and
      // it wakes a backoff that is currently waiting on an older value.
      failedAttempts = 0
      wakeRetry?.()
      if (status === 'error' || status === 'retrying') {
        publish('saving')
      }
      schedule()
    },

    async flush(opts = {}): Promise<boolean> {
      if (disposed || conflicted) {
        return desired === null
      }
      if (opts.singleAttempt === true) {
        // Cuts a backoff that is already running short, rather than joining
        // it: this caller is about to end the session either way.
        stopRetrying = true
      }
      wakeRetry?.()
      await startPump(opts)
      stopRetrying = false
      const saved = desired === null
      // A single-attempt flush skips the backoff because its caller cannot
      // wait for one. `pagehide` also fires when a tab is merely frozen
      // rather than torn down, so if the engine is still alive afterwards
      // the value must not be left sitting with nothing scheduled to carry
      // it — put it back on the normal retry path.
      if (!saved && opts.singleAttempt === true && !disposed) {
        schedule()
      }
      return saved
    },

    retryNow(): void {
      if (disposed || conflicted || desired === null) {
        return
      }
      wakeRetry?.()
      void startPump()
    },

    getState(): SyncState {
      return currentState()
    },

    dispose(): void {
      if (disposed) {
        return
      }
      disposed = true
      clearScheduleTimers()
      wakeRetry?.()
      desired = null
    },
  }
}
