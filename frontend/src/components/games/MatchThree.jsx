import { useRef, useState } from 'react'
import { recordBest, recordPlay, useTimeouts, pick } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const N = 6
const MOVES = 20
const TYPES = ['❤️', '💍', '🌹', '👰', '🤵', '💕']
const GOLD = 'gold' // the one special tile: 💖 Golden Heart
const GOLD_CHANCE = 0.6 // on a 4+ match
const STEP_MS = 230 // pop → fall → next cascade

const RUN_POINTS = (len) => (len >= 6 ? 100 : len === 5 ? 50 : len === 4 ? 25 : 10)
const COMBO_LINES = ['🔥 Combo!', '🔥🔥 Double combo!', '🔥🔥🔥 Dil garden garden ho gaya!', '💥 Unstoppable!']
const END_WIN = ['Wedding Crush champion! 💍', 'Teen milaiye, dil banaiye — aur banaye bhi! 💕', 'Dilon ki baarish! 💖', 'Match master! 🏆']
const END_LOSE = ['Achha khela! 💕', 'Agli baar aur dil banenge 💪', 'Moves khatam, pyaar nahi 🤍']

let nextId = 1
const tile = (t, fresh = false) => ({ id: nextId++, t, fresh })
const randType = () => Math.floor(Math.random() * TYPES.length)
const rc = (i) => [Math.floor(i / N), i % N]

/** A board with no ready-made matches, so the first points are earned. */
function newBoard() {
  const b = []
  for (let i = 0; i < N * N; i++) {
    const [r, c] = rc(i)
    let t
    do {
      t = randType()
    } while (
      (c >= 2 && b[i - 1].t === t && b[i - 2].t === t) ||
      (r >= 2 && b[i - N].t === t && b[i - 2 * N].t === t) ||
      (r >= 1 && c >= 1 && b[i - 1].t === t && b[i - N].t === t && b[i - N - 1].t === t)
    )
    b.push(tile(t))
  }
  return b
}

/**
 * Every horizontal/vertical run of 3+ identical (non-gold) tiles, plus every
 * 2×2 square of four, as index lists. Squares carry `.square = true`.
 */
function findRuns(b) {
  const runs = []
  const scan = (idx) => {
    let run = [idx[0]]
    for (let k = 1; k <= idx.length; k++) {
      const cur = idx[k]
      const same = k < idx.length && b[cur].t !== GOLD && b[cur].t === b[run[0]].t
      if (same) run.push(cur)
      else {
        if (run.length >= 3 && b[run[0]].t !== GOLD) runs.push(run)
        run = [cur]
      }
    }
  }
  for (let r = 0; r < N; r++) scan(Array.from({ length: N }, (_, c) => r * N + c))
  for (let c = 0; c < N; c++) scan(Array.from({ length: N }, (_, r) => r * N + c))
  for (let r = 0; r < N - 1; r++)
    for (let c = 0; c < N - 1; c++) {
      const i = r * N + c
      const t = b[i].t
      if (t !== GOLD && b[i + 1].t === t && b[i + N].t === t && b[i + N + 1].t === t) {
        const sq = [i, i + 1, i + N, i + N + 1]
        sq.square = true
        runs.push(sq)
      }
    }
  return runs
}

const swapped = (b, a, c) => {
  const n = b.slice()
  ;[n[a], n[c]] = [n[c], n[a]]
  return n
}

const adjacent = (a, b) => {
  const [r1, c1] = rc(a)
  const [r2, c2] = rc(b)
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1
}

function hasMove(b) {
  for (let i = 0; i < N * N; i++) {
    if (b[i].t === GOLD) return true
    const [r, c] = rc(i)
    if (c < N - 1 && findRuns(swapped(b, i, i + 1)).length) return true
    if (r < N - 1 && findRuns(swapped(b, i, i + N)).length) return true
  }
  return false
}

/** Drops surviving tiles to the bottom of each column and refills from the top. */
function gravity(b, cleared) {
  const n = new Array(N * N)
  for (let c = 0; c < N; c++) {
    let write = N - 1
    for (let r = N - 1; r >= 0; r--) {
      const i = r * N + c
      if (!cleared.has(i)) n[write-- * N + c] = { ...b[i], fresh: false }
    }
    while (write >= 0) n[write-- * N + c] = tile(randType(), true)
  }
  return n
}

export default function MatchThree() {
  const [board, setBoard] = useState(newBoard)
  const [sel, setSel] = useState(null)
  const [popping, setPopping] = useState(() => new Set())
  const [phase, setPhase] = useState('ready')
  const [moves, setMoves] = useState(MOVES)
  const [score, setScore] = useState(0)
  const [banner, setBanner] = useState(null) // { text, key }
  const [endLine, setEndLine] = useState('')
  const [newBest, setNewBest] = useState(false)
  const busy = useRef(false)
  const scoreRef = useRef(0)
  const movesRef = useRef(MOVES)
  const { later, clearAll } = useTimeouts()

  function flashBanner(text) {
    setBanner({ text, key: Date.now() })
    later(() => setBanner((b) => (b && b.text === text ? null : b)), 1100)
  }

  function start() {
    haptic('tap')
    clearAll()
    busy.current = false
    scoreRef.current = 0
    movesRef.current = MOVES
    setBoard(newBoard())
    setSel(null)
    setPopping(new Set())
    setScore(0)
    setMoves(MOVES)
    setBanner(null)
    setPhase('play')
  }

  function addPoints(p) {
    scoreRef.current += p
    setScore(scoreRef.current)
  }

  /** Called once the board has settled with nothing left to match. */
  function settle(b) {
    busy.current = false
    if (movesRef.current <= 0) {
      setNewBest(recordBest('match', scoreRef.current))
      recordPlay('match')
      setEndLine(pick(scoreRef.current >= 300 ? END_WIN : END_LOSE))
      setPhase('over')
      haptic('success')
      return
    }
    if (!hasMove(b)) {
      flashBanner('🔀 Koi chaal nahi — naya board!')
      later(() => setBoard(newBoard()), 500)
    }
  }

  /** Pop `cleared`, drop, refill, then look for the next cascade. */
  function clearAndFall(b, cleared, combo, keepGold = null) {
    setPopping(new Set(cleared))
    later(() => {
      let base = b
      if (keepGold != null) {
        // The golden heart takes the place of one tile in the match.
        base = b.slice()
        base[keepGold] = tile(GOLD)
        cleared.delete(keepGold)
      }
      const next = gravity(base, cleared)
      setPopping(new Set())
      setBoard(next)
      later(() => cascade(next, null, combo + 1), STEP_MS)
    }, STEP_MS)
  }

  function cascade(b, pivot, combo) {
    const runs = findRuns(b)
    if (!runs.length) return settle(b)

    const cleared = new Set()
    let points = 0
    let goldAt = null
    for (const run of runs) {
      points += RUN_POINTS(run.length)
      run.forEach((i) => cleared.add(i))
      // A 2×2 square always makes a golden heart; a line of 4+ usually does.
      if (goldAt == null && (run.square || (run.length >= 4 && Math.random() < GOLD_CHANCE))) {
        goldAt = pivot != null && run.includes(pivot) ? pivot : run[Math.floor(run.length / 2)]
      }
    }
    // Each cascade after the first multiplies what it's worth.
    addPoints(points * combo)
    haptic(combo > 1 ? 'achievement' : 'like')
    if (combo > 1) flashBanner(`${COMBO_LINES[Math.min(combo - 2, COMBO_LINES.length - 1)]} ×${combo}`)
    else if (goldAt != null) flashBanner('💖 Golden Heart bana!')
    else if (points >= 50) flashBanner(pick(['Wah! 👏', 'Zabardast 💕', 'Kya baat hai! 🔥']))
    clearAndFall(b, cleared, combo, goldAt)
  }

  /** 💥 LOVE BLAST — the golden heart clears its 3×3 neighbourhood. */
  function blast(b, at) {
    const [r, c] = rc(at)
    const cleared = new Set()
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr
        const cc = c + dc
        if (rr >= 0 && rr < N && cc >= 0 && cc < N) cleared.add(rr * N + cc)
      }
    addPoints(cleared.size * 10)
    haptic('achievement')
    flashBanner('💥 LOVE BLAST!')
    clearAndFall(b, cleared, 1)
  }

  function trySwap(a, c) {
    const next = swapped(board, a, c)
    const goldPos = next[c].t === GOLD ? c : next[a].t === GOLD ? a : null
    if (goldPos == null && !findRuns(next).length) {
      // Not a match: show the swap, then put it back. No move spent.
      haptic('warn')
      busy.current = true
      setBoard(next)
      flashBanner(pick(['Match nahi bana 😅', 'Yeh nahi 🙈', 'Teen milaiye! 3️⃣']))
      later(() => {
        setBoard(board)
        busy.current = false
      }, STEP_MS + 60)
      return
    }
    busy.current = true
    movesRef.current -= 1
    setMoves(movesRef.current)
    setBoard(next)
    later(() => (goldPos != null ? blast(next, goldPos) : cascade(next, c, 1)), STEP_MS)
  }

  function tap(i) {
    if (phase !== 'play' || busy.current) return
    if (sel == null) {
      haptic('tap')
      setSel(i)
    } else if (sel === i) {
      setSel(null)
    } else if (adjacent(sel, i)) {
      setSel(null)
      trySwap(sel, i)
    } else {
      haptic('tap')
      setSel(i)
    }
  }

  const size = 100 / N

  return (
    <div>
      <GameStats
        items={[
          ['Chaal', moves, moves <= 3 ? '#ed4956' : undefined],
          ['Score', score, '#ff6b81'],
        ]}
      />
      <div
        data-testid="match-board"
        className="zu-game-arena relative aspect-square w-full overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'linear-gradient(160deg, rgba(255,107,129,0.16), rgba(168,85,247,0.12))' }}
      >
        {board.map((t, i) => {
          const [r, c] = rc(i)
          const gold = t.t === GOLD
          return (
            <button
              key={t.id}
              type="button"
              data-type={gold ? 'gold' : TYPES[t.t]}
              onPointerDown={() => tap(i)}
              className="absolute flex items-center justify-center p-[3px]"
              style={{
                left: `${c * size}%`,
                top: `${r * size}%`,
                width: `${size}%`,
                height: `${size}%`,
                transition: `top ${STEP_MS}ms ease-in, left ${STEP_MS}ms ease-in`,
              }}
            >
              <span
                className="flex h-full w-full items-center justify-center rounded-xl text-[26px] leading-none"
                style={{
                  background: sel === i ? 'rgba(255,255,255,0.28)' : gold ? 'rgba(255,196,0,0.22)' : 'rgba(255,255,255,0.06)',
                  transform: popping.has(i) ? 'scale(0)' : sel === i ? 'scale(1.1)' : 'scale(1)',
                  transition: `transform ${STEP_MS}ms ease-out`,
                  animation: gold ? 'zu-glow 1.2s ease-in-out infinite' : t.fresh ? `zu-drop ${STEP_MS}ms ease-out` : undefined,
                }}
              >
                {gold ? '💖' : TYPES[t.t]}
              </span>
            </button>
          )
        })}

        {banner && (
          <div
            key={banner.key}
            className="pointer-events-none absolute left-0 right-0 top-[42%] z-[5] text-center text-xl font-bold"
            style={{ animation: 'zu-pop 0.25s ease-out', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
          >
            {banner.text}
          </div>
        )}

        {phase === 'ready' && (
          <GameOverlay
            emoji="💕"
            title="Wedding Crush 💍"
            lines={[
              '“Teen milaiye, dil banaiye!”',
              'Ek tile dabaiye, phir bagal wali — dono jagah badal lenge',
              `3 → 10 · 4 → 25 · 5 → 50 · 6+ → 100 · ${MOVES} chaal`,
              '4 ek line mein ya 2×2 chaukor = 💖 Golden Heart',
              'Golden Heart chalaiye → 💥 LOVE BLAST!',
            ]}
            button="Shuru kariye"
            onButton={start}
            color="#ff6b81"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={scoreRef.current >= 300 ? '🏆' : '💕'}
            title={endLine}
            lines={[`Score: ${score}`, newBest ? '✨ Naya best score!' : '']}
            button="Dobara kheliye"
            onButton={start}
            win={scoreRef.current >= 300}
            color="#ff6b81"
          />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-ig-faint">
        ❤️ Muhabbat · 💍 Nikah · 🌹 Ishq · 👰 Uzma · 🤵 Zain · 💕 ZainUz
      </p>
    </div>
  )
}
