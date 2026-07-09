/**
 * Keyboard navigation helpers for dense, repeated controls (shortcut cards,
 * category lists) using a roving-tabindex pattern: arrow keys move focus
 * between items while Tab moves past the whole group.
 */

export const ACTIVATION_KEYS = new Set(['Enter', ' '])

export function isActivationKey(key: string): boolean {
  return ACTIVATION_KEYS.has(key)
}

export type RovingNavigationKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

const ROVING_NAVIGATION_KEYS: ReadonlySet<string> = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
])

export function isRovingNavigationKey(key: string): key is RovingNavigationKey {
  return ROVING_NAVIGATION_KEYS.has(key)
}

/**
 * Computes the next focus index for a linear group (e.g. category list) or a
 * wrapped grid (e.g. shortcut cards) of `itemCount` items.
 *
 * `columns` defaults to 1 (linear list, where ArrowLeft/ArrowRight behave
 * like ArrowUp/ArrowDown). Movement wraps at the group's edges.
 */
export function getNextRovingIndex(
  currentIndex: number,
  itemCount: number,
  key: RovingNavigationKey,
  columns = 1,
): number {
  if (itemCount <= 0) {
    return currentIndex
  }

  const wrap = (index: number): number => ((index % itemCount) + itemCount) % itemCount

  switch (key) {
    case 'Home':
      return 0
    case 'End':
      return itemCount - 1
    case 'ArrowLeft':
      return wrap(currentIndex - 1)
    case 'ArrowRight':
      return wrap(currentIndex + 1)
    case 'ArrowUp':
      return columns > 1 ? wrap(currentIndex - columns) : wrap(currentIndex - 1)
    case 'ArrowDown':
      return columns > 1 ? wrap(currentIndex + columns) : wrap(currentIndex + 1)
    default:
      return currentIndex
  }
}
