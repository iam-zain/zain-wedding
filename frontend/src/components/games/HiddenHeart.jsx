import { useEffect, useState } from 'react'
import { bumpStat, LINES, pick, rand, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const COLS = 7
const ROWS = 9
const ROUND_S = 5
// Misses in a row before the game pauses — so a phone left on this page
// doesn't keep playing (and counting rounds) by itself.
const MAX_STREAK_MISSES = 3
// The heart to find changes colour each board. All pre-2019 emoji, so old
// Android phones draw them instead of empty boxes.
const HEARTS = ['❤️', '🧡', '💛', '💚', '💙', '💜']
// Busy wedding clutter. No hearts (or heart-printed things like 💌) in here —
// the target has to be the only heart on the board.
const DECOYS = ['🌸', '🌹', '💐', '🌙', '⭐', '🕌', '🪔', '🎁', '🌼', '🍬', '🎀', '🌷', '✨', '🍭', '🎊', '🪷', '🍓', '👰', '🤵']

function makeBoard() {
  const target = pick(HEARTS)
  const cells = Array.from({ length: COLS * ROWS }, () => ({ emoji: pick(DECOYS), rot: Math.round(rand(-25, 25)) }))
  cells[Math.floor(Math.random() * cells.length)] = { emoji: target, rot: Math.round(rand(-25, 25)), heart: true }
  return { cells, target, startedAt: Date.now() }
}

export default function HiddenHeart() {
  const [board, setBoard] = useState(makeBoard)
  const [found, setFound] = useState(0)
  const [missed, setMissed] = useState(0)
  const [left, setLeft] = useState(ROUND_S)
  const [flash, setFlash] = useState(null) // { index, ok, text, reveal }
  const [locked, setLocked] = useState(true) // between boards, or paused
  const [phase, setPhase] = useState('ready') // ready | play | paused
  const [streak, setStreak] = useState(0) // misses in a row
  const { later } = useTimeouts()

  function nextBoard(delay) {
    setLocked(true)
    later(() => {
      setBoard(makeBoard())
      setLeft(ROUND_S)
      setFlash(null)
      setLocked(false)
    }, delay)
  }

  function start() {
    haptic('tap')
    setBoard(makeBoard())
    setLeft(ROUND_S)
    setFlash(null)
    setStreak(0)
    setFound(0)
    setMissed(0)
    setPhase('play')
    setLocked(false)
  }

  // Five-second countdown; running out reveals the heart and moves on.
  useEffect(() => {
    if (locked) return undefined
    if (left <= 0) {
      haptic('warn')
      setMissed((m) => m + 1)
      recordPlay('hidden')
      setFlash({ index: board.cells.findIndex((c) => c.heart), ok: false, text: pick(LINES.hiddenMissed), reveal: true })
      if (streak + 1 >= MAX_STREAK_MISSES) {
        setStreak(0)
        setLocked(true)
        later(() => setPhase('paused'), 1400)
      } else {
        setStreak(streak + 1)
        nextBoard(1400)
      }
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, locked]) // eslint-disable-line react-hooks/exhaustive-deps

  function tap(i) {
    if (locked) return
    if (board.cells[i].heart) {
      haptic('like')
      setFound((f) => f + 1)
      setStreak(0)
      bumpStat('hidden')
      recordPlay('hidden')
      recordBest('hidden', Math.max(1, Math.round((Date.now() - board.startedAt) / 1000)), true)
      setFlash({ index: i, ok: true, text: pick(LINES.hiddenFound) })
      nextBoard(1100)
    } else {
      haptic('warn')
      setFlash({ index: i, ok: false, text: pick(LINES.bad) })
      later(() => setFlash((f) => (f && !f.ok && !f.reveal ? null : f)), 700)
    }
  }

  const urgent = left <= 2

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, urgent ? '#ed4956' : undefined],
          ['Mile', found, '#25d366'],
          ['Chhoote', missed, missed ? '#ed4956' : undefined],
        ]}
      />
      <p className="mb-1 text-center text-sm">
        Yeh dil kahan chhupa hai? <span className="align-middle text-xl">{board.target}</span>
      </p>
      {/* Time left, as a bar that empties over the five seconds. */}
      <div aria-hidden="true" className="mb-2 h-1.5 overflow-hidden rounded-full bg-ig-card">
        <div
          className="h-full rounded-full"
          style={{
            width: `${(Math.max(0, left) / ROUND_S) * 100}%`,
            background: urgent ? '#ed4956' : 'linear-gradient(90deg,#a855f7,#f472b6)',
            transition: 'width 1s linear',
          }}
        />
      </div>
      <div
        data-testid="hidden-board"
        className="zu-game-arena relative grid gap-0.5 rounded-2xl border border-ig-border p-2"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          background: 'linear-gradient(160deg, rgba(168,85,247,0.16), rgba(244,114,182,0.1))',
        }}
      >
        {board.cells.map((c, i) => (
          <button
            key={`${board.startedAt}-${i}`}
            type="button"
            data-heart={c.heart ? 'true' : undefined}
            onPointerDown={() => tap(i)}
            className="flex aspect-square items-center justify-center rounded-lg text-[22px] leading-none"
            style={{
              transform: `rotate(${c.rot}deg)`,
              background:
                flash?.index === i
                  ? flash.ok
                    ? 'rgba(37,211,102,0.35)'
                    : flash.reveal
                      ? 'rgba(247,151,30,0.4)'
                      : 'rgba(237,73,86,0.3)'
                  : undefined,
              animation: flash?.index === i && !flash.ok ? 'zu-shake 0.25s' : undefined,
            }}
          >
            {c.emoji}
          </button>
        ))}

        {phase === 'ready' && (
          <GameOverlay
            emoji="👀"
            title="Dil kahan chhupa hai? 👀"
            lines={['Har board mein ek dil chhupa hai', `Sirf ${ROUND_S} second — phir agla board!`, 'Har baar dil ka rang badlega 🌈']}
            button="Shuru kariye"
            onButton={start}
            color="#a855f7"
          />
        )}
        {phase === 'paused' && (
          <GameOverlay
            emoji="😴"
            title="Kahan kho gaye?"
            lines={[`${found} dil mile · ${missed} chhoote`]}
            button="Phir se kheliye"
            onButton={start}
            color="#a855f7"
          />
        )}
      </div>
      <p className="mt-2 h-5 text-center text-sm font-semibold" style={{ color: flash?.ok ? '#25d366' : '#ed4956' }}>
        {flash?.text || ''}
      </p>
    </div>
  )
}
