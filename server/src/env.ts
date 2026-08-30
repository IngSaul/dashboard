import { z } from 'zod'

/**
 * Typed environment configuration, parsed once at startup. Every deployment
 * secret/setting flows through here — never read `process.env` directly
 * elsewhere (per plan.md's Configuration Driven alignment).
 */

/**
 * Strict boolean parsing: only the exact strings `"true"` and `"false"` are
 * accepted.
 *
 * The previous `value === 'true'` shape silently resolved anything else —
 * `TRUE`, `1`, `yes`, a stray space, a typo — to `false`, which for
 * `COOKIE_SECURE` is the *insecure* direction and left no trace. A wrong
 * value now fails the whole parse at startup instead.
 */
const strictBoolean = z.enum(['true', 'false']).transform((value) => value === 'true')

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3210),
    DATABASE_PATH: z.string().min(1).default('./data/dashboard.sqlite3'),
    ADMIN_USERNAME: z.string().min(1),
    ADMIN_PASSWORD: z.string().min(8),
    /**
     * Adds `Secure` to the session cookie, so browsers only ever send it
     * back over HTTPS. Mandatory when `NODE_ENV=production` — see the
     * refinement below.
     */
    COOKIE_SECURE: strictBoolean.default('false'),
    SESSION_IDLE_TTL_DAYS: z.coerce.number().int().positive().default(30),
    SESSION_ABSOLUTE_TTL_DAYS: z.coerce.number().int().positive().default(90),
    /**
     * Max `POST /auth/login` attempts per IP per minute. The default is the
     * brute-force guard a real deployment wants; it is configurable because
     * the Playwright suite drives one login per worker per project from a
     * single loopback address (see `playwright.config.ts`), which legitimately
     * exceeds it without saying anything about production risk.
     */
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  })
  .superRefine((env, ctx) => {
    // A production deployment that serves the session cookie without
    // `Secure` is one plain-HTTP request away from handing the session to
    // anyone on the path. Refusing to boot is the only outcome that can't
    // be missed; a warning in a container log can be, and was.
    if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message:
          'must be "true" when NODE_ENV=production — the session cookie may not travel over plain HTTP. ' +
          'Terminate TLS in front of this service (see docker-compose.yml\'s Traefik labels) and set COOKIE_SECURE=true. ' +
          'For a plain-HTTP LAN deployment, run with NODE_ENV=development instead.',
      })
    }
  })

export type Env = z.infer<typeof envSchema>

/**
 * Parses and validates `process.env`. Throws with a readable, per-variable
 * message on missing/invalid config — fail fast at startup, never at
 * request time.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${details}`)
  }
  return result.data
}
