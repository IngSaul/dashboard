import { useSyncExternalStore } from 'react'
import { BREAKPOINT_QUERIES } from '../design/breakpoints'
import type { Breakpoint, ResolvedLayout } from '../types/layout'
import type { Widget, WidgetLayout, WidgetType } from '../types/widgets'

/**
 * Layout resolution. The single owner of breakpoint detection and
 * column-reflow decisions: `Workspace` renders `resolveLayout()`'s output
 * and contains no layout math of its own (see
 * `contracts/ui-contract.md#layout-engine`).
 */

function sortedColumn(widgets: Widget[], column: Widget['column']): Widget[] {
  return widgets
    .filter((widget) => widget.column === column)
    .sort((a, b) => a.order - b.order)
}

/**
 * Computes the per-column, ordered, enabled-only widget lists for the given
 * breakpoint. Pure function of its inputs — no DOM, no registry access:
 * callers pass the currently-registered types (from `PluginState`) so a
 * persisted widget whose plugin is gone is skipped, mirroring the schema's
 * unknown-type repair path but without mutating persisted state.
 *
 * Reflow rules:
 * - `desktop`: three columns, as assigned.
 * - `tablet`: the right column folds to the end of the center column (the
 *   side columns collapse below the primary content per design-reference.md).
 * - `phone` (best effort): everything folds into one center column, ordered
 *   center → left → right, so the default glanceable widgets (clock,
 *   shortcuts — always center) stay on top.
 */
export function resolveLayout(
  layout: WidgetLayout,
  breakpoint: Breakpoint,
  registeredTypes: readonly WidgetType[],
): ResolvedLayout {
  const registered = new Set(registeredTypes)
  const visible = layout.widgets.filter((widget) => widget.enabled && registered.has(widget.type))

  const left = sortedColumn(visible, 'left')
  const center = sortedColumn(visible, 'center')
  const right = sortedColumn(visible, 'right')

  switch (breakpoint) {
    case 'desktop':
      return { left, center, right }
    case 'tablet':
      return { left, center: [...center, ...right], right: [] }
    case 'phone':
      return { left: [], center: [...center, ...left, ...right], right: [] }
  }
}

/**
 * Which of `left`/`right` have widgets, as a `Workspace.css` track-layout
 * key. `center` is always included as the base key (the default config's
 * `clock`+`shortcuts` widgets live there, and schema repair guarantees at
 * least one of them stays enabled — see `config/schema.ts`), but unlike
 * before, it's no longer guaranteed non-empty by fixed chrome: a user who
 * moves both off the center column via `setWidgetColumn` will see a blank
 * center track. `grid-template-columns` is a fixed explicit track list, so
 * an empty column (`.workspace-column:empty { display: none }`) would
 * otherwise still reserve its `minmax()` min width — and because grid
 * tracks are positional, a plain "how many columns" count can't tell
 * `left+center` apart from `center+right` (same count, different track
 * widths needed). This key lets `Workspace.css` size each real combination
 * explicitly. Reflow (tablet/phone) already empties `right`/`left` in
 * `resolveLayout` above, so this stays accurate across breakpoints without
 * extra input.
 */
export type WorkspaceColumnsKey = 'center' | 'left-center' | 'center-right' | 'left-center-right'

export function resolveWorkspaceColumnsKey(resolved: ResolvedLayout): WorkspaceColumnsKey {
  const hasLeft = resolved.left.length > 0
  const hasRight = resolved.right.length > 0
  if (hasLeft && hasRight) {
    return 'left-center-right'
  }
  if (hasLeft) {
    return 'left-center'
  }
  if (hasRight) {
    return 'center-right'
  }
  return 'center'
}

function getBreakpointFromMatchMedia(): Breakpoint {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop'
  }
  if (window.matchMedia(BREAKPOINT_QUERIES.phone).matches) {
    return 'phone'
  }
  if (window.matchMedia(BREAKPOINT_QUERIES.tablet).matches) {
    return 'tablet'
  }
  return 'desktop'
}

function subscribeToBreakpointChanges(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const queries = [
    window.matchMedia(BREAKPOINT_QUERIES.phone),
    window.matchMedia(BREAKPOINT_QUERIES.tablet),
  ]
  for (const query of queries) {
    query.addEventListener('change', onChange)
  }
  return () => {
    for (const query of queries) {
      query.removeEventListener('change', onChange)
    }
  }
}

/**
 * React hook returning the active breakpoint, re-rendering when the
 * viewport crosses a threshold from `src/design/breakpoints.ts`.
 */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(
    subscribeToBreakpointChanges,
    getBreakpointFromMatchMedia,
    // Server/no-DOM snapshot: desktop-first per the constitution.
    () => 'desktop',
  )
}
