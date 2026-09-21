import { useState } from 'react'
import { pick, recordBest, recordPlay, shuffle, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay } from './GameShell'

// Each set is listed in its correct order.
const SETS = [
  {
    title: 'Zain ❤️ Uzma ki shaadi — asli dates!',
    items: ['🤝 Baat Pakki', '💛 Haldi · 26 Oct', '🌿 Mehendi · 27 Oct', '📜 Nikah · 28 Oct', '😴 Aaraam ka din · 29 Oct', '🍽️ Walima · 30 Oct'],
  },
  {
    title: 'Nikah ki rasmein',
    items: ['🐎 Baraat ka aana', '🎤 Khutba-e-Nikah', '🗣️ Ijaab-o-Qubool', '✍️ Nikahnama pe dastakhat', '🤲 Dua', '🍬 Chhuhare baantna'],
  },
  {
    title: 'Ek pyaari kahani',
    items: ['👀 Pehli mulaqat', '🤝 Baat pakki', '💍 Ring', '📜 Nikah', '🤲 Dua', '🍽️ Waleema', '🎉 Jashn'],
  },
  {
    title: 'Shaadi wale din',
    items: ['💄 Tayyari', '📸 Photoshoot', '🐎 Baraat', '📜 Nikah', '🍛 Khaana', '😢 Rukhsati'],
  },
]

export default function ArrangeNikah() {
  const [order, setOrder] = useState(() => shuffle(SETS.map((_, i) => i)))
  const [k, setK] = useState(0)
  const [pool, setPool] = useState(() => shuffle(SETS[order[0]].items))
  const [placed, setPlaced] = useState([])
  const [result, setResult] = useState(null) // null | boolean[] per slot
  const [tries, setTries] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [line, setLine] = useState('')
  const { later } = useTimeouts()

  const set = SETS[order[k]]

  function load(idx) {
    setK(idx)
    setPool(shuffle(SETS[order[idx]].items))
    setPlaced([])
    setResult(null)
    setTries(0)
  }

  function place(item) {
    if (result) return
    haptic('tap')
    const next = [...placed, item]
    setPlaced(next)
    if (next.length === set.items.length) check(next)
  }

  function unplace(i) {
    if (result) return
    haptic('tap')
    setPlaced(placed.slice(0, i).concat(placed.slice(i + 1)))
  }

  function check(p) {
    const marks = p.map((x, i) => x === set.items[i])
    setResult(marks)
    if (marks.every(Boolean)) {
      haptic('like')
      // Right first time counts double.
      const pts = tries === 0 ? 2 : 1
      setScore((s) => s + pts)
      setLine(tries === 0 ? 'Pehli baar mein sahi! MashaAllah ✨ +2' : pick(['Ab sahi hai! 👏 +1', 'Tartib mil gayi! +1']))
      later(() => {
        if (k + 1 < order.length) load(k + 1)
        else {
          setDone(true)
          recordBest('arrange', score + pts)
          recordPlay('arrange')
        }
      }, 1500)
    } else {
      haptic('warn')
      setLine(`${marks.filter(Boolean).length}/${marks.length} sahi jagah pe — laal wale dobara lagaiye`)
      later(() => {
        // Keep the right ones in place, send the wrong ones back.
        setTries((t) => t + 1)
        setPlaced(p.filter((x, i) => marks[i] && marks.slice(0, i).every(Boolean)))
        setResult(null)
      }, 1500)
    }
  }

  function again() {
    haptic('tap')
    const o = shuffle(SETS.map((_, i) => i))
    setOrder(o)
    setScore(0)
    setDone(false)
    setK(0)
    setPool(shuffle(SETS[o[0]].items))
    setPlaced([])
    setResult(null)
    setTries(0)
    setLine('')
  }

  return (
    <div data-testid="arrange-nikah">
      <div className="mb-2 flex justify-between text-xs text-ig-muted">
        <span>
          Set {k + 1}/{order.length}
        </span>
        <span>
          Score <b className="text-ig-text">{score}</b>
        </span>
      </div>
      <div className="relative rounded-2xl border border-ig-border p-4" style={{ background: 'linear-gradient(160deg, rgba(37,211,102,0.12), rgba(245,197,24,0.12))' }}>
        <p className="text-center text-base font-semibold">{set.title}</p>
        <p className="text-center text-[11px] text-ig-muted">Sahi tartib mein tap kariye — pehle se aakhir tak</p>

        <ol className="mt-3 space-y-1.5" data-testid="arrange-slots">
          {set.items.map((_, i) => {
            const item = placed[i]
            const mark = result?.[i]
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => item && unplace(i)}
                  className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm"
                  style={{
                    borderColor: result ? (mark ? '#25d366' : '#ed4956') : item ? 'var(--color-ig-border)' : 'rgba(255,255,255,0.08)',
                    borderStyle: item ? 'solid' : 'dashed',
                    background: result ? (mark ? 'rgba(37,211,102,0.15)' : 'rgba(237,73,86,0.15)') : item ? 'var(--color-ig-card)' : 'transparent',
                  }}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ig-elevated text-[10px] font-bold">{i + 1}</span>
                  <span className={item ? '' : 'text-ig-faint'}>{item || '—'}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-3 flex flex-wrap justify-center gap-1.5" data-testid="arrange-pool">
          {pool
            .filter((x) => !placed.includes(x))
            .map((x) => (
              <button
                key={x}
                type="button"
                data-item={x}
                onClick={() => place(x)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white active:scale-95"
                style={{ background: 'linear-gradient(90deg,#25d366,#0aa7a0)', animation: 'zu-pop 0.2s ease-out' }}
              >
                {x}
              </button>
            ))}
        </div>
        <p className="mt-3 h-5 text-center text-sm font-semibold" style={{ color: result ? (result.every(Boolean) ? '#25d366' : '#ed4956') : undefined }}>
          {result ? line : ''}
        </p>

        {done && (
          <GameOverlay
            emoji="📜"
            title={score >= 7 ? 'Shaadi ke expert! Sab tartib se 📜✨' : 'Saari rasmein samajh aa gayi! 👏'}
            lines={[`Score: ${score}/${SETS.length * 2}`]}
            button="Phir se kheliye"
            onButton={again}
            win={score >= 7}
            color="#25d366"
          />
        )}
      </div>
    </div>
  )
}
