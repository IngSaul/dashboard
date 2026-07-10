import { useEffect, useState } from 'react'
import { loadDashboardConfig } from '../../services/configStore'
import { fetchMonitoringSnapshot } from '../../services/monitoring'
import type { MonitoringSnapshot } from '../../services/monitoring'

export type MonitoringWidgetState =
  | { status: 'loading' }
  | { status: 'not-configured' }
  | { status: 'unavailable' }
  | { status: 'ready'; snapshot: MonitoringSnapshot }

/**
 * Polls the shared `MonitoringSourceConfig` endpoint on
 * `pollIntervalSeconds`, independent of every other widget (UI contract's
 * Per-Widget Contract). Shared by `ServerStatusWidget`/`DockerStatusWidget`
 * since both need identical fetch/poll/timeout orchestration over the same
 * single-endpoint config — they differ only in which field of the
 * resulting snapshot they read and how they render it.
 */
export function useMonitoringSnapshot(): MonitoringWidgetState {
  const [state, setState] = useState<MonitoringWidgetState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    function poll() {
      const config = loadDashboardConfig().monitoringSourceConfig
      void fetchMonitoringSnapshot(config).then((result) => {
        if (cancelled) {
          return
        }
        if (result.kind === 'ready') {
          setState({ status: 'ready', snapshot: result.snapshot })
        } else {
          setState({ status: result.kind })
        }
        timeoutId = setTimeout(poll, config.pollIntervalSeconds * 1000)
      })
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [])

  return state
}
