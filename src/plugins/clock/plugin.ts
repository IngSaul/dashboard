import type { WidgetDescriptor } from '../../types/widgets'

export const clockPlugin: WidgetDescriptor = {
  type: 'clock',
  metadata: {
    displayName: 'Clock',
    description: 'Shows the current date and time.',
    requiresConfig: false,
  },
  component: () =>
    import('../../components/widgets/ClockWidget/ClockWidget').then((module) => ({
      default: module.ClockWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
