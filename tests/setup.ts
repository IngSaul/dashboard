import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

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

afterEach(() => {
  cleanup()
})
