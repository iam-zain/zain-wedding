import { useEffect, useRef, useState } from 'react'
import { rand, recordBest, recordPlay, useTimeouts, weighted } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const ROUND_S = 30
const COUNT = 7
const SIZE = 54
// [emoji, points]; ☠️ ends the game on the spot.
const KINDS = [
  [['❤️', 1], 45],
  [['💔', -2], 22],
  [['💍', 3], 10],
  [['☠️', 'dead'], 9],
  [['🎈', 0], 14], // harmless filler, just in the way
]

let nextId = 1

function spawn(w, h, speed) {
  const [e, pts] = weighted(KINDS)
  const a = rand(0, Math.PI * 2)
  const v = speed * rand(0.7, 1.3)
  return { id: nextId++, e, pts, x: rand(0, w - SIZE), y: rand(0, h - SIZE), vx: Math.cos(a) * v, vy: Math.sin(a) * v }
}

export default function ShootHearts() {
  const [phase, setPhase] = useState('ready')
  const [objs, setObjs] = useState([])
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(ROUND_S)
  const [pops, setPops] = useState([]) // floating +/- labels
  const [endLine, setEndLine] = useState('')
  const [newBest, setNewBest] = useState(false)
  const arena = useRef(null)
  const nodes = useRef(new Map())
  const live = useRef([])
  const scoreRef = useRef(0)
  const { later, clearAll } = useTimeouts()

  const dims = () => [arena.current?.clientWidth || 320, arena.current?.clientHeight || 380]
  const speed = () => Math.min(4.5, 1.3 + (ROUND_S - left) * 0.09)

  function start() {
    haptic('tap')
    clearAll()
    scoreRef.current = 0
    setScore(0)
    setLeft(ROUND_S)
    setPops([])
    const [w, h] = dims()
    const list = Array.from({ length: COUNT }, () => spawn(w, h, 1.3))
    live.current = list
    setObjs(list)
    setPhase('play')
  }

  function end(line) {
    setNewBest(recordBest('shoot', scoreRef.current))
    recordPlay('shoot')
    setEndLine(line)
    setPhase('over')
  }

  useEffect(() => {
    if (phase !== 'play') return undefined
    if (left <= 0) {
      haptic('success')
      end(scoreRef.current >= 25 ? 'Nishanebaaz! 🎯🏆' : scoreRef.current >= 12 ? 'Achha nishana! 🎯' : 'Nishana thoda hil gaya 😅')
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'play') return undefined
    let raf
    const step = () => {
      const [W, H] = dims()
      for (const o of live.current) {
        o.x += o.vx
        o.y += o.vy
        if (o.x < 0 || o.x > W - SIZE) {
          o.vx = -o.vx
          o.x = Math.max(0, Math.min(W - SIZE, o.x))
        }
        if (o.y < 0 || o.y > H - SIZE) {
          o.vy = -o.vy
          o.y = Math.max(0, Math.min(H - SIZE, o.y))
        }
        const node = nodes.current.get(o.id)
        if (node) node.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  function shoot(o) {
    if (phase !== 'play') return
    if (o.pts === 'dead') {
      haptic('warn')
      end('☠️ Khatra dabaa diya! Game over')
      return
    }
    haptic(o.pts > 0 ? 'like' : o.pts < 0 ? 'warn' : 'tap')
    scoreRef.current += o.pts
    setScore(scoreRef.current)
    if (o.pts !== 0) {
      const pop = { id: o.id, x: o.x, y: o.y, text: o.pts > 0 ? `+${o.pts}` : `${o.pts}`, ok: o.pts > 0 }
      setPops((p) => [...p, pop])
      later(() => setPops((p) => p.filter((x) => x.id !== pop.id)), 500)
    }
    // Replace what was hit with something new.
    const [w, h] = dims()
    const fresh = spawn(w, h, speed())
    live.current = live.current.map((x) => (x.id === o.id ? fresh : x))
    setObjs(live.current.slice())
  }

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 5 ? '#ed4956' : undefined],
          ['Score', score, '#ed4956'],
        ]}
      />
      <p className="mb-2 text-center text-xs text-ig-muted">❤️ +1 · 💍 +3 · 💔 −2 · ☠️ = game over</p>
      <div
        ref={arena}
        data-testid="shoot-arena"
        className="zu-game-arena relative h-[380px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(237,73,86,0.16), rgba(20,20,40,0.5))', cursor: 'crosshair' }}
      >
        {/* Faint target rings */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />

        {phase === 'play' &&
          objs.map((o) => (
            <button
              key={o.id}
              ref={(n) => (n ? nodes.current.set(o.id, n) : nodes.current.delete(o.id))}
              type="button"
              data-e={o.e}
              onPointerDown={() => shoot(o)}
              className="absolute left-0 top-0 flex items-center justify-center text-[36px] leading-none"
              style={{ width: SIZE, height: SIZE, transform: `translate3d(${o.x}px, ${o.y}px, 0)`, animation: 'zu-pop 0.2s ease-out' }}
            >
              {o.e}
            </button>
          ))}
        {pops.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute text-xl font-bold"
            style={{ left: p.x + 12, top: p.y, color: p.ok ? '#25d366' : '#ed4956', animation: 'zu-float 0.5s ease-out forwards' }}
          >
            {p.text}
          </span>
        ))}

        {phase === 'ready' && (
          <GameOverlay
            emoji="🎯"
            title="Cupid's Arrow"
            lines={['Udte dil pe nishana lagaiye!', '❤️ +1 · 💍 +3 · 💔 −2', '☠️ ko chhua toh seedha game over!']}
            button="Nishana lagaiye 🎯"
            onButton={start}
            color="#ed4956"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={score >= 25 ? '🏆' : '🎯'}
            title={endLine}
            lines={[`Score: ${score}`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={score >= 25}
            color="#ed4956"
          />
        )}
      </div>
    </div>
  )
}
