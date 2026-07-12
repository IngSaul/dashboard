import { describe, expect, it } from 'vitest'
import {
  addCategory,
  filterShortcutsByCategory,
  getNonEmptyCategories,
  removeCategory,
  unassignShortcutsFromCategory,
  updateCategory,
} from '../../src/services/categories'
import {
  dashboardShortcutFixtures,
  emptyCategoryFixture,
  personalCategoryFixture,
  workCategoryFixture,
} from '../fixtures/dashboardConfig'

/**
 * `categories.ts` does not exist yet (built in T040); these tests define
 * its CRUD/filtering contract and are expected to fail to resolve until
 * then. `getNonEmptyCategories` covers the spec edge case that an empty
 * category must not create visual clutter on the dashboard.
 */

function categories() {
  return [workCategoryFixture, personalCategoryFixture, emptyCategoryFixture].map((c) => ({
    ...c,
  }))
}

function shortcuts() {
  return dashboardShortcutFixtures.map((shortcut) => ({ ...shortcut }))
}

describe('addCategory', () => {
  it('appends a valid category', () => {
    const result = addCategory(categories(), { name: 'Learning' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.categories).toHaveLength(categories().length + 1)
    const added = result.categories.at(-1)
    expect(added?.name).toBe('Learning')
    expect(added?.isVisible).toBe(true)
  })

  it('rejects a blank name', () => {
    const result = addCategory(categories(), { name: '   ' })

    expect(result.ok).toBe(false)
  })

  it('rejects a name that duplicates an existing category, ignoring case and whitespace', () => {
    const result = addCategory(categories(), { name: `  ${workCategoryFixture.name.toUpperCase()}  ` })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/ya existe/i)
  })
})

describe('updateCategory', () => {
  it('renames the matching category', () => {
    const list = categories()
    const target = list[0]
    if (!target) throw new Error('fixture missing first category')

    const result = updateCategory(list, target.id, { name: 'Renamed' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.categories.find((c) => c.id === target.id)?.name).toBe('Renamed')
  })

  it('rejects an update for an unknown id', () => {
    const result = updateCategory(categories(), 'does-not-exist', { name: 'Renamed' })

    expect(result.ok).toBe(false)
  })

  it('rejects renaming to another category\'s name, ignoring case', () => {
    const list = categories()

    const result = updateCategory(list, personalCategoryFixture.id, {
      name: workCategoryFixture.name.toLowerCase(),
    })

    expect(result.ok).toBe(false)
  })

  it('allows re-saving a category with its own unchanged name', () => {
    const list = categories()

    const result = updateCategory(list, workCategoryFixture.id, { name: workCategoryFixture.name })

    expect(result.ok).toBe(true)
  })
})

describe('removeCategory', () => {
  it('removes the matching category', () => {
    const list = categories()
    const target = list[0]
    if (!target) throw new Error('fixture missing first category')

    const result = removeCategory(list, target.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.categories).toHaveLength(list.length - 1)
  })

  it('rejects removal of an unknown id', () => {
    const result = removeCategory(categories(), 'does-not-exist')

    expect(result.ok).toBe(false)
  })
})

describe('unassignShortcutsFromCategory', () => {
  it('clears categoryId on shortcuts assigned to the removed category', () => {
    const result = unassignShortcutsFromCategory(shortcuts(), workCategoryFixture.id)

    const formerlyWork = result.filter((s) =>
      dashboardShortcutFixtures.some(
        (fixture) => fixture.id === s.id && fixture.categoryId === workCategoryFixture.id,
      ),
    )
    expect(formerlyWork.length).toBeGreaterThan(0)
    expect(formerlyWork.every((s) => s.categoryId === undefined)).toBe(true)
  })

  it('leaves shortcuts in other categories untouched', () => {
    const result = unassignShortcutsFromCategory(shortcuts(), workCategoryFixture.id)

    const personalShortcut = result.find((s) => s.categoryId === personalCategoryFixture.id)
    expect(personalShortcut).toBeDefined()
  })
})

describe('filterShortcutsByCategory', () => {
  it('returns only shortcuts assigned to the given category', () => {
    const result = filterShortcutsByCategory(shortcuts(), workCategoryFixture.id)

    expect(result.length).toBeGreaterThan(0)
    expect(result.every((s) => s.categoryId === workCategoryFixture.id)).toBe(true)
  })

  it('returns every shortcut when categoryId is null', () => {
    const result = filterShortcutsByCategory(shortcuts(), null)

    expect(result).toHaveLength(shortcuts().length)
  })
})

describe('getNonEmptyCategories', () => {
  it('excludes categories with no assigned shortcuts', () => {
    const result = getNonEmptyCategories(categories(), shortcuts())

    expect(result.some((c) => c.id === emptyCategoryFixture.id)).toBe(false)
    expect(result.some((c) => c.id === workCategoryFixture.id)).toBe(true)
  })

  it('excludes categories marked not visible even with assigned shortcuts', () => {
    const hiddenWorkCategory = { ...workCategoryFixture, isVisible: false }

    const result = getNonEmptyCategories(
      [hiddenWorkCategory, personalCategoryFixture, emptyCategoryFixture],
      shortcuts(),
    )

    expect(result.some((c) => c.id === workCategoryFixture.id)).toBe(false)
  })
})
