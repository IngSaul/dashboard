import { describe, expect, it } from 'vitest'
import { isIconSource, repairDashboardConfig } from '../../src/config/schema'
import { getBrandSvgBySlug } from '../../src/services/iconResolver'
import { BRAND_ICON_SLUGS, isKnownBrandSlug } from '../../src/services/brandIconSlugs'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

/**
 * TD-06's other half. Icons used to persist whole SVG documents, which
 * `ShortcutIcon` handed to `dangerouslySetInnerHTML` — so anything able to
 * write a stored configuration (browser storage, a compromised response, an
 * older build) could put arbitrary markup in the DOM.
 *
 * The fix is structural rather than a filter: the persisted value is a
 * *slug*, and markup only ever comes from what the build bundles. These
 * tests pin that a stored value can no longer be markup at all.
 */

const RESOLVED_AT = '2026-01-01T00:00:00.000Z'

describe('isIconSource', () => {
  it('accepts a bundled brand slug', () => {
    expect(isIconSource({ provider: 'simple-icons', value: 'github', resolvedAt: RESOLVED_AT })).toBe(true)
  })

  it('rejects markup dressed as a simple-icons value', () => {
    for (const value of [
      '<svg onload="alert(1)"></svg>',
      '<svg><script>alert(1)</script></svg>',
      '<img src=x onerror=alert(1)>',
    ]) {
      expect(isIconSource({ provider: 'simple-icons', value, resolvedAt: RESOLVED_AT })).toBe(false)
    }
  })

  it('rejects a slug this build does not bundle, since nothing could render it', () => {
    expect(isIconSource({ provider: 'simple-icons', value: 'not-a-real-brand', resolvedAt: RESOLVED_AT })).toBe(
      false,
    )
  })

  it('rejects the removed custom-svg provider outright', () => {
    expect(isIconSource({ provider: 'custom-svg', value: '<svg>x</svg>', resolvedAt: RESOLVED_AT })).toBe(false)
  })

  it('rejects a favicon that is not an http(s) URL', () => {
    expect(isIconSource({ provider: 'favicon', value: 'https://example.com/favicon.ico', resolvedAt: RESOLVED_AT })).toBe(
      true,
    )
    for (const value of [
      'javascript:alert(1)',
      'data:image/svg+xml,<svg onload=alert(1)>',
      'data:text/html,<script>alert(1)</script>',
    ]) {
      expect(isIconSource({ provider: 'favicon', value, resolvedAt: RESOLVED_AT })).toBe(false)
    }
  })

  it('rejects a lucide value that is not an icon name', () => {
    expect(isIconSource({ provider: 'lucide', value: 'book-open', resolvedAt: RESOLVED_AT })).toBe(true)
    expect(isIconSource({ provider: 'lucide', value: '<svg/>', resolvedAt: RESOLVED_AT })).toBe(false)
    expect(isIconSource({ provider: 'lucide', value: '../../etc/passwd', resolvedAt: RESOLVED_AT })).toBe(false)
  })

  it('bounds the fallback initials rather than accepting a whole document', () => {
    expect(isIconSource({ provider: 'fallback', value: 'GH', resolvedAt: RESOLVED_AT })).toBe(true)
    expect(isIconSource({ provider: 'fallback', value: 'x'.repeat(500), resolvedAt: RESOLVED_AT })).toBe(false)
  })
})

describe('the brand slug allow-list and the markup it guards', () => {
  /**
   * The allow-list lives apart from the markup so config validation does not
   * pull ~24 kB of SVG into the entry chunk. This is what stops the two
   * halves drifting: every slug the validator accepts must have markup the
   * renderer can actually produce.
   */
  it('accepts exactly the slugs that have bundled markup', () => {
    for (const slug of BRAND_ICON_SLUGS) {
      expect(getBrandSvgBySlug(slug), `no bundled markup for slug "${slug}"`).toContain('<svg')
    }
  })

  it('is the only door markup comes through, and it only knows bundled slugs', () => {
    expect(getBrandSvgBySlug('github')).toContain('<svg')
    expect(getBrandSvgBySlug('not-a-real-brand')).toBeNull()
    expect(getBrandSvgBySlug('<svg onload=alert(1)>')).toBeNull()
    expect(isKnownBrandSlug('github')).toBe(true)
    expect(isKnownBrandSlug('constructor')).toBe(false)
    expect(isKnownBrandSlug('__proto__')).toBe(false)
  })
})

describe('repairing a stored configuration with a hostile icon', () => {
  function configWithIcon(icon: unknown): unknown {
    const config = createDefaultDashboardConfig()
    const raw = JSON.parse(JSON.stringify(config)) as { shortcuts: { icon?: unknown }[] }
    const first = raw.shortcuts[0]
    if (!first) {
      throw new Error('expected a seed shortcut')
    }
    first.icon = icon
    return raw
  }

  it.each([
    { provider: 'simple-icons', value: '<svg onload="alert(1)"></svg>', resolvedAt: RESOLVED_AT },
    { provider: 'custom-svg', value: '<svg onload="alert(1)"></svg>', resolvedAt: RESOLVED_AT },
    { provider: 'favicon', value: 'data:image/svg+xml,<svg onload=alert(1)>', resolvedAt: RESOLVED_AT },
  ])('drops the whole shortcut rather than rendering %j', (icon) => {
    const repaired = repairDashboardConfig(configWithIcon(icon))
    for (const shortcut of repaired.shortcuts) {
      expect(JSON.stringify(shortcut.icon ?? {})).not.toContain('<svg')
      expect(JSON.stringify(shortcut.icon ?? {})).not.toContain('data:')
    }
  })

  it('leaves a legitimate slug icon untouched', () => {
    const icon = { provider: 'simple-icons', value: 'github', resolvedAt: RESOLVED_AT }
    const repaired = repairDashboardConfig(configWithIcon(icon))
    expect(repaired.shortcuts.some((shortcut) => shortcut.icon?.value === 'github')).toBe(true)
  })
})
