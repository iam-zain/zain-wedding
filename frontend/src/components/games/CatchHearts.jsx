import { useEffect, useRef, useState } from 'react'
import { bumpStat, rand, recordBest, recordPlay, useTimeouts, LINES, pick, weighted } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const ROUND_S = 20
const TARGET = 10
const SPAWN_MS = 520

// [emoji, points, countsAsHeart], weighted by how often it appears.
const OBJECTS = [
  [['❤️', 1, true], 48],
  [['💖', 2, true], 16],
  [['💔', -1, false], 12],
  [['💍', 5, false], 5],
  // Non-hearts — tapping these costs a point.
  [['🍬', -1, false], 5],
  [['🎈', -1, false], 5],
  [['🌸', -1, false], 5],
  [['⭐', -1, false], 4],
  // The couple wander through too — sweet, but not a heart.
  [['👰', -1, false], 3],
  [['🤵', -1, false], 3],
]

let nextId = 1

export default function CatchHearts() {
  const [phase, setPhase] = useState('ready') // ready | play | over
  const [score, setScore] = useState(0)
  const [caught, setCaught] = useState(0)
  const [left, setLeft] = useState(ROUND_S)
  const [items, setItems] = useState([])
  const [newBest, setNewBest] = useState(false)
  const [endLine, setEndLine] = useState('')
  const { later, clearAll } = useTimeouts()
  const scoreRef = useRef(0)

  function start() {
    haptic('tap')
    clearAll()
    scoreRef.current = 0
    setScore(0)
    setCaught(0)
    setLeft(ROUND_S)
    setItems([])
    setPhase('play')
  }

  // Clock + spawner, only while playing.
  useEffect(() => {
    if (phase !== 'play') return undefined
    const tick = setInterval(() => setLeft((s) => s - 1), 1000)
    const spawn = setInterval(() => {
      const [emoji, points, heart] = weighted(OBJECTS)
      const id = nextId++
      setItems((cur) => [...cur, { id, emoji, points, heart, x: rand(6, 82), y: rand(6, 80) }])
      later(() => setItems((cur) => cur.filter((i) => i.id !== id || i.popped)), rand(900, 1300))
    }, SPAWN_MS)
    return () => {
      clearInterval(tick)
      clearInterval(spawn)
    }
  }, [phase, later])

  useEffect(() => {
    if (phase === 'play' && left <= 0) {
      clearAll()
      setItems([])
      setNewBest(recordBest('catch', scoreRef.current))
      recordPlay('catch')
      setEndLine(pick(scoreRef.current >= TARGET ? LINES.catchWin : LINES.catchLose))
      setPhase('over')
      haptic(scoreRef.current >= TARGET ? 'success' : 'warn')
    }
  }, [left, phase, clearAll])

  function tap(item) {
    if (item.popped) return
    haptic(item.points > 0 ? 'like' : 'warn')
    scoreRef.current += item.points
    setScore(scoreRef.current)
    if (item.heart) {
      setCaught((c) => c + 1)
      bumpStat('hearts')
    }
    const label = item.points > 0 ? `+${item.points}` : `${item.points}`
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, popped: label } : i)))
    later(() => setItems((cur) => cur.filter((i) => i.id !== item.id)), 450)
  }

  const won = score >= TARGET

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 5 ? '#ed4956' : undefined],
          ['Score', score, '#ff6b81'],
          ['Dil', caught, '#f472b6'],
        ]}
      />
      <div
        data-testid="catch-arena"
        className="zu-game-arena relative h-[380px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'linear-gradient(160deg, rgba(255,107,129,0.18), rgba(168,85,247,0.1))' }}
      >
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            onPointerDown={() => tap(i)}
            className="absolute flex size-14 items-center justify-center text-[38px] leading-none"
            style={{ left: `${i.x}%`, top: `${i.y}%`, animation: 'zu-pop 0.18s ease-out' }}
          >
            {i.popped ? (
              <span
                className="text-xl font-bold"
                style={{ color: i.points > 0 ? '#25d366' : '#ed4956', animation: 'zu-float 0.45s ease-out forwards' }}
              >
                {i.popped}
              </span>
            ) : (
              i.emoji
            )}
          </button>
        ))}

        {phase === 'ready' && (
          <GameOverlay
            emoji="💕"
            title="Dil pakdiye! 💕"
            lines={[
              `${ROUND_S} second mein ${TARGET} points banaiye`,
              '❤️ +1 · 💖 +2 · 💍 +5 · 💔 −1',
              'Jo dil nahi hai (🍬🎈🌸⭐👰🤵) usse bachiye: −1',
            ]}
            button="Shuru kariye"
            onButton={start}
            color="#ff6b81"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={won ? '🏆' : '💔'}
            title={endLine}
            lines={[`Score: ${score} · ${caught} dil pakde`, newBest ? '✨ Naya best score!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={won}
            color="#ff6b81"
          />
        )}
      </div>
    </div>
  )
}
