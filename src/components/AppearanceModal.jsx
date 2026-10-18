import { useState } from 'react'
import { THEME_PRESETS } from '../themePresets.js'
import { applyTheme, saveTheme } from '../theme.js'

// Yapper's "tint the whole app" swatch grid, adapted to Next Circle's own
// two-variable (--accent-1/--accent-2) theming — picking a swatch applies
// instantly (same live-preview feel) and persists to localStorage.
export default function AppearanceModal({ onClose }) {
  const [customA, setCustomA] = useState('#22c55e')
  const [customB, setCustomB] = useState('#38bdf8')

  function pick(accent1, accent2) {
    applyTheme(accent1, accent2)
    saveTheme(accent1, accent2)
  }

  function applyCustom() {
    pick(customA, customB)
  }

  return (
    <div className="nc-call-backdrop" onClick={onClose}>
      <div className="nc-appearance" onClick={(e) => e.stopPropagation()}>
        <div className="nc-appearance-header">
          <h2>Appearance</h2>
          <button type="button" className="nc-profile-close" onClick={onClose} title="Close">
            ✕
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
      </div>
    </div>
  )
}
