import { useEffect, useRef, useState } from 'react'
import { pick, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const ROUND_S = 35
// [emoji, name, belongs in a Waleema suitcase?]
const ITEMS = [
  ['👔', 'Kapde', true],
  ['👗', 'Dress', true],
  ['👞', 'Joote', true],
  ['👠', 'Heels', true],
  ['💍', 'Ring', true],
  ['📱', 'Phone', true],
  ['🔌', 'Charger', true],
  ['💄', 'Makeup', true],
  ['⌚', 'Ghadi', true],
  ['🕶️', 'Chashma', true],
  ['🎁', 'Gift', true],
  ['🧴', 'Perfume', true],
  ['🍎', 'Seb', false],
  ['🧸', 'Teddy', false],
  ['🐟', 'Machhli', false],
  ['🥔', 'Aloo', false],
  ['🏏', 'Bat', false],
  ['🧹', 'Jhaadu', false],
  ['🍳', 'Tawa', false],
  ['🐓', 'Murga', false],
]

let nextId = 1

export default function PackWaleema() {
  const [phase, setPhase] = useState('ready')
  const [left, setLeft] = useState(ROUND_S)
  const [score, setScore] = useState(0)
  const [belt, setBelt] = useState([])
  const [packed, setPacked] = useState([])
  const [msg, setMsg] = useState(null)
  const [bump, setBump] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const scoreRef = useRef(0)
  const { later, clearAll } = useTimeouts()

  function start() {
    haptic('tap')
    clearAll()
    scoreRef.current = 0
    setScore(0)
    setBelt([])
    setPacked([])
    setMsg(null)
    setLeft(ROUND_S)
    setPhase('play')
  }

  useEffect(() => {
    if (phase !== 'play') return undefined
    if (left <= 0) {
      setBelt([])
      setNewBest(recordBest('pack', scoreRef.current))
      recordPlay('pack')
      setPhase('over')
      haptic('success')
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase])

  // Items ride the belt faster as the clock runs down.
  useEffect(() => {
    if (phase !== 'play') return undefined
    const elapsed = ROUND_S - left
    const every = Math.max(550, 1050 - elapsed * 15)
    const t = setInterval(() => {
      const [e, name, good] = pick(ITEMS)
      setBelt((cur) => [...cur, { id: nextId++, e, name, good, ms: Math.max(2600, 4400 - elapsed * 50) }])
    }, every)
    return () => clearInterval(t)
  }, [phase, Math.floor((ROUND_S - left) / 5)]) // eslint-disable-line react-hooks/exhaustive-deps

  function packIt(item) {
    if (phase !== 'play') return
    setBelt((cur) => cur.filter((i) => i.id !== item.id))
    if (item.good) {
      haptic('like')
      scoreRef.current += 1
      setPacked((p) => [...p.slice(-9), item.e])
      setBump((b) => b + 1)
      setMsg({ ok: true, text: `${item.e} ${item.name} pack! ${pick(['✅', '👍', '💼'])}` })
    } else {
      haptic('warn')
      scoreRef.current -= 1
      setMsg({ ok: false, text: `${item.e} ${item.name}?! Waleema mein? ${pick(['😂', '🙈', '🤦'])} −1` })
    }
    setScore(scoreRef.current)
    later(() => setMsg(null), 900)
  }

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 5 ? '#ed4956' : undefined],
          ['Pack', score, '#25d366'],
        ]}
      />
      <p className="mb-2 h-5 text-center text-sm font-semibold" style={{ color: msg ? (msg.ok ? '#25d366' : '#ed4956') : undefined }}>
        {msg ? msg.text : 'Sirf Waleema ka saamaan tap karke suitcase mein daaliye 🧳'}
      </p>
      <div
        data-testid="pack-arena"
        className="zu-game-arena relative h-[360px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'linear-gradient(180deg, rgba(0,149,246,0.12), rgba(168,85,247,0.12))' }}
      >
        {/* Conveyor belt */}
        <div className="absolute left-0 right-0 top-[70px] h-24 border-y-4 border-neutral-600" style={{ background: 'repeating-linear-gradient(90deg, #2a2a2a 0 18px, #333 18px 36px)' }} />
        {belt.map((i) => (
          <button
            key={i.id}
            type="button"
            data-good={i.good ? 'true' : 'false'}
            onPointerDown={() => packIt(i)}
            onAnimationEnd={() => setBelt((cur) => cur.filter((x) => x.id !== i.id))}
            className="absolute top-[80px] flex size-[72px] flex-col items-center justify-center rounded-xl bg-white/5 leading-none"
            style={{ animation: `zu-belt ${i.ms}ms linear forwards` }}
          >
            <span className="text-[40px]">{i.e}</span>
            <span className="mt-1 text-[9px] text-ig-muted">{i.name}</span>
          </button>
        ))}

        {/* Suitcase */}
        <div className="absolute bottom-4 left-1/2 w-56 -translate-x-1/2 text-center">
          <div key={bump} className="text-7xl leading-none" style={{ animation: bump ? 'zu-pop 0.25s ease-out' : undefined }}>
            🧳
          </div>
          <div className="mt-2 flex min-h-7 flex-wrap justify-center gap-0.5 text-xl">{packed.map((e, k) => <span key={k}>{e}</span>)}</div>
        </div>

        {phase === 'ready' && (
          <GameOverlay
            emoji="🧳"
            title="Pack for the Waleema"
            lines={['Belt pe saamaan aa raha hai, Waleema wale tap kariye', '👔 👞 💍 📱 💄 = +1', '🍎 🧸 🐟 🍳 jaisi faltu cheezein = −1']}
            button="Packing shuru!"
            onButton={start}
            color="#0095f6"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={score >= 15 ? '🏆' : '🧳'}
            title={score >= 15 ? 'Perfect packing! Waleema ready 🧳✨' : score >= 8 ? 'Achhi packing! 👍' : 'Kuch toh bhool gaye 😅'}
            lines={[`${score} points`, newBest ? '✨ Naya best!' : '']}
            button="Dobara pack kariye"
            onButton={start}
            win={score >= 15}
            color="#0095f6"
          />
        )}
      </div>
    </div>
  )
}
