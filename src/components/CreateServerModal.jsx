import { useState } from 'react'

const EMOJI_CHOICES = ['💬', '🎮', '🎨', '🎵', '📚', '🛠️', '🌐', '🧪']

export default function CreateServerModal({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(EMOJI_CHOICES[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await onCreate(name.trim(), icon)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create a Server</h2>
        <form onSubmit={handleSubmit} className="nc-auth-form">
          <input
            type="text"
            placeholder="Server name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            required
          />
          <div className="nc-icon-picker">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                type="button"
                className={icon === e ? 'nc-icon-choice active' : 'nc-icon-choice'}
                onClick={() => setIcon(e)}
              >
                {e}
              </button>
            ))}
          </div>
          {error && <p className="nc-auth-error">{error}</p>}
          <div className="nc-modal-actions">
            <button type="button" className="nc-btn nc-btn-text" onClick={onClose}>Cancel</button>
            <button type="submit" className="nc-btn nc-btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
