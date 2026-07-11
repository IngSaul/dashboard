import type { WidgetDescriptor } from '../../types/widgets'

export const notesPlugin: WidgetDescriptor = {
  type: 'notes',
  metadata: {
    displayName: 'Notas',
    description: 'Guarda notas rápidas localmente en este dispositivo.',
    requiresConfig: false,
  },
  component: () =>
    import('../../components/widgets/NotesWidget/NotesWidget').then((module) => ({
      default: module.NotesWidget,
    })),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}
