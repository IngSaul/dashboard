import { loadDashboardConfig } from './configStore'
import { defaultSearchEngine } from './searchEngine'
import { isNonEmptyString, isValidUrl } from '../utils/validation'
import type { Shortcut } from '../types/dashboard'
import type { SearchResult } from '../types/search'

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
    return 'El nombre es obligatorio.'
  }
  if (!isValidUrl(input.url)) {
    return 'Se requiere una URL válida.'
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
    return { ok: false, error: 'Acceso directo no encontrado.' }
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
    return { ok: false, error: 'Acceso directo no encontrado.' }
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
    return { ok: false, error: 'orderedIds debe coincidir exactamente con los ids de accesos directos existentes.' }
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

/**
 * Registers the "jump to shortcut" `SearchSource` (T094): matches
 * shortcuts whose label contains the query (case-insensitive), reading
 * `configStore` fresh on every call so a shortcut added/edited/removed via
 * `ShortcutSettings` is reflected on the very next keystroke.
 */
export function registerShortcutSearchSource(): void {
  defaultSearchEngine.registerSource({
    id: 'shortcuts',
    label: 'Accesos directos',
    kind: 'shortcut',
    match(query) {
      const lowerQuery = query.trim().toLowerCase()
      if (lowerQuery.length === 0) {
        return []
      }
      return loadDashboardConfig()
        .shortcuts.filter((shortcut) => shortcut.label.toLowerCase().includes(lowerQuery))
        .map(
          (shortcut): SearchResult => ({
            id: `shortcut-${shortcut.id}`,
            sourceId: 'shortcuts',
            label: shortcut.label,
            ...(shortcut.description !== undefined ? { description: shortcut.description } : {}),
            ...(shortcut.icon !== undefined ? { icon: shortcut.icon } : {}),
            onSelect: () => window.open(shortcut.url, '_blank', 'noopener'),
          }),
        )
    },
  })
}
