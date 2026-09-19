import { useEffect, useRef, useState } from 'react'
import { rand, recordBest, recordPlay, weighted } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const LIVES = 3
const ITEM = 44 // px
const BASKET_W = 84
const KINDS = [
  [['❤️', 1], 60],
  [['💖', 2], 12],
  [['💔', 'hurt'], 20],
  [['💎', 5], 6],
]

let nextId = 1

export default function HoldHeart() {
  const [phase, setPhase] = useState('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [items, setItems] = useState([])
  const [flash, setFlash] = useState(null)
  const [newBest, setNewBest] = useState(false)
  const arena = useRef(null)
  const basket = useRef(null)
  const bx = useRef(0.5) // basket centre, 0-1 of width
  const live = useRef([])
  const nodes = useRef(new Map())
  const st = useRef({ score: 0, lives: LIVES, t0: 0 })

  function start() {
    haptic('tap')
    st.current = { score: 0, lives: LIVES, t0: performance.now() }
    live.current = []
    setItems([])
    setScore(0)
    setLives(LIVES)
    setPhase('play')
  }

  function moveBasket(e) {
    const r = arena.current?.getBoundingClientRect()
    if (!r) return
    bx.current = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    if (basket.current) basket.current.style.left = `calc(${bx.current * 100}% - ${BASKET_W / 2}px)`
  }

  useEffect(() => {
    if (phase !== 'play') return undefined
    let raf
    let lastSpawn = 0
    const step = (now) => {
      const el = arena.current
      if (!el) return
      const W = el.clientWidth
      const H = el.clientHeight
      const secs = (now - st.current.t0) / 1000
      const fall = 2.2 + secs * 0.06 // px per frame, speeds up
      const every = Math.max(420, 1000 - secs * 12)
      if (now - lastSpawn > every) {
        lastSpawn = now
        const [e, pts] = weighted(KINDS)
        live.current.push({ id: nextId++, e, pts, x: rand(0, W - ITEM), y: -ITEM })
        setItems(live.current.slice())
      }
      const catchY = H - 70
      const cx = bx.current * W
      let changed = false
      for (const o of live.current) {
        o.y += fall
        const node = nodes.current.get(o.id)
        if (node) node.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`
        if (!o.done && o.y + ITEM >= catchY && o.y < catchY + 20 && Math.abs(o.x + ITEM / 2 - cx) < BASKET_W / 2 + 6) {
          o.done = true
          changed = true
          if (o.pts === 'hurt') {
            haptic('warn')
            st.current.lives -= 1
            setLives(st.current.lives)
            setFlash({ ok: false, text: '💔 Dil toot gaya!', k: o.id })
          } else {
            haptic('like')
            st.current.score += o.pts
            setScore(st.current.score)
            setFlash({ ok: true, text: `+${o.pts}${o.pts >= 5 ? ' 💎 Bonus!' : ''}`, k: o.id })
          }
        } else if (o.y > H) {
          o.done = true
          changed = true
        }
      }
      if (changed) {
        live.current = live.current.filter((o) => !o.done)
        setItems(live.current.slice())
      }
      if (st.current.lives <= 0) {
        setNewBest(recordBest('hold', st.current.score))
        recordPlay('hold')
        setPhase('over')
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  return (
    <div>
      <GameStats
        items={[
          ['Score', score, '#ed4956'],
          ['Jaan', '❤️'.repeat(Math.max(0, lives)) || '—'],
        ]}
      />
      <p key={flash?.k} className="mb-2 h-5 text-center text-sm font-semibold" style={{ color: flash ? (flash.ok ? '#25d366' : '#ed4956') : undefined, animation: flash ? 'zu-pop 0.2s' : undefined }}>
        {flash ? flash.text : 'Ungli ghumao, tokri se dil pakdo 🧺'}
      </p>
      <div
        ref={arena}
        data-testid="hold-arena"
        onPointerDown={moveBasket}
        onPointerMove={moveBasket}
        className="zu-game-arena relative h-[420px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ touchAction: 'none', background: 'linear-gradient(180deg, rgba(168,85,247,0.14), rgba(237,73,86,0.16))' }}
      >
        {phase === 'play' &&
          items.map((o) => (
            <span
              key={o.id}
              ref={(n) => (n ? nodes.current.set(o.id, n) : nodes.current.delete(o.id))}
              className="pointer-events-none absolute left-0 top-0 flex items-center justify-center text-[34px] leading-none"
              style={{ width: ITEM, height: ITEM, transform: `translate3d(${o.x}px, ${o.y}px, 0)` }}
            >
              {o.e}
            </span>
          ))}
        <div
          ref={basket}
          className="pointer-events-none absolute bottom-3 text-center"
          style={{ width: BASKET_W, left: `calc(${bx.current * 100}% - ${BASKET_W / 2}px)` }}
        >
          <span className="text-5xl leading-none">🧺</span>
        </div>

        {phase === 'ready' && (
          <GameOverlay
            emoji="🫶"
            title="Dil Sambhalo"
            lines={['Ungli idhar-udhar karke tokri chalao', '❤️ +1 · 💖 +2 · 💎 +5 bonus', '💔 pakda toh ek jaan gayi — speed badhti jayegi!']}
            button="Shuru karo"
            onButton={start}
            color="#a855f7"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={score >= 40 ? '🏆' : '🫶'}
            title={score >= 40 ? 'Dil sambhalna koi aapse seekhe! 🫶' : score >= 20 ? 'Achha pakda! 👏' : 'Dil phisal gaye 😅'}
            lines={[`Score: ${score}`, newBest ? '✨ Naya best!' : '']}
            button="Dobara khelo"
            onButton={start}
            win={score >= 40}
            color="#a855f7"
          />
        )}
      </div>
    </div>
  )
}
