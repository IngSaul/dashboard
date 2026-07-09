import { describe, expect, it } from 'vitest'
import {
  addShortcut,
  removeShortcut,
  reorderShortcuts,
  updateShortcut,
} from '../../src/services/shortcuts'
import { dashboardShortcutFixtures } from '../fixtures/dashboardConfig'

/**
 * `shortcuts.ts` does not exist yet (built in T039); these tests define its
 * CRUD/validation contract and are expected to fail to resolve until then.
 * All mutation helpers are pure (return a new array, never mutate the
 * input) and reject invalid input without touching the existing list,
 * matching the UI contract's "malformed input is rejected with the
 * existing configuration preserved" rule.
 */

function shortcuts() {
  return dashboardShortcutFixtures.map((shortcut) => ({ ...shortcut }))
}

describe('addShortcut', () => {
  it('appends a valid shortcut', () => {
    const result = addShortcut(shortcuts(), { label: 'Docs', url: 'https://docs.example.com' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts).toHaveLength(shortcuts().length + 1)
    const added = result.shortcuts.at(-1)
    expect(added?.label).toBe('Docs')
    expect(added?.url).toBe('https://docs.example.com')
    expect(added?.id).toEqual(expect.any(String))
    expect(added?.id.length).toBeGreaterThan(0)
  })

  it('does not mutate the input array', () => {
    const original = shortcuts()
    const originalLength = original.length

    addShortcut(original, { label: 'Docs', url: 'https://docs.example.com' })

    expect(original).toHaveLength(originalLength)
  })

  it('rejects a blank label', () => {
    const result = addShortcut(shortcuts(), { label: '   ', url: 'https://docs.example.com' })

    expect(result.ok).toBe(false)
  })

  it('rejects an invalid url', () => {
    const result = addShortcut(shortcuts(), { label: 'Docs', url: 'not-a-url' })

    expect(result.ok).toBe(false)
  })
})

describe('updateShortcut', () => {
  it('updates the matching shortcut and leaves others untouched', () => {
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(list, target.id, { label: 'Mail', url: target.url })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.shortcuts.find((s) => s.id === target.id)?.label).toBe('Mail')
    expect(result.shortcuts).toHaveLength(list.length)
    expect(result.shortcuts.find((s) => s.id === list[1]?.id)?.label).toBe(list[1]?.label)
  })

  it('rejects an update for an unknown id', () => {
    const result = updateShortcut(shortcuts(), 'does-not-exist', {
      label: 'Mail',
      url: 'https://mail.example.com',
    })

    expect(result.ok).toBe(false)
  })

  it('rejects invalid input and preserves the existing list', () => {
    const list = shortcuts()
    const target = list[0]
    if (!target) throw new Error('fixture missing first shortcut')

    const result = updateShortcut(list, target.id, { label: '', url: target.url })

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

  it('rejects removal of an unknown id', () => {
    const result = removeShortcut(shortcuts(), 'does-not-exist')

    expect(result.ok).toBe(false)
  })
})

describe('reorderShortcuts', () => {
  it('reassigns order to match the given id sequence', () => {
    const list = shortcuts()
    const reversedIds = list.map((s) => s.id).reverse()

    const result = reorderShortcuts(list, reversedIds)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    reversedIds.forEach((id, index) => {
      expect(result.shortcuts.find((s) => s.id === id)?.order).toBe(index)
    })
  })

  it('rejects a sequence that is not a permutation of existing ids', () => {
    const list = shortcuts()

    const result = reorderShortcuts(list, ['does-not-exist'])

    expect(result.ok).toBe(false)
  })
})
