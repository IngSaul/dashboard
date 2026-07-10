import type { MonitoringSourceConfig } from '../types/widgets'

/**
 * Non-blocking fetch/parse for the `server-status`/`docker-status` widgets'
 * shared endpoint, per contracts/monitoring-api-contract.md. This is an
 * external contract the dashboard consumes, not hosts — `host`/
 * `containers` are independently optional in the response, and the
 * per-field "not-configured" decision belongs to each widget, not this
 * service (see `ServerStatusWidget`/`DockerStatusWidget`).
 */

const HOST_STATUSES = ['up', 'degraded', 'down'] as const
type HostStatusValue = (typeof HOST_STATUSES)[number]

const CONTAINER_STATUSES = ['running', 'stopped', 'restarting', 'unknown'] as const
type ContainerStatusValue = (typeof CONTAINER_STATUSES)[number]

export interface MonitoringHostStatus {
  name: string
  status: HostStatusValue
  cpuPercent?: number
  memoryPercent?: number
}

export interface MonitoringContainerStatus {
  id: string
  name: string
  status: ContainerStatusValue
  uptimeSeconds: number
}

export interface MonitoringSnapshot {
  host?: MonitoringHostStatus
  containers?: MonitoringContainerStatus[]
}

export type MonitoringFetchResult =
  | { kind: 'not-configured' }
  | { kind: 'unavailable' }
  | { kind: 'ready'; snapshot: MonitoringSnapshot }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function parseHostStatus(raw: unknown): MonitoringHostStatus | undefined {
  if (!isPlainObject(raw)) {
    return undefined
  }
  if (!isNonEmptyString(raw.name) || !(HOST_STATUSES as readonly string[]).includes(raw.status as string)) {
    return undefined
  }
  const cpuPercent = isFiniteNumber(raw.cpuPercent) ? raw.cpuPercent : undefined
  const memoryPercent = isFiniteNumber(raw.memoryPercent) ? raw.memoryPercent : undefined
  return {
    name: raw.name,
    status: raw.status as HostStatusValue,
    ...(cpuPercent !== undefined ? { cpuPercent } : {}),
    ...(memoryPercent !== undefined ? { memoryPercent } : {}),
  }
}

function parseContainerStatus(raw: unknown): MonitoringContainerStatus | undefined {
  if (!isPlainObject(raw)) {
    return undefined
  }
  if (
    !isNonEmptyString(raw.id) ||
    !isNonEmptyString(raw.name) ||
    !(CONTAINER_STATUSES as readonly string[]).includes(raw.status as string) ||
    !isFiniteNumber(raw.uptimeSeconds)
  ) {
    return undefined
  }
  return { id: raw.id, name: raw.name, status: raw.status as ContainerStatusValue, uptimeSeconds: raw.uptimeSeconds }
}

/**
 * Maps an untrusted parsed JSON body to a `MonitoringSnapshot`. Pure, no
 * I/O. A malformed `host`, or an individual malformed container entry, is
 * dropped rather than failing the whole parse; unknown/extra fields are
 * ignored (forward compatibility), per the contract.
 */
export function parseMonitoringSnapshot(raw: unknown): MonitoringSnapshot {
  if (!isPlainObject(raw)) {
    return {}
  }
  const host = parseHostStatus(raw.host)
  const containers = Array.isArray(raw.containers)
    ? raw.containers
        .map(parseContainerStatus)
        .filter((container): container is MonitoringContainerStatus => container !== undefined)
    : undefined
  return {
    ...(host !== undefined ? { host } : {}),
    ...(containers !== undefined ? { containers } : {}),
  }
}

/**
 * Fetches `config.endpointUrl` with an abort-based timeout
 * (`config.timeoutMs`). Never throws: `not-configured` when no endpoint is
 * set (no fetch attempted), `unavailable` on any non-2xx response, network
 * failure, timeout, or malformed JSON body. Makes exactly one attempt per
 * call — the contract's "MUST NOT retry more than once per poll interval"
 * is satisfied by the caller only invoking this again on its own poll
 * schedule, not by retrying in here.
 */
export async function fetchMonitoringSnapshot(
  config: MonitoringSourceConfig,
): Promise<MonitoringFetchResult> {
  if (!config.endpointUrl) {
    return { kind: 'not-configured' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = await fetch(config.endpointUrl, { method: 'GET', signal: controller.signal })
    if (!response.ok) {
      return { kind: 'unavailable' }
    }
    const body: unknown = await response.json()
    return { kind: 'ready', snapshot: parseMonitoringSnapshot(body) }
  } catch {
    return { kind: 'unavailable' }
  } finally {
    clearTimeout(timeoutId)
  }
}
