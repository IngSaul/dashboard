// Temporary local alias until src/types/widgets.ts defines the canonical
// WidgetType union (Foundational task: Widget/layout/theme types and schema).
type WidgetType =
  | 'clock'
  | 'weather'
  | 'server-status'
  | 'docker-status'
  | 'calendar'
  | 'notes'
  | 'shortcuts'

export const WIDGET_CATALOG: WidgetType[] = [
  'clock',
  'weather',
  'server-status',
  'docker-status',
  'calendar',
  'notes',
  'shortcuts',
]
