import type { EventMap, EventName } from '../types/events'

/**
 * Minimal typed pub/sub for cross-slice notifications (see
 * `plan.md#global-state-architecture`): state slices never import each
 * other's internals — e.g. `CommandPalette` (SearchState) asks
 * `SettingsDrawer` (SettingsState) to open a section by emitting
 * `settings:open-section`, not by calling into it.
 *
 * Deliberately not a library and deliberately small: used only where two
 * *different* slices must react to each other. Within a slice, or in a
 * plain parent→child relationship, normal React data flow still applies.
 */

export type EventHandler<E extends EventName> = (payload: EventMap[E]) => void

export interface EventBus {
  /** Delivers `payload` to every current subscriber of `event`. A throwing handler is isolated — it never prevents later handlers from running. */
  emit<E extends EventName>(event: E, payload: EventMap[E]): void
  /** Subscribes `handler` to `event`. Returns an unsubscribe function (equivalent to calling `off` with the same pair). */
  on<E extends EventName>(event: E, handler: EventHandler<E>): () => void
  /** Removes a previously subscribed handler. No-op if it was never subscribed. */
  off<E extends EventName>(event: E, handler: EventHandler<E>): void
}

/**
 * Creates an independent bus instance (used by tests, and by
 * `defaultEventBus` below for the running app) — same factory-plus-shared-
 * instance pattern as `widgetRegistry` and `LocalStorageProvider`.
 */
export function createEventBus(): EventBus {
  // One handler set per event name. `unknown`-typed internally because a
  // single Map cannot express the per-key handler/payload pairing; the
  // public generic API above is what guarantees it at every call site.
  const handlers = new Map<EventName, Set<(payload: unknown) => void>>()

  return {
    emit(event, payload) {
      const subscribers = handlers.get(event)
      if (!subscribers) {
        return
      }
      // Snapshot so a handler subscribing/unsubscribing mid-emit doesn't
      // affect this delivery round.
      for (const handler of [...subscribers]) {
        try {
          handler(payload)
        } catch (error) {
          console.error(`eventBus: handler for "${event}" threw`, error)
        }
      }
    },

    on(event, handler) {
      let subscribers = handlers.get(event)
      if (!subscribers) {
        subscribers = new Set()
        handlers.set(event, subscribers)
      }
      const entry = handler as (payload: unknown) => void
      subscribers.add(entry)
      return () => {
        handlers.get(event)?.delete(entry)
      }
    },

    off(event, handler) {
      handlers.get(event)?.delete(handler as (payload: unknown) => void)
    },
  }
}

/** Shared instance the running app's state slices communicate through. */
export const defaultEventBus: EventBus = createEventBus()
