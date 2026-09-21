import { useEffect, useRef } from 'react'
import { TIME_OF_DAY_MESSAGES } from '../config'
import { useToast } from './toast-context'

const DELAY_MS = 3000 // let the feed settle before showing anything

/**
 * Global, mount once in Layout. Greets the guest according to the hour on
 * their own clock: late-night scrolling, morning baraat, evening getting-ready,
 * and the 7 PM start every function shares.
 *
 * Fires at most ONCE per session even if a guest leaves the tab open across a
 * window boundary, the hour is read once on mount rather than polled, because
 * a second greeting an hour later reads as a bug rather than a charm.
 */
export default function TimeOfDayEasterEgg() {
  const toast = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const hour = new Date().getHours()
    // First match wins; the windows in config are non-overlapping.
    const slot = TIME_OF_DAY_MESSAGES.find((s) => hour >= s.from && hour < s.to)
    if (!slot) return

    firedRef.current = true
    const t = setTimeout(() => toast(slot.message, { duration: 5000 }), DELAY_MS)
    return () => clearTimeout(t)
  }, [toast])

  return null
}
