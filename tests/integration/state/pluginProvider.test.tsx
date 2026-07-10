import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PluginProvider, usePluginState } from '../../../src/state/PluginProvider'
import { defaultEventBus } from '../../../src/services/eventBus'
import { defaultWidgetRegistry } from '../../../src/services/widgetRegistry'
import type { WidgetDescriptor } from '../../../src/types/widgets'

function wrapper({ children }: { children: ReactNode }) {
  return <PluginProvider>{children}</PluginProvider>
}

const notesDescriptor: WidgetDescriptor = {
  type: 'notes',
  metadata: { displayName: 'Notes', description: 'A note.', requiresConfig: false },
  component: () => Promise.resolve({ default: () => null }),
  defaultSettings: {},
  allowedColumns: ['left', 'center', 'right'],
}

describe('PluginProvider / usePluginState', () => {
  afterEach(() => {
    defaultWidgetRegistry.unregister('notes')
  })

  it('throws when used outside a PluginProvider', () => {
    expect(() => renderHook(() => usePluginState())).toThrow(
      'usePluginState must be used within a PluginProvider',
    )
  })

  it('starts with no registered types when the registry is empty', () => {
    const { result } = renderHook(() => usePluginState(), { wrapper })

    expect(result.current.registeredTypes).toEqual([])
    expect(result.current.metadataByType.size).toBe(0)
  })

  it('registers a widget type, updates the snapshot, and announces it via eventBus', () => {
    const { result } = renderHook(() => usePluginState(), { wrapper })
    const events: string[] = []
    const unsubscribe = defaultEventBus.on('widget-registry:changed', ({ type }) => events.push(type))

    act(() => {
      result.current.register(notesDescriptor)
    })

    expect(result.current.registeredTypes).toEqual(['notes'])
    expect(result.current.metadataByType.get('notes')).toEqual(notesDescriptor.metadata)
    expect(events).toEqual(['notes'])
    unsubscribe()
  })

  it('unregisters a widget type and updates the snapshot', () => {
    const { result } = renderHook(() => usePluginState(), { wrapper })

    act(() => {
      result.current.register(notesDescriptor)
    })
    act(() => {
      result.current.unregister('notes')
    })

    expect(result.current.registeredTypes).toEqual([])
    expect(result.current.getMetadata('notes')).toBeUndefined()
  })

  it('lazyLoad resolves the registered component', async () => {
    const { result } = renderHook(() => usePluginState(), { wrapper })

    act(() => {
      result.current.register(notesDescriptor)
    })

    await expect(result.current.lazyLoad('notes')).resolves.toBeInstanceOf(Function)
  })
})
