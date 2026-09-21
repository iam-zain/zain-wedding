import { useEffect, useRef, useState } from 'react'
import { pick, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const ROUND_S = 40
const BOXES = [
  { id: 'tech', e: '🔌', name: 'Electronics', color: '#0095f6' },
  { id: 'jewel', e: '💎', name: 'Jewellery', color: '#f5c518' },
  { id: 'love', e: '💕', name: 'Love', color: '#ed4956' },
  { id: 'deen', e: '🕌', name: 'Deen / Shaadi', color: '#25d366' },
]
const GIFTS = [
  ['📱', 'tech'], ['💻', 'tech'], ['🎧', 'tech'], ['📷', 'tech'], ['⌚', 'tech'], ['🔋', 'tech'],
  ['💍', 'jewel'], ['👑', 'jewel'], ['💎', 'jewel'], ['📿', 'deen'],
  ['🌹', 'love'], ['💌', 'love'], ['🧸', 'love'], ['🍫', 'love'], ['💐', 'love'], ['💝', 'love'],
  ['📖', 'deen'], ['🕋', 'deen'], ['🤲', 'deen'], ['🌙', 'deen'], ['🕌', 'deen'],
]
const FROM = ['left', 'right', 'top']

let nextId = 1

export default function GiftRush() {
  const [phase, setPhase] = useState('ready')
  const [left, setLeft] = useState(ROUND_S)
  const [score, setScore] = useState(0)
  const [gift, setGift] = useState(null) // { id, e, box, from, ms }
  const [msg, setMsg] = useState(null)
  const [streak, setStreak] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const scoreRef = useRef(0)
  const streakRef = useRef(0)
  const { later, clearAll } = useTimeouts()

  function nextGift() {
    const [e, box] = pick(GIFTS)
    const elapsed = ROUND_S - left
    setGift({ id: nextId++, e, box, from: pick(FROM), ms: Math.max(1300, 3000 - elapsed * 40) })
  }

  function start() {
    haptic('tap')
    clearAll()
    scoreRef.current = 0
    streakRef.current = 0
    setScore(0)
    setStreak(0)
    setLeft(ROUND_S)
    setMsg(null)
    setPhase('play')
    const [e, box] = pick(GIFTS)
    setGift({ id: nextId++, e, box, from: pick(FROM), ms: 3000 })
  }

  useEffect(() => {
    if (phase !== 'play') return undefined
    if (left <= 0) {
      setGift(null)
      setNewBest(recordBest('gift', scoreRef.current))
      recordPlay('gift')
      setPhase('over')
      haptic('success')
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase])

  // Each gift waits only so long before it's gone.
  useEffect(() => {
    if (phase !== 'play' || !gift) return undefined
    const t = setTimeout(() => {
      streakRef.current = 0
      setStreak(0)
      setMsg({ ok: false, text: 'Gift gir gaya! 😬' })
      nextGift()
    }, gift.ms)
    return () => clearTimeout(t)
  }, [gift?.id, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function drop(box) {
    if (phase !== 'play' || !gift) return
    if (box === gift.box) {
      haptic('like')
      streakRef.current += 1
      const bonus = streakRef.current >= 5 ? 2 : 1
      scoreRef.current += bonus
      setMsg({ ok: true, text: bonus > 1 ? `🔥 ${streakRef.current} lagataar! +2` : pick(['Sahi dabba! 🎁', 'Perfect! ✅', 'Wah! 👏']) })
    } else {
      haptic('warn')
      streakRef.current = 0
      scoreRef.current -= 1
      const right = BOXES.find((b) => b.id === gift.box)
      setMsg({ ok: false, text: `${gift.e} toh ${right.name} mein jaata −1` })
    }
    setStreak(streakRef.current)
    setScore(scoreRef.current)
    later(() => setMsg(null), 900)
    nextGift()
  }

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 5 ? '#ed4956' : undefined],
          ['Score', score, '#25d366'],
          ['🔥', streak],
        ]}
      />
      <p className="mb-2 h-5 text-center text-sm font-semibold" style={{ color: msg ? (msg.ok ? '#25d366' : '#ed4956') : undefined }}>
        {msg ? msg.text : 'Gift sahi dabbe mein daaliye 🎁'}
      </p>
      <div
        data-testid="gift-arena"
        className="zu-game-arena relative h-[400px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'linear-gradient(180deg, rgba(247,151,30,0.14), rgba(237,73,86,0.12))' }}
      >
        {gift && phase === 'play' && (
          <div
            key={gift.id}
            data-gift={gift.box}
            className="absolute left-1/2 top-[28%] -translate-x-1/2 text-center"
            style={{ animation: `zu-in-${gift.from} 0.3s ease-out` }}
          >
            <div className="text-7xl leading-none">{gift.e}</div>
            <div className="mx-auto mt-3 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
              <div className="h-full origin-left rounded-full bg-white/70" style={{ animation: `zu-shrink ${gift.ms}ms linear forwards` }} />
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-2 right-2 grid grid-cols-4 gap-2">
          {BOXES.map((b) => (
            <button
              key={b.id}
              type="button"
              data-box={b.id}
              onClick={() => drop(b.id)}
              className="flex flex-col items-center rounded-2xl border-2 py-3 active:scale-95"
              style={{ borderColor: b.color, background: `${b.color}22` }}
            >
              <span className="text-3xl">🎁</span>
              <span className="text-lg leading-none">{b.e}</span>
              <span className="mt-1 text-[10px] font-semibold leading-tight">{b.name}</span>
            </button>
          ))}
        </div>

        {phase === 'ready' && (
          <GameOverlay
            emoji="🎁"
            title="Tohfa Rush"
            lines={['Shaadi ke tohfe aa rahe hain, chaaron taraf se!', 'Har gift sahi dabbe mein: 🔌 Electronics · 💎 Jewellery · 💕 Love · 🕌 Deen/Shaadi', 'Galat dabba −1 · 5 lagataar sahi = double points 🔥']}
            button="Tohfe lao 🎁"
            onButton={start}
            color="#f7971e"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={score >= 25 ? '🏆' : '🎁'}
            title={score >= 25 ? 'Gift manager of the year! 🏆' : score >= 12 ? 'Tohfe sambhal liye! 🎁' : 'Tohfe bikhar gaye 😅'}
            lines={[`Score: ${score}`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={score >= 25}
            color="#f7971e"
          />
        )}
      </div>
    </div>
  )
}
