import { useRef, useState } from 'react'
import { THEME_PRESETS } from '../themePresets.js'
import {
  applyTheme, saveTheme,
  applyMode, saveMode,
  applyBackground, saveBackground, BACKGROUND_PRESETS, resizeImageToDataUrl,
} from '../theme.js'
import LightModeBanModal from './LightModeBanModal.jsx'

// Yapper's "tint the whole app" swatch grid, adapted to Next Circle's own
// two-variable (--accent-1/--accent-2) theming — picking a swatch applies
// instantly (same live-preview feel) and persists to localStorage. Just
// the picker, no backdrop/chrome, so it drops straight into
// SettingsScreen's "Appearance" pane.
export default function AppearanceSection() {
  const [customA, setCustomA] = useState('#22c55e')
  const [customB, setCustomB] = useState('#38bdf8')
  const [mode, setMode] = useState(() => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'))
  const [showBanModal, setShowBanModal] = useState(false)
  const [bgError, setBgError] = useState('')
  const bgInputRef = useRef(null)

  function pick(accent1, accent2) {
    applyTheme(accent1, accent2)
    saveTheme(accent1, accent2)
  }

  function applyCustom() {
    pick(customA, customB)
  }

  function switchToDark() {
    applyMode('dark')
    saveMode('dark')
    setMode('dark')
  }

  function requestLightMode() {
    setShowBanModal(true)
  }

  function confirmLightMode() {
    applyMode('light')
    saveMode('light')
    setMode('light')
    setShowBanModal(false)
  }

  function pickBackground(value) {
    applyBackground(value)
    saveBackground(value)
  }

  async function handleBackgroundUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBgError('')
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      pickBackground(`url(${dataUrl})`)
    } catch (err) {
      console.log('Next Circle — background upload failed:', err)
      setBgError('Could not use that image — try a different file.')
    }
  }

  return (
    <div>
      <p className="nc-appearance-label">Theme mode</p>
      <div className="nc-mode-row">
        <button
          type="button"
          className={mode === 'dark' ? 'nc-mode-btn active' : 'nc-mode-btn'}
          onClick={switchToDark}
        >
          🌙 Dark
        </button>
        <button
          type="button"
          className={mode === 'light' ? 'nc-mode-btn active' : 'nc-mode-btn'}
          onClick={requestLightMode}
        >
          ☀️ Light
        </button>
      </div>

      <p className="nc-appearance-label">Color theme — tints the whole app.</p>
      <div className="nc-swatch-grid">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="nc-swatch"
            title={preset.name}
            style={{ background: `linear-gradient(135deg, ${preset.accent1}, ${preset.accent2})` }}
            onClick={() => pick(preset.accent1, preset.accent2)}
          />
        ))}
      </div>

      <p className="nc-appearance-label">Custom — pick your own two colors.</p>
      <div className="nc-custom-theme">
        <input type="color" value={customA} onChange={(e) => setCustomA(e.target.value)} title="First color" />
        <input type="color" value={customB} onChange={(e) => setCustomB(e.target.value)} title="Second color" />
        <div className="nc-custom-preview" style={{ background: `linear-gradient(135deg, ${customA}, ${customB})` }} />
        <button type="button" className="nc-btn nc-btn-primary" onClick={applyCustom}>
          Apply
        </button>
      </div>

      <p className="nc-appearance-label">Background — shows behind your messages and channels.</p>
      <div className="nc-swatch-grid">
        {BACKGROUND_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className={preset.value ? 'nc-swatch nc-bg-swatch' : 'nc-swatch nc-bg-swatch nc-bg-swatch-none'}
            title={preset.name}
            style={preset.value ? { background: preset.value } : undefined}
            onClick={() => pickBackground(preset.value)}
          >
            {!preset.value && '✕'}
          </button>
        ))}
        <button type="button" className="nc-swatch nc-bg-swatch nc-bg-upload" onClick={() => bgInputRef.current?.click()}>
          +
        </button>
      </div>
      <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={handleBackgroundUpload} />
      {bgError && <p className="nc-profile-edit-error">{bgError}</p>}

      {showBanModal && (
        <LightModeBanModal onKeepDark={() => setShowBanModal(false)} onGoLight={confirmLightMode} />
      )}
    </div>
  )
}
