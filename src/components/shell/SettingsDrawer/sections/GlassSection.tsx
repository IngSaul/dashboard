import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'

const INTENSITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
]
const BORDER_OPTIONS = [
  { value: 'subtle', label: 'Sutil' },
  { value: 'visible', label: 'Visible' },
]

/**
 * Glass group: intensity/border-strength presets only — never arbitrary
 * blur/opacity values, per the UI contract's "one material" rule. Persists
 * immediately. Known gap: `GlassPanel.css` today hardcodes
 * `--glass-fill-medium`/`--glass-blur-medium` regardless of this setting —
 * the visual wiring from `ThemeState.glass` into actual rendered CSS
 * output doesn't exist yet. Flagging it rather than silently expanding
 * this task to also rework every `Glass*` component's stylesheet.
 */
export function GlassSection() {
  const { glass, setGlass } = useThemeState()

  return (
    <section className="settings-section" id="settings-section-glass" aria-label="Vidrio" tabIndex={-1}>
      <h3 className="settings-section__heading">Vidrio</h3>
      <GlassDropdown
        label="Intensidad"
        options={INTENSITY_OPTIONS}
        value={glass.intensity}
        onChange={(value) => setGlass({ ...glass, intensity: value as typeof glass.intensity })}
      />
      <GlassDropdown
        label="Grosor del borde"
        options={BORDER_OPTIONS}
        value={glass.borderStrength}
        onChange={(value) =>
          setGlass({ ...glass, borderStrength: value as typeof glass.borderStrength })
        }
      />
    </section>
  )
}
