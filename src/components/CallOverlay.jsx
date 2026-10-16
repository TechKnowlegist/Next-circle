import { useEffect, useRef, useState } from 'react'
import InitialsAvatar from './InitialsAvatar.jsx'
import ringtoneUrl from '../assets/sounds/ringtone.mp3'
import messageToneUrl from '../assets/sounds/message-tone.mp3'

const REACTIONS = ['👍', '🎉', '😂', '❤️', '👏', '🔥']
const TEST_CALLER = { name: 'Test Caller' }

// A fake call end-to-end: ringing → accept/decline → an active-call window
// with mute/camera/screen-share/reaction controls, minimizable into a
// corner pill so the rest of the site stays usable. None of it actually
// captures a mic/camera or connects to anyone — it's UI-only, for trying
// out the call experience before any real calling backend exists.
export default function CallOverlay({ status, onAccept, onDecline, onEnd }) {
  const [minimized, setMinimized] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [sharingScreen, setSharingScreen] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [lastReaction, setLastReaction] = useState(null)

  const ringtoneRef = useRef(null)
  const toneRef = useRef(null)

  useEffect(() => {
    ringtoneRef.current = new Audio(ringtoneUrl)
    ringtoneRef.current.loop = true
    ringtoneRef.current.volume = 0.7
    toneRef.current = new Audio(messageToneUrl)
    toneRef.current.volume = 0.6
    return () => {
      ringtoneRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    const ringtone = ringtoneRef.current
    if (!ringtone) return
    if (status === 'incoming') {
      ringtone.currentTime = 0
      ringtone.play().catch(() => {})
    } else {
      ringtone.pause()
    }
  }, [status])

  useEffect(() => {
    if (status === 'idle') {
      setMinimized(false)
      setMuted(false)
      setCameraOn(true)
      setSharingScreen(false)
      setShowReactions(false)
      setLastReaction(null)
    }
  }, [status])

  function react(emoji) {
    toneRef.current?.play().catch(() => {})
    setLastReaction(emoji)
    setShowReactions(false)
    setTimeout(() => setLastReaction((current) => (current === emoji ? null : current)), 1600)
  }

  if (status === 'idle') return null

  if (status === 'incoming') {
    return (
      <div className="nc-call-backdrop">
        <div className="nc-call-incoming">
          <InitialsAvatar name={TEST_CALLER.name} size={88} />
          <h2>{TEST_CALLER.name}</h2>
          <p className="nc-call-sub">Incoming test call…</p>
          <div className="nc-call-incoming-actions">
            <button type="button" className="nc-call-btn nc-call-btn-decline" onClick={onDecline}>
              Decline
            </button>
            <button type="button" className="nc-call-btn nc-call-btn-accept" onClick={onAccept}>
              Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

  // status === 'active'
  if (minimized) {
    return (
      <button type="button" className="nc-call-pill" onClick={() => setMinimized(false)}>
        <InitialsAvatar name={TEST_CALLER.name} size={30} />
        <span>{TEST_CALLER.name}</span>
        {lastReaction && <span className="nc-call-pill-reaction">{lastReaction}</span>}
        <span
          className="nc-call-pill-end"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onEnd()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.stopPropagation()
              onEnd()
            }
          }}
        >
          ✕
        </span>
      </button>
    )
  }

  return (
    <div className="nc-call-active">
      <div className="nc-call-active-header">
        <InitialsAvatar name={TEST_CALLER.name} size={34} />
        <div>
          <strong>{TEST_CALLER.name}</strong>
          <p className="nc-call-sub">Test call — nothing is actually connected</p>
        </div>
        <button type="button" className="nc-call-minimize" onClick={() => setMinimized(true)} title="Minimize">
          ⤡
        </button>
      </div>

      {lastReaction && <div className="nc-call-reaction-toast">{lastReaction}</div>}

      <div className="nc-call-controls">
        <button
          type="button"
          className={muted ? 'nc-call-icon-btn nc-call-icon-off' : 'nc-call-icon-btn'}
          onClick={() => setMuted((m) => !m)}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🎤'}
        </button>
        <button
          type="button"
          className={cameraOn ? 'nc-call-icon-btn' : 'nc-call-icon-btn nc-call-icon-off'}
          onClick={() => setCameraOn((c) => !c)}
          title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {cameraOn ? '📷' : '📵'}
        </button>
        <button
          type="button"
          className={sharingScreen ? 'nc-call-icon-btn nc-call-icon-active' : 'nc-call-icon-btn'}
          onClick={() => setSharingScreen((s) => !s)}
          title={sharingScreen ? 'Stop sharing screen' : 'Share screen'}
        >
          🖥️
        </button>
        <div className="nc-call-reaction-wrap">
          <button
            type="button"
            className="nc-call-icon-btn"
            onClick={() => setShowReactions((s) => !s)}
            title="React"
          >
            😊
          </button>
          {showReactions && (
            <div className="nc-call-reaction-popover">
              {REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => react(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="nc-call-icon-btn nc-call-icon-end" onClick={onEnd} title="End call">
          📞
        </button>
      </div>
    </div>
  )
}
