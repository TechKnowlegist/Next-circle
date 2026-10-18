// A joke "ban" screen that pops up before actually switching to light
// mode — requested as a bit, not a real moderation action. Nothing here
// touches any account, role, or server; it's purely client-side theater
// gating a CSS attribute flip.
export default function LightModeBanModal({ onKeepDark, onGoLight }) {
  return (
    <div className="nc-call-backdrop">
      <div className="nc-ban-modal">
        <p className="nc-ban-emoji">⚠️</p>
        <h2>You've been banned</h2>
        <p className="nc-ban-reason">Reason: turned on light mode</p>
        <p className="nc-ban-sub">Just kidding. …Or am I?</p>
        <div className="nc-ban-actions">
          <button type="button" className="nc-btn nc-btn-primary" onClick={onKeepDark}>
            Keep it dark
          </button>
          <button type="button" className="nc-btn nc-btn-text" onClick={onGoLight}>
            Go to the light side
          </button>
        </div>
      </div>
    </div>
  )
}
