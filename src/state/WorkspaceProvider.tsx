import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { WIDGET_CATALOG } from '../config/widgets'
import { loadDashboardConfig, saveDashboardConfig } from '../services/configStore'
import { defaultEventBus } from '../services/eventBus'
import { resolveLayout, useBreakpoint } from '../services/layoutEngine'
import {
  moveWidgetInColumn,
  reorderWidgetsInColumn,
  setWidgetColumn,
  setWidgetEnabled,
  type WidgetLayoutMutationResult,
} from '../services/widgetLayout'
import { defaultWidgetRegistry } from '../services/widgetRegistry'
import type { Breakpoint, ResolvedLayout } from '../types/layout'
import type { WidgetColumn, WidgetLayout, WidgetType } from '../types/widgets'

/** Per-widget-instance runtime status (keyed by `Widget.id`), never persisted. */
export type WidgetRuntimeStatus = 'loading' | 'ready' | 'unavailable' | 'not-configured'

/**
 * `WorkspaceState` slice: the persisted `WidgetLayout`, the current
 * `ResolvedLayout` (via `layoutEngine`), and ephemeral per-widget runtime
 * state. `PluginState` owns `widgetRegistry` registration (see plan.md's
 * ownership rules), so this slice never imports `PluginProvider` directly —
 * it re-derives the registered-types list from the plain `widgetRegistry`
 * service itself, and recomputes it when `eventBus`'s
 * `widget-registry:changed` fires.
 */
export interface WorkspaceState {
  widgetLayout: WidgetLayout
  resolvedLayout: ResolvedLayout
  breakpoint: Breakpoint
  runtimeStatus: Readonly<Record<string, WidgetRuntimeStatus>>
  setWidgetEnabled(type: WidgetType, enabled: boolean): WidgetLayoutMutationResult
  setWidgetColumn(type: WidgetType, column: WidgetColumn): WidgetLayoutMutationResult
  reorderWidgetsInColumn(column: WidgetColumn, orderedTypes: WidgetType[]): WidgetLayoutMutationResult
  moveWidgetInColumn(type: WidgetType, direction: 'up' | 'down'): WidgetLayoutMutationResult
  setWidgetRuntimeStatus(widgetId: string, status: WidgetRuntimeStatus): void
}

const WorkspaceContext = createContext<WorkspaceState | undefined>(undefined)

function loadInitialWidgetLayout(): WidgetLayout {
  return loadDashboardConfig().widgetLayout
}

function persistWidgetLayout(widgetLayout: WidgetLayout): void {
  const config = loadDashboardConfig()
  saveDashboardConfig({ ...config, widgetLayout })
}

/** `widgetRegistry` has no type-enumeration method, so registered types are derived by checking every catalog entry rather than the (currently empty, until T055's plugins land) registry itself. */
function getRegisteredTypes(): WidgetType[] {
  return WIDGET_CATALOG.filter((type) => defaultWidgetRegistry.getMetadata(type) !== undefined)
}

export interface WorkspaceProviderProps {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [widgetLayout, setWidgetLayoutState] = useState<WidgetLayout>(loadInitialWidgetLayout)
  const [runtimeStatus, setRuntimeStatus] = useState<Record<string, WidgetRuntimeStatus>>({})
  const [registeredTypes, setRegisteredTypes] = useState<WidgetType[]>(getRegisteredTypes)
  const breakpoint = useBreakpoint()

  useEffect(
    () => defaultEventBus.on('widget-registry:changed', () => setRegisteredTypes(getRegisteredTypes())),
    [],
  )

  const resolvedLayout = useMemo(
    () => resolveLayout(widgetLayout, breakpoint, registeredTypes),
    [widgetLayout, breakpoint, registeredTypes],
  )

  const applyMutation = useCallback((result: WidgetLayoutMutationResult): WidgetLayoutMutationResult => {
    if (result.ok) {
      setWidgetLayoutState(result.widgetLayout)
      persistWidgetLayout(result.widgetLayout)
    }
    return result
  }, [])

  const handleSetWidgetEnabled = useCallback(
    (type: WidgetType, enabled: boolean) => applyMutation(setWidgetEnabled(widgetLayout, type, enabled)),
    [applyMutation, widgetLayout],
  )

  const handleSetWidgetColumn = useCallback(
    (type: WidgetType, column: WidgetColumn) => applyMutation(setWidgetColumn(widgetLayout, type, column)),
    [applyMutation, widgetLayout],
  )

  const handleReorderWidgetsInColumn = useCallback(
    (column: WidgetColumn, orderedTypes: WidgetType[]) =>
      applyMutation(reorderWidgetsInColumn(widgetLayout, column, orderedTypes)),
    [applyMutation, widgetLayout],
  )

  const handleMoveWidgetInColumn = useCallback(
    (type: WidgetType, direction: 'up' | 'down') =>
      applyMutation(moveWidgetInColumn(widgetLayout, type, direction)),
    [applyMutation, widgetLayout],
  )

  const setWidgetRuntimeStatus = useCallback((widgetId: string, status: WidgetRuntimeStatus) => {
    setRuntimeStatus((previous) => ({ ...previous, [widgetId]: status }))
  }, [])

  const value = useMemo<WorkspaceState>(
    () => ({
      widgetLayout,
      resolvedLayout,
      breakpoint,
      runtimeStatus,
      setWidgetEnabled: handleSetWidgetEnabled,
      setWidgetColumn: handleSetWidgetColumn,
      reorderWidgetsInColumn: handleReorderWidgetsInColumn,
      moveWidgetInColumn: handleMoveWidgetInColumn,
      setWidgetRuntimeStatus,
    }),
    [
      widgetLayout,
      resolvedLayout,
      breakpoint,
      runtimeStatus,
      handleSetWidgetEnabled,
      handleSetWidgetColumn,
      handleReorderWidgetsInColumn,
      handleMoveWidgetInColumn,
      setWidgetRuntimeStatus,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the Provider/hook pair is the intended shape for this module (tasks.md T045).
export function useWorkspaceState(): WorkspaceState {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspaceState must be used within a WorkspaceProvider')
  }
  return context
}
