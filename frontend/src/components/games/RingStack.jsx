import { useEffect, useRef, useState } from 'react'
import { recordBest, recordPlay, shuffle, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const COLORS = ['#f5c518', '#ed4956', '#25d366', '#0095f6', '#a855f7', '#f7971e', '#f472b6', '#00b8d4']

/** Level n: size order for the first few, then a shown colour order. */
function makeLevel(n) {
  const count = Math.min(4 + Math.floor(n / 2), 8)
  const byColour = n >= 3 && n % 2 === 1
  const rings = Array.from({ length: count }, (_, i) => ({ id: i, size: count - i, color: COLORS[i] }))
  // Size mode: largest first. Colour mode: a random sequence shown above.
  const order = byColour ? shuffle(rings.map((r) => r.id)) : rings.map((r) => r.id)
  return { n, rings: shuffle(rings), order, byColour, time: 8 + count * 2 }
}

export default function RingStack() {
  const [phase, setPhase] = useState('ready')
  const [lv, setLv] = useState(() => makeLevel(0))
  const [stack, setStack] = useState([])
  const [left, setLeft] = useState(10)
  const [shake, setShake] = useState(null)
  const [msg, setMsg] = useState('')
  const [newBest, setNewBest] = useState(false)
  const levelRef = useRef(0)
  const { later, clearAll } = useTimeouts()

  function load(n) {
    const L = makeLevel(n)
    levelRef.current = n
    setLv(L)
    setStack([])
    setLeft(L.time)
    setMsg(L.byColour ? 'Upar dikhaye rang ke hisaab se lagaiye 🎨' : 'Sabse badi ring pehle, sabse chhoti aakhir mein 💍')
    setPhase('play')
  }

  function start() {
    haptic('tap')
    clearAll()
    load(0)
  }

  useEffect(() => {
    if (phase !== 'play') return undefined
    if (left <= 0) {
      haptic('warn')
      setNewBest(recordBest('ringstack', levelRef.current))
      recordPlay('ringstack')
      setPhase('over')
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase])

  function tap(r) {
    if (phase !== 'play' || stack.includes(r.id)) return
    const want = lv.order[stack.length]
    if (r.id !== want) {
      haptic('warn')
      setShake(r.id)
      setLeft((s) => Math.max(0, s - 2))
      setMsg('Galat ring! −2 second ⏱')
      later(() => setShake(null), 300)
      return
    }
    haptic('tap')
    const next = [...stack, r.id]
    setStack(next)
    if (next.length === lv.rings.length) {
      haptic('like')
      setPhase('won')
      setMsg('Stack perfect! 💍✨')
      later(() => load(levelRef.current + 1), 1100)
    }
  }

  const byId = (id) => lv.rings.find((r) => r.id === id)
  const maxSize = lv.rings.length

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 4 ? '#ed4956' : undefined],
          ['Level', lv.n + 1, '#f5c518'],
        ]}
      />
      <p className="mb-2 h-5 text-center text-sm font-semibold">{phase === 'play' || phase === 'won' ? msg : 'Rings ko sahi order mein lagaiye 💍'}</p>
      <div
        data-testid="ringstack-arena"
        className="zu-game-arena relative min-h-[430px] overflow-hidden rounded-2xl border border-ig-border p-3"
        style={{ background: 'linear-gradient(180deg, rgba(245,197,24,0.12), rgba(168,85,247,0.12))' }}
      >
        {lv.byColour && (phase === 'play' || phase === 'won') && (
          <div className="mb-2 flex items-center justify-center gap-1" data-testid="colour-order">
            <span className="mr-1 text-[10px] text-ig-muted">Order:</span>
            {lv.order.map((id, k) => (
              <span key={id} className="flex size-6 items-center justify-center rounded-full border-2 text-[10px]" style={{ borderColor: byId(id).color, opacity: k < stack.length ? 0.3 : 1 }}>
                {k + 1}
              </span>
            ))}
          </div>
        )}

        {/* Pole with the stack, bottom-up */}
        <div className="relative mx-auto flex h-48 w-full flex-col-reverse items-center justify-start">
          <div className="absolute bottom-0 h-44 w-2 rounded-full bg-amber-700/80" />
          <div className="absolute bottom-0 h-2 w-40 rounded-full bg-amber-800" />
          {stack.map((id) => {
            const r = byId(id)
            return (
              <div
                key={id}
                className="relative z-[1] -mb-0.5 rounded-[50%] border-[5px]"
                style={{ width: 40 + (r.size / maxSize) * 110, height: 18, borderColor: r.color, animation: 'zu-drop 0.2s ease-out', boxShadow: `0 0 8px ${r.color}88` }}
              />
            )
          })}
        </div>

        {/* Tray */}
        <div className="mt-4 flex flex-wrap items-end justify-center gap-2">
          {lv.rings.map((r) => {
            const used = stack.includes(r.id)
            const d = 30 + (r.size / maxSize) * 46
            return (
              <button
                key={`${lv.n}-${r.id}`}
                type="button"
                data-ring={r.id}
                data-next={lv.order[stack.length] === r.id ? 'true' : undefined}
                onClick={() => tap(r)}
                className="flex items-center justify-center rounded-full"
                style={{
                  width: d,
                  height: d,
                  border: `6px solid ${r.color}`,
                  opacity: used ? 0.12 : 1,
                  animation: shake === r.id ? 'zu-shake 0.25s' : 'zu-pop 0.25s ease-out',
                  boxShadow: used ? 'none' : `0 0 10px ${r.color}66`,
                }}
              >
              </button>
            )
          })}
        </div>

        {phase === 'ready' && (
          <GameOverlay
            emoji="💍"
            title="Ring Stack"
            lines={['Rings ko pole pe sahi order mein lagaiye', 'Pehle size se (badi → chhoti), phir rang ke order se', 'Galat ring = −2 second!']}
            button="Shuru kariye"
            onButton={start}
            color="#f5c518"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={lv.n >= 5 ? '🏆' : '💍'}
            title={lv.n >= 5 ? 'Jeweller ban jaiye aap! 💎' : 'Time khatam! ⏰'}
            lines={[`${lv.n} level paar kiye`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={lv.n >= 5}
            color="#f5c518"
          />
        )}
      </div>
    </div>
  )
}
