import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'

const REDUCED_MOTION_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'always', label: 'Siempre' },
  { value: 'never', label: 'Nunca' },
]
const TRANSITION_SPEED_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Rápida' },
  { value: 'off', label: 'Desactivada' },
]

/** Animations group: reduced-motion mode + functional-transition speed dial. */
export function AnimationsSection() {
  const { animations, setAnimations } = useThemeState()

  return (
    <section className="settings-section" id="settings-section-animations" aria-label="Animaciones" tabIndex={-1}>
      <h3 className="settings-section__heading">Animaciones</h3>
      <GlassDropdown
        label="Movimiento reducido"
        options={REDUCED_MOTION_OPTIONS}
        value={animations.reducedMotion}
        onChange={(value) =>
          setAnimations({ ...animations, reducedMotion: value as typeof animations.reducedMotion })
        }
      />
      <GlassDropdown
        label="Velocidad de transición"
        options={TRANSITION_SPEED_OPTIONS}
        value={animations.transitionSpeed}
        onChange={(value) =>
          setAnimations({
            ...animations,
            transitionSpeed: value as typeof animations.transitionSpeed,
          })
        }
      />
    </section>
  )
}
