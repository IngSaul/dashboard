import { loadDashboardConfig } from './configStore'
import { defaultSearchEngine } from './searchEngine'
import { isNonEmptyString, isValidUrl } from '../utils/validation'
import type { Shortcut } from '../types/dashboard'
import type { SearchResult } from '../types/search'

export interface ShortcutInput {
  label: string
  url: string
  /** The user's raw category choice — `undefined` means "none picked", resolved by the caller (`useShortcutLibrary`) to `fallbackCategoryId` (always "General"). Never persisted as unset — see `Shortcut.categoryId`. */
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

function buildShortcutFields(input: ShortcutInput, categoryId: string) {
  return {
    label: input.label.trim(),
    url: input.url.trim(),
    categoryId,
    ...(input.description !== undefined ? { description: input.description } : {}),
  }
}

/**
 * One past the highest existing `globalOrder` — not `shortcuts.length`,
 * which would collide with an existing value once a deletion has left a gap
 * (e.g. 4 shortcuts numbered 0-3, delete the one numbered 1: length is now
 * 3, but 3 is already taken).
 */
function nextGlobalOrder(shortcuts: Shortcut[]): number {
  return shortcuts.reduce((max, shortcut) => Math.max(max, shortcut.globalOrder), -1) + 1
}

/**
 * Appends a new shortcut at the end of the single global order — never at
 * the end of a per-category slice, since no such thing exists (see
 * `Shortcut.globalOrder`). Rejects invalid input without touching the
 * existing list. `fallbackCategoryId` must already resolve to a real
 * category (see `resolveGeneralCategory`) — every shortcut always belongs
 * to one.
 */
export function addShortcut(
  shortcuts: Shortcut[],
  input: ShortcutInput,
  fallbackCategoryId: string,
): ShortcutMutationResult {
  const error = validateShortcutInput(input)
  if (error) {
    return { ok: false, error }
  }
  const categoryId = input.categoryId ?? fallbackCategoryId
  const now = new Date().toISOString()
  const shortcut: Shortcut = {
    id: crypto.randomUUID(),
    globalOrder: nextGlobalOrder(shortcuts),
    createdAt: now,
    updatedAt: now,
    ...buildShortcutFields(input, categoryId),
  }
  return { ok: true, shortcuts: [...shortcuts, shortcut] }
}

/**
 * Replaces the fields of the shortcut matching `id` with `input` (a full
 * replacement, not a partial merge — the editing form always submits every
 * field). Rejects an unknown id or invalid input without touching the
 * existing list, per the UI contract's "malformed input is rejected with
 * the existing configuration preserved" rule. `fallbackCategoryId` is used
 * only when `input.categoryId` is unset (see `addShortcut`). Changing
 * `categoryId` here — the only place it's allowed to change — never
 * touches `globalOrder`: category is purely a filter, so re-categorizing a
 * shortcut leaves its position in the single global order untouched.
 */
export function updateShortcut(
  shortcuts: Shortcut[],
  id: string,
  input: ShortcutInput,
  fallbackCategoryId: string,
): ShortcutMutationResult {
  const existing = shortcuts.find((shortcut) => shortcut.id === id)
  if (!existing) {
    return { ok: false, error: 'Acceso directo no encontrado.' }
  }
  const error = validateShortcutInput(input)
  if (error) {
    return { ok: false, error }
  }
  const categoryId = input.categoryId ?? fallbackCategoryId
  const updated: Shortcut = {
    id: existing.id,
    globalOrder: existing.globalOrder,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
    // Editing label/URL/category must not silently wipe a previously
    // resolved icon — re-resolving it (`iconProvider.resolveIcon`, T088) is
    // a separate, explicit step the caller performs after this succeeds.
    ...(existing.icon !== undefined ? { icon: existing.icon } : {}),
    ...buildShortcutFields(input, categoryId),
  }
  return {
    ok: true,
    shortcuts: shortcuts.map((shortcut) => (shortcut.id === id ? updated : shortcut)),
  }
}

/**
 * Removes the shortcut matching `id` and renumbers `globalOrder` to close
 * the gap it leaves, so the sequence stays contiguous. Rejects an unknown
 * id.
 */
export function removeShortcut(shortcuts: Shortcut[], id: string): ShortcutMutationResult {
  if (!shortcuts.some((shortcut) => shortcut.id === id)) {
    return { ok: false, error: 'Acceso directo no encontrado.' }
  }
  return { ok: true, shortcuts: renumberGlobalOrder(shortcuts.filter((shortcut) => shortcut.id !== id)) }
}

/** Reassigns `globalOrder` to match `orderedIds`. Rejects a sequence that is not an exact permutation of existing ids. */
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
      reordered.push({ ...shortcut, globalOrder: index })
    }
  })
  return { ok: true, shortcuts: reordered }
}

function moveArrayItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice()
  const [item] = next.splice(from, 1)
  if (item !== undefined) {
    next.splice(to, 0, item)
  }
  return next
}

function sortByGlobalOrder(shortcuts: Shortcut[]): Shortcut[] {
  return [...shortcuts].sort((a, b) => a.globalOrder - b.globalOrder)
}

/**
 * Recomputes `globalOrder` as a contiguous 0..N-1 sequence, from
 * `shortcuts`' *current* `globalOrder` values (not array position) —
 * collapses gaps left by deletions and keeps the numbers small and stable.
 * `categoryId` is never touched here; category membership and order are
 * fully independent.
 */
export function renumberGlobalOrder(shortcuts: Shortcut[]): Shortcut[] {
  return sortByGlobalOrder(shortcuts).map((shortcut, index) => ({ ...shortcut, globalOrder: index }))
}

/**
 * The single drag & drop reorder primitive — moves `activeId` to sit right
 * beside `overId` within the one global order, and nothing else.
 * `categoryId` is never touched here, regardless of `overId`'s category:
 * category only ever changes through an explicit edit (`updateShortcut`),
 * never as a side effect of reordering. Dropping a "General" shortcut onto
 * a "Coding" one in the "Todas" view moves it next to that card in the
 * global sequence — it still only appears under the "General" filter.
 * Rejects unknown ids or dropping an item on itself.
 */
export function moveShortcut(shortcuts: Shortcut[], activeId: string, overId: string): ShortcutMutationResult {
  if (activeId === overId) {
    return { ok: false, error: 'El acceso no puede soltarse sobre sí mismo.' }
  }
  const ordered = sortByGlobalOrder(shortcuts)
  const fromIndex = ordered.findIndex((shortcut) => shortcut.id === activeId)
  const toIndex = ordered.findIndex((shortcut) => shortcut.id === overId)
  if (fromIndex === -1 || toIndex === -1) {
    return { ok: false, error: 'Acceso directo no encontrado.' }
  }
  const moved = moveArrayItem(ordered, fromIndex, toIndex)
  return { ok: true, shortcuts: moved.map((shortcut, index) => ({ ...shortcut, globalOrder: index })) }
}

/**
 * Registers the "jump to shortcut" `SearchSource` (T094): matches
 * shortcuts whose label contains the query (case-insensitive), reading
 * `configStore` fresh on every call so a shortcut added/edited/removed from
 * the grid is reflected on the very next keystroke.
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
