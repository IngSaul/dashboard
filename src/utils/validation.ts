/**
 * Reusable URL and string validation helpers for forms and services
 * (shortcut editing, search query handling) that need to give the user
 * feedback rather than silently repairing data like `config/schema.ts`.
 */

/**
 * Schemes a shortcut is allowed to point at.
 *
 * Parsing with `new URL()` says a string is a *URL*; it says nothing about
 * whether following it is safe. `javascript:alert(1)` parses perfectly, and
 * a shortcut card renders its destination into an `<a href>` — so accepting
 * "anything that parses" meant accepting script execution on click.
 *
 * `mailto:` is included because a mail link is a genuinely useful shortcut
 * and carries no script; everything not listed — `javascript:`, `data:`,
 * `vbscript:`, `blob:`, `file:` — is rejected.
 */
export const ALLOWED_LINK_PROTOCOLS = ['https:', 'http:', 'mailto:'] as const

/**
 * Schemes allowed where the app *loads* something rather than linking to it
 * — a wallpaper URL, a favicon `<img src>`, a monitoring endpoint. No
 * `mailto:` (meaningless), and in particular no `data:`, which would let a
 * stored config smuggle arbitrary bytes into an image or a fetch.
 */
export const ALLOWED_RESOURCE_PROTOCOLS = ['https:', 'http:'] as const

/**
 * `new URL()` applies the same normalisation a browser does before
 * navigating — trimming leading whitespace, stripping embedded tabs and
 * newlines, lowercasing the scheme — so `JaVaScRiPt:`, `java\tscript:` and
 * ` javascript:` all arrive here as the protocol `javascript:`. Comparing
 * the parsed protocol is therefore enough; matching on the raw string would
 * not be.
 */
function hasAllowedProtocol(value: string, allowed: readonly string[]): boolean {
  if (isBlank(value)) {
    return false
  }
  try {
    return allowed.includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** True when `value` is empty or contains only whitespace. */
export function isBlank(value: string): boolean {
  return value.trim().length === 0
}

/** True when `value` is an absolute URL a shortcut may point at — see `ALLOWED_LINK_PROTOCOLS`. */
export function isValidUrl(value: string): boolean {
  return hasAllowedProtocol(value, ALLOWED_LINK_PROTOCOLS)
}

/** True when `value` is an absolute URL the app may load a resource from — see `ALLOWED_RESOURCE_PROTOCOLS`. */
export function isSafeResourceUrl(value: string): boolean {
  return hasAllowedProtocol(value, ALLOWED_RESOURCE_PROTOCOLS)
}
