import { describe, expect, it, vi } from 'vitest'
import { createEventBus } from '../../src/services/eventBus'

describe('eventBus', () => {
  it('delivers an emitted payload to a subscribed handler', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on('settings:open-section', handler)

    bus.emit('settings:open-section', { section: 'wallpaper' })

    expect(handler).toHaveBeenCalledExactlyOnceWith({ section: 'wallpaper' })
  })

  it('delivers to every subscriber of the same event', () => {
    const bus = createEventBus()
    const first = vi.fn()
    const second = vi.fn()
    bus.on('widget-registry:changed', first)
    bus.on('widget-registry:changed', second)

    bus.emit('widget-registry:changed', { type: 'clock' })

    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it('does not deliver to handlers of a different event', () => {
    const bus = createEventBus()
    const settingsHandler = vi.fn()
    bus.on('settings:open-section', settingsHandler)

    bus.emit('widget-registry:changed', { type: 'notes' })

    expect(settingsHandler).not.toHaveBeenCalled()
  })

  it('emitting with no subscribers is a no-op', () => {
    const bus = createEventBus()

    expect(() => bus.emit('settings:open-section', { section: 'widgets' })).not.toThrow()
  })

  it('off() stops future deliveries', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    bus.on('settings:open-section', handler)

    bus.off('settings:open-section', handler)
    bus.emit('settings:open-section', { section: 'glass' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('the unsubscribe function returned by on() stops future deliveries', () => {
    const bus = createEventBus()
    const handler = vi.fn()
    const unsubscribe = bus.on('settings:open-section', handler)

    unsubscribe()
    bus.emit('settings:open-section', { section: 'theme' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('off() with a never-subscribed handler is a no-op', () => {
    const bus = createEventBus()

    expect(() => bus.off('settings:open-section', vi.fn())).not.toThrow()
  })

  it('a throwing handler does not prevent later handlers from running', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const bus = createEventBus()
    const throwing = vi.fn(() => {
      throw new Error('handler failure')
    })
    const after = vi.fn()
    bus.on('widget-registry:changed', throwing)
    bus.on('widget-registry:changed', after)

    expect(() => bus.emit('widget-registry:changed', { type: 'weather' })).not.toThrow()
    expect(after).toHaveBeenCalledOnce()

    consoleError.mockRestore()
  })

  it('a handler unsubscribing itself mid-emit does not skip other handlers in the same round', () => {
    const bus = createEventBus()
    const second = vi.fn()
    const first = vi.fn(() => {
      bus.off('widget-registry:changed', first)
    })
    bus.on('widget-registry:changed', first)
    bus.on('widget-registry:changed', second)

    bus.emit('widget-registry:changed', { type: 'calendar' })

    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it('gives independent bus instances independent subscriptions', () => {
    const busA = createEventBus()
    const busB = createEventBus()
    const handler = vi.fn()
    busA.on('settings:open-section', handler)

    busB.emit('settings:open-section', { section: 'accessibility' })

    expect(handler).not.toHaveBeenCalled()
  })
})
