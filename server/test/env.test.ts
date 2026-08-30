import { describe, expect, it } from 'vitest'
import { loadEnv } from '../src/env.js'

/**
 * Deployment-configuration guards (the audit's TD-01). Two things are being
 * pinned here, both of which used to fail silently and in the insecure
 * direction:
 *
 * 1. `COOKIE_SECURE` is a strict boolean — anything that isn't exactly
 *    `"true"`/`"false"` is a startup error, not an implicit `false`.
 * 2. A production deployment cannot start without it, so there is no way to
 *    end up serving a session cookie over plain HTTP by omission.
 */

const REQUIRED = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'admin-password-123',
}

describe('loadEnv', () => {
  describe('COOKIE_SECURE', () => {
    it('accepts the two exact boolean strings', () => {
      expect(loadEnv({ ...REQUIRED, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(true)
      expect(loadEnv({ ...REQUIRED, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false)
    })

    it('defaults to false outside production', () => {
      expect(loadEnv({ ...REQUIRED }).COOKIE_SECURE).toBe(false)
      expect(loadEnv({ ...REQUIRED, NODE_ENV: 'test' }).COOKIE_SECURE).toBe(false)
    })

    it.each(['TRUE', 'True', '1', 'yes', 'on', 'true ', ''])(
      'rejects %o instead of silently reading it as false',
      (value) => {
        expect(() => loadEnv({ ...REQUIRED, COOKIE_SECURE: value })).toThrow(/COOKIE_SECURE/)
      },
    )
  })

  describe('production transport requirements', () => {
    it('refuses to start in production without a Secure cookie', () => {
      expect(() => loadEnv({ ...REQUIRED, NODE_ENV: 'production', COOKIE_SECURE: 'false' })).toThrow(
        /COOKIE_SECURE.*NODE_ENV=production/s,
      )
    })

    it('refuses to start in production when COOKIE_SECURE is simply absent', () => {
      expect(() => loadEnv({ ...REQUIRED, NODE_ENV: 'production' })).toThrow(/COOKIE_SECURE/)
    })

    it('starts in production once the cookie is Secure', () => {
      const env = loadEnv({ ...REQUIRED, NODE_ENV: 'production', COOKIE_SECURE: 'true' })
      expect(env.NODE_ENV).toBe('production')
      expect(env.COOKIE_SECURE).toBe(true)
    })

    it.each(['development', 'test'] as const)(
      'still allows plain HTTP in %s, so local work is unaffected',
      (nodeEnv) => {
        expect(loadEnv({ ...REQUIRED, NODE_ENV: nodeEnv, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(
          false,
        )
      },
    )
  })

  describe('error reporting', () => {
    it('names every offending variable on one readable message', () => {
      let message = ''
      try {
        loadEnv({ ADMIN_USERNAME: '', ADMIN_PASSWORD: 'short', PORT: 'not-a-number' })
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
      }
      expect(message).toContain('Invalid environment configuration')
      expect(message).toContain('ADMIN_USERNAME')
      expect(message).toContain('ADMIN_PASSWORD')
      expect(message).toContain('PORT')
    })
  })
})
