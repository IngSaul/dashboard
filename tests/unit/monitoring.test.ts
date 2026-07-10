import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMonitoringSnapshot, parseMonitoringSnapshot } from '../../src/services/monitoring'
import type { MonitoringSourceConfig } from '../../src/types/widgets'

/**
 * `monitoring.ts` does not exist yet (built in T060); these tests define its
 * fetch/timeout/malformed-response contract per
 * contracts/monitoring-api-contract.md and are expected to fail to resolve
 * until then.
 *
 * `parseMonitoringSnapshot` maps an untrusted parsed JSON body to a
 * `MonitoringSnapshot` (pure, no I/O); `fetchMonitoringSnapshot` is the
 * fetch/timeout orchestrator built around it — mirrors weather.ts's
 * pure-resolver split, and `configStore`'s "drop the malformed part, not
 * the whole thing" repair philosophy for individual container entries.
 *
 * Per the contract: `host` backs the server-status widget, `containers`
 * backs the docker-status widget, and either may be independently absent
 * from an otherwise-successful response — that per-field "not-configured"
 * decision belongs to each widget (T064/T065), not this service. This
 * service only distinguishes "no endpoint configured"
 * (`{ kind: 'not-configured' }`, no fetch attempted) from an actual
 * request outcome (`'ready'`/`'unavailable'`).
 */

const baseConfig: MonitoringSourceConfig = {
  endpointUrl: 'https://monitor.example.com/status',
  pollIntervalSeconds: 60,
  timeoutMs: 5000,
}

describe('parseMonitoringSnapshot', () => {
  it('parses a response with both host and containers', () => {
    const result = parseMonitoringSnapshot({
      host: { name: 'nas', status: 'up', cpuPercent: 12, memoryPercent: 40 },
      containers: [{ id: 'c1', name: 'web', status: 'running', uptimeSeconds: 120 }],
    })

    expect(result.host).toEqual({ name: 'nas', status: 'up', cpuPercent: 12, memoryPercent: 40 })
    expect(result.containers).toEqual([{ id: 'c1', name: 'web', status: 'running', uptimeSeconds: 120 }])
  })

  it('parses a host-only response, leaving containers undefined', () => {
    const result = parseMonitoringSnapshot({ host: { name: 'nas', status: 'degraded' } })

    expect(result.host).toEqual({ name: 'nas', status: 'degraded' })
    expect(result.containers).toBeUndefined()
  })

  it('parses a containers-only response, leaving host undefined', () => {
    const result = parseMonitoringSnapshot({
      containers: [{ id: 'c1', name: 'db', status: 'stopped', uptimeSeconds: 0 }],
    })

    expect(result.host).toBeUndefined()
    expect(result.containers).toEqual([{ id: 'c1', name: 'db', status: 'stopped', uptimeSeconds: 0 }])
  })

  it('omits cpuPercent/memoryPercent when absent rather than defaulting them to 0', () => {
    const result = parseMonitoringSnapshot({ host: { name: 'nas', status: 'up' } })

    expect(result.host).toEqual({ name: 'nas', status: 'up' })
  })

  it('ignores unknown/extra fields rather than failing to parse', () => {
    const result = parseMonitoringSnapshot({
      host: { name: 'nas', status: 'up', extra: 'ignored' },
      somethingElse: true,
    })

    expect(result.host).toEqual({ name: 'nas', status: 'up' })
  })

  it('drops a malformed host (invalid status) rather than throwing', () => {
    const result = parseMonitoringSnapshot({ host: { name: 'nas', status: 'sideways' } })

    expect(result.host).toBeUndefined()
  })

  it('drops individual malformed container entries without discarding valid ones', () => {
    const result = parseMonitoringSnapshot({
      containers: [
        { id: 'c1', name: 'web', status: 'running', uptimeSeconds: 10 },
        { id: 'c2', name: 'broken' },
      ],
    })

    expect(result.containers).toEqual([{ id: 'c1', name: 'web', status: 'running', uptimeSeconds: 10 }])
  })

  it('returns an empty snapshot for a completely malformed body, never throwing', () => {
    expect(parseMonitoringSnapshot(null)).toEqual({})
    expect(parseMonitoringSnapshot('not an object')).toEqual({})
    expect(parseMonitoringSnapshot([])).toEqual({})
  })
})

describe('fetchMonitoringSnapshot', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns not-configured without fetching when endpointUrl is null', async () => {
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await fetchMonitoringSnapshot({ ...baseConfig, endpointUrl: null })

    expect(result).toEqual({ kind: 'not-configured' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends a GET request to the configured endpoint', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    global.fetch = fetchSpy as unknown as typeof fetch

    await fetchMonitoringSnapshot(baseConfig)

    expect(fetchSpy).toHaveBeenCalledWith(
      baseConfig.endpointUrl,
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('returns ready with the parsed snapshot on a successful response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ host: { name: 'nas', status: 'up' } }),
    }) as unknown as typeof fetch

    const result = await fetchMonitoringSnapshot(baseConfig)

    expect(result).toEqual({ kind: 'ready', snapshot: { host: { name: 'nas', status: 'up' } } })
  })

  it('returns unavailable on a non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch

    const result = await fetchMonitoringSnapshot(baseConfig)

    expect(result).toEqual({ kind: 'unavailable' })
  })

  it('returns unavailable on a network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch

    const result = await fetchMonitoringSnapshot(baseConfig)

    expect(result).toEqual({ kind: 'unavailable' })
  })

  it('returns unavailable when the response body is not valid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('invalid json')),
    }) as unknown as typeof fetch

    const result = await fetchMonitoringSnapshot(baseConfig)

    expect(result).toEqual({ kind: 'unavailable' })
  })

  it('aborts and resolves to unavailable after timeoutMs, never hanging', async () => {
    global.fetch = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    }) as unknown as typeof fetch

    const resultPromise = fetchMonitoringSnapshot({ ...baseConfig, timeoutMs: 2000 })
    await vi.advanceTimersByTimeAsync(2000)

    await expect(resultPromise).resolves.toEqual({ kind: 'unavailable' })
  })
})
