/**
 * Glassmorphism material tokens.
 *
 * The single source of truth for the translucent-surface look shared by
 * every `Glass*` component (`src/components/glass/`). Values are the
 * `--glass-*` custom properties defined in `src/index.css`.
 *
 * `intensity` and `borderStrength` mirror the `glass` preference group in
 * `ThemePreferences` (see data-model.md) — the user selects one of these
 * presets, never an arbitrary blur/opacity value, so every glass surface
 * stays visually consistent.
 */

export type GlassIntensity = 'low' | 'medium' | 'high'
export type GlassBorderStrength = 'subtle' | 'visible'

export const glassBlurTokens: Record<GlassIntensity, string> = {
  low: 'var(--glass-blur-low)',
  medium: 'var(--glass-blur-medium)',
  high: 'var(--glass-blur-high)',
}

export const glassFillTokens: Record<GlassIntensity, string> = {
  low: 'var(--glass-fill-low)',
  medium: 'var(--glass-fill-medium)',
  high: 'var(--glass-fill-high)',
}

export const glassBorderTokens: Record<GlassBorderStrength, string> = {
  subtle: 'var(--glass-border-subtle)',
  visible: 'var(--glass-border-visible)',
}

export const DEFAULT_GLASS_INTENSITY: GlassIntensity = 'medium'
export const DEFAULT_GLASS_BORDER_STRENGTH: GlassBorderStrength = 'subtle'
