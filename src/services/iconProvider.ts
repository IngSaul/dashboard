import { isKnownBrandSlug } from './brandIconSlugs'
import type { IconSource } from '../types/widgets'

/**
 * Shortcut icon resolution, per contracts/icon-provider-contract.md's fixed
 * fallback chain: manual `lucide` choice -> Simple Icons brand match ->
 * favicon auto-discovery -> initials fallback. Runs only when explicitly
 * invoked by the shortcut editor (T088) — never during normal dashboard
 * render or on a polling interval; the result is meant to be cached onto
 * the shortcut's persisted `icon` field by the caller.
 *
 * A brand match resolves to the icon's **slug**, not its markup. Persisting
 * markup put a whole SVG document into stored configuration, which
 * `ShortcutIcon` then injected into the DOM; storing a slug means the
 * markup only ever comes from what this build bundles (see
 * `iconResolver.getBrandSvgBySlug`). It also removes the reason this module
 * had dynamic imports of the same icons `iconResolver` already imports
 * statically.
 */

export interface ResolveIconOptions {
  /** An explicit manual choice — always wins immediately, with no fetch attempted, and is never later auto-downgraded. */
  manualChoice?: { provider: 'lucide'; value: string }
  /** The shortcut's currently-cached icon, if any. A manual provider here is preserved unless `manualChoice` explicitly overrides it. */
  currentIcon?: IconSource
  /** Favicon-check timeout in ms (default 3000) — fails fast rather than blocking the settings UI, per the contract. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 3000

/**
 * Curated domain -> Simple Icons slug map. Every slug here must also be one
 * `iconResolver` bundles, which `resolveIcon` checks before returning it —
 * so a resolved icon always has markup available to render.
 */
const DOMAIN_TO_SLUG: Record<string, string> = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'youtube.com': 'youtube',
  'mail.google.com': 'gmail',
  'calendar.google.com': 'googlecalendar',
  'drive.google.com': 'googledrive',
  'docs.google.com': 'googledocs',
  'notion.so': 'notion',
  'figma.com': 'figma',
  'discord.com': 'discord',
  'npmjs.com': 'npm',
  'docker.com': 'docker',
  'trello.com': 'trello',
  'linear.app': 'linear',
  'vercel.com': 'vercel',
  'netlify.com': 'netlify',
  'grafana.com': 'grafana',
  'portainer.io': 'portainer',
}

function stripWww(hostname: string): string {
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname
}

/** Exported so `ShortcutCard` can render the same initials tile for a shortcut whose icon hasn't been resolved yet (e.g. pre-existing shortcuts created before the icon system). */
export function getInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (first === undefined) {
    return '?'
  }
  const second = words[1]
  if (second === undefined) {
    return first.slice(0, 2).toUpperCase()
  }
  return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
}

/** Per-origin favicon-check cache: a session never re-checks the same origin's favicon.ico more than once. */
const faviconCache = new Map<string, Promise<boolean>>()

/** Test/dev utility: clears the in-memory favicon-check cache. */
export function clearIconProviderCache(): void {
  faviconCache.clear()
}

/**
 * Checks whether an image loads at `url`, resolving `false` on error or
 * after `timeoutMs`. Uses `Image` (not `fetch`) deliberately: loading an
 * `<img>` isn't blocked by CORS the way reading a cross-origin `fetch`
 * response body is, so this degrades to `false` rather than throwing when
 * blocked — matching the contract's "silently falls through" rule.
 */
function checkImageLoads(url: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    const timer = setTimeout(() => resolve(false), timeoutMs)
    image.onload = () => {
      clearTimeout(timer)
      resolve(true)
    }
    image.onerror = () => {
      clearTimeout(timer)
      resolve(false)
    }
    image.src = url
  })
}

function checkFaviconCached(faviconUrl: string, timeoutMs: number): Promise<boolean> {
  const cached = faviconCache.get(faviconUrl)
  if (cached) {
    return cached
  }
  const promise = checkImageLoads(faviconUrl, timeoutMs)
  faviconCache.set(faviconUrl, promise)
  return promise
}

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Resolves an `IconSource` for a shortcut. Never throws: any failure along
 * the chain (bad URL, blocked favicon, network error) falls through to the
 * next step, ending in `fallback` — a shortcut always renders something.
 */
export async function resolveIcon(
  url: string,
  label: string,
  options: ResolveIconOptions = {},
): Promise<IconSource> {
  if (options.manualChoice) {
    return { provider: options.manualChoice.provider, value: options.manualChoice.value, resolvedAt: nowIso() }
  }
  if (options.currentIcon && options.currentIcon.provider === 'lucide') {
    return options.currentIcon
  }

  let origin: string
  let hostname: string
  try {
    const parsed = new URL(url)
    origin = parsed.origin
    hostname = stripWww(parsed.hostname)
  } catch {
    return { provider: 'fallback', value: getInitials(label), resolvedAt: nowIso() }
  }

  const slug = DOMAIN_TO_SLUG[hostname]
  if (slug !== undefined && isKnownBrandSlug(slug)) {
    return { provider: 'simple-icons', value: slug, resolvedAt: nowIso() }
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const faviconUrl = `${origin}/favicon.ico`
  const faviconLoaded = await checkFaviconCached(faviconUrl, timeoutMs)
  if (faviconLoaded) {
    return { provider: 'favicon', value: faviconUrl, resolvedAt: nowIso() }
  }

  return { provider: 'fallback', value: getInitials(label), resolvedAt: nowIso() }
}
