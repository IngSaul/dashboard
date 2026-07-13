import { describe, expect, it } from 'vitest'
import { addShortcut, moveShortcut, removeShortcut, reorderShortcuts, updateShortcut } from '../../src/services/shortcuts'
import {
  dashboardShortcutFixtures,
  generalCategoryFixture,
  personalCategoryFixture,
  workCategoryFixture,
} from '../fixtures/dashboardConfig'

/**
 * All mutation helpers are pure (return a new array, never mutate the
 * input) and reject invalid input without touching the existing list,
 * matching the UI contract's "malformed input is rejected with the
 * existing configuration preserved" rule.
 *
 * `globalOrder` is the single source of truth for shortcut order — there is
 * no per-category order anywhere. Fixture order (`dashboardShortcutFixtures`):
 * shortcut-mail (Work, 0), shortcut-calendar (Work, 1), shortcut-news
 * (Personal, 2), shortcut-notes (General, 3).
 */

function shortcuts() {
  return dashboardShortcutFixtures.map((shortcut) => ({ ...shortcut }))
}

describe('addShortcut', () => {
  it('appends a valid shortcut', () => {
    const result = addShortcut(shortcuts(), { label: 'Docs', url: 'https://docs.example.com' }, generalCategoryFixture.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts).toHaveLength(shortcuts().length + 1)
    const added = result.shortcuts.at(-1)
    expect(added?.label).toBe('Docs')
    expect(added?.url).toBe('https://docs.example.com')
    expect(added?.id).toEqual(expect.any(String))
    expect(added?.id.length).toBeGreaterThan(0)
  })

  it('falls back to the given category when none is picked', () => {
    const result = addShortcut(shortcuts(), { label: 'Docs', url: 'https://docs.example.com' }, generalCategoryFixture.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.at(-1)?.categoryId).toBe(generalCategoryFixture.id)
  })

  it('appends at the end of the single global order, regardless of category', () => {
    // Adding to "Work" (which already holds 2 of the 4 fixture shortcuts)
    // still appends after every shortcut in the whole list, not just Work's.
    const result = addShortcut(shortcuts(), { label: 'Docs', url: 'https://docs.example.com' }, workCategoryFixture.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.at(-1)?.globalOrder).toBe(shortcuts().length)
  })

  it('prefers an explicit categoryId over the fallback', () => {
    const result = addShortcut(
      shortcuts(),
      { label: 'Docs', url: 'https://docs.example.com', categoryId: personalCategoryFixture.id },
      generalCategoryFixture.id,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.at(-1)?.categoryId).toBe(personalCategoryFixture.id)
  })

  it('assigns a globalOrder past the highest existing one, even after a gap left by deletion', () => {
    // shortcut-notes has the highest globalOrder (3) in the fixture; removing
    // shortcut-calendar (1) leaves a gap that `shortcuts.length` alone would
    // collide with.
    const afterRemoval = removeShortcut(shortcuts(), 'shortcut-calendar')
    expect(afterRemoval.ok).toBe(true)
    if (!afterRemoval.ok) return

    const result = addShortcut(afterRemoval.shortcuts, { label: 'Docs', url: 'https://docs.example.com' }, generalCategoryFixture.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const orders = result.shortcuts.map((shortcut) => shortcut.globalOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('does not mutate the input array', () => {
    const original = shortcuts()
    const originalLength = original.length

    addShortcut(original, { label: 'Docs', url: 'https://docs.example.com' }, generalCategoryFixture.id)

    expect(original).toHaveLength(originalLength)
  })

  it('rejects a blank label', () => {
    const result = addShortcut(shortcuts(), { label: '   ', url: 'https://docs.example.com' }, generalCategoryFixture.id)

    expect(result.ok).toBe(false)
  })

  it('rejects an invalid url', () => {
    const result = addShortcut(shortcuts(), { label: 'Docs', url: 'not-a-url' }, generalCategoryFixture.id)

    expect(result.ok).toBe(false)
  })
})

describe('updateShortcut', () => {
  it('updates the matching shortcut and leaves others untouched', () => {
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(list, target.id, { label: 'Mail', url: target.url }, generalCategoryFixture.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.find((s) => s.id === target.id)?.label).toBe('Mail')
    expect(result.shortcuts).toHaveLength(list.length)
    expect(result.shortcuts.find((s) => s.id === list[1]?.id)?.label).toBe(list[1]?.label)
  })

  it('keeps its own category and globalOrder when the input repeats the shortcut\'s current categoryId', () => {
    // `EditShortcutModal`'s category field is always pre-filled with the
    // shortcut's own current category, so a save that doesn't touch it
    // submits that same id explicitly — this is the realistic "unchanged
    // category" case, not an omitted `categoryId`.
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(
      list,
      target.id,
      { label: 'Mail', url: target.url, categoryId: target.categoryId },
      generalCategoryFixture.id,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const updated = result.shortcuts.find((s) => s.id === target.id)
    expect(updated?.categoryId).toBe(target.categoryId)
    expect(updated?.globalOrder).toBe(target.globalOrder)
  })

  it('falls back to the given category when the input omits categoryId, same as addShortcut', () => {
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(list, target.id, { label: 'Mail', url: target.url }, generalCategoryFixture.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.find((s) => s.id === target.id)?.categoryId).toBe(generalCategoryFixture.id)
  })

  it('changes categoryId without touching globalOrder when the input picks a different category', () => {
    // Category only ever changes through this explicit edit path — and even
    // here, it never touches `globalOrder`: the shortcut keeps its exact
    // position in the single global order, just filtered differently now.
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(
      list,
      target.id,
      { label: target.label, url: target.url, categoryId: personalCategoryFixture.id },
      generalCategoryFixture.id,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const updated = result.shortcuts.find((s) => s.id === target.id)
    expect(updated?.categoryId).toBe(personalCategoryFixture.id)
    expect(updated?.globalOrder).toBe(target.globalOrder)
  })

  it('rejects an update for an unknown id', () => {
    const result = updateShortcut(
      shortcuts(),
      'does-not-exist',
      { label: 'Mail', url: 'https://mail.example.com' },
      generalCategoryFixture.id,
    )

    expect(result.ok).toBe(false)
  })

  it('rejects invalid input and preserves the existing list', () => {
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(list, target.id, { label: '', url: target.url }, generalCategoryFixture.id)

    expect(result.ok).toBe(false)
  })
})

describe('removeShortcut', () => {
  it('removes the matching shortcut', () => {
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = removeShortcut(list, target.id)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts).toHaveLength(list.length - 1)
    expect(result.shortcuts.find((s) => s.id === target.id)).toBeUndefined()
  })

  it('renumbers globalOrder to close the gap it leaves', () => {
    const result = removeShortcut(shortcuts(), 'shortcut-calendar')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const orders = result.shortcuts.map((s) => s.globalOrder).sort((a, b) => a - b)
    expect(orders).toEqual([0, 1, 2])
  })

  it('rejects removal of an unknown id', () => {
    const result = removeShortcut(shortcuts(), 'does-not-exist')

    expect(result.ok).toBe(false)
  })
})

describe('reorderShortcuts', () => {
  it('reassigns globalOrder to match the given id sequence', () => {
    const list = shortcuts()
    const reversedIds = list.map((s) => s.id).reverse()

    const result = reorderShortcuts(list, reversedIds)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    reversedIds.forEach((id, index) => {
      expect(result.shortcuts.find((s) => s.id === id)?.globalOrder).toBe(index)
    })
  })

  it('rejects a sequence that is not a permutation of existing ids', () => {
    const list = shortcuts()

    const result = reorderShortcuts(list, ['does-not-exist'])

    expect(result.ok).toBe(false)
  })
})

describe('moveShortcut', () => {
  it('reorders within the same category when dropped beside a sibling', () => {
    const list = shortcuts()
    // Fixture: shortcut-mail (globalOrder 0), shortcut-calendar (globalOrder 1), both "Work".
    const result = moveShortcut(list, 'shortcut-mail', 'shortcut-calendar')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.find((s) => s.id === 'shortcut-calendar')?.globalOrder).toBe(0)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-mail')?.globalOrder).toBe(1)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-mail')?.categoryId).toBe(workCategoryFixture.id)
  })

  it('never changes categoryId, even when dropped beside a shortcut from a different category', () => {
    const list = shortcuts()

    // shortcut-mail ("Work") dropped beside shortcut-news ("Personal") —
    // under the old (wrong) model this used to re-categorize it; the new
    // model only ever moves globalOrder.
    const result = moveShortcut(list, 'shortcut-mail', 'shortcut-news')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const moved = result.shortcuts.find((s) => s.id === 'shortcut-mail')
    expect(moved?.categoryId).toBe(workCategoryFixture.id)
  })

  it('renumbers the whole global order after a cross-category-boundary move, touching no categoryId', () => {
    const list = shortcuts()

    const result = moveShortcut(list, 'shortcut-mail', 'shortcut-news')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Global order was [mail 0, calendar 1, news 2, notes 3]; moving mail to
    // sit beside news yields [calendar, news, mail, notes].
    expect(result.shortcuts.find((s) => s.id === 'shortcut-calendar')?.globalOrder).toBe(0)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-news')?.globalOrder).toBe(1)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-mail')?.globalOrder).toBe(2)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-notes')?.globalOrder).toBe(3)
    // Every shortcut's categoryId is exactly what it started with.
    expect(result.shortcuts.find((s) => s.id === 'shortcut-mail')?.categoryId).toBe(workCategoryFixture.id)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-calendar')?.categoryId).toBe(workCategoryFixture.id)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-news')?.categoryId).toBe(personalCategoryFixture.id)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-notes')?.categoryId).toBe(generalCategoryFixture.id)
  })

  it('leaves every shortcut not between the source and target position untouched', () => {
    const list = shortcuts()
    const notesBefore = list.find((s) => s.id === 'shortcut-notes')

    const result = moveShortcut(list, 'shortcut-mail', 'shortcut-news')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.find((s) => s.id === 'shortcut-notes')).toEqual(notesBefore)
  })

  it('reordering within a filtered category view still only moves globalOrder, keeping every category\'s relative order elsewhere intact', () => {
    // Simulates dragging within the "Personal"/"General" filtered view: only
    // one category's shortcut is involved, so its neighbors in other
    // categories must not shift at all.
    const list = shortcuts()

    const result = moveShortcut(list, 'shortcut-notes', 'shortcut-news')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.find((s) => s.id === 'shortcut-notes')?.categoryId).toBe(generalCategoryFixture.id)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-mail')?.globalOrder).toBe(0)
    expect(result.shortcuts.find((s) => s.id === 'shortcut-calendar')?.globalOrder).toBe(1)
  })

  it('rejects dropping a shortcut on itself', () => {
    const result = moveShortcut(shortcuts(), 'shortcut-mail', 'shortcut-mail')

    expect(result.ok).toBe(false)
  })

  it('rejects an unknown active or target id', () => {
    const list = shortcuts()

    expect(moveShortcut(list, 'does-not-exist', 'shortcut-mail').ok).toBe(false)
    expect(moveShortcut(list, 'shortcut-mail', 'does-not-exist').ok).toBe(false)
  })
})
