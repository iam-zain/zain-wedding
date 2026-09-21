import { useEffect, useRef, useState } from 'react'
import { bumpStat, LINES, pick, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const LIVES = 3
const REAL = '❤️'

/** Round `n` (0-based): more tiles, more fakes, less time — and from round 8 a sneaky 🧡. */
let roundSeq = 0

function makeRound(n) {
  const seq = roundSeq++
  const count = Math.min(9, 4 + Math.floor(n / 3))
  const fakes = ['💔']
  if (n >= 8) fakes.push('🧡')
  if (n >= 14) fakes.push('🖤')
  const fakeCount = Math.max(1, Math.round(count * Math.min(0.55, 0.25 + n * 0.02)))
  const tiles = Array.from({ length: count }, (_, i) => ({ id: `${seq}-${i}`, e: i < fakeCount ? pick(fakes) : REAL, tapped: false }))
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[tiles[i], tiles[j]] = [tiles[j], tiles[i]]
  }
  return { tiles, ms: Math.max(1100, 3000 - n * 90), key: `r${seq}` }
}

export default function TrueHeart() {
  const [phase, setPhase] = useState('ready')
  const [round, setRound] = useState(0) // rounds cleared this game
  const [lives, setLives] = useState(LIVES)
  const [cur, setCur] = useState(() => makeRound(0))
  const [msg, setMsg] = useState(null)
  const [endLine, setEndLine] = useState('')
  const [newBest, setNewBest] = useState(false)
  const locked = useRef(false)
  const livesRef = useRef(LIVES)
  const roundRef = useRef(0)
  const { later, clearAll } = useTimeouts()

  function start() {
    haptic('tap')
    clearAll()
    livesRef.current = LIVES
    roundRef.current = 0
    setLives(LIVES)
    setRound(0)
    setMsg(null)
    setCur(makeRound(0))
    locked.current = false
    setPhase('play')
  }

  function nextRound(delay) {
    locked.current = true
    later(() => {
      setCur(makeRound(roundRef.current))
      setMsg(null)
      locked.current = false
    }, delay)
  }

  function loseLife(text) {
    haptic('warn')
    livesRef.current -= 1
    setLives(livesRef.current)
    setMsg({ ok: false, text })
    if (livesRef.current <= 0) {
      locked.current = true
      later(() => {
        setNewBest(recordBest('trueheart', roundRef.current))
        recordPlay('trueheart')
        setEndLine(
          roundRef.current >= 15 ? 'Dil Toota Nahi! 💪' : pick(['Dil toot gaya 💔', 'Nakli dil ne dhokha de diya 😅', 'Phir se try kariye 🤍']),
        )
        setPhase('over')
      }, 700)
    } else nextRound(700)
  }

  // Round clock.
  useEffect(() => {
    if (phase !== 'play') return undefined
    const t = setTimeout(() => {
      if (!locked.current) loseLife(pick(['Time khatam! ⏰', 'Jaldi kariye! 🏃', 'Der ho gayi 😬']))
    }, cur.ms)
    return () => clearTimeout(t)
    // Keyed on the round, not the tiles: tapping a heart mustn't restart the clock.
  }, [cur.key, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function tap(k) {
    if (locked.current || phase !== 'play') return
    const t = cur.tiles[k]
    if (t.tapped) return
    if (t.e !== REAL) return loseLife(`${t.e} nakli tha! ${pick(['🙈', '😬', '😅'])}`)
    haptic('like')
    const tiles = cur.tiles.map((x, i) => (i === k ? { ...x, tapped: true } : x))
    setCur({ ...cur, tiles })
    if (tiles.every((x) => x.e !== REAL || x.tapped)) {
      roundRef.current += 1
      setRound(roundRef.current)
      bumpStat('trueHeart')
      setMsg({ ok: true, text: roundRef.current % 5 === 0 ? `🔥 ${roundRef.current} rounds! Speed badh rahi hai` : pick(LINES.good) })
      locked.current = true
      nextRound(350)
    }
  }

  const cols = cur.tiles.length > 4 ? 3 : 2

  return (
    <div>
      <GameStats
        items={[
          ['Round', round, '#ed4956'],
          ['Jaan', '❤️'.repeat(Math.max(0, lives)) || '—'],
        ]}
      />
      <p className="mb-1 text-center text-sm font-semibold">Sirf sachha dil ❤️ dabaiye!</p>
      <div aria-hidden="true" className="mb-2 h-1.5 overflow-hidden rounded-full bg-ig-card">
        {phase === 'play' && (
          <div
            key={cur.key}
            className="h-full origin-left rounded-full"
            style={{ background: 'linear-gradient(90deg,#ed4956,#f472b6)', animation: `zu-shrink ${cur.ms}ms linear forwards` }}
          />
        )}
      </div>
      <div
        data-testid="trueheart-board"
        className="zu-game-arena relative grid min-h-[330px] content-center gap-3 rounded-2xl border border-ig-border p-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, background: 'linear-gradient(160deg, rgba(237,73,86,0.16), rgba(20,20,20,0.2))' }}
      >
        {cur.tiles.map((t, k) => (
          <button
            key={t.id}
            type="button"
            data-e={t.e}
            onPointerDown={() => tap(k)}
            className="flex aspect-square items-center justify-center rounded-2xl text-[40px] leading-none"
            style={{
              background: t.tapped ? 'rgba(37,211,102,0.25)' : 'rgba(255,255,255,0.07)',
              animation: 'zu-pop 0.18s ease-out',
            }}
          >
            {t.tapped ? '✨' : t.e}
          </button>
        ))}

        {phase === 'ready' && (
          <GameOverlay
            emoji="😳"
            title="Sachha Dil"
            lines={['Sirf sachha dil ❤️ dabaiye — saare!', '💔 dabaya toh jaan gayi', 'Har round tez — aage 🧡 aur 🖤 bhi dhokha denge']}
            button="Shuru kariye"
            onButton={start}
            color="#ed4956"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={round >= 15 ? '🏆' : '💔'}
            title={endLine}
            lines={[`${round} rounds paar kiye`, newBest ? '✨ Naya best!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={round >= 15}
            color="#ed4956"
          />
        )}
      </div>
      <p className="mt-2 h-5 text-center text-sm font-semibold" style={{ color: msg?.ok ? '#25d366' : '#ed4956' }}>
        {msg?.text || ''}
      </p>
    </div>
  )
}
