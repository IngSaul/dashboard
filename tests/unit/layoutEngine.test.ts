import { describe, expect, it } from 'vitest'
import { resolveLayout } from '../../src/services/layoutEngine'
import type { Widget, WidgetLayout, WidgetType } from '../../src/types/widgets'

const ALL_TYPES: WidgetType[] = [
  'clock',
  'weather',
  'server-status',
  'docker-status',
  'calendar',
  'notes',
  'shortcuts',
]

function createTestLayout(): WidgetLayout {
  const widgets: Widget[] = [
    { id: 'widget-weather', type: 'weather', enabled: true, column: 'left', order: 0, settings: {} },
    { id: 'widget-server', type: 'server-status', enabled: true, column: 'left', order: 1, settings: {} },
    { id: 'widget-clock', type: 'clock', enabled: true, column: 'center', order: 0, settings: {} },
    { id: 'widget-shortcuts', type: 'shortcuts', enabled: true, column: 'center', order: 1, settings: {} },
    { id: 'widget-calendar', type: 'calendar', enabled: true, column: 'right', order: 0, settings: {} },
    { id: 'widget-notes', type: 'notes', enabled: false, column: 'right', order: 1, settings: {} },
  ]
  return { widgets, schemaVersion: 1 }
}

function types(widgets: Widget[]): WidgetType[] {
  return widgets.map((widget) => widget.type)
}

describe('layoutEngine.resolveLayout', () => {
  it('keeps three columns as assigned on desktop', () => {
    const resolved = resolveLayout(createTestLayout(), 'desktop', ALL_TYPES)

    expect(types(resolved.left)).toEqual(['weather', 'server-status'])
    expect(types(resolved.center)).toEqual(['clock', 'shortcuts'])
    expect(types(resolved.right)).toEqual(['calendar'])
  })

  it('folds the right column into the end of center on tablet', () => {
    const resolved = resolveLayout(createTestLayout(), 'tablet', ALL_TYPES)

    expect(types(resolved.left)).toEqual(['weather', 'server-status'])
    expect(types(resolved.center)).toEqual(['clock', 'shortcuts', 'calendar'])
    expect(resolved.right).toEqual([])
  })

  it('folds everything into a single center column on phone, center first', () => {
    const resolved = resolveLayout(createTestLayout(), 'phone', ALL_TYPES)

    expect(resolved.left).toEqual([])
    expect(types(resolved.center)).toEqual([
      'clock',
      'shortcuts',
      'weather',
      'server-status',
      'calendar',
    ])
    expect(resolved.right).toEqual([])
  })

  it('excludes disabled widgets', () => {
    const resolved = resolveLayout(createTestLayout(), 'desktop', ALL_TYPES)

    expect(types(resolved.right)).not.toContain('notes')
  })

  it('skips widgets whose type is not registered', () => {
    const withoutCalendarPlugin = ALL_TYPES.filter((type) => type !== 'calendar')

    const resolved = resolveLayout(createTestLayout(), 'desktop', withoutCalendarPlugin)

    expect(resolved.right).toEqual([])
    expect(types(resolved.center)).toEqual(['clock', 'shortcuts'])
  })

  it('sorts widgets by order within each column', () => {
    const layout = createTestLayout()
    const shuffled: WidgetLayout = { ...layout, widgets: [...layout.widgets].reverse() }

    const resolved = resolveLayout(shuffled, 'desktop', ALL_TYPES)

    expect(types(resolved.left)).toEqual(['weather', 'server-status'])
    expect(types(resolved.center)).toEqual(['clock', 'shortcuts'])
  })

  it('returns empty columns for a layout with nothing enabled and never throws', () => {
    const layout: WidgetLayout = {
      widgets: createTestLayout().widgets.map((widget) => ({ ...widget, enabled: false }) as Widget),
      schemaVersion: 1,
    }

    const resolved = resolveLayout(layout, 'desktop', ALL_TYPES)

    expect(resolved).toEqual({ left: [], center: [], right: [] })
  })

  it('is pure: identical inputs produce equal outputs and inputs are not mutated', () => {
    const layout = createTestLayout()
    const snapshot = JSON.parse(JSON.stringify(layout)) as WidgetLayout

    const first = resolveLayout(layout, 'tablet', ALL_TYPES)
    const second = resolveLayout(layout, 'tablet', ALL_TYPES)

    expect(first).toEqual(second)
    expect(layout).toEqual(snapshot)
  })
})
