import { useState } from 'react'
import { useShake } from '../lib/useShake'
import { playChime } from '../lib/sound'
import Confetti from './Confetti'

const SHOWER_MS = 2200

/** Global — shake the phone to reveal a confetti burst. Mount once in Layout. */
export default function ShakeEasterEgg() {
  const [active, setActive] = useState(false)

  useShake(() => {
    setActive(true)
    playChime()
    setTimeout(() => setActive(false), SHOWER_MS)
  })

  if (!active) return null

  return <Confetti />
}
