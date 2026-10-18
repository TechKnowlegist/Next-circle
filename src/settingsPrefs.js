// Small per-browser toggles for the Notifications/Privacy settings panes —
// same pattern as theme.js: plain localStorage, no backend model, read
// directly by the hooks that care (useMessageSound, useHeartbeat) rather
// than threaded through a Context.
const SOUND_MUTED_KEY = 'nc-mute-sound'
const APPEAR_OFFLINE_KEY = 'nc-appear-offline'

export function isSoundMuted() {
  try {
    return localStorage.getItem(SOUND_MUTED_KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundMuted(muted) {
  try {
    localStorage.setItem(SOUND_MUTED_KEY, muted ? '1' : '0')
  } catch {
    // ignore
  }
}

// When on, useHeartbeat stops touching lastSeenAt — within the 60s online
// window (see useHeartbeat.js) everyone else just sees the dot go gray,
// same mechanism as closing the tab, nothing server-side to flip.
export function isAppearOffline() {
  try {
    return localStorage.getItem(APPEAR_OFFLINE_KEY) === '1'
  } catch {
    return false
  }
}

export function setAppearOffline(offline) {
  try {
    localStorage.setItem(APPEAR_OFFLINE_KEY, offline ? '1' : '0')
  } catch {
    // ignore
  }
}
