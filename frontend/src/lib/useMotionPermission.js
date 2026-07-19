import { useEffect } from 'react'

/**
 * iOS 13+ requires DeviceMotionEvent.requestPermission() to be called from
 * within a user gesture before 'devicemotion' will ever fire. Piggyback on
 * the very first tap anywhere in the app so the shake eggs can work there
 * too, without a dedicated "enable motion" button spoiling the surprise.
 * No-ops on browsers that don't need it (Android, desktop, older iOS).
 */
export function useMotionPermission() {
  useEffect(() => {
    if (typeof DeviceMotionEvent === 'undefined' || typeof DeviceMotionEvent.requestPermission !== 'function') return

    function requestOnce() {
      window.removeEventListener('pointerdown', requestOnce)
      DeviceMotionEvent.requestPermission().catch(() => {})
    }

    window.addEventListener('pointerdown', requestOnce, { once: true })
    return () => window.removeEventListener('pointerdown', requestOnce)
  }, [])
}
