import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShortcutIcon } from '../../src/components/ShortcutIcon/ShortcutIcon'
import type { IconSource } from '../../src/types/widgets'

/**
 * The end of the TD-06 chain: whatever a stored configuration claims, what
 * actually lands in the DOM.
 *
 * `ShortcutIcon` still uses `dangerouslySetInnerHTML`, and that is fine —
 * what changed is where its input comes from. The persisted value is a slug
 * resolved against the icons bundled at build time, so a configuration can
 * choose *which* trusted markup renders but can never supply markup of its
 * own. These tests render hostile values through the real component and
 * assert on the resulting DOM rather than on validation return values.
 */

/** Bypasses the type system the way a hand-edited or hostile stored config does. */
function icon(provider: string, value: string): IconSource {
  return { provider, value, resolvedAt: '2026-01-01T00:00:00.000Z' } as unknown as IconSource
}

describe('ShortcutIcon with a hostile persisted icon', () => {
  it('does not inject markup smuggled in as a simple-icons value', () => {
    const { container } = render(
      <ShortcutIcon
        shortcut={{
          url: 'https://example.com',
          icon: icon('simple-icons', '<img src=x onerror="window.__pwned = true">'),
        }}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')
    // It falls through to the URL-derived icon instead of rendering nothing.
    expect(container.querySelector('[data-icon-provider]')).not.toBeNull()
  })

  it('does not inject markup for the removed custom-svg provider', () => {
    const { container } = render(
      <ShortcutIcon
        shortcut={{
          url: 'https://example.com',
          icon: icon('custom-svg', '<svg onload="window.__pwned = true"></svg>'),
        }}
      />,
    )

    expect(container.innerHTML).not.toContain('onload')
  })

  it('does not render a data: favicon into an img src', () => {
    const { container } = render(
      <ShortcutIcon
        shortcut={{
          url: 'https://example.com',
          icon: icon('favicon', 'data:image/svg+xml,<svg onload=alert(1)>'),
        }}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('data:image/svg')
  })

  it('does not render a javascript: favicon', () => {
    const { container } = render(
      <ShortcutIcon
        shortcut={{ url: 'https://example.com', icon: icon('favicon', 'javascript:alert(1)') }}
      />,
    )

    expect(container.querySelector('img')).toBeNull()
  })

  it('escapes fallback initials rather than treating them as markup', () => {
    const { container } = render(
      <ShortcutIcon
        shortcut={{ url: 'https://example.com', icon: icon('fallback', '<b>x</b>') }}
      />,
    )

    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toContain('<b>x</b>')
  })
})

describe('ShortcutIcon with a legitimate icon', () => {
  it('renders the bundled brand mark for a known slug', () => {
    const { container } = render(
      <ShortcutIcon shortcut={{ url: 'https://github.com', icon: icon('simple-icons', 'github') }} />,
    )

    const host = container.querySelector('[data-icon-provider="simple-icons"]')
    expect(host?.innerHTML).toContain('<svg')
  })

  it('renders an http(s) favicon', () => {
    const { container } = render(
      <ShortcutIcon
        shortcut={{
          url: 'https://example.com',
          icon: icon('favicon', 'https://example.com/favicon.ico'),
        }}
      />,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/favicon.ico')
  })
})
