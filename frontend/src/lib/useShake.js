import { useEffect, useRef } from 'react'

const SHAKE_THRESHOLD = 18 // summed accel delta (m/s²) across axes
const SHAKE_COOLDOWN_MS = 4000

/** Calls onShake() when a device-motion shake is detected. No-ops where devicemotion is unsupported/blocked. */
export function useShake(onShake) {
  const lastShakeRef = useRef(0)
  const lastAccelRef = useRef(null)

  useEffect(() => {
    function handleMotion(e) {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null) return
      const prev = lastAccelRef.current
      lastAccelRef.current = a
      if (!prev) return

      const delta = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z)
      const now = Date.now()
      if (delta > SHAKE_THRESHOLD && now - lastShakeRef.current > SHAKE_COOLDOWN_MS) {
        lastShakeRef.current = now
        onShake()
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [onShake])
}
