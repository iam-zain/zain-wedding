import { useEffect, useRef } from 'react'
import { BATTERY_LOW_MESSAGE } from '../config'
import { useToast } from './toast-context'

const LOW_LEVEL = 0.15

/** Global — mount once in Layout. Fires once per session if the Battery API reports a low, non-charging device. No-ops where unsupported (most browsers). */
export default function BatteryEasterEgg() {
  const toast = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') return

    let battery = null
    let cancelled = false

    const check = () => {
      if (firedRef.current || !battery) return
      if (battery.level <= LOW_LEVEL && !battery.charging) {
        firedRef.current = true
        toast(BATTERY_LOW_MESSAGE, { duration: 5000 })
      }
    }

    navigator.getBattery()
      .then((b) => {
        if (cancelled) return
        battery = b
        check()
        battery.addEventListener('levelchange', check)
        battery.addEventListener('chargingchange', check)
      })
      .catch(() => {
        // Battery API blocked/unsupported — silently skip
      })

    return () => {
      cancelled = true
      battery?.removeEventListener('levelchange', check)
      battery?.removeEventListener('chargingchange', check)
    }
  }, [toast])

  return null
}
