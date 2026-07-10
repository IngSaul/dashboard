import type { WidgetDescriptor } from '../../types/widgets'

export const weatherPlugin: WidgetDescriptor = {
  type: 'weather',
  metadata: {
    displayName: 'Weather',
    description: 'Shows current conditions for your location.',
    requiresConfig: false,
  },
  component: () =>
    import('../../components/widgets/WeatherWidget/WeatherWidget').then((module) => ({
      default: module.WeatherWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
