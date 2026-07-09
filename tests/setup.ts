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

afterEach(() => {
  cleanup()
})
