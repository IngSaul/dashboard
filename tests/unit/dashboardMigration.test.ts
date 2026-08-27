import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decideMigration } from '../../src/services/auth/migrateLocalConfig'
import { DASHBOARD_CONFIG_STORAGE_KEY } from '../../src/services/configStore'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/** User Story 4 (spec.md) — migration decision logic, spec FR-016/FR-017. */
describe('decideMigration', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('found: uses the server config as-is and never needs uploading', () => {
    const serverConfig = createDefaultDashboardConfig()

    const decision = decideMigration({ kind: 'found', config: serverConfig })

    expect(decision).toEqual({ config: serverConfig, needsUpload: false, migratedFromLocal: false })
  })

  it('not-found with a pre-existing local config: repairs and returns it for upload, flagged as migrated', () => {
    const localConfig = createDefaultDashboardConfig()
    window.localStorage.setItem(DASHBOARD_CONFIG_STORAGE_KEY, JSON.stringify(localConfig))

    const decision = decideMigration({ kind: 'not-found' })

    expect(decision.needsUpload).toBe(true)
    expect(decision.migratedFromLocal).toBe(true)
    expect(decision.config.shortcuts).toHaveLength(localConfig.shortcuts.length)
  })

  it('not-found with no local config: seeds fresh defaults, not flagged as migrated', () => {
    const decision = decideMigration({ kind: 'not-found' })

    expect(decision.needsUpload).toBe(true)
    expect(decision.migratedFromLocal).toBe(false)
    expect(decision.config.shortcuts.length).toBeGreaterThan(0)
  })

  it('not-found with a corrupted local config: repairs it (never uploads garbage) rather than failing', () => {
    window.localStorage.setItem(DASHBOARD_CONFIG_STORAGE_KEY, '{ not valid json')

    const decision = decideMigration({ kind: 'not-found' })

    expect(decision.needsUpload).toBe(true)
    // A corrupted stored value repairs to defaults via the existing
    // repairDashboardConfig — still correctly flagged as "there was
    // something local" since the raw key was present.
    expect(decision.migratedFromLocal).toBe(true)
    expect(decision.config.shortcuts.length).toBeGreaterThan(0)
  })

  it('error: degrades gracefully to a usable config without requesting an upload', () => {
    const decision = decideMigration({ kind: 'error' })

    expect(decision.needsUpload).toBe(false)
    expect(decision.migratedFromLocal).toBe(false)
    expect(decision.config.shortcuts.length).toBeGreaterThan(0)
  })
})
