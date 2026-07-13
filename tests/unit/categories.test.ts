import { describe, expect, it } from 'vitest'
import {
  addCategory,
  filterShortcutsByCategory,
  getNonEmptyCategories,
  getOrderedShortcuts,
  reassignShortcutsToCategory,
  removeCategory,
  resolveGeneralCategory,
  updateCategory,
} from '../../src/services/categories'
import {
  dashboardShortcutFixtures,
  emptyCategoryFixture,
  generalCategoryFixture,
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
  return [workCategoryFixture, personalCategoryFixture, emptyCategoryFixture, generalCategoryFixture].map((c) => ({
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

describe('reassignShortcutsToCategory', () => {
  it('reassigns categoryId on shortcuts assigned to the source category', () => {
    const result = reassignShortcutsToCategory(shortcuts(), workCategoryFixture.id, generalCategoryFixture.id)

    const formerlyWork = result.filter((s) =>
      dashboardShortcutFixtures.some(
        (fixture) => fixture.id === s.id && fixture.categoryId === workCategoryFixture.id,
      ),
    )
    expect(formerlyWork.length).toBeGreaterThan(0)
    expect(formerlyWork.every((s) => s.categoryId === generalCategoryFixture.id)).toBe(true)
  })

  it('leaves shortcuts in other categories untouched', () => {
    const result = reassignShortcutsToCategory(shortcuts(), workCategoryFixture.id, generalCategoryFixture.id)

    const personalShortcut = result.find((s) => s.categoryId === personalCategoryFixture.id)
    expect(personalShortcut).toBeDefined()
  })

  it('never touches globalOrder — category and order are fully independent', () => {
    const before = shortcuts()

    const result = reassignShortcutsToCategory(before, workCategoryFixture.id, generalCategoryFixture.id)

    result.forEach((shortcut) => {
      const original = before.find((s) => s.id === shortcut.id)
      expect(shortcut.globalOrder).toBe(original?.globalOrder)
    })
  })
})

describe('resolveGeneralCategory', () => {
  it('returns the existing category named "General" unchanged', () => {
    const cats = categories()

    const result = resolveGeneralCategory(cats)

    expect(result.category.id).toBe(generalCategoryFixture.id)
    expect(result.categories).toBe(cats)
  })

  it('matches "General" case-insensitively and trimmed', () => {
    const cats = [{ ...generalCategoryFixture, name: '  general  ' }]

    const result = resolveGeneralCategory(cats)

    expect(result.category.id).toBe(generalCategoryFixture.id)
  })

  it('creates a new "General" category when none exists', () => {
    const cats = [workCategoryFixture, personalCategoryFixture]

    const result = resolveGeneralCategory(cats)

    expect(result.category.name).toBe('General')
    expect(result.categories).toHaveLength(cats.length + 1)
    expect(result.categories).toContainEqual(result.category)
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

describe('getOrderedShortcuts', () => {
  it('sorts a single category by globalOrder regardless of input array order', () => {
    const list = shortcuts().reverse()

    const result = getOrderedShortcuts(list, workCategoryFixture.id)

    expect(result.map((s) => s.id)).toEqual(['shortcut-mail', 'shortcut-calendar'])
  })

  it('"Todas" is the single globalOrder-sorted sequence, with nothing filtered out', () => {
    const result = getOrderedShortcuts(shortcuts().reverse(), null)

    expect(result.map((s) => s.id)).toEqual([
      'shortcut-mail',
      'shortcut-calendar',
      'shortcut-news',
      'shortcut-notes',
    ])
  })

  it('a category is purely a filter: reshuffling globalOrder changes both "Todas" and the filtered view together, with no order of its own', () => {
    // Mirrors the worked example in the feature spec: reorder the global
    // sequence so the two "Work" shortcuts are no longer adjacent, and
    // confirm the category view is still exactly their relative order
    // within that one sequence — not a stored, independent order.
    const byId = (id: string) => {
      const found = shortcuts().find((s) => s.id === id)
      if (!found) throw new Error(`fixture missing ${id}`)
      return found
    }
    const reshuffled = [
      { ...byId('shortcut-notes'), globalOrder: 0 },
      { ...byId('shortcut-calendar'), globalOrder: 1 },
      { ...byId('shortcut-news'), globalOrder: 2 },
      { ...byId('shortcut-mail'), globalOrder: 3 },
    ]

    expect(getOrderedShortcuts(reshuffled, null).map((s) => s.id)).toEqual([
      'shortcut-notes',
      'shortcut-calendar',
      'shortcut-news',
      'shortcut-mail',
    ])
    expect(getOrderedShortcuts(reshuffled, workCategoryFixture.id).map((s) => s.id)).toEqual([
      'shortcut-calendar',
      'shortcut-mail',
    ])
  })

  it('does not mutate the input shortcuts array', () => {
    const list = shortcuts()
    const originalListOrder = list.map((s) => s.id)

    getOrderedShortcuts(list, null)

    expect(list.map((s) => s.id)).toEqual(originalListOrder)
  })
})
