import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { WorkspaceProvider, useWorkspaceState } from '../../../src/state/WorkspaceProvider'
import { loadDashboardConfig } from '../../../src/services/configStore'
import { defaultEventBus } from '../../../src/services/eventBus'
import { defaultWidgetRegistry } from '../../../src/services/widgetRegistry'
import { clearDashboardStorage } from '../../fixtures/dashboardConfig'
import type { WidgetDescriptor } from '../../../src/types/widgets'

function wrapper({ children }: { children: ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>
}

const notesDescriptor: WidgetDescriptor = {
  type: 'notes',
  metadata: { displayName: 'Notes', description: 'A note.', requiresConfig: false },
  component: () => Promise.resolve({ default: () => null }),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}

describe('WorkspaceProvider / useWorkspaceState', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
    defaultWidgetRegistry.unregister('notes')
  })

  it('throws when used outside a WorkspaceProvider', () => {
    expect(() => renderHook(() => useWorkspaceState())).toThrow(
      'useWorkspaceState must be used within a WorkspaceProvider',
    )
  })

  it('loads the persisted/default widget layout, breakpoint, and empty runtime status', () => {
    const { result } = renderHook(() => useWorkspaceState(), { wrapper })

    expect(result.current.widgetLayout.widgets.length).toBeGreaterThan(0)
    expect(result.current.breakpoint).toBe('desktop')
    expect(result.current.runtimeStatus).toEqual({})
  })

  it('resolves an empty layout when no widget types are registered yet', () => {
    const { result } = renderHook(() => useWorkspaceState(), { wrapper })

    expect(result.current.resolvedLayout).toEqual({ left: [], center: [], right: [] })
  })

  it('recomputes the resolved layout when the registry announces a change via eventBus', () => {
    const { result } = renderHook(() => useWorkspaceState(), { wrapper })

    act(() => {
      defaultWidgetRegistry.register(notesDescriptor)
      defaultEventBus.emit('widget-registry:changed', { type: 'notes' })
    })

    const notesWidget = result.current.widgetLayout.widgets.find((widget) => widget.type === 'notes')
    if (notesWidget?.enabled) {
      expect(result.current.resolvedLayout[notesWidget.column]).toContainEqual(notesWidget)
    } else {
      expect(result.current.resolvedLayout).toEqual({ left: [], center: [], right: [] })
    }
  })

  it('persists a widget-enabled mutation and updates state', () => {
    const { result } = renderHook(() => useWorkspaceState(), { wrapper })

    act(() => {
      const mutationResult = result.current.setWidgetEnabled('weather', true)
      expect(mutationResult.ok).toBe(true)
    })

    const weather = result.current.widgetLayout.widgets.find((widget) => widget.type === 'weather')
    expect(weather?.enabled).toBe(true)
    expect(
      loadDashboardConfig().widgetLayout.widgets.find((widget) => widget.type === 'weather')?.enabled,
    ).toBe(true)
  })

  it('rejects a mutation that would leave the dashboard fully empty, without persisting it', () => {
    const { result } = renderHook(() => useWorkspaceState(), { wrapper })

    act(() => {
      expect(result.current.setWidgetEnabled('shortcuts', false).ok).toBe(true)
    })
    act(() => {
      const mutationResult = result.current.setWidgetEnabled('clock', false)
      expect(mutationResult.ok).toBe(false)
    })

    const clock = result.current.widgetLayout.widgets.find((widget) => widget.type === 'clock')
    expect(clock?.enabled).toBe(true)
  })

  it('tracks ephemeral per-widget runtime status without persisting it', () => {
    const { result } = renderHook(() => useWorkspaceState(), { wrapper })

    act(() => {
      result.current.setWidgetRuntimeStatus('widget-weather', 'loading')
    })

    expect(result.current.runtimeStatus).toEqual({ 'widget-weather': 'loading' })
    expect(loadDashboardConfig()).not.toHaveProperty('runtimeStatus')
  })
})
