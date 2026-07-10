import { describe, expect, it } from 'vitest'
import { resolveBackground } from '../../src/services/backgroundEngine'
import type { BackgroundConfig } from '../../src/types/widgets'

function createConfig(overrides: Partial<BackgroundConfig> = {}): BackgroundConfig {
  return {
    source: 'default',
    value: null,
    dimOverlay: 0.45,
    blurPx: 0,
    gradient: null,
    ...overrides,
  }
}

describe('resolveBackground', () => {
  it('falls back to the bundled gradient when the default source has no registered image', () => {
    const result = resolveBackground(createConfig())

    expect(result.backgroundImage).toBeNull()
    expect(result.gradient).toMatch(/^linear-gradient\(/)
  })

  it('resolves a custom-url source to a CSS url() background image', () => {
    const result = resolveBackground(createConfig({ source: 'custom-url', value: 'https://example.com/bg.jpg' }))

    expect(result.backgroundImage).toBe('url("https://example.com/bg.jpg")')
  })

  it('resolves a custom-upload source to a CSS url() background image', () => {
    const result = resolveBackground(createConfig({ source: 'custom-upload', value: 'local-ref-1' }))

    expect(result.backgroundImage).toBe('url("local-ref-1")')
  })

  it('prefers an explicit gradient over the fallback, even without an image', () => {
    const result = resolveBackground(
      createConfig({ gradient: { from: '#111111', to: '#222222', angleDeg: 45 } }),
    )

    expect(result.gradient).toBe('linear-gradient(45deg, #111111, #222222)')
  })

  it('carries an explicit gradient alongside a resolved image', () => {
    const result = resolveBackground(
      createConfig({
        source: 'custom-url',
        value: 'https://example.com/bg.jpg',
        gradient: { from: '#111111', to: '#222222', angleDeg: 45 },
      }),
    )

    expect(result.backgroundImage).toBe('url("https://example.com/bg.jpg")')
    expect(result.gradient).toBe('linear-gradient(45deg, #111111, #222222)')
  })

  it('computes the overlay color from dimOverlay', () => {
    const result = resolveBackground(createConfig({ dimOverlay: 0.6 }))

    expect(result.overlayColor).toBe('rgba(0, 0, 0, 0.6)')
  })

  it('omits the filter when blurPx is 0', () => {
    const result = resolveBackground(createConfig({ blurPx: 0 }))

    expect(result.filter).toBeNull()
  })

  it('computes a blur filter when blurPx is positive', () => {
    const result = resolveBackground(createConfig({ blurPx: 12 }))

    expect(result.filter).toBe('blur(12px)')
  })

  it('clamps an out-of-range dimOverlay instead of rejecting the config', () => {
    const result = resolveBackground(createConfig({ dimOverlay: 5 }))

    expect(result.overlayColor).toBe('rgba(0, 0, 0, 1)')
  })

  it('clamps a negative dimOverlay instead of rejecting the config', () => {
    const result = resolveBackground(createConfig({ dimOverlay: -3 }))

    expect(result.overlayColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('clamps an out-of-range blurPx instead of rejecting the config', () => {
    const result = resolveBackground(createConfig({ blurPx: 999 }))

    expect(result.filter).toBe('blur(40px)')
  })

  it('falls back to 0 when dimOverlay is not a finite number', () => {
    const result = resolveBackground(createConfig({ dimOverlay: Number.NaN }))

    expect(result.overlayColor).toBe('rgba(0, 0, 0, 0)')
  })

  it('falls back to no filter when blurPx is not a finite number', () => {
    const result = resolveBackground(createConfig({ blurPx: Number.NaN }))

    expect(result.filter).toBeNull()
  })

  it('produces no background image for a custom-url source with a null value', () => {
    const result = resolveBackground(createConfig({ source: 'custom-url', value: null }))

    expect(result.backgroundImage).toBeNull()
  })
})
