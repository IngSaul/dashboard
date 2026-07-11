import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { useMonitoringSnapshot } from '../useMonitoringSnapshot'
import './DockerStatusWidget.css'

const NOT_CONFIGURED_MESSAGE =
  'Configura un endpoint de monitorización en Configuración para ver los contenedores de Docker.'
const UNAVAILABLE_MESSAGE = 'El estado de los contenedores de Docker no está disponible en este momento.'
const LOADING_MESSAGE = 'Cargando contenedores de Docker…'
const NO_CONTAINERS_MESSAGE = 'No se encontraron contenedores.'

const CONTAINER_STATUS_LABELS: Record<string, string> = {
  running: 'En ejecución',
  stopped: 'Detenido',
  restarting: 'Reiniciando',
  unknown: 'Desconocido',
}

/**
 * Docker-container widget: same `loading`/`ready`/`unavailable`/
 * `not-configured` state contract as `ServerStatusWidget`, consuming the
 * same shared `useMonitoringSnapshot` poll but reading `containers`
 * instead of `host`. An empty `containers` array is a valid `ready` state
 * (the field is present, just empty) — distinct from `containers` being
 * absent entirely, which is `not-configured` per the contract.
 */
export function DockerStatusWidget() {
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

  const containers = monitoring.snapshot.containers
  if (!containers) {
    return <StatusMessage message={NOT_CONFIGURED_MESSAGE} tone="notice" />
  }
  if (containers.length === 0) {
    return <StatusMessage message={NO_CONTAINERS_MESSAGE} />
  }

  return (
    <ul className="docker-status-widget">
      {containers.map((container) => (
        <li key={container.id} className="docker-status-widget__item">
          <span className="docker-status-widget__name">{container.name}</span>
          <span
            className={`docker-status-widget__status docker-status-widget__status--${container.status}`}
          >
            {CONTAINER_STATUS_LABELS[container.status] ?? container.status}
          </span>
        </li>
      ))}
    </ul>
  )
}
