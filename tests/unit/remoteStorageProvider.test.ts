import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DASHBOARD_CONFIG_STORAGE_KEY } from '../../src/services/configStore'
import { createRemoteStorageProvider } from '../../src/services/storage/RemoteStorageProvider'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import type { AuthClient } from '../../src/services/auth/AuthClient'
import type { DashboardConfiguration } from '../../src/types/dashboard'
import type { RemoteStorageSession } from '../../src/services/storage/RemoteStorageProvider'
import type { SyncState } from '../../src/services/storage/configSyncEngine'

const ACCOUNT_ID = 7

function createFixture(): DashboardConfiguration {
  return createDefaultDashboardConfig()
}

function createAuthClientStub(): { putDashboard: ReturnType<typeof vi.fn> } {
  return { putDashboard: vi.fn().mockResolvedValue({ kind: 'saved' }) }
}

describe('RemoteStorageProvider', () => {
  let removeListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    removeListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.useRealTimers()
    removeListenerSpy.mockRestore()
  })

  describe('cache behavior', () => {
    let provider: RemoteStorageSession
    let authClient: { putDashboard: ReturnType<typeof vi.fn> }
    let initialConfig: DashboardConfiguration

    beforeEach(() => {
      authClient = createAuthClientStub()
      initialConfig = createFixture()
      provider = createRemoteStorageProvider(initialConfig, { authClient: authClient as unknown as AuthClient, accountId: ACCOUNT_ID, revision: 1 })
    })

    it('returns the initial config for the dashboard key', () => {
      const value = provider.get<DashboardConfiguration>(DASHBOARD_CONFIG_STORAGE_KEY)
      expect(value).toEqual(initialConfig)
    })

    it('returns undefined for a key never set', () => {
      expect(provider.get('some-other-key')).toBeUndefined()
    })

    it('set() is reflected immediately by get(), before any network call resolves', () => {
      const updated = { ...createFixture(), updatedAt: '2030-01-01T00:00:00.000Z' }
      provider.set(DASHBOARD_CONFIG_STORAGE_KEY, updated)

      expect(provider.get<DashboardConfiguration>(DASHBOARD_CONFIG_STORAGE_KEY)).toEqual(updated)
    })

    it('remove() clears the cached value', () => {
      provider.remove(DASHBOARD_CONFIG_STORAGE_KEY)
      expect(provider.get(DASHBOARD_CONFIG_STORAGE_KEY)).toBeUndefined()
    })

    it('caches an unrelated key in-memory without ever calling putDashboard', () => {
      provider.set('unrelated-key', { anything: true })
      expect(provider.get('unrelated-key')).toEqual({ anything: true })
      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })
  })

  describe('debounced writes (spec FR-009 / SC-006)', () => {
    it('collapses many rapid set() calls within the trailing window into exactly one PUT', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const provider = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })

      for (let i = 0; i < 20; i += 1) {
        provider.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: `iteration-${i}` })
        vi.advanceTimersByTime(200)
      }
      // 20 * 200ms = 4000ms elapsed, always under the 1000ms trailing window
      // reset by each call, so nothing should have flushed yet.
      expect(authClient.putDashboard).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000)

      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
      expect(authClient.putDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: 'iteration-19' }),
        expect.objectContaining({ accountId: ACCOUNT_ID }),
      )
    })

    it('flushes at the max-wait boundary even if set() keeps resetting the trailing timer', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const provider = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })

      // A set() every 800ms continually postpones the 1000ms trailing timer,
      // but must not postpone the 5000ms absolute max-wait.
      for (let i = 0; i < 8; i += 1) {
        provider.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: `iteration-${i}` })
        vi.advanceTimersByTime(800)
      }

      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
    })

    // Async, unlike its neighbours: a second write can only start once the
    // first has been *answered*, and letting that answer be processed needs
    // the microtask queue drained as well as the timers advanced.
    it('schedules a new debounce cycle once the previous write has been answered', async () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const provider = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })

      provider.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'first' })
      await vi.advanceTimersByTimeAsync(1000)
      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)

      provider.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'second' })
      await vi.advanceTimersByTimeAsync(1000)
      expect(authClient.putDashboard).toHaveBeenCalledTimes(2)
      expect(authClient.putDashboard).toHaveBeenLastCalledWith(
        expect.objectContaining({ updatedAt: 'second' }),
        expect.objectContaining({ accountId: ACCOUNT_ID }),
      )
    })
  })

  describe('pagehide flush', () => {
    it('sends a keepalive PUT for a still-pending write when pagehide fires before the debounce elapses', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })
        .set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'pending-write' })

      window.dispatchEvent(new Event('pagehide'))

      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
      expect(authClient.putDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: 'pending-write' }),
        expect.objectContaining({ keepalive: true, accountId: ACCOUNT_ID }),
      )

      // The debounce timer must not also fire later and double-send.
      vi.advanceTimersByTime(5000)
      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
    })

    it('does nothing on pagehide when there is no pending write', () => {
      const authClient = createAuthClientStub()
      createRemoteStorageProvider(createFixture(), { authClient: authClient as unknown as AuthClient, accountId: ACCOUNT_ID, revision: 1 })

      window.dispatchEvent(new Event('pagehide'))

      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })
  })

  describe('lifecycle (TD-02)', () => {
    it('cancels a pending write on dispose instead of sending it later', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'queued-before-dispose' })
      session.dispose()

      // Both timers are gone: neither the trailing window nor the max-wait
      // boundary can resurrect the write.
      vi.advanceTimersByTime(60_000)
      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })

    it('removes its pagehide listener, so a disposed session ignores page teardown', () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
      })
      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'queued' })

      session.dispose()
      window.dispatchEvent(new Event('pagehide'))

      expect(removeListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })

    it('aborts anything still in flight', () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
      })
      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'in-flight' })
      void session.flushPending()

      const signal = authClient.putDashboard.mock.calls[0]?.[1]?.signal as AbortSignal
      expect(signal.aborted).toBe(false)

      session.dispose()

      expect(signal.aborted).toBe(true)
    })

    it('never writes again after dispose, however many times set() is called', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 1000,
      })
      session.dispose()

      for (let i = 0; i < 5; i += 1) {
        session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: `after-dispose-${i}` })
        vi.advanceTimersByTime(2000)
      }
      window.dispatchEvent(new Event('pagehide'))
      void session.flushPending()

      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })

    it('is idempotent', () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
      })

      expect(() => {
        session.dispose()
        session.dispose()
        session.dispose()
      }).not.toThrow()
    })

    it('flushPending sends the queued write immediately and resolves once it is answered', async () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 10_000,
      })
      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'unsaved-edit' })

      await session.flushPending()

      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
      expect(authClient.putDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: 'unsaved-edit' }),
        expect.objectContaining({ accountId: ACCOUNT_ID }),
      )
    })

    it('flushPending is a no-op when nothing is queued', async () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
      })

      await session.flushPending()

      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })

    it('still answers reads from its cache after dispose', () => {
      const authClient = createAuthClientStub()
      const initialConfig = createFixture()
      const session = createRemoteStorageProvider(initialConfig, {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
      })

      session.dispose()

      expect(session.get<DashboardConfiguration>(DASHBOARD_CONFIG_STORAGE_KEY)).toEqual(initialConfig)
    })
  })

  describe('account binding (TD-02)', () => {
    it('stamps every write with the account that scheduled it', async () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: 42,
        revision: 1,
      })
      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'for-42' })

      await session.flushPending()

      expect(session.accountId).toBe(42)
      expect(authClient.putDashboard).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ accountId: 42 }),
      )
    })

    it('two sessions for two accounts never share a binding or a signal', () => {
      const authClient = createAuthClientStub()
      const first = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: 1,
        revision: 1,
      })
      const second = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: 2,
        revision: 1,
      })

      first.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'from-1' })
      second.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'from-2' })
      void first.flushPending()
      void second.flushPending()

      const [firstCall, secondCall] = authClient.putDashboard.mock.calls
      expect(firstCall?.[1]?.accountId).toBe(1)
      expect(secondCall?.[1]?.accountId).toBe(2)

      // Disposing one must not abort the other's in-flight work.
      first.dispose()
      expect((firstCall?.[1]?.signal as AbortSignal).aborted).toBe(true)
      expect((secondCall?.[1]?.signal as AbortSignal).aborted).toBe(false)
    })
  })

  describe('persistence reliability (TD-03)', () => {
    it('retries a failed write on its own and reports the whole journey', async () => {
      const authClient = {
        putDashboard: vi
          .fn()
          .mockResolvedValueOnce({ kind: 'unavailable' })
          .mockResolvedValueOnce({ kind: 'saved' }),
      }
      const states: SyncState[] = []
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
        retryDelaysMs: [0],
        onSyncStateChange: (state) => states.push(state),
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'needs-a-retry' })
      await expect(session.flushPending()).resolves.toBe(false)

      // A single-attempt flush gave up, but the value was kept — the
      // engine's own retry then saves it without anyone asking.
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('idle'))
      expect(authClient.putDashboard).toHaveBeenCalledTimes(2)
      expect(states.map((state) => state.status)).toContain('retrying')
    })

    it('surfaces an exhausted write as an error instead of dropping it', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'unavailable' }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
        retryDelaysMs: [0],
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'never-lands' })

      await vi.waitFor(() => expect(session.getSyncState().status).toBe('error'))
      expect(session.getSyncState().failedAttempts).toBeGreaterThan(0)
    })

    it('does not retry a write the server permanently refused', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'rejected', status: 400 }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
        retryDelaysMs: [0, 0, 0],
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'malformed' })

      await vi.waitFor(() => expect(session.getSyncState().status).toBe('error'))
      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
    })

    it('retries as soon as the browser reports it is back online', async () => {
      const authClient = {
        putDashboard: vi
          .fn()
          .mockResolvedValueOnce({ kind: 'unavailable' })
          .mockResolvedValue({ kind: 'saved' }),
      }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
        // Long enough that only the `online` event can explain a second try.
        retryDelaysMs: [60_000],
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'offline-edit' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('retrying'))

      window.dispatchEvent(new Event('online'))

      await vi.waitFor(() => expect(session.getSyncState().status).toBe('idle'))
      expect(authClient.putDashboard).toHaveBeenCalledTimes(2)
    })

    it('stops listening for reconnection once disposed', () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
      })

      session.dispose()

      expect(removeListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
      expect(removeListenerSpy).toHaveBeenCalledWith('pagehide', expect.any(Function))
    })

    it('reports whether logging out actually saved the outstanding change', async () => {
      const failing = { putDashboard: vi.fn().mockResolvedValue({ kind: 'unavailable' }) }
      const failingSession = createRemoteStorageProvider(createFixture(), {
        authClient: failing as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 10_000,
      })
      failingSession.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'unsaved' })
      await expect(failingSession.flushPending()).resolves.toBe(false)
      failingSession.dispose()

      const working = createAuthClientStub()
      const workingSession = createRemoteStorageProvider(createFixture(), {
        authClient: working as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 10_000,
      })
      workingSession.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'saved' })
      await expect(workingSession.flushPending()).resolves.toBe(true)
    })
  })

  /**
   * Optimistic concurrency (TD-03's "dos pestañas hacen last writer wins sin
   * aviso"). Two tabs each hold a whole configuration document built from
   * the same starting point, so the one that saves second used to erase the
   * first silently.
   */
  describe('revision conflicts', () => {
    it('sends the revision its config was read at, and tracks the one it is given back', async () => {
      const authClient = {
        putDashboard: vi
          .fn()
          .mockResolvedValueOnce({ kind: 'saved', revision: 8 })
          .mockResolvedValueOnce({ kind: 'saved', revision: 9 }),
      }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 7,
        debounceMs: 0,
        maxWaitMs: 0,
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'first' })
      await session.flushPending()
      expect(authClient.putDashboard).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ revision: 7 }),
      )

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'second' })
      await session.flushPending()
      // The second write is based on what the first one produced, not on the
      // revision this session started with.
      expect(authClient.putDashboard).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ revision: 8 }),
      )
    })

    it('stops writing once the server reports a conflict, instead of retrying over the newer state', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'conflict', revision: 12 }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 3,
        debounceMs: 0,
        maxWaitMs: 0,
        retryDelaysMs: [0, 0, 0],
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'stale-edit' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('conflict'))

      // Exactly one attempt: a conflict is not a transient failure, and
      // retrying would overwrite whoever saved first.
      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'later-edit' })
      window.dispatchEvent(new Event('online'))
      await session.flushPending()

      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
      expect(session.getSyncState().status).toBe('conflict')
    })

    it('keeps serving the user their own edits while conflicted, rather than discarding them', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'conflict', revision: 2 }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'mine' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('conflict'))

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'mine-again' })

      expect(
        session.get<DashboardConfiguration>(DASHBOARD_CONFIG_STORAGE_KEY)?.updatedAt,
      ).toBe('mine-again')
    })

    it('never writes at all when it could not establish what it is based on', async () => {
      const authClient = createAuthClientStub()
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        // Hydration failed: this tab has no idea what the account's real
        // configuration is, so any write is a blind overwrite.
        revision: null,
        debounceMs: 0,
        maxWaitMs: 0,
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'blind' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('conflict'))

      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })
  })

  describe('sync diagnostics (TD-12)', () => {
    it('names the transport failure, so an outage is not mistaken for a bad payload', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'unavailable' }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
        retryDelaysMs: [0],
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'x' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('error'))

      expect(session.getSyncState().lastFailure?.detail).toMatch(/unreachable|erroring/)
    })

    it('includes the status code when the server refused the configuration', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'rejected', status: 400 }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 1,
        debounceMs: 0,
        maxWaitMs: 0,
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'x' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('error'))

      // Without the code, a rejected payload is indistinguishable from an
      // expired session — and only one of those is the user's problem.
      expect(session.getSyncState().lastFailure?.detail).toContain('HTTP 400')
    })

    it('says which revision won a conflict', async () => {
      const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'conflict', revision: 12 }) }
      const session = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        accountId: ACCOUNT_ID,
        revision: 3,
        debounceMs: 0,
        maxWaitMs: 0,
      })

      session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'x' })
      await vi.waitFor(() => expect(session.getSyncState().status).toBe('conflict'))

      const detail = session.getSyncState().lastFailure?.detail ?? ''
      expect(detail).toContain('12')
      expect(detail).toContain('3')
    })

    it('warns once per unhealthy transition and stays silent while healthy', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const info = vi.spyOn(console, 'info').mockImplementation(() => {})
      try {
        const authClient = {
          putDashboard: vi
            .fn()
            .mockResolvedValueOnce({ kind: 'unavailable' })
            .mockResolvedValue({ kind: 'saved', revision: 2 }),
        }
        const session = createRemoteStorageProvider(createFixture(), {
          authClient: authClient as unknown as AuthClient,
          accountId: ACCOUNT_ID,
          revision: 1,
          debounceMs: 0,
          maxWaitMs: 0,
          retryDelaysMs: [0],
        })

        session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'x' })
        // Waiting for `idle` would pass instantly — that is the state the
        // session starts in. Wait for the retry itself to have happened.
        await vi.waitFor(() => expect(authClient.putDashboard).toHaveBeenCalledTimes(2))
        await vi.waitFor(() => expect(session.getSyncState().status).toBe('idle'))

        expect(warn).toHaveBeenCalledTimes(1)
        expect(String(warn.mock.calls[0]?.[0])).toContain('[dashboard sync]')
        // Recovery is said once, so a console does not end on a failure that
        // has since resolved.
        expect(info).toHaveBeenCalledWith(expect.stringContaining('back in sync'))
      } finally {
        warn.mockRestore()
        info.mockRestore()
      }
    })

    it('says nothing at all when every write succeeds', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const info = vi.spyOn(console, 'info').mockImplementation(() => {})
      try {
        const authClient = { putDashboard: vi.fn().mockResolvedValue({ kind: 'saved', revision: 2 }) }
        const session = createRemoteStorageProvider(createFixture(), {
          authClient: authClient as unknown as AuthClient,
          accountId: ACCOUNT_ID,
          revision: 1,
          debounceMs: 0,
          maxWaitMs: 0,
        })

        session.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'x' })
        // Same trap as above: assert against work that actually happened.
        await vi.waitFor(() => expect(authClient.putDashboard).toHaveBeenCalledTimes(1))
        await vi.waitFor(() => expect(session.getSyncState().status).toBe('idle'))

        expect(warn).not.toHaveBeenCalled()
        expect(info).not.toHaveBeenCalled()
      } finally {
        warn.mockRestore()
        info.mockRestore()
      }
    })
  })
})
