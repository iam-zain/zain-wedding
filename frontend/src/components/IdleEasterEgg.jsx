import { useEffect, useRef, useState } from 'react'
import { IDLE_EASTER_EGG_MESSAGE } from '../config'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

const IDLE_MS = 15000
const ACTIVITY_EVENTS = ['mousemove', 'touchstart', 'keydown', 'scroll', 'wheel', 'pointerdown']

/** Global — mount once in Layout. Shows a centered reveal once per session after ~15s of no interaction. */
export default function IdleEasterEgg() {
  const [egg, setEgg] = useState(false)
  const shownRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    function resetTimer() {
      if (shownRef.current) return
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        shownRef.current = true
        setEgg(true)
        playChime()
      }, IDLE_MS)
    }

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetTimer))
    }
  }, [])

  if (!egg) return null
  return <EasterEggModal message={IDLE_EASTER_EGG_MESSAGE} icon="👀" onClose={() => setEgg(false)} testId="idle-egg" />
}
