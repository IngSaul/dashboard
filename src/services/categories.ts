import { isNonEmptyString } from '../utils/validation'
import type { Shortcut, ShortcutCategory } from '../types/dashboard'

export interface CategoryInput {
  name: string
  isVisible?: boolean
}

export type CategoryMutationResult =
  | { ok: true; categories: ShortcutCategory[] }
  | { ok: false; error: string }

/**
 * Validates a category name: required, and unique case-insensitively among
 * `categories` (trimmed comparison). `excludeId` lets `updateCategory` rename
 * a category to its own unchanged name without tripping the duplicate check
 * on itself.
 */
function validateCategoryInput(
  categories: ShortcutCategory[],
  input: CategoryInput,
  excludeId?: string,
): string | null {
  if (!isNonEmptyString(input.name)) {
    return 'El nombre es obligatorio.'
  }
  const normalized = input.name.trim().toLowerCase()
  const isDuplicate = categories.some(
    (category) => category.id !== excludeId && category.name.trim().toLowerCase() === normalized,
  )
  if (isDuplicate) {
    return 'Ya existe una categoría con ese nombre.'
  }
  return null
}

/** Appends a new category. Rejects a blank or duplicate name without touching the existing list. */
export function addCategory(
  categories: ShortcutCategory[],
  input: CategoryInput,
): CategoryMutationResult {
  const error = validateCategoryInput(categories, input)
  if (error) {
    return { ok: false, error }
  }
  const now = new Date().toISOString()
  const category: ShortcutCategory = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    order: categories.length,
    isVisible: input.isVisible ?? true,
    createdAt: now,
    updatedAt: now,
  }
  return { ok: true, categories: [...categories, category] }
}

/** Renames/updates the category matching `id`. Rejects an unknown id, a blank name, or a name duplicating another category. */
export function updateCategory(
  categories: ShortcutCategory[],
  id: string,
  input: CategoryInput,
): CategoryMutationResult {
  const existing = categories.find((category) => category.id === id)
  if (!existing) {
    return { ok: false, error: 'Categoría no encontrada.' }
  }
  const error = validateCategoryInput(categories, input, id)
  if (error) {
    return { ok: false, error }
  }
  const updated: ShortcutCategory = {
    ...existing,
    name: input.name.trim(),
    isVisible: input.isVisible ?? existing.isVisible,
    updatedAt: new Date().toISOString(),
  }
  return {
    ok: true,
    categories: categories.map((category) => (category.id === id ? updated : category)),
  }
}

/** Removes the category matching `id`. Rejects an unknown id. */
export function removeCategory(
  categories: ShortcutCategory[],
  id: string,
): CategoryMutationResult {
  if (!categories.some((category) => category.id === id)) {
    return { ok: false, error: 'Categoría no encontrada.' }
  }
  return { ok: true, categories: categories.filter((category) => category.id !== id) }
}

/** Returns shortcuts assigned to `categoryId`, or every shortcut when `categoryId` is `null`. */
export function filterShortcutsByCategory(
  shortcuts: Shortcut[],
  categoryId: string | null,
): Shortcut[] {
  if (categoryId === null) {
    return shortcuts
  }
  return shortcuts.filter((shortcut) => shortcut.categoryId === categoryId)
}

/**
 * Clears `categoryId` on every shortcut assigned to `categoryId`. Called
 * alongside `removeCategory` so deleting a category never leaves a
 * shortcut pointing at one that no longer exists — the same "uncategorized"
 * outcome `repairShortcuts` (`config/schema.ts`) already enforces for a
 * `categoryId` that fails to resolve on load, just applied eagerly instead
 * of waiting for the next reload.
 */
export function unassignShortcutsFromCategory(shortcuts: Shortcut[], categoryId: string): Shortcut[] {
  return shortcuts.map((shortcut) => {
    if (shortcut.categoryId !== categoryId) {
      return shortcut
    }
    const next = { ...shortcut }
    delete next.categoryId
    return next
  })
}

/**
 * Categories to show in navigation: visible categories that have at least
 * one assigned shortcut, so an empty category never clutters the dashboard
 * (spec edge case for User Story 2).
 */
export function getNonEmptyCategories(
  categories: ShortcutCategory[],
  shortcuts: Shortcut[],
): ShortcutCategory[] {
  const categoryIdsWithShortcuts = new Set(
    shortcuts
      .map((shortcut) => shortcut.categoryId)
      .filter((categoryId): categoryId is string => categoryId !== undefined),
  )
  return categories.filter(
    (category) => category.isVisible && categoryIdsWithShortcuts.has(category.id),
  )
}
