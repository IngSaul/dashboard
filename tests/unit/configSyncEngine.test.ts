import { describe, expect, it, vi } from 'vitest'
import {
  createConfigSyncEngine,
  type ConfigSyncEngine,
  type ConfigWriteResult,
  type SyncState,
} from '../../src/services/storage/configSyncEngine'

/**
 * The ordering, retry and reporting rules from the audit's TD-03, tested
 * where they live. No DOM, no fetch, no config shape — the writer is
 * injected, so "what happens when two writes overlap" is expressible
 * directly instead of being provoked through timers and network stubs.
 */

interface Attempt {
  value: string
  resolve: (result: ConfigWriteResult) => void
  settled: boolean
}

/**
 * A writer whose attempts are resolved by the test, one at a time — the only
 * way to put two writes in a chosen order relative to each other.
 */
function createControllableWriter() {
  const attempts: Attempt[] = []
  const write = vi.fn(
    (value: string): Promise<ConfigWriteResult> =>
      new Promise<ConfigWriteResult>((resolve) => {
        const attempt: Attempt = {
          value,
          settled: false,
          resolve: (result) => {
            attempt.settled = true
            resolve(result)
          },
        }
        attempts.push(attempt)
      }),
  )
  return {
    write,
    attempts,
    get values() {
      return attempts.map((attempt) => attempt.value)
    },
    /** Resolves the nth attempt (0-based) and lets the engine's microtasks run. */
    async settle(index: number, result: ConfigWriteResult = { kind: 'saved' }): Promise<void> {
      const attempt = attempts[index]
      if (!attempt) {
        throw new Error(`no attempt at index ${index}; got ${attempts.length}`)
      }
      attempt.resolve(result)
      await flushMicrotasks()
    },
  }
}

/**
 * Lets the engine run to a standstill: promise chains *and* the zero-delay
 * timers behind its debounce and backoff, which are macrotasks and would
 * otherwise never fire inside a purely microtask-based drain.
 */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function createEngine(
  writer: ReturnType<typeof createControllableWriter>,
  overrides: { retryDelaysMs?: number[]; debounceMs?: number; maxWaitMs?: number } = {},
): { engine: ConfigSyncEngine<string>; states: SyncState[] } {
  const states: SyncState[] = []
  const engine = createConfigSyncEngine<string>({
    write: writer.write,
    debounceMs: overrides.debounceMs ?? 0,
    maxWaitMs: overrides.maxWaitMs ?? 0,
    retryDelaysMs: overrides.retryDelaysMs ?? [0, 0, 0],
    onStateChange: (state) => states.push({ ...state }),
  })
  return { engine, states }
}

describe('configSyncEngine', () => {
  describe('a normal write', () => {
    it('sends the value once and reports idle when the server confirms it', async () => {
      const writer = createControllableWriter()
      const { engine, states } = createEngine(writer)

      engine.write('v1')
      const flushed = engine.flush()
      await flushMicrotasks()

      expect(writer.values).toEqual(['v1'])
      await writer.settle(0)

      await expect(flushed).resolves.toBe(true)
      expect(engine.getState()).toEqual({ status: 'idle', failedAttempts: 0 })
      expect(states.map((state) => state.status)).toEqual(['saving', 'idle'])
    })
  })

  describe('two consecutive writes', () => {
    it('never has two attempts in flight at once', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()

      // The second change lands while the first is still unanswered.
      engine.write('v2')
      await flushMicrotasks()

      expect(writer.values).toEqual(['v1'])
      expect(writer.write).toHaveBeenCalledTimes(1)

      await writer.settle(0)
      expect(writer.values).toEqual(['v1', 'v2'])
    })

    it('sends only the latest value, collapsing everything queued behind it', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()

      engine.write('v2')
      engine.write('v3')
      engine.write('v4')
      await writer.settle(0)

      // v2 and v3 were superseded before they ever had a chance to go out.
      expect(writer.values).toEqual(['v1', 'v4'])
    })

    it('stays unsaved until the newest value is the one confirmed', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      const flushed = engine.flush()
      await flushMicrotasks()
      engine.write('v2')

      await writer.settle(0)
      expect(engine.getState().status).toBe('saving')

      await writer.settle(1)
      await expect(flushed).resolves.toBe(true)
      expect(engine.getState().status).toBe('idle')
    })
  })

  describe('responses arriving out of order', () => {
    it('cannot happen: serialisation removes the race rather than repairing it', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('older')
      void engine.flush()
      await flushMicrotasks()
      engine.write('newer')
      await flushMicrotasks()

      // Only one request exists, so there is no second response that could
      // come back first and resurrect `older`.
      expect(writer.attempts).toHaveLength(1)

      await writer.settle(0)
      expect(writer.values).toEqual(['older', 'newer'])

      // Settling the *first* attempt again (a duplicate late response) does
      // not undo the newer value.
      await writer.settle(0)
      expect(writer.values).toEqual(['older', 'newer'])
    })
  })

  describe('a temporary network failure', () => {
    it('retries the same value and succeeds without the caller doing anything', async () => {
      const writer = createControllableWriter()
      const { engine, states } = createEngine(writer)

      engine.write('v1')
      const flushed = engine.flush()
      await flushMicrotasks()

      await writer.settle(0, { kind: 'retry' })
      await flushMicrotasks()

      expect(writer.values).toEqual(['v1', 'v1'])
      expect(states.map((state) => state.status)).toContain('retrying')

      await writer.settle(1)
      await expect(flushed).resolves.toBe(true)
      expect(engine.getState()).toEqual({ status: 'idle', failedAttempts: 0 })
    })

    it('keeps the value and reports error once the attempt budget runs out', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer, { retryDelaysMs: [0, 0] })

      engine.write('v1')
      const flushed = engine.flush()
      await flushMicrotasks()

      for (let i = 0; i < 3; i += 1) {
        await writer.settle(i, { kind: 'retry' })
        await flushMicrotasks()
      }

      await expect(flushed).resolves.toBe(false)
      expect(engine.getState().status).toBe('error')
      expect(engine.getState().failedAttempts).toBe(3)

      // The value was never thrown away — a nudge resumes from it.
      engine.retryNow()
      await flushMicrotasks()
      expect(writer.values[writer.values.length - 1]).toBe('v1')
    })

    it('resumes from the newest value when the user changes something after giving up', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer, { retryDelaysMs: [0] })

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'retry' })
      await flushMicrotasks()
      await writer.settle(1, { kind: 'retry' })
      await flushMicrotasks()
      expect(engine.getState().status).toBe('error')

      engine.write('v2')
      await flushMicrotasks()

      expect(writer.values[writer.values.length - 1]).toBe('v2')
      expect(engine.getState().failedAttempts).toBe(0)
    })

    it('does not retry a permanently refused write', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      const flushed = engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'fatal' })

      await expect(flushed).resolves.toBe(false)
      expect(writer.values).toEqual(['v1'])
      expect(engine.getState().status).toBe('error')
    })

    it('reports every transition, so no failure is only visible in a console', async () => {
      const writer = createControllableWriter()
      const { engine, states } = createEngine(writer, { retryDelaysMs: [0] })

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'retry' })
      await flushMicrotasks()
      await writer.settle(1, { kind: 'retry' })
      await flushMicrotasks()

      expect(states.map((state) => state.status)).toEqual(['saving', 'retrying', 'saving', 'error'])
    })
  })

  describe('flush', () => {
    it('resolves after one attempt for callers that cannot wait out a backoff', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer, { debounceMs: 60_000, maxWaitMs: 60_000 })

      engine.write('v1')
      const flushed = engine.flush({ singleAttempt: true })
      await flushMicrotasks()
      await writer.settle(0, { kind: 'retry' })

      await expect(flushed).resolves.toBe(false)
      expect(writer.values).toEqual(['v1'])
      // Reported as still trying, not as given up: the caller either
      // disposes the engine now, or leaves it to the rescheduled retry.
      expect(engine.getState().status).toBe('retrying')
    })

    it('puts an unsaved value back on the normal retry path when the engine survives', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      const flushed = engine.flush({ singleAttempt: true })
      await flushMicrotasks()
      await writer.settle(0, { kind: 'retry' })
      await expect(flushed).resolves.toBe(false)

      // `pagehide` also fires for a tab that is merely frozen. If the page
      // is still alive, the value must not sit there unscheduled.
      await flushMicrotasks()
      expect(writer.values.length).toBeGreaterThan(1)
      await writer.settle(1)
      expect(engine.getState().status).toBe('idle')
    })

    it('resolves true immediately when there is nothing outstanding', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      await expect(engine.flush()).resolves.toBe(true)
      expect(writer.write).not.toHaveBeenCalled()
    })

    /**
     * Regression guard. `flush` used to simply await whatever drain was
     * running, so a logout that happened while a write was three retries
     * into its backoff inherited the rest of that schedule and blocked the
     * UI for the whole of it.
     */
    it('cuts a running backoff short instead of waiting the whole schedule out', async () => {
      const writer = createControllableWriter()
      // A long debounce keeps the post-flush reschedule out of the way, so
      // the attempt count below is only about the flush itself.
      const { engine } = createEngine(writer, {
        retryDelaysMs: [60_000, 60_000, 60_000],
        debounceMs: 60_000,
        maxWaitMs: 60_000,
      })

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'retry' })
      await flushMicrotasks()
      expect(engine.getState().status).toBe('retrying')

      // Without the cut-short this would sit on a 60s sleep.
      const flushed = engine.flush({ singleAttempt: true })
      await flushMicrotasks()
      await writer.settle(1, { kind: 'retry' })

      await expect(flushed).resolves.toBe(false)
      expect(writer.values).toEqual(['v1', 'v1'])
    })

    it('joins the write already in flight instead of starting a second one', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      const first = engine.flush()
      const second = engine.flush()
      await flushMicrotasks()

      expect(writer.attempts).toHaveLength(1)
      await writer.settle(0)
      await expect(first).resolves.toBe(true)
      await expect(second).resolves.toBe(true)
    })
  })

  describe('dispose', () => {
    it('stops writing, and a pending value is dropped rather than sent later', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      engine.dispose()
      await flushMicrotasks()

      expect(writer.write).not.toHaveBeenCalled()
      engine.write('v2')
      engine.retryNow()
      await engine.flush()
      await flushMicrotasks()
      expect(writer.write).not.toHaveBeenCalled()
    })

    it('does not continue the retry loop for a write that was in flight', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      engine.dispose()
      await writer.settle(0, { kind: 'retry' })
      await flushMicrotasks()

      expect(writer.values).toEqual(['v1'])
    })

    it('is idempotent', () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)
      expect(() => {
        engine.dispose()
        engine.dispose()
      }).not.toThrow()
    })
  })

  describe('a conflict', () => {
    it('is terminal: nothing further is sent, however much the user changes', async () => {
      const writer = createControllableWriter()
      const { engine, states } = createEngine(writer)

      engine.write('v1')
      const flushed = engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'conflict' })

      await expect(flushed).resolves.toBe(false)
      expect(engine.getState().status).toBe('conflict')

      engine.write('v2')
      engine.write('v3')
      engine.retryNow()
      await engine.flush()
      await flushMicrotasks()

      // Retrying is not merely useless here, it is destructive: every one of
      // these is built on the same superseded base.
      expect(writer.values).toEqual(['v1'])
      expect(states.map((state) => state.status)).toEqual(['saving', 'conflict'])
    })

    it('is never retried the way a transient failure is', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer, { retryDelaysMs: [0, 0, 0] })

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'conflict' })
      await flushMicrotasks()

      expect(writer.write).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * TD-12. "My changes are not saving" is unanswerable from a status alone:
   * a dead network, a refused payload and another tab having saved first all
   * look identical, and each needs a different response from the user.
   */
  describe('diagnosing a failure', () => {
    it('records why the last attempt failed, and clears it on success', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer, { retryDelaysMs: [0] })

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'retry', detail: 'server unreachable' })
      await flushMicrotasks()

      expect(engine.getState().lastFailure?.detail).toBe('server unreachable')
      expect(engine.getState().lastFailure?.at).toEqual(expect.any(String))

      await writer.settle(1, { kind: 'saved' })
      expect(engine.getState()).toEqual({ status: 'idle', failedAttempts: 0 })
    })

    it('distinguishes a refusal from an outage', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'fatal', detail: 'server refused the configuration (HTTP 400)' })

      expect(engine.getState().status).toBe('error')
      expect(engine.getState().lastFailure?.detail).toContain('HTTP 400')
    })

    it('distinguishes a conflict, which is neither an outage nor a refusal', async () => {
      const writer = createControllableWriter()
      const { engine } = createEngine(writer)

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0, { kind: 'conflict', detail: 'another writer is at revision 9' })

      expect(engine.getState().status).toBe('conflict')
      expect(engine.getState().lastFailure?.detail).toContain('revision 9')
    })

    it('reports nothing while everything is healthy', async () => {
      const writer = createControllableWriter()
      const { engine, states } = createEngine(writer)

      engine.write('v1')
      void engine.flush()
      await flushMicrotasks()
      await writer.settle(0)

      expect(states.every((state) => state.lastFailure === undefined)).toBe(true)
    })
  })
})
