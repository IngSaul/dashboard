import { useMemo, useState, type ChangeEvent } from 'react'
import { usePluginState } from '../../state/PluginProvider'
import { useWorkspaceState } from '../../state/WorkspaceProvider'
import { GlassDropdown } from '../glass/GlassDropdown/GlassDropdown'
import { GlassInput } from '../glass/GlassInput/GlassInput'
import { loadDashboardConfig, saveDashboardConfig } from '../../services/configStore'
import type { MonitoringSourceConfig, WidgetColumn, WidgetType } from '../../types/widgets'
import './WidgetSettings.css'

const COLUMN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

/**
 * Lists every registered widget type with enable/disable, column
 * assignment, and move up/down reordering controls (UI contract's Widget
 * Settings Surface). Every control is a native `<input>`/`<button>` —
 * already keyboard-operable via Tab + Enter/Space without a
 * roving-tabindex layer, mirroring `ShortcutCard`'s existing move up/down
 * buttons (which use the same plain-button pattern for the same
 * requirement). Every change calls straight into `WorkspaceState`, which
 * persists synchronously — no separate save step (T081).
 *
 * Also exposes the shared monitoring-source endpoint configuration (T080)
 * once, when at least one of `server-status`/`docker-status` is
 * registered — both widget types read the same single
 * `MonitoringSourceConfig`, so it's one section, not duplicated per row.
 */
export function WidgetSettings() {
  const { registeredTypes, getMetadata } = usePluginState()
  const { widgetLayout, setWidgetEnabled, setWidgetColumn, moveWidgetInColumn } = useWorkspaceState()

  const widgetsByType = useMemo(
    () => new Map(widgetLayout.widgets.map((widget) => [widget.type, widget])),
    [widgetLayout],
  )

  function columnNeighbors(type: WidgetType): { canMoveUp: boolean; canMoveDown: boolean } {
    const widget = widgetsByType.get(type)
    if (!widget) {
      return { canMoveUp: false, canMoveDown: false }
    }
    const columnTypes = widgetLayout.widgets
      .filter((entry) => entry.column === widget.column)
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.type)
    const index = columnTypes.indexOf(type)
    return { canMoveUp: index > 0, canMoveDown: index < columnTypes.length - 1 }
  }

  const showMonitoringSection =
    registeredTypes.includes('server-status') || registeredTypes.includes('docker-status')

  return (
    <div className="widget-settings">
      <h3 className="widget-settings__heading">Widgets</h3>
      <ul className="widget-settings__list">
        {registeredTypes.map((type) => {
          const widget = widgetsByType.get(type)
          const displayName = getMetadata(type)?.displayName ?? type
          const { canMoveUp, canMoveDown } = columnNeighbors(type)
          return (
            <li key={type} className="widget-settings__row">
              <label className="widget-settings__toggle">
                <input
                  type="checkbox"
                  checked={widget?.enabled ?? false}
                  onChange={(event) => setWidgetEnabled(type, event.target.checked)}
                />
                {displayName}
              </label>
              <GlassDropdown
                label={`${displayName} column`}
                options={COLUMN_OPTIONS}
                value={widget?.column ?? 'center'}
                onChange={(value) => setWidgetColumn(type, value as WidgetColumn)}
              />
              <div className="widget-settings__move">
                <button
                  type="button"
                  aria-label={`Move ${displayName} up`}
                  disabled={!canMoveUp}
                  onClick={() => moveWidgetInColumn(type, 'up')}
                >
                  Up
                </button>
                <button
                  type="button"
                  aria-label={`Move ${displayName} down`}
                  disabled={!canMoveDown}
                  onClick={() => moveWidgetInColumn(type, 'down')}
                >
                  Down
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {showMonitoringSection ? <MonitoringSourceSettings /> : null}
    </div>
  )
}

/** Endpoint/poll-interval/timeout fields for the shared `MonitoringSourceConfig` (T080) — reads/writes directly through `configStore` since, like `weatherPreference`, no state slice owns it. */
function MonitoringSourceSettings() {
  const [config, setConfig] = useState<MonitoringSourceConfig>(
    () => loadDashboardConfig().monitoringSourceConfig,
  )

  function update(patch: Partial<MonitoringSourceConfig>): void {
    const next = { ...config, ...patch }
    setConfig(next)
    const fullConfig = loadDashboardConfig()
    saveDashboardConfig({ ...fullConfig, monitoringSourceConfig: next })
  }

  return (
    <div className="widget-settings__monitoring">
      <h3 className="widget-settings__heading">Monitoring endpoint</h3>
      <GlassInput
        label="Endpoint URL"
        type="url"
        value={config.endpointUrl ?? ''}
        placeholder="https://…"
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          update({ endpointUrl: event.target.value || null })
        }
      />
      <GlassInput
        label="Poll interval (seconds)"
        type="number"
        min={10}
        max={3600}
        value={config.pollIntervalSeconds}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          update({ pollIntervalSeconds: Number(event.target.value) })
        }
      />
      <GlassInput
        label="Timeout (ms)"
        type="number"
        min={500}
        max={30000}
        value={config.timeoutMs}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          update({ timeoutMs: Number(event.target.value) })
        }
      />
    </div>
  )
}
