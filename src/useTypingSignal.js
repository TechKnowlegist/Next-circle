import { useEffect, useRef, useState } from 'react'
import { clearTyping, listTypingUsers, touchTyping } from './chatApi.js'

const POLL_MS = 2_500
const TOUCH_THROTTLE_MS = 1_500

// Polls for who else is typing in `conversationId` (see ChatTypingSignal in
// the schema) and exposes `notifyTyping()` to call on every composer
// keystroke — throttled client-side so it isn't actually one write per
// keystroke, just roughly one every TOUCH_THROTTLE_MS while text keeps
// changing. Call `stopTyping()` on send/blur so the signal clears
// immediately instead of waiting out the server-side staleness window.
export function useTypingSignal(conversationId, userId, userName) {
  const [typingUsers, setTypingUsers] = useState([])
  const lastTouchRef = useRef(0)

  useEffect(() => {
    setTypingUsers([])
    let cancelled = false
    function poll() {
      listTypingUsers(conversationId, userId)
        .then((users) => !cancelled && setTypingUsers(users))
        .catch((err) => console.log('Next Circle — typing poll failed:', err))
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
      clearTyping(conversationId, userId).catch(() => {})
    }
  }, [conversationId, userId])

  function notifyTyping() {
    const now = Date.now()
    if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return
    lastTouchRef.current = now
    touchTyping(conversationId, userId, userName).catch((err) => console.log('Next Circle — typing touch failed:', err))
  }

  function stopTyping() {
    lastTouchRef.current = 0
    clearTyping(conversationId, userId).catch(() => {})
  }

  return { typingUsers, notifyTyping, stopTyping }
}
