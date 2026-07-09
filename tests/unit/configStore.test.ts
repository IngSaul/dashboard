import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DASHBOARD_CONFIG_STORAGE_KEY,
  loadDashboardConfig,
  saveDashboardConfig,
} from '../../src/services/configStore'
import type { DashboardConfiguration } from '../../src/types/dashboard'
import {
  clearDashboardStorage,
  defaultDashboardConfigFixture,
  malformedJsonStorageFixture,
  seedDashboardStorage,
} from '../fixtures/dashboardConfig'

/**
 * jsdom's `Storage` methods are not interceptable with `vi.spyOn`, so
 * simulating a storage failure requires replacing `window.localStorage`
 * with a throwing stand-in for the duration of a single test.
 */
function withUnavailableLocalStorage(run: () => void): void {
  const originalLocalStorage = window.localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: () => {
        throw new Error('storage unavailable')
      },
      setItem: () => {
        throw new Error('storage unavailable')
      },
      removeItem: () => {},
    },
    writable: true,
    configurable: true,
  })
  try {
    run()
  } finally {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  }
}

describe('configStore', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
    vi.restoreAllMocks()
  })

  describe('loadDashboardConfig', () => {
    it('returns a default configuration when storage is empty', () => {
      const result = loadDashboardConfig()

      expect(result.shortcuts.length).toBeGreaterThan(0)
      expect(result.categories.length).toBeGreaterThan(0)
    })

    it('returns the persisted configuration when storage holds a valid value', () => {
      seedDashboardStorage()

      const result = loadDashboardConfig()

      expect(result.shortcuts).toHaveLength(defaultDashboardConfigFixture.shortcuts.length)
      expect(result.categories).toHaveLength(defaultDashboardConfigFixture.categories.length)
    })

    it('falls back to defaults when storage holds unparsable JSON', () => {
      seedDashboardStorage(malformedJsonStorageFixture)

      const result = loadDashboardConfig()

      expect(result.shortcuts.length).toBeGreaterThan(0)
    })

    it('falls back to defaults when storage access throws', () => {
      withUnavailableLocalStorage(() => {
        const result = loadDashboardConfig()

        expect(result.shortcuts.length).toBeGreaterThan(0)
      })
    })
  })

  describe('saveDashboardConfig', () => {
    it('persists the configuration under the dashboard storage key', () => {
      const config: DashboardConfiguration = { ...defaultDashboardConfigFixture }

      const succeeded = saveDashboardConfig(config)

      expect(succeeded).toBe(true)
      const stored = window.localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY)
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored ?? '{}') as DashboardConfiguration
      expect(parsed.shortcuts).toHaveLength(config.shortcuts.length)
    })

    it('stamps updatedAt with the save time', () => {
      const config: DashboardConfiguration = {
        ...defaultDashboardConfigFixture,
        updatedAt: '2000-01-01T00:00:00.000Z',
      }

      saveDashboardConfig(config)

      const stored = window.localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY)
      const parsed = JSON.parse(stored ?? '{}') as DashboardConfiguration
      expect(parsed.updatedAt).not.toBe('2000-01-01T00:00:00.000Z')
    })

    it('returns false without throwing when storage access fails', () => {
      withUnavailableLocalStorage(() => {
        const succeeded = saveDashboardConfig(defaultDashboardConfigFixture)

        expect(succeeded).toBe(false)
      })
    })
  })
})
