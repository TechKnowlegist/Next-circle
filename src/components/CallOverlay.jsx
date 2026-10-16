import { useEffect, useRef, useState } from 'react'
import InitialsAvatar from './InitialsAvatar.jsx'
import ringtoneUrl from '../assets/sounds/ringtone.mp3'
import messageToneUrl from '../assets/sounds/message-tone.mp3'
import muteOnUrl from '../assets/sounds/sfx/mute_on.mp3'
import muteOffUrl from '../assets/sounds/sfx/mute_off.mp3'
import cameraOnUrl from '../assets/sounds/sfx/camera_on.mp3'
import cameraOffUrl from '../assets/sounds/sfx/camera_off.mp3'
import screenShareStartUrl from '../assets/sounds/sfx/screenshare_start.mp3'
import screenShareStopUrl from '../assets/sounds/sfx/screenshare_stop.mp3'
import callJoinLeaveUrl from '../assets/sounds/sfx/call_join_leave.mp3'
import {
  MicIcon, MicOffIcon, CameraIcon, CameraOffIcon, ScreenShareIcon,
  PhoneEndIcon, MinimizeIcon, ReactionIcon,
} from './CallIcons.jsx'

const REACTIONS = ['👍', '🎉', '😂', '❤️', '👏', '🔥']
const TEST_CALLER = { name: 'Test Caller' }

const SFX_URLS = {
  muteOn: muteOnUrl,
  muteOff: muteOffUrl,
  cameraOn: cameraOnUrl,
  cameraOff: cameraOffUrl,
  screenShareStart: screenShareStartUrl,
  screenShareStop: screenShareStopUrl,
  joinLeave: callJoinLeaveUrl,
}

// A fake call end-to-end: ringing → accept/decline → a big, centered active
// call window with mute/camera/screen-share/reaction controls, each with
// its own distinct sound effect, minimizable into a corner pill so the
// rest of the site stays usable. None of it actually captures a
// mic/camera or connects to anyone — it's UI-only, for trying out the
// call experience before any real calling backend exists.
export default function CallOverlay({ status, onAccept, onDecline, onEnd }) {
  const [minimized, setMinimized] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [sharingScreen, setSharingScreen] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [lastReaction, setLastReaction] = useState(null)

  const ringtoneRef = useRef(null)
  const toneRef = useRef(null)
  const sfxRefs = useRef({})
  const wasActive = useRef(false)

  useEffect(() => {
    ringtoneRef.current = new Audio(ringtoneUrl)
    ringtoneRef.current.loop = true
    ringtoneRef.current.volume = 0.7
    toneRef.current = new Audio(messageToneUrl)
    toneRef.current.volume = 0.6
    for (const [key, url] of Object.entries(SFX_URLS)) {
      const audio = new Audio(url)
      audio.volume = 0.55
      sfxRefs.current[key] = audio
    }
    return () => {
      ringtoneRef.current?.pause()
    }
  }, [])

  function playSfx(key) {
    const audio = sfxRefs.current[key]
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

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

  // Join/leave chime — fires the moment the call actually becomes active
  // (accept) and the moment it stops being active (end), not on decline
  // (which never joined in the first place).
  useEffect(() => {
    if (status === 'active' && !wasActive.current) {
      playSfx('joinLeave')
      wasActive.current = true
    } else if (status !== 'active' && wasActive.current) {
      playSfx('joinLeave')
      wasActive.current = false
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

  function toggleMuted() {
    setMuted((m) => {
      playSfx(m ? 'muteOff' : 'muteOn')
      return !m
    })
  }

  function toggleCamera() {
    setCameraOn((c) => {
      playSfx(c ? 'cameraOff' : 'cameraOn')
      return !c
    })
  }

  function toggleScreenShare() {
    setSharingScreen((s) => {
      playSfx(s ? 'screenShareStop' : 'screenShareStart')
      return !s
    })
  }

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
  const controls = (
    <div className="nc-call-controls">
      <button
        type="button"
        className={muted ? 'nc-call-icon-btn nc-call-icon-off' : 'nc-call-icon-btn'}
        onClick={toggleMuted}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <MicOffIcon /> : <MicIcon />}
      </button>
      <button
        type="button"
        className={cameraOn ? 'nc-call-icon-btn' : 'nc-call-icon-btn nc-call-icon-off'}
        onClick={toggleCamera}
        title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
      >
        {cameraOn ? <CameraIcon /> : <CameraOffIcon />}
      </button>
      <button
        type="button"
        className={sharingScreen ? 'nc-call-icon-btn nc-call-icon-active' : 'nc-call-icon-btn'}
        onClick={toggleScreenShare}
        title={sharingScreen ? 'Stop sharing screen' : 'Share screen'}
      >
        <ScreenShareIcon />
      </button>
      <div className="nc-call-reaction-wrap">
        <button
          type="button"
          className="nc-call-icon-btn"
          onClick={() => setShowReactions((s) => !s)}
          title="React"
        >
          <ReactionIcon />
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
        <PhoneEndIcon />
      </button>
    </div>
  )

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
    <div className="nc-call-backdrop">
      <div className="nc-call-active-large">
        <button
          type="button"
          className="nc-call-minimize"
          onClick={() => setMinimized(true)}
          title="Minimize"
        >
          <MinimizeIcon />
        </button>

        <InitialsAvatar name={TEST_CALLER.name} size={92} />
        <h2>{TEST_CALLER.name}</h2>
        <p className="nc-call-sub">Test call — nothing is actually connected</p>

        {lastReaction && <div className="nc-call-reaction-toast">{lastReaction}</div>}

        {controls}
      </div>
    </div>
  )
}
