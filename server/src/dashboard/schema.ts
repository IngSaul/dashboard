import { z } from 'zod'

/**
 * Server-side validation of a stored dashboard configuration.
 *
 * The division of labour is deliberate and unchanged: the client remains the
 * single source of truth for what a *correct* `DashboardConfiguration` looks
 * like (see data-model.md's `DashboardConfigRecord` notes), and this does
 * not reimplement `repairDashboardConfig`'s field-level repair rules.
 *
 * What it does enforce is what is *safe to store and hand back later*. The
 * previous version checked only `{ version: number }` and passed everything
 * else through, which meant the server would happily persist a
 * `javascript:` shortcut or an SVG document dressed as an icon and serve it
 * to every future session of that account. Validation in the browser cannot
 * cover that: the browser is exactly the thing an attacker replaces.
 *
 * So: unknown fields still pass through untouched, but the fields that end
 * up in an `href`, an `<img src>`, a `fetch`, or the DOM are checked here
 * too.
 */

const MAX_CONFIG_BYTES = 2_000_000

/** Mirrors `src/utils/validation.ts`'s `ALLOWED_LINK_PROTOCOLS`. */
const ALLOWED_LINK_PROTOCOLS = ['https:', 'http:', 'mailto:']
/** Mirrors `src/utils/validation.ts`'s `ALLOWED_RESOURCE_PROTOCOLS`. */
const ALLOWED_RESOURCE_PROTOCOLS = ['https:', 'http:']

/**
 * `new URL()` normalises the way a browser does before navigating — leading
 * whitespace trimmed, embedded tabs and newlines stripped, scheme
 * lowercased — so `JaVaScRiPt:` and `java\tscript:` both arrive as the
 * protocol `javascript:`. Checking the parsed protocol is what makes this
 * robust; substring matching on the raw string would not be.
 */
function hasAllowedProtocol(value: string, allowed: string[]): boolean {
  try {
    return allowed.includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const linkUrl = z.string().refine((value) => hasAllowedProtocol(value, ALLOWED_LINK_PROTOCOLS), {
  message: 'url must use one of https:, http:, mailto:',
})

const resourceUrl = z
  .string()
  .refine((value) => hasAllowedProtocol(value, ALLOWED_RESOURCE_PROTOCOLS), {
    message: 'url must use https: or http:',
  })

/**
 * `custom-svg` is absent on purpose: it persisted raw SVG that the client
 * injected into the DOM, and it was removed rather than sanitised (the
 * audit's TD-06). Rejecting it here stops a config written by an older
 * build — or by hand — from reintroducing it.
 */
const iconSourceSchema = z
  .discriminatedUnion('provider', [
    z.object({ provider: z.literal('lucide'), value: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/) }),
    // A slug, never markup. The client resolves it against the icons it
    // bundles; anything containing markup is rejected outright.
    z.object({ provider: z.literal('simple-icons'), value: z.string().regex(/^[a-z0-9-]{1,64}$/) }),
    z.object({ provider: z.literal('favicon'), value: resourceUrl }),
    z.object({ provider: z.literal('fallback'), value: z.string().max(8) }),
  ])
  .and(z.object({ resolvedAt: z.string() }).passthrough())

const shortcutSchema = z
  .object({
    url: linkUrl,
    icon: iconSourceSchema.optional(),
  })
  .passthrough()

const backgroundSchema = z
  .object({
    source: z.string().optional(),
    value: z.unknown().optional(),
  })
  .passthrough()
  .superRefine((background, ctx) => {
    if (background.source === 'custom-url' && typeof background.value === 'string') {
      if (!hasAllowedProtocol(background.value, ALLOWED_RESOURCE_PROTOCOLS)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: 'wallpaper url must use https: or http:',
        })
      }
    }
  })

const dashboardConfigShape = z
  .object({
    version: z.number().int().positive(),
    shortcuts: z.array(shortcutSchema).optional(),
    themePreferences: z
      .object({ wallpaper: backgroundSchema.optional() })
      .passthrough()
      .optional(),
    monitoringSourceConfig: z
      .object({ endpointUrl: resourceUrl.nullable().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type DashboardConfigValidationResult =
  | { ok: true; json: string; schemaVersion: number }
  | { ok: false; error: string }

export function validateDashboardConfigPayload(body: unknown): DashboardConfigValidationResult {
  const parsed = dashboardConfigShape.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first && first.path.length > 0 ? ` at ${first.path.join('.')}` : ''
    return { ok: false, error: `invalid dashboard configuration${where}: ${first?.message ?? 'bad shape'}` }
  }
  const json = JSON.stringify(parsed.data)
  if (Buffer.byteLength(json, 'utf8') > MAX_CONFIG_BYTES) {
    return { ok: false, error: 'dashboard configuration exceeds maximum size' }
  }
  return { ok: true, json, schemaVersion: parsed.data.version }
}
