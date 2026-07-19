import { useEffect, useRef, useState } from 'react'
import { CHAOS_EASTER_EGG_MESSAGES } from '../config'
import { useShake } from '../lib/useShake'
import { playChime, playGlitch } from '../lib/sound'
import Confetti from './Confetti'
import EasterEggModal from './EasterEggModal'

const SHOWER_MS = 4200

const MIN_TILES = 10
const MAX_TILES = 16
const WOBBLE_MS = 250
const FALL_MS = 1800
const REASSEMBLE_PAUSE_MS = 500
const TILE_COLORS = ['#262626', '#0095f6', '#ed4956', '#feda75', '#25d366', '#962fbf']

// Grabs a random sample of currently-visible UI elements to "detach" and fall —
// rendered as plain colored tiles (not clones of the real nodes), so nothing
// about the real React tree is ever touched.
function sampleTiles() {
  const candidates = Array.from(document.querySelectorAll('.content-col [data-testid]')).filter((el) => {
    const r = el.getBoundingClientRect()
    return (
      r.width >= 20 && r.width <= 260 &&
      r.height >= 20 && r.height <= 260 &&
      r.bottom > 0 && r.top < window.innerHeight
    )
  })
  return candidates
    .sort(() => Math.random() - 0.5)
    .slice(0, MAX_TILES)
    .map((el, i) => {
      const r = el.getBoundingClientRect()
      return { id: i, top: r.top, left: r.left, width: r.width, height: r.height }
    })
}

/**
 * Global — mount once in Layout. A gentle shake reveals confetti; a much
 * harder one makes the UI look like it's fallen apart, then reassembles.
 */
export default function ShakeEasterEgg() {
  const [confettiActive, setConfettiActive] = useState(false)
  const [chaosPhase, setChaosPhase] = useState('idle') // idle | wobbling | falling | reassembling | egg
  const [tiles, setTiles] = useState([])
  const timersRef = useRef([])

  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms))
  }

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  useShake({
    onShake: () => {
      setConfettiActive(true)
      playChime()
      schedule(() => setConfettiActive(false), SHOWER_MS)
    },
    onVigorousShake: () => {
      if (chaosPhase !== 'idle') return
      const captured = sampleTiles()
      if (captured.length < MIN_TILES) return // not enough on screen right now — skip quietly

      setTiles(captured)
      setChaosPhase('wobbling')
      playGlitch()
      schedule(() => setChaosPhase('falling'), WOBBLE_MS)
      schedule(() => setChaosPhase('reassembling'), WOBBLE_MS + FALL_MS)
      schedule(() => setChaosPhase('egg'), WOBBLE_MS + FALL_MS + REASSEMBLE_PAUSE_MS)
    },
  })

  // Wobble + hide the real app-shell while its "pieces" are on the floor.
  useEffect(() => {
    const shell = document.querySelector('[data-testid="app-shell"]')
    if (!shell) return
    shell.classList.toggle('chaos-wobble', chaosPhase === 'wobbling')
    shell.classList.toggle('chaos-hidden', chaosPhase === 'falling')
  }, [chaosPhase])

  return (
    <>
      {confettiActive && <Confetti />}

      {(chaosPhase === 'wobbling' || chaosPhase === 'falling') && (
        <div data-testid="chaos-tiles" aria-hidden="true" className="pointer-events-none fixed inset-0 z-[85] overflow-hidden">
          {tiles.map((t, i) => (
            <span
              key={t.id}
              className="absolute rounded-md"
              style={{
                top: t.top,
                left: t.left,
                width: t.width,
                height: t.height,
                backgroundColor: TILE_COLORS[i % TILE_COLORS.length],
                opacity: chaosPhase === 'falling' ? 1 : 0,
                animation:
                  chaosPhase === 'falling'
                    ? `chaos-fall ${1.1 + (i % 4) * 0.18}s cubic-bezier(.55,0,1,.45) ${(i % 5) * 0.05}s forwards`
                    : undefined,
              }}
            />
          ))}
        </div>
      )}

      {chaosPhase === 'egg' && (
        <EasterEggModal
          message={CHAOS_EASTER_EGG_MESSAGES[Math.floor(Math.random() * CHAOS_EASTER_EGG_MESSAGES.length)]}
          icon="🫠"
          onClose={() => setChaosPhase('idle')}
          testId="chaos-egg"
        />
      )}
    </>
  )
}
