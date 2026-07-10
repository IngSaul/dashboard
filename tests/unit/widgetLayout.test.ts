import { describe, expect, it } from 'vitest'
import { repairDashboardConfig } from '../../src/config/schema'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import {
  moveWidgetInColumn,
  reorderWidgetsInColumn,
  setWidgetColumn,
  setWidgetEnabled,
} from '../../src/services/widgetLayout'
import type { Widget, WidgetLayout } from '../../src/types/widgets'

function createTestLayout(): WidgetLayout {
  const widgets: Widget[] = [
    { id: 'widget-clock', type: 'clock', enabled: true, column: 'center', order: 0, settings: {} },
    { id: 'widget-shortcuts', type: 'shortcuts', enabled: true, column: 'center', order: 1, settings: {} },
    { id: 'widget-weather', type: 'weather', enabled: true, column: 'left', order: 0, settings: {} },
    { id: 'widget-notes', type: 'notes', enabled: false, column: 'right', order: 0, settings: {} },
  ]
  return { widgets, schemaVersion: 1 }
}

function columnTypes(layout: WidgetLayout, column: Widget['column']): string[] {
  return layout.widgets
    .filter((widget) => widget.column === column)
    .sort((a, b) => a.order - b.order)
    .map((widget) => widget.type)
}

describe('widgetLayout mutations', () => {
  describe('setWidgetEnabled', () => {
    it('enables a disabled widget', () => {
      const result = setWidgetEnabled(createTestLayout(), 'notes', true)

      expect(result.ok).toBe(true)
      if (result.ok) {
        const notes = result.widgetLayout.widgets.find((widget) => widget.type === 'notes')
        expect(notes?.enabled).toBe(true)
      }
    })

    it('disables an enabled widget', () => {
      const result = setWidgetEnabled(createTestLayout(), 'weather', false)

      expect(result.ok).toBe(true)
      if (result.ok) {
        const weather = result.widgetLayout.widgets.find((widget) => widget.type === 'weather')
        expect(weather?.enabled).toBe(false)
      }
    })

    it('rejects an unknown widget type', () => {
      const layout = createTestLayout()
      const withoutCalendar = { ...layout, widgets: layout.widgets.filter((w) => w.type !== 'calendar') }

      const result = setWidgetEnabled(withoutCalendar, 'calendar', true)

      expect(result.ok).toBe(false)
    })

    it('allows disabling clock while shortcuts stays enabled', () => {
      const result = setWidgetEnabled(createTestLayout(), 'clock', false)

      expect(result.ok).toBe(true)
    })

    it('rejects disabling the last enabled default widget (never-fully-empty guarantee)', () => {
      const afterClockOff = setWidgetEnabled(createTestLayout(), 'clock', false)
      expect(afterClockOff.ok).toBe(true)
      if (!afterClockOff.ok) {
        return
      }

      const result = setWidgetEnabled(afterClockOff.widgetLayout, 'shortcuts', false)

      expect(result.ok).toBe(false)
    })

    it('is a no-op (still ok) when the widget already has the requested state', () => {
      const layout = createTestLayout()

      const result = setWidgetEnabled(layout, 'clock', true)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.widgetLayout).toBe(layout)
      }
    })
  })

  describe('setWidgetColumn', () => {
    it('moves a widget to the end of the destination column and reindexes', () => {
      const result = setWidgetColumn(createTestLayout(), 'weather', 'center')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'center')).toEqual(['clock', 'shortcuts', 'weather'])
        expect(columnTypes(result.widgetLayout, 'left')).toEqual([])
      }
    })

    it('rejects an unknown widget type', () => {
      const layout = createTestLayout()
      const withoutCalendar = { ...layout, widgets: layout.widgets.filter((w) => w.type !== 'calendar') }

      const result = setWidgetColumn(withoutCalendar, 'calendar', 'left')

      expect(result.ok).toBe(false)
    })

    it('is a no-op (still ok, same layout reference) when already in the target column', () => {
      const layout = createTestLayout()

      const result = setWidgetColumn(layout, 'weather', 'left')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.widgetLayout).toBe(layout)
      }
    })

    it('reindexes the source column after removing a widget, leaving no order gap', () => {
      const result = setWidgetColumn(createTestLayout(), 'clock', 'left')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'center')).toEqual(['shortcuts'])
        const shortcuts = result.widgetLayout.widgets.find((widget) => widget.type === 'shortcuts')
        expect(shortcuts?.order).toBe(0)
      }
    })
  })

  describe('reorderWidgetsInColumn', () => {
    it('reassigns order to match the given sequence', () => {
      const result = reorderWidgetsInColumn(createTestLayout(), 'center', ['shortcuts', 'clock'])

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'center')).toEqual(['shortcuts', 'clock'])
      }
    })

    it('rejects a sequence that is not an exact permutation of the column', () => {
      const result = reorderWidgetsInColumn(createTestLayout(), 'center', ['clock'])

      expect(result.ok).toBe(false)
    })

    it('rejects a sequence with a duplicate type, even at the correct length', () => {
      const result = reorderWidgetsInColumn(createTestLayout(), 'center', ['clock', 'clock'])

      expect(result.ok).toBe(false)
    })

    it('rejects a sequence containing a type from a different column', () => {
      const result = reorderWidgetsInColumn(createTestLayout(), 'center', ['clock', 'weather'])

      expect(result.ok).toBe(false)
    })

    it('leaves other columns untouched', () => {
      const result = reorderWidgetsInColumn(createTestLayout(), 'center', ['shortcuts', 'clock'])

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'left')).toEqual(['weather'])
        expect(columnTypes(result.widgetLayout, 'right')).toEqual(['notes'])
      }
    })
  })

  describe('moveWidgetInColumn', () => {
    it('swaps a widget with its neighbor below', () => {
      const result = moveWidgetInColumn(createTestLayout(), 'clock', 'down')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'center')).toEqual(['shortcuts', 'clock'])
      }
    })

    it('is a no-op at the top of the column', () => {
      const layout = createTestLayout()

      const result = moveWidgetInColumn(layout, 'clock', 'up')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'center')).toEqual(['clock', 'shortcuts'])
      }
    })

    it('is a no-op at the bottom of the column', () => {
      const result = moveWidgetInColumn(createTestLayout(), 'shortcuts', 'down')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(columnTypes(result.widgetLayout, 'center')).toEqual(['clock', 'shortcuts'])
      }
    })

    it('rejects an unknown widget type', () => {
      const layout = createTestLayout()
      const withoutCalendar = { ...layout, widgets: layout.widgets.filter((w) => w.type !== 'calendar') }

      const result = moveWidgetInColumn(withoutCalendar, 'calendar', 'down')

      expect(result.ok).toBe(false)
    })
  })
})

describe('widgetLayout repair on load (schema.ts)', () => {
  function configWithWidgetLayout(widgetLayout: unknown): unknown {
    return { ...createDefaultDashboardConfig(), widgetLayout }
  }

  it('falls back to the default layout when widgets is not an array', () => {
    const repaired = repairDashboardConfig(configWithWidgetLayout({ widgets: 'corrupted', schemaVersion: 1 }))

    expect(repaired.widgetLayout).toEqual(createDefaultDashboardConfig().widgetLayout)
  })

  it('drops malformed widget entries and keeps valid ones', () => {
    const valid = createTestLayout()
    const repaired = repairDashboardConfig(
      configWithWidgetLayout({
        widgets: [...valid.widgets, { type: 'clock' }, 'garbage', null],
        schemaVersion: 1,
      }),
    )

    expect(repaired.widgetLayout.widgets).toHaveLength(valid.widgets.length)
  })

  it('drops widgets with unknown types', () => {
    const valid = createTestLayout()
    const repaired = repairDashboardConfig(
      configWithWidgetLayout({
        widgets: [
          ...valid.widgets,
          { id: 'widget-rss', type: 'rss', enabled: true, column: 'left', order: 5, settings: {} },
        ],
        schemaVersion: 1,
      }),
    )

    expect(repaired.widgetLayout.widgets.some((widget) => (widget.type as string) === 'rss')).toBe(false)
  })

  it('drops duplicate widget types, keeping the first', () => {
    const valid = createTestLayout()
    const repaired = repairDashboardConfig(
      configWithWidgetLayout({
        widgets: [
          ...valid.widgets,
          { id: 'widget-clock-2', type: 'clock', enabled: false, column: 'right', order: 9, settings: {} },
        ],
        schemaVersion: 1,
      }),
    )

    const clocks = repaired.widgetLayout.widgets.filter((widget) => widget.type === 'clock')
    expect(clocks).toHaveLength(1)
    expect(clocks[0]?.id).toBe('widget-clock')
  })

  it('reassigns conflicting orders sequentially within a column', () => {
    const repaired = repairDashboardConfig(
      configWithWidgetLayout({
        widgets: [
          { id: 'widget-clock', type: 'clock', enabled: true, column: 'center', order: 7, settings: {} },
          { id: 'widget-shortcuts', type: 'shortcuts', enabled: true, column: 'center', order: 7, settings: {} },
        ],
        schemaVersion: 1,
      }),
    )

    const orders = repaired.widgetLayout.widgets
      .filter((widget) => widget.column === 'center')
      .map((widget) => widget.order)
      .sort()
    expect(orders).toEqual([0, 1])
  })

  it('falls back to the default layout when both clock and shortcuts would be disabled', () => {
    const repaired = repairDashboardConfig(
      configWithWidgetLayout({
        widgets: [
          { id: 'widget-clock', type: 'clock', enabled: false, column: 'center', order: 0, settings: {} },
          { id: 'widget-shortcuts', type: 'shortcuts', enabled: false, column: 'center', order: 1, settings: {} },
          { id: 'widget-notes', type: 'notes', enabled: true, column: 'right', order: 0, settings: {} },
        ],
        schemaVersion: 1,
      }),
    )

    expect(repaired.widgetLayout).toEqual(createDefaultDashboardConfig().widgetLayout)
  })
})
