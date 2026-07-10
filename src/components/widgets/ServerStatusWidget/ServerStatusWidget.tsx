import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { useMonitoringSnapshot } from '../useMonitoringSnapshot'
import './ServerStatusWidget.css'

const NOT_CONFIGURED_MESSAGE = 'Set a monitoring endpoint in Settings to see server status.'
const UNAVAILABLE_MESSAGE = 'Server status is unavailable right now.'
const LOADING_MESSAGE = 'Loading server status…'

/**
 * Server-status widget: `loading`/`ready`/`unavailable`/`not-configured`
 * states, consuming the shared `useMonitoringSnapshot` poll.
 * `not-configured` also covers an otherwise-successful response missing
 * `host` (per contracts/monitoring-api-contract.md — `host`/`containers`
 * are independently optional), not only a missing endpoint.
 */
export function ServerStatusWidget() {
  const monitoring = useMonitoringSnapshot()

  if (monitoring.status === 'loading') {
    return <StatusMessage message={LOADING_MESSAGE} tone="notice" />
  }
  if (monitoring.status === 'not-configured') {
    return <StatusMessage message={NOT_CONFIGURED_MESSAGE} tone="notice" />
  }
  if (monitoring.status === 'unavailable') {
    return <StatusMessage message={UNAVAILABLE_MESSAGE} tone="notice" />
  }

  const host = monitoring.snapshot.host
  if (!host) {
    return <StatusMessage message={NOT_CONFIGURED_MESSAGE} tone="notice" />
  }

  return (
    <dl className="server-status-widget">
      <div className="server-status-widget__row">
        <dt>Host</dt>
        <dd>{host.name}</dd>
      </div>
      <div className="server-status-widget__row">
        <dt>Status</dt>
        <dd className={`server-status-widget__status server-status-widget__status--${host.status}`}>
          {host.status}
        </dd>
      </div>
      {host.cpuPercent !== undefined ? (
        <div className="server-status-widget__row">
          <dt>CPU</dt>
          <dd>{Math.round(host.cpuPercent)}%</dd>
        </div>
      ) : null}
      {host.memoryPercent !== undefined ? (
        <div className="server-status-widget__row">
          <dt>Memory</dt>
          <dd>{Math.round(host.memoryPercent)}%</dd>
        </div>
      ) : null}
    </dl>
  )
}
