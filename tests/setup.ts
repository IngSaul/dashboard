import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'
import { registerBuiltInPlugins } from '../src/plugins'
import { registerBuiltInSearchSources } from '../src/services/searchSources'

/**
 * Every widget is code-split behind `widgetRegistry.lazyLoad()` (a hard UI
 * contract rule — see `WidgetGrid.test.tsx`'s note), so the *first* time any
 * given widget type is dynamically imported within a test file's module
 * graph, mounting it pays a real on-demand transform cost, not just a
 * microtask tick. Under the CPU contention of running many test files at
 * once, that cost has been observed to exceed `@testing-library`'s default
 * 1000ms `findBy*`/`waitFor` polling window, producing intermittent
 * failures that are purely about timing headroom, not incorrect app
 * behavior — every affected assertion passes reliably alone or with
 * reduced parallelism. Raising the shared default here fixes all of them
 * at once without touching any test's actual assertions/coverage.
 */
configure({ asyncUtilTimeout: 5000 })

/**
 * jsdom does not implement `window.matchMedia`. Components that read theme
 * or motion preferences (theme.ts, T051) call it unconditionally, so every
 * test renders it needs to exist. Defaults to `matches: false`; individual
 * tests can override with `Object.defineProperty(window, 'matchMedia', ...)`
 * when they need a specific preference (e.g. reduced motion).
 */
function createMatchMediaStub(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = createMatchMediaStub
}

/**
 * jsdom does not implement `HTMLDialogElement.showModal()`/`close()` (its
 * `<dialog>` support stops at reflecting the `open` attribute). `GlassDialog`
 * and `CommandPalette` both rely on the native dialog for
 * focus-trapping/`Escape`-to-close/top-layer stacking, so every test that
 * renders one needs at least the open/close state transitions and the
 * `close` event `onClose`/`onCancel` handlers depend on.
 */
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) {
      return
    }
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

/**
 * jsdom does not implement `Element.prototype.scrollIntoView` at all.
 * `SettingsDrawer` calls it when a search command opens a specific section
 * (T095/T098), so every test that triggers that path needs it to exist.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = function () {}
}

/**
 * Mirrors `main.tsx`: real app init registers every built-in widget plugin
 * before `AppShell` ever mounts. Tests render `Dashboard`/`AppShell`
 * directly (never through `main.tsx`), so without this, every widget would
 * be unregistered in every test — this runs it once per test file, exactly
 * like the one real call site does.
 */
registerBuiltInPlugins()
registerBuiltInSearchSources()

afterEach(() => {
  cleanup()
})
