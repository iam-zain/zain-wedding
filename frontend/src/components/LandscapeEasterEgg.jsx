import { useEffect, useRef } from 'react'
import { LANDSCAPE_MESSAGE } from '../config'
import { useToast } from './toast-context'

/**
 * Global — mount once in Layout. Fires once per session the first time the
 * device is turned sideways.
 *
 * Deliberately only fires on a portrait -> landscape *transition* rather than
 * on "is landscape now": every desktop browser is landscape at all times, so
 * checking the current state would greet laptop guests the instant they opened
 * the page, which is not the joke.
 */
export default function LandscapeEasterEgg() {
  const toast = useToast()
  const sawPortraitRef = useRef(false)
  const firedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(orientation: landscape)')

    const check = () => {
      if (!mq.matches) {
        sawPortraitRef.current = true
        return
      }
      if (firedRef.current || !sawPortraitRef.current) return
      firedRef.current = true
      toast(LANDSCAPE_MESSAGE, { duration: 4500 })
    }

    check() // records the starting orientation; can't fire on this pass
    mq.addEventListener('change', check)
    return () => mq.removeEventListener('change', check)
  }, [toast])

  return null
}
