import { z } from 'zod'

/**
 * Structural validation only — size cap and shape check. This deliberately
 * does NOT reimplement the frontend's `repairDashboardConfig` field-level
 * repair rules (see data-model.md's `DashboardConfigRecord` notes): the
 * client remains the single source of truth for what a *correct*
 * `DashboardConfiguration` looks like, the server only enforces what's
 * *safe* to store.
 */
const MAX_CONFIG_BYTES = 2_000_000

const dashboardConfigShape = z
  .object({
    version: z.number(),
  })
  .passthrough()

export type DashboardConfigValidationResult =
  | { ok: true; json: string; schemaVersion: number }
  | { ok: false; error: string }

export function validateDashboardConfigPayload(body: unknown): DashboardConfigValidationResult {
  const parsed = dashboardConfigShape.safeParse(body)
  if (!parsed.success) {
    return { ok: false, error: 'invalid dashboard configuration shape' }
  }
  const json = JSON.stringify(parsed.data)
  if (Buffer.byteLength(json, 'utf8') > MAX_CONFIG_BYTES) {
    return { ok: false, error: 'dashboard configuration exceeds maximum size' }
  }
  return { ok: true, json, schemaVersion: parsed.data.version }
}
