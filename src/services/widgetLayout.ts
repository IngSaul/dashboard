import type { Widget, WidgetColumn, WidgetLayout, WidgetType } from '../types/widgets'

/**
 * Widget layout mutations: enable/disable, column assignment, and
 * reordering. Pure functions over a `WidgetLayout` value, mirroring
 * `shortcuts.ts`'s `{ ok, ... } | { ok: false, error }` pattern — callers
 * (eventually `WorkspaceState`) are responsible for persisting the result
 * via `configStore`.
 *
 * This module does not re-implement corruption repair: loading
 * malformed/missing persisted data already goes through
 * `config/schema.ts`'s `repairWidgetLayout` (invoked by
 * `configStore.loadDashboardConfig`). What these functions validate is
 * different — live edits must not themselves *produce* an invalid layout
 * (e.g. disabling both `clock` and `shortcuts`, or reordering with a
 * mismatched set of widget types).
 */

export type WidgetLayoutMutationResult =
  | { ok: true; widgetLayout: WidgetLayout }
  | { ok: false; error: string }

const COLUMNS: WidgetColumn[] = ['left', 'center', 'right']

function findWidget(layout: WidgetLayout, type: WidgetType): Widget | undefined {
  return layout.widgets.find((widget) => widget.type === type)
}

/** `clock` and `shortcuts` can never both end up disabled — the dashboard must never render fully empty (data-model.md). */
function wouldLeaveDashboardEmpty(widgets: Widget[], type: WidgetType, nextEnabled: boolean): boolean {
  if (nextEnabled || (type !== 'clock' && type !== 'shortcuts')) {
    return false
  }
  const other: WidgetType = type === 'clock' ? 'shortcuts' : 'clock'
  const otherEnabled = widgets.some((widget) => widget.type === other && widget.enabled)
  return !otherEnabled
}

/** Reassigns `order` sequentially within each column, in the array's current iteration order. */
function reassignOrders(widgets: Widget[]): Widget[] {
  return COLUMNS.flatMap((column) =>
    widgets
      .filter((widget) => widget.column === column)
      .map((widget, index) => ({ ...widget, order: index }) as Widget),
  )
}

/** Enables or disables `type`. Rejected if `type` is unknown, or if the change would leave the dashboard with no default widget enabled. */
export function setWidgetEnabled(
  layout: WidgetLayout,
  type: WidgetType,
  enabled: boolean,
): WidgetLayoutMutationResult {
  const widget = findWidget(layout, type)
  if (!widget) {
    return { ok: false, error: `Unknown widget type: ${type}` }
  }
  if (widget.enabled === enabled) {
    return { ok: true, widgetLayout: layout }
  }
  if (wouldLeaveDashboardEmpty(layout.widgets, type, enabled)) {
    return { ok: false, error: 'At least one of the clock or shortcuts widgets must stay enabled.' }
  }
  const widgets = layout.widgets.map((widget) =>
    widget.type === type ? ({ ...widget, enabled } as Widget) : widget,
  )
  return { ok: true, widgetLayout: { ...layout, widgets } }
}

/** Moves `type` to a different column, placing it at the end of the destination column and reindexing both columns. */
export function setWidgetColumn(
  layout: WidgetLayout,
  type: WidgetType,
  column: WidgetColumn,
): WidgetLayoutMutationResult {
  const widget = findWidget(layout, type)
  if (!widget) {
    return { ok: false, error: `Unknown widget type: ${type}` }
  }
  if (widget.column === column) {
    return { ok: true, widgetLayout: layout }
  }
  const rest = layout.widgets.filter((widget) => widget.type !== type)
  const moved: Widget = { ...widget, column } as Widget
  const widgets = reassignOrders([...rest, moved])
  return { ok: true, widgetLayout: { ...layout, widgets } }
}

/** Reassigns `order` within `column` to match `orderedTypes`. Rejected if `orderedTypes` is not an exact permutation of that column's current widget types. */
export function reorderWidgetsInColumn(
  layout: WidgetLayout,
  column: WidgetColumn,
  orderedTypes: WidgetType[],
): WidgetLayoutMutationResult {
  const columnWidgets = layout.widgets.filter((widget) => widget.column === column)
  const currentTypes = new Set(columnWidgets.map((widget) => widget.type))
  const isPermutation =
    orderedTypes.length === columnWidgets.length &&
    new Set(orderedTypes).size === orderedTypes.length &&
    orderedTypes.every((type) => currentTypes.has(type))
  if (!isPermutation) {
    return { ok: false, error: "orderedTypes must match the column's existing widget types exactly." }
  }
  const byType = new Map(columnWidgets.map((widget) => [widget.type, widget]))
  const reorderedColumn = orderedTypes
    .map((type, index) => {
      const widget = byType.get(type)
      return widget ? ({ ...widget, order: index } as Widget) : undefined
    })
    .filter((widget): widget is Widget => widget !== undefined)
  const others = layout.widgets.filter((widget) => widget.column !== column)
  return { ok: true, widgetLayout: { ...layout, widgets: [...others, ...reorderedColumn] } }
}

/**
 * Swaps `type` with its neighbor in the given direction, within its own
 * column. A no-op (not an error) at the start/end of the column, so a
 * keyboard "move up"/"move down" control never needs to special-case the
 * edges itself.
 */
export function moveWidgetInColumn(
  layout: WidgetLayout,
  type: WidgetType,
  direction: 'up' | 'down',
): WidgetLayoutMutationResult {
  const widget = findWidget(layout, type)
  if (!widget) {
    return { ok: false, error: `Unknown widget type: ${type}` }
  }
  const columnTypes = layout.widgets
    .filter((entry) => entry.column === widget.column)
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.type)
  const index = columnTypes.indexOf(type)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= columnTypes.length) {
    return { ok: true, widgetLayout: layout }
  }
  const swapped = [...columnTypes]
  const temp = swapped[index]
  swapped[index] = swapped[targetIndex] as WidgetType
  swapped[targetIndex] = temp as WidgetType
  return reorderWidgetsInColumn(layout, widget.column, swapped)
}
