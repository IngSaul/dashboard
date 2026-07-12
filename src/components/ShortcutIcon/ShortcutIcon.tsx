import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { resolveShortcutIcon } from '../../services/iconResolver'
import type { Shortcut } from '../../types/dashboard'

export interface ShortcutIconProps {
  shortcut: { url: string; icon?: Shortcut['icon'] | undefined }
  className?: string
}

/**
 * Renders a shortcut's icon with no layout difference by provider (UI
 * contract's Icon System section). If `shortcut.icon` has already been
 * resolved (`iconProvider.resolveIcon`, run in the background on every
 * create/edit and cached onto the shortcut), that result always wins and
 * is rendered per its `provider` — a manual `lucide`/`custom-svg` choice,
 * an embedded `simple-icons` SVG, a live `favicon` image, or `fallback`
 * initials text. Only when no `icon` is cached yet (freshly created,
 * resolution still in flight) does this fall back to `iconResolver`'s
 * small synchronous curated-brand map, so the card still shows something
 * reasonable for the brief window before the real resolution lands.
 *
 * Shared by `ShortcutCard` (the launch grid) and `ShortcutPreview` (the
 * edit modal's live preview) so both stay in sync automatically.
 */
export function ShortcutIcon({ shortcut, className = 'shortcut-card__icon' }: ShortcutIconProps) {
  const icon = shortcut.icon

  if (icon) {
    switch (icon.provider) {
      case 'lucide':
        return (
          <span className={className} data-icon-provider="lucide" aria-hidden="true">
            <DynamicIcon name={icon.value as IconName} />
          </span>
        )
      case 'custom-svg':
      case 'simple-icons':
        return (
          <span
            className={className}
            data-icon-provider={icon.provider}
            aria-hidden="true"
            // custom-svg has no authoring UI yet (a future task), so that
            // path isn't reachable from user input in this feature yet;
            // simple-icons SVGs ship with no explicit fill/color applied.
            dangerouslySetInnerHTML={{ __html: icon.value }}
          />
        )
      case 'favicon':
        return (
          <span className={className} data-icon-provider="favicon" aria-hidden="true">
            <img src={icon.value} alt="" />
          </span>
        )
      case 'fallback':
        return (
          <span className={className} data-icon-provider="fallback" aria-hidden="true">
            {icon.value}
          </span>
        )
    }
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
