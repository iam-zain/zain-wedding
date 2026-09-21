import { useEffect, useRef, useState } from 'react'
import { bumpStat, LINES, pick, rand, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const ROUND_S = 30
const LIVES = 3
const COUNT = 5
const SIZE = 56 // px, tap target
const OBJECTS = [
  { e: '💍', ask: 'Ring par tap kariye!' },
  { e: '🌹', ask: 'Rose par tap kariye!' },
  { e: '💔', ask: 'Toote dil par tap kariye!' },
  { e: '🧸', ask: 'Teddy par tap kariye!' },
  { e: '💌', ask: 'Love letter par tap kariye!' },
  { e: '🌙', ask: 'Chaand par tap kariye!' },
  { e: '🎁', ask: 'Gift par tap kariye!' },
  { e: '🕌', ask: 'Masjid par tap kariye!' },
  { e: '👰', ask: 'Dulhan par tap kariye!' },
  { e: '🤵', ask: 'Dulhe par tap kariye!' },
]

let nextId = 1

/** Five objects: at least one target, the rest anything but the target. */
function makeWave(targetIdx, w, h, speed) {
  const others = OBJECTS.map((_, i) => i).filter((i) => i !== targetIdx)
  const targets = Math.random() < 0.3 ? 2 : 1
  return Array.from({ length: COUNT }, (_, k) => {
    const idx = k < targets ? targetIdx : pick(others)
    const angle = rand(0, Math.PI * 2)
    return {
      id: nextId++,
      idx,
      x: rand(0, w - SIZE),
      y: rand(0, h - SIZE),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    }
  })
}

export default function TapCorrect() {
  const [phase, setPhase] = useState('ready')
  const [target, setTarget] = useState(0)
  const [objs, setObjs] = useState([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [left, setLeft] = useState(ROUND_S)
  const [msg, setMsg] = useState(null)
  const [newBest, setNewBest] = useState(false)
  const arena = useRef(null)
  const nodes = useRef(new Map()) // id -> element
  const live = useRef([]) // positions mutated by the animation loop
  const scoreRef = useRef(0)
  const livesRef = useRef(LIVES)
  const { later, clearAll } = useTimeouts()

  function newWave(sc) {
    const el = arena.current
    const w = el ? el.clientWidth : 320
    const h = el ? el.clientHeight : 380
    const t = Math.floor(Math.random() * OBJECTS.length)
    // Pixels per frame: gentle to start, quicker with every correct tap.
    const wave = makeWave(t, w, h, Math.min(5.5, 1.4 + sc * 0.18))
    live.current = wave
    setTarget(t)
    setObjs(wave)
  }

  function start() {
    haptic('tap')
    clearAll()
    scoreRef.current = 0
    livesRef.current = LIVES
    setScore(0)
    setLives(LIVES)
    setLeft(ROUND_S)
    setMsg(null)
    setPhase('play')
    newWave(0)
  }

  function end() {
    setNewBest(recordBest('tap', scoreRef.current))
    recordPlay('tap')
    setPhase('over')
    haptic('success')
  }

  // Clock.
  useEffect(() => {
    if (phase !== 'play') return undefined
    if (left <= 0) {
      end()
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bounce loop — writes transforms straight to the DOM, no React renders.
  useEffect(() => {
    if (phase !== 'play') return undefined
    let raf
    const step = () => {
      const el = arena.current
      if (el) {
        const w = el.clientWidth - SIZE
        const h = el.clientHeight - SIZE
        for (const o of live.current) {
          o.x += o.vx
          o.y += o.vy
          if (o.x < 0 || o.x > w) {
            o.vx = -o.vx
            o.x = Math.max(0, Math.min(w, o.x))
          }
          if (o.y < 0 || o.y > h) {
            o.vy = -o.vy
            o.y = Math.max(0, Math.min(h, o.y))
          }
          const node = nodes.current.get(o.id)
          if (node) node.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`
        }
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  function tap(o) {
    if (phase !== 'play') return
    if (o.idx === target) {
      haptic('like')
      scoreRef.current += 1
      setScore(scoreRef.current)
      bumpStat('quick')
      setMsg({ ok: true, text: scoreRef.current % 5 === 0 ? `⚡ ${scoreRef.current}! Aur tez…` : pick(LINES.good) })
      newWave(scoreRef.current)
    } else {
      haptic('warn')
      livesRef.current -= 1
      setLives(livesRef.current)
      setMsg({ ok: false, text: `Woh ${OBJECTS[o.idx].e} tha! ${pick(['🙈', '😅', '😬'])}` })
      if (livesRef.current <= 0) end()
    }
    later(() => setMsg(null), 900)
  }

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 5 ? '#ed4956' : undefined],
          ['Sahi', score, '#25d366'],
          ['Jaan', '❤️'.repeat(Math.max(0, lives)) || '—'],
        ]}
      />
      <p key={`${target}-${score}`} className="mb-2 text-center text-base font-semibold" style={{ animation: 'zu-pop 0.2s ease-out' }}>
        {phase === 'play' ? (
          <>
            <span className="text-2xl">{OBJECTS[target].e}</span> {OBJECTS[target].ask}
          </>
        ) : (
          'Jo bola jaye, wahi dabaiye 🎯'
        )}
      </p>
      <div
        ref={arena}
        data-testid="tap-arena"
        className="zu-game-arena relative h-[380px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'linear-gradient(160deg, rgba(0,149,246,0.14), rgba(168,85,247,0.12))' }}
      >
        {phase === 'play' &&
          objs.map((o) => (
            <button
              key={o.id}
              ref={(n) => (n ? nodes.current.set(o.id, n) : nodes.current.delete(o.id))}
              type="button"
              data-idx={o.idx}
              data-target={o.idx === target ? 'true' : undefined}
              onPointerDown={() => tap(o)}
              className="absolute left-0 top-0 flex items-center justify-center text-[38px] leading-none"
              style={{ width: SIZE, height: SIZE, transform: `translate3d(${o.x}px, ${o.y}px, 0)`, willChange: 'transform' }}
            >
              {OBJECTS[o.idx].e}
            </button>
          ))}

        {phase === 'ready' && (
          <GameOverlay
            emoji="🎯"
            title="Baraat Reflex"
            lines={['Cheezein uchhal rahi hain — jo bola jaye, wahi dabaiye', `${ROUND_S} second · galat tap = ek jaan gayi`, 'Har sahi tap ke baad speed badhegi ⚡']}
            button="Shuru kariye"
            onButton={start}
            color="#0095f6"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={score >= 20 ? '⚡' : '🎯'}
            title={score >= 20 ? 'Tez Nazar! ⚡' : score >= 10 ? 'Kya reflexes hain! 👏' : 'Thoda aur dhyaan se 👀'}
            lines={[`${score} sahi tap`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={score >= 20}
            color="#0095f6"
          />
        )}
      </div>
      <p className="mt-2 h-5 text-center text-sm font-semibold" style={{ color: msg?.ok ? '#25d366' : '#ed4956' }}>
        {msg?.text || ''}
      </p>
    </div>
  )
}
