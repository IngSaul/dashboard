import { isNonEmptyString, isValidUrl } from '../utils/validation'
import type { Shortcut } from '../types/dashboard'

export interface ShortcutInput {
  label: string
  url: string
  categoryId?: string
  description?: string
}

export type ShortcutMutationResult =
  | { ok: true; shortcuts: Shortcut[] }
  | { ok: false; error: string }

function validateShortcutInput(input: ShortcutInput): string | null {
  if (!isNonEmptyString(input.label)) {
    return 'Label is required.'
  }
  if (!isValidUrl(input.url)) {
    return 'A valid URL is required.'
  }
  return null
}

function buildShortcutFields(input: ShortcutInput) {
  return {
    label: input.label.trim(),
    url: input.url.trim(),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
  }
}

/** Appends a new shortcut. Rejects invalid input without touching the existing list. */
export function addShortcut(shortcuts: Shortcut[], input: ShortcutInput): ShortcutMutationResult {
  const error = validateShortcutInput(input)
  if (error) {
    return { ok: false, error }
  }
  const now = new Date().toISOString()
  const shortcut: Shortcut = {
    id: crypto.randomUUID(),
    order: shortcuts.length,
    createdAt: now,
    updatedAt: now,
    ...buildShortcutFields(input),
  }
  return { ok: true, shortcuts: [...shortcuts, shortcut] }
}

/**
 * Replaces the fields of the shortcut matching `id` with `input` (a full
 * replacement, not a partial merge — the editing form always submits every
 * field). Rejects an unknown id or invalid input without touching the
 * existing list, per the UI contract's "malformed input is rejected with
 * the existing configuration preserved" rule.
 */
export function updateShortcut(
  shortcuts: Shortcut[],
  id: string,
  input: ShortcutInput,
): ShortcutMutationResult {
  const existing = shortcuts.find((shortcut) => shortcut.id === id)
  if (!existing) {
    return { ok: false, error: 'Shortcut not found.' }
  }
  const error = validateShortcutInput(input)
  if (error) {
    return { ok: false, error }
  }
  const updated: Shortcut = {
    id: existing.id,
    order: existing.order,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    // Editing label/URL/category must not silently wipe a previously
    // resolved icon — re-resolving it (`iconProvider.resolveIcon`, T088) is
    // a separate, explicit step the caller performs after this succeeds.
    ...(existing.icon !== undefined ? { icon: existing.icon } : {}),
    ...buildShortcutFields(input),
  }
  return {
    ok: true,
    shortcuts: shortcuts.map((shortcut) => (shortcut.id === id ? updated : shortcut)),
  }
}

/** Removes the shortcut matching `id`. Rejects an unknown id. */
export function removeShortcut(shortcuts: Shortcut[], id: string): ShortcutMutationResult {
  if (!shortcuts.some((shortcut) => shortcut.id === id)) {
    return { ok: false, error: 'Shortcut not found.' }
  }
  return { ok: true, shortcuts: shortcuts.filter((shortcut) => shortcut.id !== id) }
}

/** Reassigns `order` to match `orderedIds`. Rejects a sequence that is not an exact permutation of existing ids. */
export function reorderShortcuts(
  shortcuts: Shortcut[],
  orderedIds: string[],
): ShortcutMutationResult {
  const currentIds = new Set(shortcuts.map((shortcut) => shortcut.id))
  const isPermutation =
    orderedIds.length === shortcuts.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIds.has(id))
  if (!isPermutation) {
    return { ok: false, error: 'orderedIds must match the existing shortcut ids exactly.' }
  }
  const byId = new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut]))
  const reordered: Shortcut[] = []
  orderedIds.forEach((id, index) => {
    const shortcut = byId.get(id)
    if (shortcut) {
      reordered.push({ ...shortcut, order: index })
    }
  })
  return { ok: true, shortcuts: reordered }
}
