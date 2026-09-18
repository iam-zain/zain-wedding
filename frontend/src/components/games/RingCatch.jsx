import { useEffect, useRef, useState } from 'react'
import { bumpStat, rand, recordBest, recordPlay, useTimeouts, LINES, pick } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const ROUND_S = 32
const LEVEL_EVERY_S = 8
const ARENA_H = 380

// Per level: how often rings drop, how long a fall takes, how many drop at
// once, and the chance a drop is a fake ring or a bomb instead.
const LEVELS = [
  { spawn: 1100, fall: 3400, count: 1, trap: 0 },
  { spawn: 900, fall: 2400, count: 1, trap: 0 },
  { spawn: 900, fall: 2200, count: 2, trap: 0 },
  { spawn: 750, fall: 1900, count: 2, trap: 0.35 },
]
const LEVEL_NAMES = ['Aahista 🐢', 'Tez 🏃', 'Do-do rings 💍💍', 'Nakli rings aur bomb 💣']

let nextId = 1

export default function RingCatch() {
  const [phase, setPhase] = useState('ready')
  const [score, setScore] = useState(0)
  const [rings, setRings] = useState(0)
  const [left, setLeft] = useState(ROUND_S)
  const [items, setItems] = useState([])
  const [newBest, setNewBest] = useState(false)
  const [endLine, setEndLine] = useState('')
  const { later, clearAll } = useTimeouts()
  const scoreRef = useRef(0)

  const elapsed = ROUND_S - left
  const level = Math.min(LEVELS.length - 1, Math.floor(elapsed / LEVEL_EVERY_S))

  function start() {
    haptic('tap')
    clearAll()
    scoreRef.current = 0
    setScore(0)
    setRings(0)
    setLeft(ROUND_S)
    setItems([])
    setPhase('play')
  }

  useEffect(() => {
    if (phase !== 'play') return undefined
    const tick = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(tick)
  }, [phase])

  // Restarted on each level change so the spawn rate follows the level.
  useEffect(() => {
    if (phase !== 'play') return undefined
    const cfg = LEVELS[level]
    const spawn = setInterval(() => {
      const drops = []
      for (let n = 0; n < cfg.count; n++) {
        let kind = 'ring'
        if (Math.random() < cfg.trap) kind = Math.random() < 0.5 ? 'fake' : 'bomb'
        // Spread simultaneous drops across the width so they don't overlap.
        const lane = cfg.count > 1 ? (n === 0 ? rand(4, 40) : rand(50, 80)) : rand(6, 78)
        drops.push({ id: nextId++, kind, x: lane, fall: cfg.fall * rand(0.9, 1.1) })
      }
      setItems((cur) => [...cur, ...drops])
    }, cfg.spawn)
    return () => clearInterval(spawn)
  }, [phase, level])

  useEffect(() => {
    if (phase === 'play' && left <= 0) {
      clearAll()
      setItems([])
      setNewBest(recordBest('ring', scoreRef.current))
      recordPlay('ring')
      setEndLine(pick(scoreRef.current >= 15 ? LINES.ringWin : LINES.ringLose))
      setPhase('over')
      haptic('success')
    }
  }, [left, phase, clearAll])

  function tap(item) {
    if (item.popped) return
    let points = 1
    if (item.kind === 'fake') points = -1
    if (item.kind === 'bomb') points = -3
    haptic(points > 0 ? 'like' : 'warn')
    scoreRef.current += points
    setScore(scoreRef.current)
    if (item.kind === 'ring') {
      setRings((r) => r + 1)
      bumpStat('rings')
    }
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, popped: points > 0 ? `+${points}` : `${points}` } : i)))
    later(() => setItems((cur) => cur.filter((i) => i.id !== item.id)), 450)
  }

  const remove = (id) => setItems((cur) => cur.filter((i) => i.id !== id || i.popped))

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, left <= 5 ? '#ed4956' : undefined],
          ['Level', level + 1, '#a855f7'],
          ['Score', score, '#f7971e'],
        ]}
      />
      <div
        data-testid="ring-arena"
        className="zu-game-arena relative overflow-hidden rounded-2xl border border-ig-border"
        style={{ height: ARENA_H, background: 'linear-gradient(180deg, rgba(247,151,30,0.14), rgba(237,73,86,0.1) 70%, rgba(168,85,247,0.16))' }}
      >
        {phase === 'play' && (
          <p className="absolute left-0 right-0 top-2 text-center text-[11px] text-ig-muted">
            Level {level + 1}: {LEVEL_NAMES[level]}
          </p>
        )}

        {items.map((i) =>
          i.popped ? (
            <span
              key={i.id}
              className="pointer-events-none absolute text-xl font-bold"
              style={{
                left: `${i.x}%`,
                top: '45%',
                color: i.popped.startsWith('+') ? '#25d366' : '#ed4956',
                animation: 'zu-float 0.45s ease-out forwards',
              }}
            >
              {i.popped}
            </span>
          ) : (
            <button
              key={i.id}
              type="button"
              onPointerDown={() => tap(i)}
              onAnimationEnd={() => remove(i.id)}
              className="absolute top-0 flex size-14 items-center justify-center text-[36px] leading-none"
              style={{
                left: `${i.x}%`,
                '--fall': `${ARENA_H + 10}px`,
                animation: `zu-fall ${i.fall}ms linear forwards`,
                // Fake rings are real rings gone grey — easy to spot once you look.
                filter: i.kind === 'fake' ? 'grayscale(1) brightness(0.8)' : undefined,
              }}
            >
              {i.kind === 'bomb' ? '💣' : '💍'}
            </button>
          ),
        )}

        {/* The couple waiting at the bottom for the ring. */}
        <div aria-hidden="true" className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-4xl">
          🤵<span className="mx-1 text-2xl">💕</span>👰
        </div>

        {phase === 'ready' && (
          <GameOverlay
            emoji="💍"
            title="Uzma ka ring pakdo 💍"
            lines={[
              'Ring girne se pehle tap karo',
              'Har level tez hota jayega',
              'Grey nakli ring −1 · 💣 bomb −3',
            ]}
            button="Shuru karo"
            onButton={start}
            color="#f7971e"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={score >= 15 ? '🏆' : '💍'}
            title={endLine}
            lines={[`Score: ${score} · ${rings} rings pakdi`, newBest ? '✨ Naya best score!' : '']}
            button="Dobara khelo"
            onButton={start}
            win={score >= 15}
            color="#f7971e"
          />
        )}
      </div>
    </div>
  )
}
