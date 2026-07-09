/**
 * Reusable URL and string validation helpers for forms and services
 * (shortcut editing, search query handling) that need to give the user
 * feedback rather than silently repairing data like `config/schema.ts`.
 */

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** True when `value` is empty or contains only whitespace. */
export function isBlank(value: string): boolean {
  return value.trim().length === 0
}

/** True when `value` parses as an absolute URL (e.g. a shortcut destination). */
export function isValidUrl(value: string): boolean {
  if (isBlank(value)) {
    return false
  }
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
