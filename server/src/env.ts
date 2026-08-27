import { z } from 'zod'

/**
 * Typed environment configuration, parsed once at startup. Every deployment
 * secret/setting flows through here — never read `process.env` directly
 * elsewhere (per plan.md's Configuration Driven alignment).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3210),
  DATABASE_PATH: z.string().min(1).default('./data/dashboard.sqlite3'),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SESSION_IDLE_TTL_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_ABSOLUTE_TTL_DAYS: z.coerce.number().int().positive().default(90),
})

export type Env = z.infer<typeof envSchema>

/** Parses and validates `process.env`. Throws with a readable message on missing/invalid config — fail fast at startup, never at request time. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${result.error.message}`)
  }
  return result.data
}
