import { useEffect, useRef } from 'react'
import { TILT_MESSAGE } from '../config'
import { useToast } from './toast-context'

// Degrees of left/right tilt that count as deliberate. Low enough to catch a
// real turn of the wrist, high enough that reading in bed never triggers it.
const TILT_THRESHOLD = 42
// How long it must be held, so a quick wobble while walking doesn't count.
const HOLD_MS = 700

/**
 * Global — mount once in Layout. Fires once per session when the phone is
 * deliberately tilted onto its side.
 *
 * Reads `gamma` (left/right roll) rather than beta, because beta changes just
 * from holding a phone at a comfortable reading angle and would fire instantly
 * for almost everyone. No-ops entirely on desktop, where the event never fires.
 */
export default function TiltEasterEgg() {
  const toast = useToast()
  const firedRef = useRef(false)
  const heldSinceRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return

    const onTilt = (e) => {
      if (firedRef.current) return
      const gamma = e.gamma
      if (typeof gamma !== 'number') return

      if (Math.abs(gamma) < TILT_THRESHOLD) {
        heldSinceRef.current = null
        return
      }
      if (heldSinceRef.current == null) {
        heldSinceRef.current = Date.now()
        return
      }
      if (Date.now() - heldSinceRef.current >= HOLD_MS) {
        firedRef.current = true
        toast(TILT_MESSAGE, { duration: 4500 })
      }
    }

    // Listener only — permission is requested elsewhere (useMotionPermission),
    // so this never puts a second prompt in front of a guest.
    window.addEventListener('deviceorientation', onTilt)
    return () => window.removeEventListener('deviceorientation', onTilt)
  }, [toast])

  return null
}
