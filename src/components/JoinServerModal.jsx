import { useState } from 'react'

export default function JoinServerModal({ onJoin, onClose }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await onJoin(code.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join that server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Join a Server</h2>
        <form onSubmit={handleSubmit} className="nc-auth-form">
          <input
            type="text"
            placeholder="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
            autoFocus
            required
          />
          {error && <p className="nc-auth-error">{error}</p>}
          <div className="nc-modal-actions">
            <button type="button" className="nc-btn nc-btn-text" onClick={onClose}>Cancel</button>
            <button type="submit" className="nc-btn nc-btn-primary" disabled={busy}>
              {busy ? 'Joining…' : 'Join'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
