import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'

const REDUCED_MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'always', label: 'Always' },
  { value: 'never', label: 'Never' },
]
const TRANSITION_SPEED_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'fast', label: 'Fast' },
  { value: 'off', label: 'Off' },
]

/** Animations group: reduced-motion mode + functional-transition speed dial. */
export function AnimationsSection() {
  const { animations, setAnimations } = useThemeState()

  return (
    <section className="settings-section" id="settings-section-animations" aria-label="Animations" tabIndex={-1}>
      <h3 className="settings-section__heading">Animations</h3>
      <GlassDropdown
        label="Reduced motion"
        options={REDUCED_MOTION_OPTIONS}
        value={animations.reducedMotion}
        onChange={(value) =>
          setAnimations({ ...animations, reducedMotion: value as typeof animations.reducedMotion })
        }
      />
      <GlassDropdown
        label="Transition speed"
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
