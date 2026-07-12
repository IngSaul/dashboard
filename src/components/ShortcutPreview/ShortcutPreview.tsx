import { ShortcutIcon } from '../ShortcutIcon/ShortcutIcon'
import type { Shortcut } from '../../types/dashboard'
import './ShortcutPreview.css'

export interface ShortcutPreviewProps {
  label: string
  url: string
  /** Preserves a manually-chosen icon override while editing, same as `ShortcutCard`. */
  icon?: Shortcut['icon']
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname || null
  } catch {
    return null
  }
}

/**
 * Live icon + name + hostname preview shown inside `EditShortcutModal` as
 * the user edits — built on the same `ShortcutIcon` `ShortcutCard` uses, so
 * the preview always matches what the card will actually render after save.
 */
export function ShortcutPreview({ label, url, icon }: ShortcutPreviewProps) {
  const hostname = hostnameOf(url)

  return (
    <div className="shortcut-preview">
      <ShortcutIcon shortcut={{ url, icon }} className="shortcut-preview__icon" />
      <div className="shortcut-preview__text">
        <span className="shortcut-preview__label">{label || 'Sin nombre'}</span>
        <span className="shortcut-preview__url">{hostname ?? (url || 'Sin URL')}</span>
      </div>
    </div>
  )
}
