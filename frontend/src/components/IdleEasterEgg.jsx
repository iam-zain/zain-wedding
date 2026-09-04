import { useEffect, useRef, useState } from 'react'
import { IDLE_EASTER_EGG_MESSAGES } from '../config'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

const IDLE_MS = 25000
const ACTIVITY_EVENTS = ['mousemove', 'touchstart', 'keydown', 'scroll', 'wheel', 'pointerdown']

/** Global — mount once in Layout. Shows a centered reveal once per session after ~25s of no interaction. */
export default function IdleEasterEgg() {
  const [message, setMessage] = useState(null)
  const shownRef = useRef(false)
  const timerRef = useRef(null)

  useEffect(() => {
    function resetTimer() {
      if (shownRef.current) return
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        shownRef.current = true
        setMessage(IDLE_EASTER_EGG_MESSAGES[Math.floor(Math.random() * IDLE_EASTER_EGG_MESSAGES.length)])
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

  if (!message) return null
  return <EasterEggModal message={message} icon="👀" onClose={() => setMessage(null)} testId="idle-egg" />
}
