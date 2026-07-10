import type { ComponentType } from 'react'
import type { WidgetDescriptor, WidgetMetadata, WidgetProps, WidgetType } from '../types/widgets'

/**
 * Widget registration/lazy-loading service. See
 * `specs/002-widget-dashboard/contracts/ui-contract.md#widget-registry`.
 *
 * `Workspace`/`WidgetSettings` resolve widget components only through
 * `getMetadata()`/`lazyLoad()` — never by importing a widget component
 * directly — so adding a widget type is "register one plugin module," not a
 * change to the grid/settings code.
 */
export interface WidgetRegistry {
  /**
   * Registers a widget type. Registering a `type` that is already
   * registered throws in development (a coding error to catch early) but is
   * a silent no-op in production — the first registration for a given
   * `type` always wins, so one broken/duplicate plugin module can't crash a
   * real dashboard load.
   */
  register(descriptor: WidgetDescriptor): void
  /** No-op if `type` isn't registered. */
  unregister(type: WidgetType): void
  getMetadata(type: WidgetType): WidgetMetadata | undefined
  /** Returns the already-resolved component for `type`, if `lazyLoad()` has previously resolved it. Never triggers a load itself. */
  load(type: WidgetType): ComponentType<WidgetProps> | undefined
  /**
   * Dynamically imports (and caches) the component for `type`. Concurrent
   * calls before the first resolves share the same in-flight import rather
   * than triggering the dynamic `import()` more than once. Rejects if
   * `type` isn't registered.
   */
  lazyLoad(type: WidgetType): Promise<ComponentType<WidgetProps>>
}

interface RegistryEntry {
  descriptor: WidgetDescriptor
  resolvedComponent?: ComponentType<WidgetProps>
  pendingImport?: Promise<ComponentType<WidgetProps>>
}

/**
 * Creates an independent registry instance (used by tests, and by
 * `defaultWidgetRegistry` below for the running app). A factory rather than
 * only a module-level singleton keeps test suites from bleeding
 * registrations into one another.
 */
export function createWidgetRegistry(): WidgetRegistry {
  const entries = new Map<WidgetType, RegistryEntry>()

  return {
    register(descriptor) {
      if (entries.has(descriptor.type)) {
        if (import.meta.env.DEV) {
          throw new Error(`widgetRegistry: "${descriptor.type}" is already registered`)
        }
        return
      }
      entries.set(descriptor.type, { descriptor })
    },

    unregister(type) {
      entries.delete(type)
    },

    getMetadata(type) {
      return entries.get(type)?.descriptor.metadata
    },

    load(type) {
      return entries.get(type)?.resolvedComponent
    },

    lazyLoad(type) {
      const entry = entries.get(type)
      if (!entry) {
        return Promise.reject(new Error(`widgetRegistry: "${type}" is not registered`))
      }
      if (entry.resolvedComponent) {
        return Promise.resolve(entry.resolvedComponent)
      }
      if (!entry.pendingImport) {
        entry.pendingImport = entry.descriptor.component().then((module) => {
          entry.resolvedComponent = module.default
          return module.default
        })
      }
      return entry.pendingImport
    },
  }
}

/** Shared instance the running app registers built-in plugins into (`src/plugins/index.ts`). */
export const defaultWidgetRegistry: WidgetRegistry = createWidgetRegistry()
