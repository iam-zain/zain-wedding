import { useState } from 'react'
import { pick, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import Confetti from '../Confetti'

const ZAIN = { id: 'zain', e: '🤵', name: 'Zain', color: '#0095f6' }
const UZMA = { id: 'uzma', e: '👰', name: 'Uzma', color: '#f472b6' }
const LINES3 = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
// A little of the computer's attention wanders, so it can be beaten.
const SLIP = 0.22

function winner(b) {
  for (const l of LINES3) {
    const [a, c, d] = l
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { who: b[a], line: l }
  }
  return b.every(Boolean) ? { who: 'draw', line: [] } : null
}

/** Win if it can, block if it must, else centre, corner, anything. */
function computerMove(b, me, them) {
  const free = b.map((v, i) => (v ? null : i)).filter((i) => i != null)
  if (Math.random() < SLIP) return pick(free)
  for (const who of [me, them]) {
    for (const i of free) {
      const t = b.slice()
      t[i] = who
      if (winner(t)?.who === who) return i
    }
  }
  if (!b[4]) return 4
  const corners = [0, 2, 6, 8].filter((i) => !b[i])
  return corners.length ? pick(corners) : pick(free)
}

const WIN_LINES = {
  zain: ['Zain jeet gaya! 🤵🏆', 'Dulhe ki jeet! 🤵', 'Zain ne baazi maar li 💪'],
  uzma: ['Uzma jeet gayi! 👰🏆', 'Dulhan ki jeet! 👰', 'Uzma ne baazi maar li 💅'],
  draw: ['Barabar! Jodi perfect hai 💕', 'Draw — dono ek doosre ke liye bane hain 💞', 'Koi nahi haara — pyaar jeeta 🤍'],
}

export default function ChooseYours() {
  const [mode, setMode] = useState('cpu') // cpu | friend
  const [me, setMe] = useState(null) // 'zain' | 'uzma' in cpu mode
  const [board, setBoard] = useState(Array(9).fill(null))
  const [turn, setTurn] = useState('zain')
  const [firstTurn, setFirstTurn] = useState('zain')
  const [result, setResult] = useState(null) // { who, line, text }
  const [tally, setTally] = useState({ zain: 0, uzma: 0, draw: 0 })
  const [thinking, setThinking] = useState(false)
  const { later, clearAll } = useTimeouts()

  const P = (id) => (id === 'zain' ? ZAIN : UZMA)
  const other = (id) => (id === 'zain' ? 'uzma' : 'zain')

  function finish(b) {
    const w = winner(b)
    if (!w) return false
    const text = pick(WIN_LINES[w.who])
    setResult({ ...w, text })
    setTally((t) => ({ ...t, [w.who]: t[w.who] + 1 }))
    recordPlay('ttt')
    haptic(w.who === 'draw' ? 'tap' : mode === 'cpu' && w.who !== me ? 'warn' : 'success')
    return true
  }

  function place(i, who, b) {
    const next = b.slice()
    next[i] = who
    setBoard(next)
    if (!finish(next)) setTurn(other(who))
    return next
  }

  function cpuTurn(b, cpu) {
    setThinking(true)
    later(() => {
      setThinking(false)
      place(computerMove(b, cpu, other(cpu)), cpu, b)
    }, 550)
  }

  function newGame(starter, chosen = me) {
    clearAll()
    setThinking(false)
    const b = Array(9).fill(null)
    setBoard(b)
    setResult(null)
    setTurn(starter)
    setFirstTurn(starter)
    if (mode === 'cpu' && chosen && starter !== chosen) cpuTurn(b, starter)
  }

  function choose(id) {
    haptic('tap')
    setMe(id)
    setTally({ zain: 0, uzma: 0, draw: 0 })
    newGame('zain', id)
  }

  function tap(i) {
    if (result || board[i] || thinking) return
    if (mode === 'cpu' && turn !== me) return
    haptic('tap')
    const next = place(i, turn, board)
    if (mode === 'cpu' && !winner(next)) cpuTurn(next, other(me))
  }

  function switchMode(m) {
    if (m === mode) return
    haptic('tap')
    clearAll()
    setMode(m)
    setMe(null)
    setThinking(false)
    setBoard(Array(9).fill(null))
    setResult(null)
    setTurn('zain')
    setTally({ zain: 0, uzma: 0, draw: 0 })
  }

  const picking = mode === 'cpu' && !me
  const status = result
    ? result.text
    : thinking
      ? `${P(turn).e} ${P(turn).name} ${turn === 'zain' ? 'soch raha hai' : 'soch rahi hai'}…`
      : mode === 'cpu'
        ? turn === me
          ? `Aapki baari ${P(me).e}`
          : `${P(turn).name} ki baari…`
        : `${P(turn).e} ${P(turn).name} ki baari`

  return (
    <div data-testid="choose-yours">
      {/* Mode switch */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-ig-card p-1 text-xs font-semibold">
        {[
          ['cpu', '📱 Phone se kheliye'],
          ['friend', '👫 Dost ke saath'],
        ].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className="rounded-full py-2 transition-colors"
            style={{ background: mode === m ? 'linear-gradient(90deg,#0095f6,#f472b6)' : 'transparent', color: mode === m ? '#fff' : undefined }}
          >
            {label}
          </button>
        ))}
      </div>

      {picking ? (
        <div className="rounded-2xl border border-ig-border p-5 text-center" style={{ background: 'linear-gradient(160deg, rgba(0,149,246,0.14), rgba(244,114,182,0.14))' }}>
          <p className="text-lg font-semibold">Choose yours 💕</p>
          <p className="mt-1 text-xs text-ig-muted">Aap kiski taraf se kheloge?</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[ZAIN, UZMA].map((p) => (
              <button
                key={p.id}
                type="button"
                data-testid={`choose-${p.id}`}
                onClick={() => choose(p.id)}
                className="rounded-2xl border-2 p-4 active:scale-95"
                style={{ borderColor: p.color, background: `${p.color}22` }}
              >
                <span className="block text-5xl">{p.e}</span>
                <span className="mt-2 block font-semibold" style={{ color: p.color }}>
                  {p.name}
                </span>
                <span className="block text-[11px] text-ig-muted">{p.id === 'zain' ? 'Dulhe ki team' : 'Dulhan ki team'}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="rounded-full bg-ig-card px-3 py-1">
              🤵 <b style={{ color: ZAIN.color }}>{tally.zain}</b>
            </span>
            <span className="rounded-full bg-ig-card px-3 py-1 text-ig-muted">
              💕 {tally.draw}
            </span>
            <span className="rounded-full bg-ig-card px-3 py-1">
              👰 <b style={{ color: UZMA.color }}>{tally.uzma}</b>
            </span>
          </div>
          <p className="mb-2 h-6 text-center text-base font-semibold" data-testid="ttt-status" style={{ color: result && result.who !== 'draw' ? P(result.who).color : undefined }}>
            {status}
          </p>

          <div className="relative">
            {result && result.who !== 'draw' && (mode === 'friend' || result.who === me) && <Confetti count={50} />}
            <div
              data-testid="ttt-board"
              className="zu-game-arena mx-auto grid max-w-[330px] grid-cols-3 gap-2 rounded-3xl p-3"
              style={{ background: 'linear-gradient(145deg, #d4a64a, #8a5a1c)', boxShadow: '0 0 24px rgba(212,166,74,0.35)' }}
            >
              {board.map((v, i) => {
                const inLine = result?.line.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    data-cell={i}
                    onClick={() => tap(i)}
                    className="flex aspect-square items-center justify-center rounded-2xl text-5xl leading-none"
                    style={{
                      background: inLine ? `${P(result.who).color}55` : 'rgba(40,8,20,0.88)',
                      boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)',
                    }}
                  >
                    {v ? (
                      <span style={{ animation: 'zu-pop 0.2s ease-out' }}>{P(v).e}</span>
                    ) : (
                      <span className="text-lg opacity-20">🌸</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              data-testid="ttt-again"
              onClick={() => {
                haptic('tap')
                // Whoever didn't start last time starts now.
                newGame(other(firstTurn))
              }}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white active:opacity-80"
              style={{ background: 'linear-gradient(90deg,#0095f6,#f472b6)' }}
            >
              {result ? 'Agla game 🔁' : 'Naya game'}
            </button>
            {mode === 'cpu' && (
              <button
                type="button"
                onClick={() => {
                  haptic('tap')
                  clearAll()
                  setMe(null)
                }}
                className="rounded-full border border-ig-border px-5 py-2 text-sm font-semibold active:opacity-80"
              >
                Team badlo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
