import { useEffect, useRef } from 'react'
import { subscribeToMessages } from './chatApi.js'
import messageToneUrl from './assets/sounds/message-tone.mp3'

// Site-wide, independent of whichever conversation is open — plays the
// notification chime for any incoming message that isn't the signed-in
// user's own (their own sends already show up optimistically, so no
// need to ping on those). Browsers block audio before any user
// interaction on the page; .play() failing silently here just means
// nothing's played yet this session, which is fine.
export function useMessageSound(myUserId) {
  const audioRef = useRef(null)

  useEffect(() => {
    audioRef.current = new Audio(messageToneUrl)
    audioRef.current.volume = 0.6
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      if (message.authorId === myUserId) return
      audioRef.current?.play().catch(() => {})
    })
    return unsubscribe
  }, [myUserId])
}
