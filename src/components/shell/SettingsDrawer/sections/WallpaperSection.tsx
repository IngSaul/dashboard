import { useRef, type ChangeEvent } from 'react'
import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'
import { GlassInput } from '../../../glass/GlassInput/GlassInput'
import type { BackgroundConfig } from '../../../../types/widgets'

const SOURCE_OPTIONS = [
  { value: 'default', label: 'Predeterminado' },
  { value: 'custom-url', label: 'URL personalizada' },
  { value: 'custom-upload', label: 'Subida personalizada' },
]

const DEFAULT_GRADIENT = { from: '#0f172a', to: '#1e293b', angleDeg: 135 }

/**
 * Wallpaper group (T079): source picker, blur, dim overlay, and an
 * optional gradient overlay — `BackgroundLayer` already renders whatever
 * `backgroundEngine.resolveBackground()` computes from this state; this
 * section only edits the persisted `BackgroundConfig`.
 */
export function WallpaperSection() {
  const { wallpaper, setWallpaper } = useThemeState()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const gradient = wallpaper.gradient

  function update(patch: Partial<BackgroundConfig>): void {
    setWallpaper({ ...wallpaper, ...patch })
  }

  function handleSourceChange(value: string): void {
    const source = value as BackgroundConfig['source']
    if (source === 'custom-upload') {
      fileInputRef.current?.click()
      return
    }
    update({ source, value: source === 'default' ? null : wallpaper.value })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        update({ source: 'custom-upload', value: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <section className="settings-section" id="settings-section-wallpaper" aria-label="Fondo de pantalla" tabIndex={-1}>
      <h3 className="settings-section__heading">Fondo de pantalla</h3>
      <GlassDropdown
        label="Origen"
        options={SOURCE_OPTIONS}
        value={wallpaper.source}
        onChange={handleSourceChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Subir imagen de fondo"
        onChange={handleFileChange}
      />
      {wallpaper.source === 'custom-url' ? (
        <GlassInput
          label="URL de la imagen"
          type="url"
          value={wallpaper.value ?? ''}
          placeholder="https://…"
          onChange={(event) => update({ value: event.target.value || null })}
        />
      ) : null}
      <label className="settings-section__row">
        Desenfoque ({wallpaper.blurPx}px)
        <input
          type="range"
          min={0}
          max={40}
          value={wallpaper.blurPx}
          onChange={(event) => update({ blurPx: Number(event.target.value) })}
        />
      </label>
      <label className="settings-section__row">
        Superposición de oscurecimiento ({Math.round(wallpaper.dimOverlay * 100)}%)
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={wallpaper.dimOverlay}
          onChange={(event) => update({ dimOverlay: Number(event.target.value) })}
        />
      </label>
      <label className="settings-section__row">
        <input
          type="checkbox"
          checked={gradient !== null}
          onChange={(event) => update({ gradient: event.target.checked ? DEFAULT_GRADIENT : null })}
        />
        Superposición de degradado
      </label>
      {gradient ? (
        <>
          <GlassInput
            label="Degradado desde"
            type="color"
            value={gradient.from}
            onChange={(event) => update({ gradient: { ...gradient, from: event.target.value } })}
          />
          <GlassInput
            label="Degradado hasta"
            type="color"
            value={gradient.to}
            onChange={(event) => update({ gradient: { ...gradient, to: event.target.value } })}
          />
        </>
      ) : null}
    </section>
  )
}
