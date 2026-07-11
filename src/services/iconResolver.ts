import { Bot, Globe, type LucideIcon } from 'lucide-react'
import githubSvg from 'simple-icons/icons/github.svg?raw'
import gitlabSvg from 'simple-icons/icons/gitlab.svg?raw'
import youtubeSvg from 'simple-icons/icons/youtube.svg?raw'
import gmailSvg from 'simple-icons/icons/gmail.svg?raw'
import googleCalendarSvg from 'simple-icons/icons/googlecalendar.svg?raw'
import googleDriveSvg from 'simple-icons/icons/googledrive.svg?raw'
import googleDocsSvg from 'simple-icons/icons/googledocs.svg?raw'
import notionSvg from 'simple-icons/icons/notion.svg?raw'
import figmaSvg from 'simple-icons/icons/figma.svg?raw'
import discordSvg from 'simple-icons/icons/discord.svg?raw'
import npmSvg from 'simple-icons/icons/npm.svg?raw'
import dockerSvg from 'simple-icons/icons/docker.svg?raw'
import trelloSvg from 'simple-icons/icons/trello.svg?raw'
import linearSvg from 'simple-icons/icons/linear.svg?raw'
import vercelSvg from 'simple-icons/icons/vercel.svg?raw'
import netlifySvg from 'simple-icons/icons/netlify.svg?raw'
import grafanaSvg from 'simple-icons/icons/grafana.svg?raw'
import portainerSvg from 'simple-icons/icons/portainer.svg?raw'
import whatsappSvg from 'simple-icons/icons/whatsapp.svg?raw'
import claudeSvg from 'simple-icons/icons/claude.svg?raw'

/**
 * URL -> brand icon resolution, independent of `iconProvider.ts` (which
 * resolves a persisted, editor-driven `IconSource` via an async chain that
 * includes a live favicon fetch). This resolver is synchronous and pure —
 * every SVG it can return is statically bundled at build time — so it's
 * safe to call on every `ShortcutCard` render without violating the "no
 * blocking network calls on startup" constitution rule.
 */

export type ShortcutIconMatch = 'brand' | 'unknown'

export interface ShortcutIconDefinition {
  /** 'brand' when the shortcut's hostname matched a known service; 'unknown' otherwise. */
  match: ShortcutIconMatch
  /** Human-readable service name (e.g. "GitHub"), or the bare hostname/generic label when unmatched. Usable as a title/aria hint. */
  label: string
  /** Brand hex color (e.g. "#181717") for a match; `currentColor` for the unknown fallback so it follows the card's default foreground color. */
  color: string
  /** Colorized Simple Icons SVG markup — set when a real brand icon was bundled. Mutually exclusive with `Icon`. */
  svg?: string
  /** Lucide icon component — used for the generic "unknown" fallback, and for known services with no bundled brand SVG (e.g. one removed from Simple Icons over trademark policy). Mutually exclusive with `svg`. */
  Icon?: LucideIcon
}

interface BrandEntry {
  label: string
  /** Hex color without the leading '#'. */
  hex: string
  svg?: string
  icon?: LucideIcon
}

type BrandKey =
  | 'github'
  | 'gitlab'
  | 'youtube'
  | 'gmail'
  | 'googlecalendar'
  | 'googledrive'
  | 'googledocs'
  | 'notion'
  | 'figma'
  | 'discord'
  | 'npm'
  | 'docker'
  | 'trello'
  | 'linear'
  | 'vercel'
  | 'netlify'
  | 'grafana'
  | 'portainer'
  | 'whatsapp'
  | 'claude'
  | 'chatgpt'

const BRANDS: Record<BrandKey, BrandEntry> = {
  github: { label: 'GitHub', hex: '181717', svg: githubSvg },
  gitlab: { label: 'GitLab', hex: 'FC6D26', svg: gitlabSvg },
  youtube: { label: 'YouTube', hex: 'FF0000', svg: youtubeSvg },
  gmail: { label: 'Gmail', hex: 'EA4335', svg: gmailSvg },
  googlecalendar: { label: 'Google Calendar', hex: '4285F4', svg: googleCalendarSvg },
  googledrive: { label: 'Google Drive', hex: '4285F4', svg: googleDriveSvg },
  googledocs: { label: 'Google Docs', hex: '4285F4', svg: googleDocsSvg },
  notion: { label: 'Notion', hex: '000000', svg: notionSvg },
  figma: { label: 'Figma', hex: 'F24E1E', svg: figmaSvg },
  discord: { label: 'Discord', hex: '5865F2', svg: discordSvg },
  npm: { label: 'npm', hex: 'CB3837', svg: npmSvg },
  docker: { label: 'Docker', hex: '2496ED', svg: dockerSvg },
  trello: { label: 'Trello', hex: '0052CC', svg: trelloSvg },
  linear: { label: 'Linear', hex: '5E6AD2', svg: linearSvg },
  vercel: { label: 'Vercel', hex: '000000', svg: vercelSvg },
  netlify: { label: 'Netlify', hex: '00C7B7', svg: netlifySvg },
  grafana: { label: 'Grafana', hex: 'F46800', svg: grafanaSvg },
  portainer: { label: 'Portainer', hex: '13BEF9', svg: portainerSvg },
  whatsapp: { label: 'WhatsApp', hex: '25D366', svg: whatsappSvg },
  claude: { label: 'Claude', hex: 'D97757', svg: claudeSvg },
  // Simple Icons dropped the official OpenAI/ChatGPT mark over trademark
  // policy (no `openai`/`chatgpt` slug ships in this package version), so
  // this uses a generic Lucide glyph tinted with OpenAI's known brand
  // green rather than reproducing a mark the icon set itself won't carry.
  chatgpt: { label: 'ChatGPT', hex: '10A37F', icon: Bot },
}

/** Hostname (exact, lowercased) -> brand key. Subdomains not listed here fall back to eTLD+1 matching in `matchBrand`. */
const HOSTNAME_TO_BRAND: Record<string, BrandKey> = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'youtube.com': 'youtube',
  'gmail.com': 'gmail',
  'mail.google.com': 'gmail',
  'calendar.google.com': 'googlecalendar',
  'drive.google.com': 'googledrive',
  'docs.google.com': 'googledocs',
  'notion.so': 'notion',
  'notion.com': 'notion',
  'figma.com': 'figma',
  'discord.com': 'discord',
  'discordapp.com': 'discord',
  'npmjs.com': 'npm',
  'docker.com': 'docker',
  'trello.com': 'trello',
  'linear.app': 'linear',
  'vercel.com': 'vercel',
  'netlify.com': 'netlify',
  'grafana.com': 'grafana',
  'portainer.io': 'portainer',
  'whatsapp.com': 'whatsapp',
  'web.whatsapp.com': 'whatsapp',
  'claude.ai': 'claude',
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'openai.com': 'chatgpt',
}

const STRIPPABLE_SUBDOMAIN_PREFIXES = ['www.', 'm.', 'mobile.']

/** Candidate hostnames to try, most-specific first: exact host, then with common device/www subdomains stripped, then the bare eTLD+1 (last two labels — a pragmatic approximation, not a full public-suffix-list lookup, which is enough for the curated `.com`/`.app`/`.io`/`.ai`/`.so` domains above). */
function hostnameVariants(hostname: string): string[] {
  const lower = hostname.toLowerCase()
  const variants = [lower]

  for (const prefix of STRIPPABLE_SUBDOMAIN_PREFIXES) {
    if (lower.startsWith(prefix)) {
      variants.push(lower.slice(prefix.length))
    }
  }

  const labels = lower.split('.')
  if (labels.length > 2) {
    variants.push(labels.slice(-2).join('.'))
  }

  return variants
}

function matchBrand(hostname: string): BrandKey | null {
  for (const variant of hostnameVariants(hostname)) {
    const brand = HOSTNAME_TO_BRAND[variant]
    if (brand) {
      return brand
    }
  }
  return null
}

/** Simple Icons SVGs ship with no `fill`, so it defaults to SVG's own black — this bakes in the real brand hex via the (inherited) root `fill` attribute. */
function colorizeSvg(svg: string, hex: string): string {
  return svg.replace('<svg ', `<svg fill="#${hex}" `)
}

function unknownIcon(label: string): ShortcutIconDefinition {
  return { match: 'unknown', label, color: 'currentColor', Icon: Globe }
}

/**
 * Resolves the branded icon for a shortcut's destination URL. Never throws:
 * an invalid URL or an unrecognized host both resolve to the generic
 * "unknown" definition (Globe icon, default foreground color) — a shortcut
 * never renders a brand mark unrelated to its actual destination.
 */
export function resolveShortcutIcon(url: string): ShortcutIconDefinition {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return unknownIcon('Enlace')
  }
  if (!hostname) {
    return unknownIcon('Enlace')
  }

  const brandKey = matchBrand(hostname)
  if (!brandKey) {
    return unknownIcon(hostname)
  }

  const brand = BRANDS[brandKey]
  const color = `#${brand.hex}`
  if (brand.svg) {
    return { match: 'brand', label: brand.label, color, svg: colorizeSvg(brand.svg, brand.hex) }
  }
  return { match: 'brand', label: brand.label, color, Icon: brand.icon ?? Globe }
}
