import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'
import { GlassInput } from '../../../glass/GlassInput/GlassInput'

const FOCUS_RING_OPTIONS = [
  { value: 'default', label: 'Predeterminado' },
  { value: 'high-visibility', label: 'Alta visibilidad' },
]

/** Accessibility group: contrast boost, focus ring style, and font scale — extends feature 001's existing accessibility support. */
export function AccessibilitySection() {
  const { accessibility, setAccessibility } = useThemeState()

  return (
    <section className="settings-section" id="settings-section-accessibility" aria-label="Accesibilidad" tabIndex={-1}>
      <h3 className="settings-section__heading">Accesibilidad</h3>
      <label className="settings-section__row">
        <input
          type="checkbox"
          checked={accessibility.contrastBoost}
          onChange={(event) =>
            setAccessibility({ ...accessibility, contrastBoost: event.target.checked })
          }
        />
        Aumentar contraste
      </label>
      <GlassDropdown
        label="Estilo del foco"
        options={FOCUS_RING_OPTIONS}
        value={accessibility.focusRingStyle}
        onChange={(value) =>
          setAccessibility({
            ...accessibility,
            focusRingStyle: value as typeof accessibility.focusRingStyle,
          })
        }
      />
      <GlassInput
        label="Escala de fuente"
        type="number"
        min={0.9}
        max={1.5}
        step={0.1}
        value={accessibility.fontScale}
        onChange={(event) =>
          setAccessibility({ ...accessibility, fontScale: Number(event.target.value) })
        }
      />
    </section>
  )
}
