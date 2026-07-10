import { useEffect, useId, useRef, type ReactNode } from 'react'
import './GlassDialog.css'

export interface GlassDialogProps {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
}

/**
 * Modal glass surface built on the native `<dialog>` element: focus
 * trapping, `Escape`-to-close, and top-layer stacking (above every other
 * `Glass*` surface, including `GlassDropdown`/`GlassTooltip`) come from the
 * browser instead of hand-rolled JS. `--z-dialog` is still applied as a
 * defensive fallback for engines without top-layer support.
 */
export function GlassDialog({ open, onClose, title, children }: GlassDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="glass-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <h2 id={titleId} className="glass-dialog__title">
        {title}
      </h2>
      <div className="glass-dialog__body">{children}</div>
    </dialog>
  )
}
