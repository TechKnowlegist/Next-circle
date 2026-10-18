import { useEffect } from 'react'

// Closes whichever modal/overlay calls this on Escape — every nc-modal-
// overlay/nc-call-backdrop-style popup in the app calls this with its own
// onClose instead of each wiring its own keydown listener.
export function useEscapeToClose(onClose) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
}
