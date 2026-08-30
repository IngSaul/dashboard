import { describe, expect, it } from 'vitest'
import { isSafeResourceUrl, isValidUrl } from '../../src/utils/validation'
import { addShortcut } from '../../src/services/shortcuts'
import { repairDashboardConfig } from '../../src/config/schema'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import type { DashboardConfiguration } from '../../src/types/dashboard'

/**
 * The audit's TD-06: `new URL()` succeeding says a string is a URL, not that
 * following it is safe. A shortcut's destination goes straight into an
 * `<a href>`, so "anything that parses" meant a stored `javascript:` URL
 * would execute on click.
 */

/** Every scheme these tests assert is refused, including the obfuscations a browser would still honour. */
const DANGEROUS_URLS = [
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  ' javascript:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'data:image/svg+xml,<svg onload=alert(1)>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  'blob:https://example.com/abc',
]

describe('URL protocol allow-list', () => {
  describe('isValidUrl (shortcut destinations)', () => {
    it.each(['https://example.com', 'http://192.168.1.10:8080/path', 'mailto:someone@example.com'])(
      'accepts %s',
      (url) => {
        expect(isValidUrl(url)).toBe(true)
      },
    )

    it.each(DANGEROUS_URLS)('rejects %j', (url) => {
      expect(isValidUrl(url)).toBe(false)
    })

    it('still rejects things that are not URLs at all', () => {
      expect(isValidUrl('')).toBe(false)
      expect(isValidUrl('   ')).toBe(false)
      expect(isValidUrl('not a url')).toBe(false)
      expect(isValidUrl('example.com')).toBe(false)
    })
  })

  describe('isSafeResourceUrl (things the app loads rather than links to)', () => {
    it('accepts http(s) but not mailto:, which is meaningless for a resource', () => {
      expect(isSafeResourceUrl('https://example.com/a.png')).toBe(true)
      expect(isSafeResourceUrl('http://example.com/a.png')).toBe(true)
      expect(isSafeResourceUrl('mailto:someone@example.com')).toBe(false)
    })

    it.each(DANGEROUS_URLS)('rejects %j', (url) => {
      expect(isSafeResourceUrl(url)).toBe(false)
    })
  })
})

describe('creating a shortcut', () => {
  it.each(DANGEROUS_URLS)('refuses %j with an error rather than storing it', (url) => {
    const result = addShortcut([], { label: 'Trap', url }, 'category-general')
    expect(result.ok).toBe(false)
    if (result.ok) return
    // A scheme that parses but is not allowed gets a message that says so —
    // "not a valid URL" would be misleading for `javascript:alert(1)`.
    expect(result.error).toContain('Solo se permiten enlaces')
  })

  it('still says "not a valid URL" for something that is not a URL at all', () => {
    // No scheme, so `new URL()` throws — a typo, not a rejected scheme.
    const result = addShortcut([], { label: 'Typo', url: 'example.com/docs' }, 'category-general')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('Se requiere una URL válida.')
  })

  it('accepts an ordinary destination', () => {
    const result = addShortcut([], { label: 'Docs', url: 'https://docs.example.com' }, 'category-general')
    expect(result.ok).toBe(true)
  })
})

describe('repairing a stored configuration', () => {
  /**
   * The important half: a config written before the allow-list existed — or
   * by somebody else — is repaired on load, so an unsafe URL never reaches
   * a rendered `href` even though it was already persisted.
   */
  function configWithShortcutUrl(url: string): unknown {
    const config = createDefaultDashboardConfig() as unknown as DashboardConfiguration
    const first = config.shortcuts[0]
    if (!first) {
      throw new Error('expected a seed shortcut')
    }
    first.url = url
    return JSON.parse(JSON.stringify(config))
  }

  it.each(DANGEROUS_URLS)('drops an already-stored shortcut pointing at %j', (url) => {
    const repaired = repairDashboardConfig(configWithShortcutUrl(url))
    expect(repaired.shortcuts.map((shortcut) => shortcut.url)).not.toContain(url)
  })

  it('keeps the safe shortcuts alongside the dropped one', () => {
    const repaired = repairDashboardConfig(configWithShortcutUrl('javascript:alert(1)'))
    expect(repaired.shortcuts.length).toBeGreaterThan(0)
    for (const shortcut of repaired.shortcuts) {
      expect(isValidUrl(shortcut.url)).toBe(true)
    }
  })

  it('refuses a data: wallpaper, falling back to the default background', () => {
    const config = createDefaultDashboardConfig()
    const raw = JSON.parse(JSON.stringify(config)) as {
      themePreferences: { wallpaper: { source: string; value: string | null } }
    }
    raw.themePreferences.wallpaper.source = 'custom-url'
    raw.themePreferences.wallpaper.value = 'data:image/svg+xml,<svg onload=alert(1)>'

    const repaired = repairDashboardConfig(raw)
    const wallpaper = repaired.themePreferences.wallpaper
    expect(wallpaper.source === 'custom-url' && wallpaper.value?.startsWith('data:')).toBe(false)
  })

  it('refuses a javascript: monitoring endpoint, which would otherwise be fetched', () => {
    const raw = JSON.parse(JSON.stringify(createDefaultDashboardConfig())) as {
      monitoringSourceConfig: { endpointUrl: string | null }
    }
    raw.monitoringSourceConfig.endpointUrl = 'javascript:alert(1)'

    expect(repairDashboardConfig(raw).monitoringSourceConfig.endpointUrl).toBeNull()
  })
})
