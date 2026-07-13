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

const GENERAL_CATEGORY_NAME = 'General'

/**
 * Finds the category named "General" (case-insensitive, trimmed — matching
 * `validateCategoryInput`'s duplicate-name comparison), creating one if none
 * exists (e.g. it was renamed or just deleted). Every shortcut must always
 * resolve to a real category — this is the single, shared fallback used for
 * "no category selected" on create/edit, for reassigning a deleted
 * category's shortcuts, and for repairing an orphaned `categoryId`
 * reference on load (`config/schema.ts`).
 */
export function resolveGeneralCategory(
  categories: ShortcutCategory[],
): { categories: ShortcutCategory[]; category: ShortcutCategory } {
  const existing = categories.find(
    (category) => category.name.trim().toLowerCase() === GENERAL_CATEGORY_NAME.toLowerCase(),
  )
  if (existing) {
    return { categories, category: existing }
  }
  const now = new Date().toISOString()
  const general: ShortcutCategory = {
    id: crypto.randomUUID(),
    name: GENERAL_CATEGORY_NAME,
    order: categories.length,
    isVisible: true,
    createdAt: now,
    updatedAt: now,
  }
  return { categories: [...categories, general], category: general }
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
 * Reassigns every shortcut in `fromCategoryId` to `toCategoryId`.
 * `globalOrder` is untouched — category and order are fully independent, so
 * reassigning category never needs to renumber anything. Called alongside
 * `removeCategory` so deleting a category never leaves a shortcut pointing
 * at one that no longer exists — every shortcut always belongs to a real
 * category, falling back to "General" (`resolveGeneralCategory`).
 */
export function reassignShortcutsToCategory(
  shortcuts: Shortcut[],
  fromCategoryId: string,
  toCategoryId: string,
): Shortcut[] {
  return shortcuts.map((shortcut) =>
    shortcut.categoryId === fromCategoryId ? { ...shortcut, categoryId: toCategoryId } : shortcut,
  )
}

/**
 * Render order for the shortcuts grid — the single source of truth so
 * `ShortcutGrid` only ever needs to render what it's given. `categoryId` is
 * purely a filter: this always starts from the one global order
 * (`globalOrder`, ascending) and, for a specific category, removes
 * shortcuts that don't match — it never reads or reconstructs order from
 * categories. "Todas" (`activeCategoryId === null`) is that same global
 * order with nothing filtered out.
 */
export function getOrderedShortcuts(
  shortcuts: Shortcut[],
  activeCategoryId: string | null,
): Shortcut[] {
  const ordered = [...shortcuts].sort((a, b) => a.globalOrder - b.globalOrder)
  return filterShortcutsByCategory(ordered, activeCategoryId)
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
  const categoryIdsWithShortcuts = new Set(shortcuts.map((shortcut) => shortcut.categoryId))
  return categories.filter(
    (category) => category.isVisible && categoryIdsWithShortcuts.has(category.id),
  )
}
