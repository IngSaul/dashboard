import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react'
import { WIDGET_CATALOG } from '../config/widgets'
import { defaultEventBus } from '../services/eventBus'
import { defaultWidgetRegistry } from '../services/widgetRegistry'
import type { WidgetDescriptor, WidgetMetadata, WidgetProps, WidgetType } from '../types/widgets'

interface RegistrySnapshot {
  registeredTypes: WidgetType[]
  metadataByType: ReadonlyMap<WidgetType, WidgetMetadata>
}

/**
 * `PluginState` slice: a React-visible snapshot of `widgetRegistry`'s
 * in-memory registration map (what's available to enable, per-type
 * `requiresConfig`, etc.). `widgetRegistry` itself is a plain service with
 * no subscribe/notify mechanism (per plan.md's Global State Architecture),
 * so this provider re-snapshots after every `register`/`unregister` it
 * performs and announces the change via `eventBus` so other slices (e.g.
 * `WorkspaceState`) know to recompute their derived state.
 */
export interface PluginState {
  /** Every registered widget type, in `WIDGET_CATALOG` order. */
  registeredTypes: WidgetType[]
  /** Registered widget types mapped to their metadata. */
  metadataByType: ReadonlyMap<WidgetType, WidgetMetadata>
  register(descriptor: WidgetDescriptor): void
  unregister(type: WidgetType): void
  getMetadata(type: WidgetType): WidgetMetadata | undefined
  lazyLoad(type: WidgetType): Promise<ComponentType<WidgetProps>>
}

const PluginContext = createContext<PluginState | undefined>(undefined)

function snapshotRegistry(): RegistrySnapshot {
  const registeredTypes: WidgetType[] = []
  const metadataByType = new Map<WidgetType, WidgetMetadata>()
  for (const type of WIDGET_CATALOG) {
    const metadata = defaultWidgetRegistry.getMetadata(type)
    if (metadata) {
      registeredTypes.push(type)
      metadataByType.set(type, metadata)
    }
  }
  return { registeredTypes, metadataByType }
}

export interface PluginProviderProps {
  children: ReactNode
}

export function PluginProvider({ children }: PluginProviderProps) {
  const [snapshot, setSnapshot] = useState<RegistrySnapshot>(snapshotRegistry)

  const register = useCallback((descriptor: WidgetDescriptor) => {
    defaultWidgetRegistry.register(descriptor)
    setSnapshot(snapshotRegistry())
    defaultEventBus.emit('widget-registry:changed', { type: descriptor.type })
  }, [])

  const unregister = useCallback((type: WidgetType) => {
    defaultWidgetRegistry.unregister(type)
    setSnapshot(snapshotRegistry())
    defaultEventBus.emit('widget-registry:changed', { type })
  }, [])

  const getMetadata = useCallback(
    (type: WidgetType) => defaultWidgetRegistry.getMetadata(type),
    [],
  )

  const lazyLoad = useCallback((type: WidgetType) => defaultWidgetRegistry.lazyLoad(type), [])

  const value = useMemo<PluginState>(
    () => ({
      registeredTypes: snapshot.registeredTypes,
      metadataByType: snapshot.metadataByType,
      register,
      unregister,
      getMetadata,
      lazyLoad,
    }),
    [snapshot, register, unregister, getMetadata, lazyLoad],
  )

  return <PluginContext.Provider value={value}>{children}</PluginContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the Provider/hook pair is the intended shape for this module (tasks.md T046).
export function usePluginState(): PluginState {
  const context = useContext(PluginContext)
  if (!context) {
    throw new Error('usePluginState must be used within a PluginProvider')
  }
  return context
}
