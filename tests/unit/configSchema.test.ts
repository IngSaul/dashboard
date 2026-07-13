import { describe, expect, it } from 'vitest'
import { repairDashboardConfig } from '../../src/config/schema'
import {
  defaultDashboardConfigFixture,
  invalidShortcutConfigFixture,
  invalidVersionConfigFixture,
  missingFieldsConfigFixture,
  orphanCategoryReferenceConfigFixture,
  partiallyInvalidConfigFixture,
  validSerializedDashboardConfigFixture,
} from '../fixtures/dashboardConfig'

describe('repairDashboardConfig', () => {
  it('accepts a valid configuration unchanged', () => {
    const result = repairDashboardConfig(JSON.parse(validSerializedDashboardConfigFixture))

    expect(result.shortcuts).toHaveLength(defaultDashboardConfigFixture.shortcuts.length)
    expect(result.categories).toHaveLength(defaultDashboardConfigFixture.categories.length)
    expect(result.themePreference).toEqual(defaultDashboardConfigFixture.themePreference)
    expect(result.searchPreference).toEqual(defaultDashboardConfigFixture.searchPreference)
  })

  it('falls back to full defaults for an unrecognized version', () => {
    const result = repairDashboardConfig(JSON.parse(invalidVersionConfigFixture))

    expect(result.version).toBe(1)
    expect(result.shortcuts.length).toBeGreaterThan(0)
    expect(result.categories.length).toBeGreaterThan(0)
  })

  it('falls back to defaults for individually missing sections', () => {
    const result = repairDashboardConfig(JSON.parse(missingFieldsConfigFixture))

    expect(result.shortcuts).toEqual([])
    expect(result.themePreference.mode).toBe('system')
    expect(result.searchPreference.searchUrlTemplate).toContain('{query}')
    expect(result.categories.length).toBeGreaterThan(0)
  })

  it('drops a shortcut missing required fields', () => {
    const result = repairDashboardConfig(JSON.parse(invalidShortcutConfigFixture))

    expect(result.shortcuts).toEqual([])
  })

  it('reassigns an orphaned categoryId to General while keeping the shortcut', () => {
    const result = repairDashboardConfig(JSON.parse(orphanCategoryReferenceConfigFixture))

    expect(result.shortcuts).toHaveLength(1)
    const general = result.categories.find((category) => category.name === 'General')
    expect(general).toBeDefined()
    expect(result.shortcuts[0]?.categoryId).toBe(general?.id)
  })

  it('keeps valid records and drops invalid ones from a mixed list', () => {
    const result = repairDashboardConfig(JSON.parse(partiallyInvalidConfigFixture))

    expect(result.shortcuts).toHaveLength(1)
    expect(result.shortcuts[0]?.id).toBe('shortcut-mail')
  })

  it('falls back to full defaults for a non-object value', () => {
    const result = repairDashboardConfig(null)

    expect(result.shortcuts.length).toBeGreaterThan(0)
    expect(result.categories.length).toBeGreaterThan(0)
  })

  it('deduplicates shortcut and category ids, keeping the first occurrence', () => {
    const duplicated = {
      ...defaultDashboardConfigFixture,
      categories: [
        defaultDashboardConfigFixture.categories[0],
        { ...defaultDashboardConfigFixture.categories[0], name: 'Duplicate' },
      ],
      shortcuts: [
        defaultDashboardConfigFixture.shortcuts[0],
        { ...defaultDashboardConfigFixture.shortcuts[0], label: 'Duplicate' },
      ],
    }

    const result = repairDashboardConfig(duplicated)

    // 1 deduplicated "Work" + an auto-created "General" (`resolveGeneralCategory`
    // guarantees one exists, and "Work" alone doesn't satisfy that).
    expect(result.categories).toHaveLength(2)
    expect(result.categories.filter((category) => category.name === 'Work')).toHaveLength(1)
    expect(result.shortcuts).toHaveLength(1)
  })
})
