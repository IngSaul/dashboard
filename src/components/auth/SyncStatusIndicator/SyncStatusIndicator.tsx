import { CloudOff, GitCompareArrows, RefreshCw } from 'lucide-react'
import { useAuthState } from '../../../state/AuthProvider'
import { GlassPanel } from '../../glass/GlassPanel/GlassPanel'
import './SyncStatusIndicator.css'

/**
 * The visible half of "a persistence failure is never discarded silently".
 *
 * Renders nothing at all while syncing is healthy — including during a
 * normal `saving`, which is the common case and not worth a badge that
 * flickers on every change (Constitution V: dense, no decorative motion).
 * It appears only when this tab's copy of the dashboard and the server's
 * have come apart, which the user would otherwise have no way to know:
 *
 * - `retrying`/`error` — the change has not landed yet, or has stopped
 *   being attempted. Offering "retry" is the useful action.
 * - `conflict` — somebody else (another tab, another device) saved first,
 *   or this tab never established what its copy is based on. Retrying is
 *   precisely the wrong thing here: it would overwrite the newer state.
 *   The only safe resolution is to load what the server actually has, so
 *   that is the only action offered.
 */
export function SyncStatusIndicator() {
  const { syncState, retrySync } = useAuthState()

  const { status } = syncState
  // The specific reason belongs in a tooltip, not the sentence: the message
  // has to stay readable for someone who just wants to know whether their
  // changes are safe, while still being available to anyone diagnosing it.
  const reason = syncState.lastFailure?.detail

  if (status === 'idle' || status === 'saving') {
    return null
  }

  if (status === 'conflict') {
    return (
      <div className="sync-status" role="status" aria-live="polite">
        <GlassPanel className="sync-status__panel" data-state="conflict" title={reason}>
          <GitCompareArrows className="sync-status__icon" aria-hidden="true" />
          <span className="sync-status__message">
            Esta pestaña está desactualizada: tu configuración cambió en otro sitio. Recarga para ver
            la versión actual.
          </span>
          <button
            type="button"
            className="sync-status__retry"
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </GlassPanel>
      </div>
    )
  }

  const retrying = status === 'retrying'

  return (
    <div className="sync-status" role="status" aria-live="polite">
      <GlassPanel className="sync-status__panel" data-state={status} title={reason}>
        {retrying ? (
          <RefreshCw className="sync-status__icon sync-status__icon--spin" aria-hidden="true" />
        ) : (
          <CloudOff className="sync-status__icon" aria-hidden="true" />
        )}
        <span className="sync-status__message">
          {retrying
            ? 'Guardando cambios… sin conexión con el servidor.'
            : 'No se pudieron guardar tus cambios. Siguen en esta pestaña.'}
        </span>
        {retrying ? null : (
          <button type="button" className="sync-status__retry" onClick={retrySync}>
            Reintentar
          </button>
        )}
      </GlassPanel>
    </div>
  )
}
