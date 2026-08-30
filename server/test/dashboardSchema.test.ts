import { describe, expect, it } from 'vitest'
import { validateDashboardConfigPayload } from '../src/dashboard/schema.js'

/**
 * The audit's TD-06, server side. Frontend validation cannot protect a
 * stored configuration, because the frontend is exactly what an attacker
 * replaces: anything holding a session cookie can `PUT` whatever JSON it
 * likes. Whatever the server stores here, it hands back to every future
 * session of that account.
 */

const RESOLVED_AT = '2026-01-01T00:00:00.000Z'

function shortcut(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 's1',
    label: 'Example',
    url: 'https://example.com',
    globalOrder: 0,
    createdAt: RESOLVED_AT,
    updatedAt: RESOLVED_AT,
    ...overrides,
  }
}

function configWith(shortcuts: Record<string, unknown>[]): Record<string, unknown> {
  return { version: 1, shortcuts }
}

describe('validateDashboardConfigPayload', () => {
  describe('shortcut destinations', () => {
    it.each([
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      ' javascript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ])('rejects a config containing %j', (url) => {
      const result = validateDashboardConfigPayload(configWith([shortcut({ url })]))
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toContain('shortcuts.0.url')
    })

    it.each(['https://example.com', 'http://10.0.0.5:9000/status', 'mailto:someone@example.com'])(
      'accepts %s',
      (url) => {
        expect(validateDashboardConfigPayload(configWith([shortcut({ url })])).ok).toBe(true)
      },
    )

    it('rejects the whole payload when any one shortcut is unsafe', () => {
      const result = validateDashboardConfigPayload(
        configWith([shortcut(), shortcut({ id: 's2', url: 'javascript:alert(1)' })]),
      )
      expect(result.ok).toBe(false)
    })
  })

  describe('icons', () => {
    it('rejects SVG markup smuggled in as a simple-icons value', () => {
      const result = validateDashboardConfigPayload(
        configWith([
          shortcut({
            icon: { provider: 'simple-icons', value: '<svg onload="alert(1)"></svg>', resolvedAt: RESOLVED_AT },
          }),
        ]),
      )
      expect(result.ok).toBe(false)
    })

    it('rejects the removed custom-svg provider, so an older build cannot reintroduce it', () => {
      const result = validateDashboardConfigPayload(
        configWith([
          shortcut({ icon: { provider: 'custom-svg', value: '<svg/>', resolvedAt: RESOLVED_AT } }),
        ]),
      )
      expect(result.ok).toBe(false)
    })

    it('rejects a data: favicon', () => {
      const result = validateDashboardConfigPayload(
        configWith([
          shortcut({
            icon: {
              provider: 'favicon',
              value: 'data:image/svg+xml,<svg onload=alert(1)>',
              resolvedAt: RESOLVED_AT,
            },
          }),
        ]),
      )
      expect(result.ok).toBe(false)
    })

    it('accepts a plain slug and an http(s) favicon', () => {
      expect(
        validateDashboardConfigPayload(
          configWith([
            shortcut({ icon: { provider: 'simple-icons', value: 'github', resolvedAt: RESOLVED_AT } }),
          ]),
        ).ok,
      ).toBe(true)
      expect(
        validateDashboardConfigPayload(
          configWith([
            shortcut({
              icon: { provider: 'favicon', value: 'https://example.com/favicon.ico', resolvedAt: RESOLVED_AT },
            }),
          ]),
        ).ok,
      ).toBe(true)
    })
  })

  describe('other URLs the client would load from', () => {
    it('rejects a data: wallpaper', () => {
      const result = validateDashboardConfigPayload({
        version: 1,
        themePreferences: {
          wallpaper: { source: 'custom-url', value: 'data:image/svg+xml,<svg onload=alert(1)>' },
        },
      })
      expect(result.ok).toBe(false)
    })

    it('accepts an https wallpaper, and ignores `value` when the source is not custom-url', () => {
      expect(
        validateDashboardConfigPayload({
          version: 1,
          themePreferences: { wallpaper: { source: 'custom-url', value: 'https://example.com/bg.jpg' } },
        }).ok,
      ).toBe(true)
      expect(
        validateDashboardConfigPayload({
          version: 1,
          themePreferences: { wallpaper: { source: 'default', value: null } },
        }).ok,
      ).toBe(true)
    })

    it('rejects a javascript: monitoring endpoint, which the browser would fetch', () => {
      expect(
        validateDashboardConfigPayload({
          version: 1,
          monitoringSourceConfig: { endpointUrl: 'javascript:alert(1)' },
        }).ok,
      ).toBe(false)
      expect(
        validateDashboardConfigPayload({
          version: 1,
          monitoringSourceConfig: { endpointUrl: null },
        }).ok,
      ).toBe(true)
    })
  })

  describe('structure', () => {
    it('still requires a positive integer version', () => {
      expect(validateDashboardConfigPayload({ version: 0 }).ok).toBe(false)
      expect(validateDashboardConfigPayload({ version: -1 }).ok).toBe(false)
      expect(validateDashboardConfigPayload({ version: 1.5 }).ok).toBe(false)
      expect(validateDashboardConfigPayload({ version: '1' }).ok).toBe(false)
      expect(validateDashboardConfigPayload({}).ok).toBe(false)
      expect(validateDashboardConfigPayload(null).ok).toBe(false)
    })

    it('still enforces the size cap', () => {
      const result = validateDashboardConfigPayload({ version: 1, blob: 'x'.repeat(2_100_000) })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toContain('maximum size')
    })

    /**
     * The server validates safety, not correctness — it must not become a
     * second, diverging copy of the client's schema. Anything it does not
     * have an opinion about is stored exactly as sent.
     */
    it('passes unknown fields through untouched, at every depth', () => {
      const config = {
        version: 1,
        futureFeature: { nested: ['a', 1, true, null], deep: { deeper: 'value' } },
        shortcuts: [shortcut({ somethingNew: 'kept' })],
      }
      const result = validateDashboardConfigPayload(config)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(JSON.parse(result.json)).toEqual(config)
    })
  })
})
