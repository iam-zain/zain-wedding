import { useState } from 'react'
import { bumpStat, recordBest, recordPlay, shuffle, useTimeouts, LINES, pick } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const PAIRS = 8
const POOL = ['💍', '❤️', '🌹', '💌', '🕌', '🌙', '🤲', '💕', '🥰', '💐', '🪔', '🎁', '👰', '🤵', '🍬', '✨']

function deal() {
  const picks = shuffle(POOL).slice(0, PAIRS)
  return shuffle([...picks, ...picks]).map((emoji, i) => ({ id: i, emoji, matched: false }))
}

export default function HeartMemory() {
  const [cards, setCards] = useState(deal)
  const [open, setOpen] = useState([]) // indices currently face-up (max 2)
  const [seen, setSeen] = useState(() => new Set()) // indices ever turned over
  const [moves, setMoves] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [done, setDone] = useState(false)
  const [newBest, setNewBest] = useState(false)
  const [toast, setToast] = useState(null) // { ok, text }
  const [endLine, setEndLine] = useState('')
  const { later, clearAll } = useTimeouts()

  function restart() {
    haptic('tap')
    clearAll()
    setCards(deal())
    setOpen([])
    setSeen(new Set())
    setMoves(0)
    setMistakes(0)
    setDone(false)
    setToast(null)
  }

  function flip(i) {
    if (done || open.length === 2 || open.includes(i) || cards[i].matched) return
    haptic('tap')
    const next = [...open, i]
    setOpen(next)
    if (next.length < 2) return

    const [a, b] = next
    const nextMoves = moves + 1
    setMoves(nextMoves)

    if (cards[a].emoji === cards[b].emoji) {
      haptic('like')
      setToast({ ok: true, text: pick(LINES.good) })
      const updated = cards.map((c, k) => (k === a || k === b ? { ...c, matched: true } : c))
      later(() => {
        setCards(updated)
        setOpen([])
        if (updated.every((c) => c.matched)) {
          setDone(true)
          setNewBest(recordBest('memory', nextMoves, true))
          recordPlay('memory')
          setEndLine(pick(LINES.memoryWin))
          if (mistakes === 0) bumpStat('memoryPerfect')
          haptic('success')
        }
      }, 350)
    } else {
      // Only a "real" mistake if you'd already seen one of these cards, a
      // first-ever look can't be remembered, so it isn't held against you.
      if (seen.has(a) || seen.has(b)) {
        setMistakes((m) => m + 1)
        setToast({ ok: false, text: pick(LINES.bad) })
      }
      later(() => setOpen([]), 850)
    }
    setSeen((s) => new Set(s).add(a).add(b))
  }

  const perfect = done && mistakes === 0

  return (
    <div>
      <GameStats
        items={[
          ['Chaal', moves],
          ['Jode', `${cards.filter((c) => c.matched).length / 2}/${PAIRS}`, '#25d366'],
          ['Galti', mistakes, mistakes ? '#ed4956' : undefined],
        ]}
      />
      <div
        data-testid="memory-board"
        className="zu-game-arena relative grid grid-cols-4 gap-2 rounded-2xl border border-ig-border p-3"
        style={{ background: 'linear-gradient(160deg, rgba(37,211,102,0.12), rgba(0,149,246,0.1))' }}
      >
        {cards.map((c, i) => {
          const up = c.matched || open.includes(i)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => flip(i)}
              data-emoji={c.emoji}
              className="flex aspect-square items-center justify-center rounded-xl text-3xl leading-none transition-colors duration-200"
              style={{
                background: up
                  ? c.matched
                    ? 'rgba(37,211,102,0.22)'
                    : 'var(--color-ig-elevated)'
                  : 'linear-gradient(135deg, #ff6b81, #a855f7)',
                opacity: c.matched ? 0.75 : 1,
              }}
            >
              {up ? <span style={{ animation: 'zu-pop 0.2s ease-out' }}>{c.emoji}</span> : <span className="text-lg text-white/80">🤍</span>}
            </button>
          )
        })}

        {done && (
          <GameOverlay
            emoji={perfect ? '🧠' : '💗'}
            title={perfect ? 'Yaad Reh Gaya! Ek bhi galti nahi 🧠' : endLine}
            lines={[`${moves} chaal · ${mistakes} galti`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={restart}
            win
            color="#25d366"
          />
        )}
      </div>
      <p className="mt-2 h-5 text-center text-sm font-semibold" style={{ color: toast?.ok ? '#25d366' : '#ed4956' }}>
        {done ? '' : toast?.text || ''}
      </p>
      <p className="mt-1 text-center text-[11px] text-ig-faint">
        Galti tab ginti hai jab pehle dekha hua card phir galat kholo.
      </p>
    </div>
  )
}
