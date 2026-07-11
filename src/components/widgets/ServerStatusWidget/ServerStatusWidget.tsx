import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { useMonitoringSnapshot } from '../useMonitoringSnapshot'
import './ServerStatusWidget.css'

const NOT_CONFIGURED_MESSAGE =
  'Configura un endpoint de monitorización en Configuración para ver el estado del servidor.'
const UNAVAILABLE_MESSAGE = 'El estado del servidor no está disponible en este momento.'
const LOADING_MESSAGE = 'Cargando estado del servidor…'

const HOST_STATUS_LABELS: Record<string, string> = {
  up: 'Activo',
  degraded: 'Degradado',
  down: 'Caído',
}

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
        <dt>Estado</dt>
        <dd className={`server-status-widget__status server-status-widget__status--${host.status}`}>
          {HOST_STATUS_LABELS[host.status] ?? host.status}
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
          <dt>Memoria</dt>
          <dd>{Math.round(host.memoryPercent)}%</dd>
        </div>
      ) : null}
    </dl>
  )
}
