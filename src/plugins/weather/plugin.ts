import type { WidgetDescriptor } from '../../types/widgets'

export const weatherPlugin: WidgetDescriptor = {
  type: 'weather',
  metadata: {
    displayName: 'Clima',
    description: 'Muestra las condiciones actuales para tu ubicación.',
    requiresConfig: false,
  },
  component: () =>
    import('../../components/widgets/WeatherWidget/WeatherWidget').then((module) => ({
      default: module.WeatherWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
