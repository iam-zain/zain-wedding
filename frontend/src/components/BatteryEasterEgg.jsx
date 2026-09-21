import { useEffect, useRef } from 'react'
import {
  BATTERY_CHARGING_MESSAGE,
  BATTERY_CRITICAL_MESSAGE,
  BATTERY_FULL_MESSAGE,
  BATTERY_LOW_MESSAGE,
} from '../config'
import { useToast } from './toast-context'

const LOW_LEVEL = 0.15
const CRITICAL_LEVEL = 0.05

/** Global, mount once in Layout. Fires once per session if the Battery API reports a low, non-charging device, or, separately, once when the device is plugged in. No-ops where unsupported (most browsers). */
export default function BatteryEasterEgg() {
  const toast = useToast()
  const firedRef = useRef(false)
  const chargeFiredRef = useRef(false)
  const fullFiredRef = useRef(false)
  const criticalFiredRef = useRef(false)
  // Whether we've seen this device unplugged. A guest who opens the app while
  // already charging shouldn't be told it "started" charging.
  const sawUnpluggedRef = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') return

    let battery = null
    let cancelled = false

    const check = () => {
      if (!battery) return

      if (!battery.charging) sawUnpluggedRef.current = true

      // Plugged in after we'd seen it running on battery.
      if (
        battery.charging &&
        sawUnpluggedRef.current &&
        !chargeFiredRef.current
      ) {
        chargeFiredRef.current = true
        toast(BATTERY_CHARGING_MESSAGE, { duration: 4500 })
      }

      // Fully charged, and we saw it get there rather than arriving full.
      if (battery.charging && battery.level >= 1 && sawUnpluggedRef.current && !fullFiredRef.current) {
        fullFiredRef.current = true
        toast(BATTERY_FULL_MESSAGE, { duration: 4500 })
        return
      }

      // Critical is checked BEFORE the ordinary low nudge and latches both, so
      // a phone sliding from 15% to 4% gets the gentle line once and then the
      // urgent one, never the gentle one again afterwards.
      if (!battery.charging && battery.level <= CRITICAL_LEVEL && !criticalFiredRef.current) {
        criticalFiredRef.current = true
        firedRef.current = true
        toast(BATTERY_CRITICAL_MESSAGE, { duration: 6000 })
        return
      }

      if (firedRef.current) return
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
        // Battery API blocked/unsupported, silently skip
      })

    return () => {
      cancelled = true
      battery?.removeEventListener('levelchange', check)
      battery?.removeEventListener('chargingchange', check)
    }
  }, [toast])

  return null
}
