import { lazy, Suspense, type ComponentType } from 'react'
import { WIDGET_CATALOG } from '../../../config/widgets'
import { usePluginState } from '../../../state/PluginProvider'
import { defaultWidgetRegistry } from '../../../services/widgetRegistry'
import { GlassCard } from '../../glass/GlassCard/GlassCard'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { WidgetErrorBoundary } from './WidgetErrorBoundary'
import type { Widget, WidgetProps, WidgetType } from '../../../types/widgets'
import './WidgetSlot.css'

export interface WidgetSlotProps {
  widget: Widget
}

/**
 * One lazy component per `WidgetType`, created exactly once at module load
 * (never during render — components created during render remount and lose
 * state every time a fresh `lazy()` result reaches JSX). Reads
 * `defaultWidgetRegistry.lazyLoad` directly (the same underlying service
 * `PluginState.lazyLoad` wraps with no extra logic) since this cache must
 * exist before any component ever renders.
 */
const lazyComponentsByType = new Map<WidgetType, ComponentType<WidgetProps>>(
  WIDGET_CATALOG.map((type) => [
    type,
    lazy(() => defaultWidgetRegistry.lazyLoad(type).then((resolved) => ({ default: resolved }))),
  ]),
)

/**
 * Resolves and renders a single `Widget` instance through `widgetRegistry`
 * (via the cache above) — never a direct per-type import/switch, per the UI
 * contract's Widget Registry rule. Wrapped in the shared `GlassCard`
 * material and an error boundary so one widget's failure/slow response can
 * never affect the rest of the grid.
 */
export function WidgetSlot({ widget }: WidgetSlotProps) {
  const { getMetadata } = usePluginState()
  const LazyComponent = lazyComponentsByType.get(widget.type)
  const displayName = getMetadata(widget.type)?.displayName ?? widget.type

  if (!LazyComponent) {
    return null
  }

  return (
    <GlassCard
      as="section"
      className="widget-slot"
      aria-label={displayName}
      data-widget-type={widget.type}
    >
      <WidgetErrorBoundary>
        <Suspense fallback={<StatusMessage message="Loading…" />}>
          {/* eslint-disable-next-line react-hooks/static-components -- `LazyComponent` is a stable, module-scope-cached lookup (see `lazyComponentsByType` above), not created per render; the linter can't see through the Map lookup to that. */}
          <LazyComponent widget={widget} />
        </Suspense>
      </WidgetErrorBoundary>
    </GlassCard>
  )
}
