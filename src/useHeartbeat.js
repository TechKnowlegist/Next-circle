import { useEffect } from 'react'
import { heartbeatPresence } from './chatApi.js'

const INTERVAL_MS = 25_000

// Touches lastSeenAt on every server the user belongs to, every ~25s,
// matching the 60s "online" window in chatApi.js's isOnline() — gives
// two heartbeats of margin before someone reads as offline. Runs once
// immediately on mount too, so presence shows up right away rather than
// waiting a full interval.
export function useHeartbeat(userId) {
  useEffect(() => {
    if (!userId) return
    function tick() {
      heartbeatPresence(userId).catch((err) => console.log('Next Circle — heartbeat failed:', err))
    }
    tick()
    const id = setInterval(tick, INTERVAL_MS)
    return () => clearInterval(id)
  }, [userId])
}
