import type { BackgroundConfig, BackgroundGradient } from '../types/widgets'

/**
 * Wallpaper resolution: source switching plus dim-overlay/blur/gradient
 * computation, per data-model.md's `BackgroundConfig` and plan.md's
 * "dedicated `backgroundEngine` service owns wallpaper source switching,
 * overlay/blur/gradient computation" note. `BackgroundLayer` renders this
 * output and contains no resolution logic of its own, mirroring how
 * `Workspace` only renders `layoutEngine.resolveLayout()`'s output.
 *
 * Pure and defensive: inputs may already have passed through
 * `config/schema.ts`'s `repairBackgroundConfig` on load, but this module
 * clamps/falls back independently rather than trusting that — the same
 * repair-not-reject philosophy applied one layer closer to render.
 */

/** Bundled default background assets, keyed by the id stored in `BackgroundConfig.value`. Empty for now; a real asset only needs to be dropped in and registered here. */
const DEFAULT_BACKGROUND_ASSETS: Record<string, string> = {}

/** Used whenever resolution has no image to show (first launch, or an unregistered `default` asset id) so the dashboard is never left with a blank background. */
const FALLBACK_GRADIENT: BackgroundGradient = { from: '#0f172a', to: '#1e293b', angleDeg: 135 }

export interface ResolvedBackground {
  /** CSS `background-image` value (e.g. `url("...")`), or `null` when no image applies. */
  backgroundImage: string | null
  /** CSS gradient value (e.g. `linear-gradient(...)`) layered under/instead of the image, or `null` when none applies. */
  gradient: string | null
  /** `rgba(0, 0, 0, alpha)` dark scrim color derived from `dimOverlay`, always applied so text stays legible over any image. */
  overlayColor: string
  /** CSS `filter` value (e.g. `blur(12px)`), or `null` when blur is disabled. */
  filter: string | null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function toGradientCss(gradient: BackgroundGradient): string {
  return `linear-gradient(${gradient.angleDeg}deg, ${gradient.from}, ${gradient.to})`
}

function resolveSourceImage(config: BackgroundConfig): string | null {
  switch (config.source) {
    case 'default':
      return config.value ? (DEFAULT_BACKGROUND_ASSETS[config.value] ?? null) : null
    case 'custom-url':
    case 'custom-upload':
      return config.value ? `url("${config.value}")` : null
    default:
      return null
  }
}

/**
 * Resolves a `BackgroundConfig` into CSS-ready values.
 *
 * Falls back to a bundled dark gradient when the resolved source has no
 * image (first launch, or a `default` id with no bundled asset yet) and
 * `dimOverlay`/`blurPx` are out of range. An explicit `gradient` always wins
 * over the fallback, even when an image is also present, since it may be an
 * intentional decorative layer over the image.
 */
export function resolveBackground(config: BackgroundConfig): ResolvedBackground {
  const backgroundImage = resolveSourceImage(config)
  const gradient = config.gradient
    ? toGradientCss(config.gradient)
    : backgroundImage
      ? null
      : toGradientCss(FALLBACK_GRADIENT)

  const dimOverlay = isFiniteNumber(config.dimOverlay) ? clamp(config.dimOverlay, 0, 1) : 0
  const blurPx = isFiniteNumber(config.blurPx) ? clamp(config.blurPx, 0, 40) : 0

  return {
    backgroundImage,
    gradient,
    overlayColor: `rgba(0, 0, 0, ${dimOverlay})`,
    filter: blurPx > 0 ? `blur(${blurPx}px)` : null,
  }
}
