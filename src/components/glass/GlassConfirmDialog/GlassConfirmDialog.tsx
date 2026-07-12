import { GlassDialog } from '../GlassDialog/GlassDialog'
import { GlassButton } from '../GlassButton/GlassButton'
import './GlassConfirmDialog.css'

export interface GlassConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Generic confirm/cancel dialog built on `GlassDialog` — for destructive
 * actions (e.g. deleting a shortcut) that need an explicit confirmation
 * step before persisting. Deliberately not scoped to shortcuts so other
 * destructive flows (categories, widgets) can reuse it later.
 */
export function GlassConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: GlassConfirmDialogProps) {
  return (
    <GlassDialog open={open} onClose={onCancel} title={title}>
      <div className="glass-confirm-dialog">
        <p className="glass-confirm-dialog__message">{message}</p>
        <div className="glass-confirm-dialog__actions">
          <GlassButton type="button" variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </GlassButton>
          <GlassButton type="button" className="glass-confirm-dialog__confirm" onClick={onConfirm}>
            {confirmLabel}
          </GlassButton>
        </div>
      </div>
    </GlassDialog>
  )
}
