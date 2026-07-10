import { describe, expect, it, vi } from 'vitest'
import { createWidgetRegistry } from '../../src/services/widgetRegistry'
import type { WidgetDescriptor, WidgetType } from '../../src/types/widgets'

function FakeWidgetComponent() {
  return null
}

function createTestDescriptor(
  type: WidgetType,
  componentFactory: () => Promise<{ default: typeof FakeWidgetComponent }> = () =>
    Promise.resolve({ default: FakeWidgetComponent }),
): WidgetDescriptor {
  return {
    type,
    metadata: { displayName: type, description: `${type} widget`, requiresConfig: false },
    component: componentFactory,
    defaultSettings: {},
    allowedColumns: ['left', 'center', 'right'],
  } as WidgetDescriptor
}

describe('widgetRegistry', () => {
  it('returns undefined metadata for an unregistered type', () => {
    const registry = createWidgetRegistry()

    expect(registry.getMetadata('clock')).toBeUndefined()
  })

  it('registers a widget type and exposes its metadata', () => {
    const registry = createWidgetRegistry()

    registry.register(createTestDescriptor('clock'))

    expect(registry.getMetadata('clock')).toEqual({
      displayName: 'clock',
      description: 'clock widget',
      requiresConfig: false,
    })
  })

  it('throws when registering a type that is already registered', () => {
    const registry = createWidgetRegistry()
    registry.register(createTestDescriptor('clock'))

    expect(() => registry.register(createTestDescriptor('clock'))).toThrow()
  })

  it('unregister removes a registered type', () => {
    const registry = createWidgetRegistry()
    registry.register(createTestDescriptor('notes'))

    registry.unregister('notes')

    expect(registry.getMetadata('notes')).toBeUndefined()
  })

  it('unregister is a no-op for an unknown type', () => {
    const registry = createWidgetRegistry()

    expect(() => registry.unregister('weather')).not.toThrow()
  })

  it('load() returns undefined before lazyLoad() has resolved', () => {
    const registry = createWidgetRegistry()
    registry.register(createTestDescriptor('calendar'))

    expect(registry.load('calendar')).toBeUndefined()
  })

  it('lazyLoad() resolves the component, and load() returns it synchronously afterward', async () => {
    const registry = createWidgetRegistry()
    registry.register(createTestDescriptor('calendar'))

    const resolved = await registry.lazyLoad('calendar')

    expect(resolved).toBe(FakeWidgetComponent)
    expect(registry.load('calendar')).toBe(FakeWidgetComponent)
  })

  it('lazyLoad() rejects for an unregistered type', async () => {
    const registry = createWidgetRegistry()

    await expect(registry.lazyLoad('docker-status')).rejects.toThrow()
  })

  it('concurrent lazyLoad() calls share a single in-flight import', async () => {
    const registry = createWidgetRegistry()
    const componentFactory = vi.fn(() => Promise.resolve({ default: FakeWidgetComponent }))
    registry.register(createTestDescriptor('server-status', componentFactory))

    const [first, second] = await Promise.all([
      registry.lazyLoad('server-status'),
      registry.lazyLoad('server-status'),
    ])

    expect(first).toBe(FakeWidgetComponent)
    expect(second).toBe(FakeWidgetComponent)
    expect(componentFactory).toHaveBeenCalledTimes(1)
  })

  it('gives independent registry instances independent registrations', () => {
    const registryA = createWidgetRegistry()
    const registryB = createWidgetRegistry()

    registryA.register(createTestDescriptor('shortcuts'))

    expect(registryA.getMetadata('shortcuts')).toBeDefined()
    expect(registryB.getMetadata('shortcuts')).toBeUndefined()
  })
})
