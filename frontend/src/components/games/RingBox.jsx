import { useRef, useState } from 'react'
import { LINES, pick, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const LIVES = 3
// Round n: how many boxes, how many swaps, how fast each swap slides.
const boxesFor = (n) => (n < 2 ? 3 : n < 4 ? 5 : 7)
const swapsFor = (n) => 4 + n * 2
const speedFor = (n) => Math.max(170, 520 - n * 45)

export default function RingBox() {
  const [phase, setPhase] = useState('ready') // ready | show | shuffle | pick | reveal | over
  const [round, setRound] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [slots, setSlots] = useState([0, 1, 2]) // slots[boxId] = position
  const [ring, setRing] = useState(0) // box id holding the ring
  const [speed, setSpeed] = useState(400)
  const [chosen, setChosen] = useState(null)
  const [msg, setMsg] = useState('')
  const [newBest, setNewBest] = useState(false)
  const roundRef = useRef(0)
  const livesRef = useRef(LIVES)
  const { later, clearAll } = useTimeouts()

  function play(n) {
    const count = boxesFor(n)
    const pos = Array.from({ length: count }, (_, i) => i)
    const ringId = Math.floor(Math.random() * count)
    const ms = speedFor(n)
    roundRef.current = n
    setRound(n)
    setSlots(pos)
    setRing(ringId)
    setSpeed(ms)
    setChosen(null)
    setMsg('Ring dekh lijiye… 👀')
    setPhase('show')
    // Show the ring, cover it, then shuffle.
    later(() => {
      setPhase('shuffle')
      setMsg('Shuffle ho raha hai… 🔀')
      let cur = pos
      for (let k = 0; k < swapsFor(n); k++) {
        later(() => {
          const a = Math.floor(Math.random() * count)
          let b = Math.floor(Math.random() * (count - 1))
          if (b >= a) b += 1
          cur = cur.map((p) => (p === a ? b : p === b ? a : p))
          setSlots(cur)
        }, k * (ms + 40))
      }
      later(() => {
        setPhase('pick')
        setMsg('Ring kahan hai? 👀')
      }, swapsFor(n) * (ms + 40) + 150)
    }, 1300)
  }

  function start() {
    haptic('tap')
    clearAll()
    livesRef.current = LIVES
    setLives(LIVES)
    play(0)
  }

  function choose(id) {
    if (phase !== 'pick') return
    setChosen(id)
    setPhase('reveal')
    if (id === ring) {
      haptic('like')
      setMsg(pick(['Mil gayi ring! 💍', ...LINES.good]))
      later(() => play(roundRef.current + 1), 1300)
    } else {
      haptic('warn')
      livesRef.current -= 1
      setLives(livesRef.current)
      setMsg(pick(['Khaali dabba! 📦', 'Ring toh yahan thi! 👉', 'Nazar chook gayi 😅']))
      later(() => {
        if (livesRef.current <= 0) {
          setNewBest(recordBest('ringbox', roundRef.current))
          recordPlay('ringbox')
          setPhase('over')
        } else play(roundRef.current)
      }, 1600)
    }
  }

  const count = slots.length
  const width = 100 / count
  const lifted = (id) => phase === 'show' || (phase === 'reveal' && (id === ring || id === chosen))

  return (
    <div>
      <GameStats
        items={[
          ['Round', round + 1, '#f7971e'],
          ['Dabbe', count],
          ['Jaan', '❤️'.repeat(Math.max(0, lives)) || '-'],
        ]}
      />
      <p className="mb-2 h-6 text-center text-base font-semibold">{phase === 'ready' || phase === 'over' ? 'Ring in the Box 💍' : msg}</p>
      <div
        data-testid="ringbox-arena"
        className="zu-game-arena relative h-[300px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'radial-gradient(circle at 50% 30%, rgba(247,151,30,0.22), rgba(120,20,40,0.3))' }}
      >
        {/* Table cloth */}
        <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(180deg, rgba(190,30,60,0.5), rgba(90,10,30,0.7))' }} />
        {slots.map((slot, id) => (
          <button
            key={id}
            type="button"
            data-box={id}
            data-ring={id === ring ? 'true' : undefined}
            onClick={() => choose(id)}
            className="absolute bottom-10 flex flex-col items-center"
            style={{
              left: `${slot * width}%`,
              width: `${width}%`,
              transition: `left ${speed}ms ease-in-out`,
            }}
          >
            <span
              className="text-3xl"
              style={{ visibility: id === ring && lifted(id) ? 'visible' : 'hidden', animation: id === ring && lifted(id) ? 'zu-pop 0.25s ease-out' : undefined }}
            >
              💍
            </span>
            <span
              className="leading-none"
              style={{
                fontSize: count > 5 ? 40 : 54,
                transform: lifted(id) ? 'translateY(-14px) rotate(-8deg)' : 'none',
                transition: 'transform 0.25s',
                filter: phase === 'reveal' && id === chosen && id !== ring ? 'grayscale(0.7)' : undefined,
              }}
            >
              🎁
            </span>
          </button>
        ))}

        {phase === 'ready' && (
          <GameOverlay
            emoji="💍"
            title="Ring kahan hai? 👀"
            lines={['Ek dabbe mein ring hai, dhyaan se dekhiye', 'Dabbe ghoomenge, phir sahi wale chuniye', 'Har round zyada dabbe, tez shuffle!']}
            button="Shuru kariye"
            onButton={start}
            color="#f7971e"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={round >= 5 ? '🏆' : '🎁'}
            title={round >= 5 ? 'Baaz ki nazar! 🦅' : 'Ring chhup gayi 😅'}
            lines={[`${round} round jeete`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={round >= 5}
            color="#f7971e"
          />
        )}
      </div>
    </div>
  )
}
