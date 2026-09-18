import { useEffect, useState } from 'react'
import { bumpStat, rand, recordBest, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameStats } from './GameShell'

const COLS = 7
const ROWS = 9
// Busy wedding clutter. No hearts (or heart-printed things like 💌) in here — the one ❤️ has to be unique.
const DECOYS = ['🌸', '🌹', '💐', '🌙', '⭐', '🕌', '🪔', '🎁', '🌼', '🍬', '🎀', '🌷', '✨', '🍭', '🎊', '🪷', '🍓']
const FOUND_LINES = ['Mil gaya! 👀', 'Kya nazar hai! ✨', 'Pakad liya dil 💕', 'Wah! Agla dhoondo', 'Detective ho aap 🕵️']

function makeBoard() {
  const cells = Array.from({ length: COLS * ROWS }, () => ({
    emoji: DECOYS[Math.floor(Math.random() * DECOYS.length)],
    rot: Math.round(rand(-25, 25)),
  }))
  const heart = Math.floor(Math.random() * cells.length)
  cells[heart] = { emoji: '❤️', rot: Math.round(rand(-25, 25)), heart: true }
  return { cells, startedAt: Date.now() }
}

export default function HiddenHeart() {
  const [board, setBoard] = useState(makeBoard)
  const [found, setFound] = useState(0)
  const [flash, setFlash] = useState(null) // { index, ok, text }
  const [secs, setSecs] = useState(0)
  const [solved, setSolved] = useState(false)
  const { later } = useTimeouts()

  useEffect(() => {
    if (solved) return undefined
    const t = setInterval(() => setSecs(Math.floor((Date.now() - board.startedAt) / 1000)), 1000)
    return () => clearInterval(t)
  }, [board, solved])

  function tap(i) {
    if (solved) return
    if (board.cells[i].heart) {
      haptic('like')
      setSolved(true)
      setFound((f) => f + 1)
      bumpStat('hidden')
      recordBest('hidden', Math.max(1, Math.floor((Date.now() - board.startedAt) / 1000)), true)
      setFlash({ index: i, ok: true, text: FOUND_LINES[Math.floor(Math.random() * FOUND_LINES.length)] })
      later(() => {
        setBoard(makeBoard())
        setSecs(0)
        setSolved(false)
        setFlash(null)
      }, 1300)
    } else {
      haptic('warn')
      setFlash({ index: i, ok: false, text: 'Yeh nahi 😅' })
      later(() => setFlash((f) => (f && !f.ok ? null : f)), 700)
    }
  }

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${secs}s`],
          ['Mile', found, '#a855f7'],
        ]}
      />
      <p className="mb-2 text-center text-sm">Dil kahan chhupa hai? 👀</p>
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
            key={i}
            type="button"
            data-heart={c.heart ? 'true' : undefined}
            onPointerDown={() => tap(i)}
            className="flex aspect-square items-center justify-center rounded-lg text-[22px] leading-none"
            style={{
              transform: `rotate(${c.rot}deg)`,
              background: flash?.index === i ? (flash.ok ? 'rgba(37,211,102,0.35)' : 'rgba(237,73,86,0.3)') : undefined,
              animation: flash?.index === i && !flash.ok ? 'zu-shake 0.25s' : undefined,
            }}
          >
            {c.emoji}
          </button>
        ))}
      </div>
      <p className="mt-2 h-5 text-center text-sm font-semibold" style={{ color: flash?.ok ? '#25d366' : '#ed4956' }}>
        {flash?.text || ''}
      </p>
    </div>
  )
}
