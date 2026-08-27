import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DASHBOARD_CONFIG_STORAGE_KEY } from '../../src/services/configStore'
import { createRemoteStorageProvider } from '../../src/services/storage/RemoteStorageProvider'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import type { AuthClient } from '../../src/services/auth/AuthClient'
import type { DashboardConfiguration } from '../../src/types/dashboard'
import type { StorageProvider } from '../../src/services/storage/StorageProvider'

function createFixture(): DashboardConfiguration {
  return createDefaultDashboardConfig()
}

function createAuthClientStub(): { putDashboard: ReturnType<typeof vi.fn> } {
  return { putDashboard: vi.fn().mockResolvedValue(true) }
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
    let provider: StorageProvider
    let authClient: { putDashboard: ReturnType<typeof vi.fn> }
    let initialConfig: DashboardConfiguration

    beforeEach(() => {
      authClient = createAuthClientStub()
      initialConfig = createFixture()
      provider = createRemoteStorageProvider(initialConfig, { authClient: authClient as unknown as AuthClient })
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
      )
    })

    it('flushes at the max-wait boundary even if set() keeps resetting the trailing timer', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const provider = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
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

    it('schedules a new debounce cycle after a flush', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      const provider = createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })

      provider.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'first' })
      vi.advanceTimersByTime(1000)
      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)

      provider.set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'second' })
      vi.advanceTimersByTime(1000)
      expect(authClient.putDashboard).toHaveBeenCalledTimes(2)
      expect(authClient.putDashboard).toHaveBeenLastCalledWith(expect.objectContaining({ updatedAt: 'second' }))
    })
  })

  describe('pagehide flush', () => {
    it('sends a keepalive PUT for a still-pending write when pagehide fires before the debounce elapses', () => {
      vi.useFakeTimers()
      const authClient = createAuthClientStub()
      createRemoteStorageProvider(createFixture(), {
        authClient: authClient as unknown as AuthClient,
        debounceMs: 1000,
        maxWaitMs: 5000,
      })
        .set(DASHBOARD_CONFIG_STORAGE_KEY, { ...createFixture(), updatedAt: 'pending-write' })

      window.dispatchEvent(new Event('pagehide'))

      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
      expect(authClient.putDashboard).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: 'pending-write' }),
        { keepalive: true },
      )

      // The debounce timer must not also fire later and double-send.
      vi.advanceTimersByTime(5000)
      expect(authClient.putDashboard).toHaveBeenCalledTimes(1)
    })

    it('does nothing on pagehide when there is no pending write', () => {
      const authClient = createAuthClientStub()
      createRemoteStorageProvider(createFixture(), { authClient: authClient as unknown as AuthClient })

      window.dispatchEvent(new Event('pagehide'))

      expect(authClient.putDashboard).not.toHaveBeenCalled()
    })
  })
})
