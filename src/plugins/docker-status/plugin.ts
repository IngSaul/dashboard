import type { WidgetDescriptor } from '../../types/widgets'

export const dockerStatusPlugin: WidgetDescriptor = {
  type: 'docker-status',
  metadata: {
    displayName: 'Docker Containers',
    description: 'Shows container status from your monitoring endpoint.',
    requiresConfig: true,
  },
  component: () =>
    import('../../components/widgets/DockerStatusWidget/DockerStatusWidget').then((module) => ({
      default: module.DockerStatusWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
