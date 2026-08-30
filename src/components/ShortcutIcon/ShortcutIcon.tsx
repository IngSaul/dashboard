import { lazy, Suspense } from 'react'
import type { IconName } from 'lucide-react/dynamic'
import { getBrandSvgBySlug, resolveShortcutIcon } from '../../services/iconResolver'
import { isSafeResourceUrl } from '../../utils/validation'
import type { Shortcut } from '../../types/dashboard'

/**
 * Loaded on demand, because `lucide-react/dynamic` carries a map from every
 * icon name to its own chunk — 1,742 entries, about 119 kB, which measured
 * at 36% of the shortcuts chunk when imported eagerly.
 *
 * Nothing in the app currently *produces* a `lucide` icon: `resolveIcon`
 * only returns one for an explicit `manualChoice`, and no UI passes one. So
 * that map was downloaded by everyone to serve a branch almost nobody
 * reaches. Deleting the provider would break any configuration that does
 * carry one, and unlike the removed `custom-svg` there is nothing unsafe
 * about an icon *name* — so it stays, and simply costs nothing until used.
 *
 * The type import above is erased at build time and pulls in no runtime code.
 */
const LucideIcon = lazy(async () => {
  const { DynamicIcon } = await import('lucide-react/dynamic')
  return { default: DynamicIcon }
})

export interface ShortcutIconProps {
  shortcut: { url: string; icon?: Shortcut['icon'] | undefined }
  className?: string
}

/**
 * Renders a shortcut's icon with no layout difference by provider (UI
 * contract's Icon System section). If `shortcut.icon` has already been
 * resolved (`iconProvider.resolveIcon`, run in the background on every
 * create/edit and cached onto the shortcut), that result always wins and
 * is rendered per its `provider` — a manual `lucide` choice, a bundled
 * `simple-icons` brand mark, a live `favicon` image, or `fallback`
 * initials text. Only when no `icon` is cached yet (freshly created,
 * resolution still in flight) does this fall back to `iconResolver`'s
 * small synchronous curated-brand map, so the card still shows something
 * reasonable for the brief window before the real resolution lands.
 *
 * Security note (the audit's TD-06): the persisted `icon.value` is never
 * markup. A `simple-icons` icon names a slug, and the markup comes from
 * `getBrandSvgBySlug` — i.e. from what this build statically bundled — so
 * `dangerouslySetInnerHTML` below can only ever receive trusted strings,
 * whatever a stored configuration says. An unrecognised slug renders the
 * URL-derived fallback rather than anything supplied by the config.
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
            {/* No fallback: an icon that appears a frame late is better than
                a placeholder that shifts the card's layout twice. */}
            <Suspense fallback={null}>
              <LucideIcon name={icon.value as IconName} />
            </Suspense>
          </span>
        )
      case 'simple-icons': {
        const svg = getBrandSvgBySlug(icon.value)
        if (svg !== null) {
          return (
            <span
              className={className}
              data-icon-provider="simple-icons"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )
        }
        break
      }
      case 'favicon':
        // A stored favicon URL is still a URL from an untrusted document;
        // anything but http(s) here would be a `data:`/`javascript:` payload
        // wearing an `<img src>`.
        if (isSafeResourceUrl(icon.value)) {
          return (
            <span className={className} data-icon-provider="favicon" aria-hidden="true">
              <img src={icon.value} alt="" />
            </span>
          )
        }
        break
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
        // Bundled brand markup from `iconResolver`, never persisted data.
        <span dangerouslySetInnerHTML={{ __html: resolved.svg }} />
      ) : resolved.Icon ? (
        <resolved.Icon color={resolved.color} />
      ) : null}
    </span>
  )
}
