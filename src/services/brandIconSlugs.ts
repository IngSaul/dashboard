/**
 * The Simple Icons slugs a persisted `IconSource` is allowed to name.
 *
 * Deliberately a separate module from `iconResolver`, which holds the actual
 * SVG markup. Config validation only needs to answer "is this a slug this
 * build knows", and it runs during startup config repair — importing the
 * resolver for that answer dragged ~24 kB of brand SVGs into the entry
 * chunk, where they delay first paint for a check that needs a list of
 * strings (Constitution III).
 *
 * Every slug here must have bundled markup in `iconResolver`; a test pins
 * that so the two cannot drift.
 */
export const BRAND_ICON_SLUGS = [
  'github',
  'gitlab',
  'youtube',
  'gmail',
  'googlecalendar',
  'googledrive',
  'googledocs',
  'notion',
  'figma',
  'discord',
  'npm',
  'docker',
  'trello',
  'linear',
  'vercel',
  'netlify',
  'grafana',
  'portainer',
  'whatsapp',
  'claude',
] as const

export type BrandIconSlug = (typeof BRAND_ICON_SLUGS)[number]

const SLUGS: ReadonlySet<string> = new Set(BRAND_ICON_SLUGS)

/**
 * True when `value` names a brand icon this build bundles.
 *
 * Backed by a `Set` rather than an object lookup on purpose: an object would
 * answer `true` for `constructor`, `__proto__` and friends, and this is a
 * security allow-list fed by untrusted stored configuration.
 */
export function isKnownBrandSlug(value: string): boolean {
  return SLUGS.has(value)
}
