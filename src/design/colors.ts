/**
 * Color role tokens.
 *
 * Semantic aliases over the existing `--color-*` custom properties from
 * `src/index.css`, which already resolve correctly per light/dark theme via
 * `data-theme` on `<html>` (see `src/services/theme.ts`). This module does
 * not introduce new color values — it names the existing roles so
 * `src/design/glass.ts` and the `Glass*` component family reference roles,
 * not raw variable strings.
 */

export const colorTokens = {
  background: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceMuted: 'var(--color-surface-muted)',
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  border: 'var(--color-border)',
  accent: 'var(--color-accent)',
  accentStrong: 'var(--color-accent-strong)',
  focus: 'var(--color-focus)',
} as const

export type ColorToken = keyof typeof colorTokens
