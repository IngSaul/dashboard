import type { WidgetDescriptor } from '../../types/widgets'

export const calendarPlugin: WidgetDescriptor = {
  type: 'calendar',
  metadata: {
    displayName: 'Calendar',
    description: 'Muestra el mes actual, sin sincronización externa.',
    requiresConfig: false,
  },
  component: () =>
    import('../../components/widgets/CalendarWidget/CalendarWidget').then((module) => ({
      default: module.CalendarWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
