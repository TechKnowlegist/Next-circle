import InitialsAvatar from './InitialsAvatar.jsx'

// A static, non-interactive recreation of the chat UI for the preview
// card below — same classes as the real thing (ServerSidebar/MessageView)
// so it actually looks like the product, not a mockup of it. No real
// data, no backend calls.
function PreviewCard() {
  return (
    <div className="nc-landing-preview">
      <div className="nc-landing-preview-sidebar">
        <p className="nc-landing-preview-server">Game Night</p>
        <div className="nc-landing-preview-channels">
          <span className="nc-channel active"># general</span>
          <span className="nc-channel"># clips</span>
          <span className="nc-channel">🔊 Lounge</span>
        </div>
      </div>
      <div className="nc-landing-preview-main">
        <p className="nc-landing-preview-title"># general</p>
        <div className="nc-message">
          <InitialsAvatar name="mika" size={28} />
          <div className="nc-message-body">
            <div className="nc-message-meta">
              <span className="nc-message-author">mika</span>
            </div>
            <div className="nc-message-content">anyone up for a match tonight?</div>
          </div>
        </div>
        <div className="nc-message">
          <InitialsAvatar name="jules" size={28} />
          <div className="nc-message-body">
            <div className="nc-message-meta">
              <span className="nc-message-author">jules</span>
            </div>
            <div className="nc-message-content">yeah, give me five minutes</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage({ onLogin, onGetStarted }) {
  return (
    <div className="nc-landing">
      <nav className="nc-landing-nav">
        <span className="nc-landing-logo">Next Circle</span>
        <button type="button" className="nc-btn nc-btn-text" onClick={onLogin}>
          Log In
        </button>
      </nav>

      <div className="nc-landing-hero">
        <div className="nc-landing-copy">
          <h1 className="nc-landing-headline">Your circle, in one place.</h1>
          <p className="nc-landing-sub">
            Servers, channels, and DMs — free, with the same account you already use on
            nextlayer3d.app. No separate sign-up.
          </p>
          <div className="nc-landing-actions">
            <button type="button" className="nc-btn nc-btn-primary nc-landing-cta" onClick={onGetStarted}>
              Get Started
            </button>
            <button type="button" className="nc-btn nc-btn-text" onClick={onLogin}>
              Already have an account?
            </button>
          </div>
        </div>
        <PreviewCard />
      </div>
    </div>
  )
}
