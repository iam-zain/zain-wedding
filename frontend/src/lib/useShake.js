import { useEffect, useRef } from 'react'

const SHAKE_THRESHOLD = 18 // summed accel delta (m/s²) across axes — gentle shake
const VIGOROUS_THRESHOLD = 32 // a much harder shake — the "chaos" egg
const SHAKE_COOLDOWN_MS = 4500
const VIGOROUS_COOLDOWN_MS = 20000 // disruptive effect — keep it rare

/**
 * Calls onShake() for a gentle device shake, onVigorousShake() for a much
 * harder one (mutually exclusive — a vigorous shake never also fires
 * onShake for the same motion). No-ops where devicemotion is
 * unsupported/blocked (e.g. iOS without granted motion permission).
 */
export function useShake({ onShake, onVigorousShake } = {}) {
  const lastShakeRef = useRef(0)
  const lastVigorousRef = useRef(0)
  const lastAccelRef = useRef(null)

  useEffect(() => {
    function handleMotion(e) {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null || a.y == null || a.z == null) return
      const prev = lastAccelRef.current
      lastAccelRef.current = a
      if (!prev) return

      const delta = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z)
      const now = Date.now()

      if (delta > VIGOROUS_THRESHOLD && now - lastVigorousRef.current > VIGOROUS_COOLDOWN_MS) {
        lastVigorousRef.current = now
        lastShakeRef.current = now
        onVigorousShake?.()
        return
      }

      if (delta > SHAKE_THRESHOLD && now - lastShakeRef.current > SHAKE_COOLDOWN_MS) {
        lastShakeRef.current = now
        onShake?.()
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [onShake, onVigorousShake])
}
