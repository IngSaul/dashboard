import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { resolveShortcutIcon } from '../../services/iconResolver'
import type { Shortcut } from '../../types/dashboard'

export interface ShortcutIconProps {
  shortcut: { url: string; icon?: Shortcut['icon'] | undefined }
  className?: string
}

/**
 * Renders a shortcut's icon with no layout difference by provider (UI
 * contract's Icon System section). A manually-chosen `lucide`/`custom-svg`
 * icon (set via the shortcut editor) always wins, since that's an explicit
 * user override; everything else is derived fresh from the shortcut's URL
 * via `iconResolver` on every render — real colored brand icon when the
 * destination is recognized, generic Globe glyph otherwise.
 *
 * Shared by `ShortcutCard` (the launch grid) and `ShortcutPreview` (the
 * edit modal's live preview) so both stay in sync automatically.
 */
export function ShortcutIcon({ shortcut, className = 'shortcut-card__icon' }: ShortcutIconProps) {
  const icon = shortcut.icon

  if (icon && (icon.provider === 'lucide' || icon.provider === 'custom-svg')) {
    return icon.provider === 'lucide' ? (
      <span className={className} data-icon-provider="lucide" aria-hidden="true">
        <DynamicIcon name={icon.value as IconName} />
      </span>
    ) : (
      <span
        className={className}
        data-icon-provider="custom-svg"
        aria-hidden="true"
        // custom-svg has no authoring UI yet (a future task), so this path
        // isn't reachable from user input in this feature.
        dangerouslySetInnerHTML={{ __html: icon.value }}
      />
    )
  }

  const resolved = resolveShortcutIcon(shortcut.url)
  return (
    <span
      className={className}
      data-icon-provider={resolved.match}
      style={{ color: resolved.color }}
      title={resolved.label}
      aria-hidden="true"
    >
      {resolved.svg ? (
        <span dangerouslySetInnerHTML={{ __html: resolved.svg }} />
      ) : resolved.Icon ? (
        <resolved.Icon color={resolved.color} />
      ) : null}
    </span>
  )
}
