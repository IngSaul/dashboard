import type { WidgetDescriptor } from '../../types/widgets'

export const serverStatusPlugin: WidgetDescriptor = {
  type: 'server-status',
  metadata: {
    displayName: 'Estado del servidor',
    description: 'Shows host CPU/memory and status from your monitoring endpoint.',
    requiresConfig: true,
  },
  component: () =>
    import('../../components/widgets/ServerStatusWidget/ServerStatusWidget').then((module) => ({
      default: module.ServerStatusWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
