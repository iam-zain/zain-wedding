import { useEffect, useState } from 'react'
import { pick, rand, recordBest, recordPlay, shuffle } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import Confetti from '../Confetti'

const COLS = 8
const ROWS = 10
const TARGETS = [
  ['💍', 'Ring'],
  ['🌙', 'Chaand'],
  ['🕯️', 'Shama'],
  ['💌', 'Khat'],
  ['🌹', 'Gulaab'],
  ['🕌', 'Masjid'],
  ['❤️', 'Dil'],
]
// Party clutter, none of these may be a target.
const CLUTTER = ['🌸', '🌼', '🌷', '🍬', '🎀', '✨', '🎊', '🍭', '🍓', '🎁', '⭐', '🌺', '🍰', '🍩', '🎈', '👰', '🤵', '🥁', '🍛', '🌿', '🧁', '🎉']
const FOUND_LINES = ['Mil gaya! ✨', 'Kya nazar hai! 👀', 'Wah! 🎯', 'Pakad liya! 💪']

function makeScene() {
  const cells = Array.from({ length: COLS * ROWS }, () => ({ e: pick(CLUTTER), rot: Math.round(rand(-30, 30)), size: Math.round(rand(18, 26)) }))
  const spots = shuffle(cells.map((_, i) => i)).slice(0, TARGETS.length)
  TARGETS.forEach(([e], k) => {
    cells[spots[k]] = { e, target: true, rot: Math.round(rand(-30, 30)), size: Math.round(rand(16, 22)) }
  })
  return cells
}

export default function WeddingSpotter() {
  const [scene, setScene] = useState(makeScene)
  const [found, setFound] = useState([]) // cell indices
  const [secs, setSecs] = useState(0)
  const [miss, setMiss] = useState(null)
  const [line, setLine] = useState('')
  const [best, setBest] = useState(null)

  const done = found.length === TARGETS.length

  useEffect(() => {
    if (done) return undefined
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [done])

  function tap(i) {
    if (done || found.includes(i)) return
    if (scene[i].target) {
      haptic('like')
      const next = [...found, i]
      setFound(next)
      setLine(pick(FOUND_LINES))
      if (next.length === TARGETS.length) {
        haptic('achievement')
        setBest(recordBest('spotter', secs, true))
        recordPlay('spotter')
        setLine(`Sab mil gaya! ${secs}s mein 🎉`)
      }
    } else {
      haptic('warn')
      setMiss(i)
      setLine(pick(['Yeh nahi 😅', 'Dhyaan se! 👀', 'Galat cheez 🙈']))
      setTimeout(() => setMiss((m) => (m === i ? null : m)), 350)
    }
  }

  function again() {
    haptic('tap')
    setScene(makeScene())
    setFound([])
    setSecs(0)
    setLine('')
    setBest(null)
  }

  const foundEmojis = new Set(found.map((i) => scene[i].e))

  return (
    <div data-testid="wedding-spotter">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="rounded-full bg-ig-card px-3 py-1 tabular-nums">⏱ {secs}s</span>
        <span className="rounded-full bg-ig-card px-3 py-1">
          Mile <b style={{ color: '#25d366' }}>{found.length}</b>/{TARGETS.length}
        </span>
      </div>
      {/* The find-list */}
      <div className="mb-2 flex justify-center gap-1.5">
        {TARGETS.map(([e, name]) => {
          const got = foundEmojis.has(e)
          return (
            <span key={e} title={name} className="flex size-10 flex-col items-center justify-center rounded-xl text-xl" style={{ background: got ? 'rgba(37,211,102,0.25)' : 'rgba(255,255,255,0.07)', opacity: got ? 0.6 : 1 }}>
              {got ? '✅' : e}
            </span>
          )
        })}
      </div>
      <div className="relative">
        {done && <Confetti count={60} />}
        <div
          data-testid="spotter-scene"
          className="zu-game-arena grid rounded-2xl border border-ig-border p-1.5"
          style={{
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            // A mandap-ish backdrop: warm centre, marigold edge.
            background: 'radial-gradient(circle at 50% 35%, rgba(247,151,30,0.3), rgba(120,20,40,0.35) 70%)',
            boxShadow: 'inset 0 0 0 3px rgba(245,197,24,0.4)',
          }}
        >
          {scene.map((c, i) => {
            const got = found.includes(i)
            return (
              <button
                key={i}
                type="button"
                data-target={c.target ? 'true' : undefined}
                onPointerDown={() => tap(i)}
                className="flex aspect-square items-center justify-center rounded-md leading-none"
                style={{
                  fontSize: c.size,
                  transform: got ? 'scale(1.35)' : `rotate(${c.rot}deg)`,
                  transition: 'transform 0.25s',
                  background: got ? 'rgba(37,211,102,0.35)' : miss === i ? 'rgba(237,73,86,0.35)' : undefined,
                  animation: miss === i ? 'zu-shake 0.25s' : got ? 'zu-pop 0.3s ease-out' : undefined,
                }}
              >
                {c.e}
              </button>
            )
          })}
        </div>
      </div>
      <p className="mt-2 h-5 text-center text-sm font-semibold" style={{ color: done ? '#25d366' : undefined }}>
        {line}
        {done && best ? ' · ✨ Naya best!' : ''}
      </p>
      {done && (
        <div className="mt-2 text-center">
          <button type="button" data-testid="spotter-again" onClick={again} className="rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ background: 'linear-gradient(90deg,#f7971e,#ed4956)' }}>
            Naya scene 📸
          </button>
        </div>
      )}
    </div>
  )
}
