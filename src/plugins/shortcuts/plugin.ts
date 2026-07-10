import type { WidgetDescriptor } from '../../types/widgets'

export const shortcutsPlugin: WidgetDescriptor = {
  type: 'shortcuts',
  metadata: {
    displayName: 'Shortcuts',
    description: 'Acceso rápido a tus sitios y apps favoritas.',
    requiresConfig: false,
  },
  component: () =>
    import('../../components/widgets/ShortcutsWidget/ShortcutsWidget').then((module) => ({
      default: module.ShortcutsWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
