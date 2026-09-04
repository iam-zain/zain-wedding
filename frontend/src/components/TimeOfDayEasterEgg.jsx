import { useEffect, useRef } from 'react'
import { NIGHT_OWL_MESSAGE } from '../config'
import { useToast } from './toast-context'

const NIGHT_OWL_START_HOUR = 1
const NIGHT_OWL_END_HOUR = 5
const DELAY_MS = 3000 // let the feed settle before showing anything

/** Global — mount once in Layout. Fires once per session for visitors browsing late at night. */
export default function TimeOfDayEasterEgg() {
  const toast = useToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    const hour = new Date().getHours()
    if (hour < NIGHT_OWL_START_HOUR || hour >= NIGHT_OWL_END_HOUR) return

    firedRef.current = true
    const t = setTimeout(() => toast(NIGHT_OWL_MESSAGE, { duration: 5000 }), DELAY_MS)
    return () => clearTimeout(t)
  }, [toast])

  return null
}
