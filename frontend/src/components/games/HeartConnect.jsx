import { useRef, useState } from 'react'
import { recordBest, recordPlay, shuffle } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import Confetti from '../Confetti'

const HEARTS = [
  ['❤️', '#ed4956'],
  ['💙', '#0095f6'],
  ['💚', '#25d366'],
  ['💛', '#f5c518'],
  ['💜', '#a855f7'],
  ['🧡', '#f7971e'],
]
const LEVELS = [
  { n: 5, k: 4 },
  { n: 6, k: 5 },
  { n: 7, k: 6 },
]

/**
 * A solvable board: walk one snake through every cell, randomly
 * mirrored/rotated, then cut it into k pieces. Each piece's two ends are a
 * pair of dots — so a full, non-crossing solution always exists.
 */
function makeLevel(n, k) {
  let snake = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) snake.push([r, r % 2 ? n - 1 - c : c])
  const tf = Math.floor(Math.random() * 8)
  snake = snake.map(([r, c]) => {
    let [a, b] = tf & 1 ? [c, r] : [r, c]
    if (tf & 2) a = n - 1 - a
    if (tf & 4) b = n - 1 - b
    return a * n + b
  })
  // Random cut points, every piece at least 3 cells long.
  const total = n * n
  let cuts
  do {
    cuts = shuffle(Array.from({ length: total - 1 }, (_, i) => i + 1))
      .slice(0, k - 1)
      .sort((a, b) => a - b)
  } while ([0, ...cuts, total].some((v, i, arr) => i > 0 && v - arr[i - 1] < 3))
  const bounds = [0, ...cuts, total]
  const colors = shuffle(HEARTS.map((_, i) => i)).slice(0, k)
  const dots = {} // cell -> color index
  for (let i = 0; i < k; i++) {
    dots[snake[bounds[i]]] = colors[i]
    dots[snake[bounds[i + 1] - 1]] = colors[i]
  }
  return { n, dots, colors }
}

export default function HeartConnect() {
  const [lv, setLv] = useState(0)
  const [level, setLevel] = useState(() => makeLevel(LEVELS[0].n, LEVELS[0].k))
  const [paths, setPaths] = useState({}) // color -> [cells]
  const [solved, setSolved] = useState(false)
  const [solvedCount, setSolvedCount] = useState(0)
  const board = useRef(null)
  const active = useRef(null) // color being drawn
  const pathsRef = useRef({})

  const { n, dots } = level
  const adj = (a, b) => (Math.abs(a - b) === n) || (Math.abs(a - b) === 1 && Math.floor(a / n) === Math.floor(b / n))

  function commit(p) {
    pathsRef.current = p
    setPaths(p)
  }

  function next(nextLv = lv) {
    const L = LEVELS[Math.min(nextLv, LEVELS.length - 1)]
    setLv(nextLv)
    setLevel(makeLevel(L.n, L.k))
    commit({})
    setSolved(false)
  }

  const complete = (color, p) => p && p.length > 1 && dots[p[0]] === color && dots[p[p.length - 1]] === color && p[0] !== p[p.length - 1]

  function cellAt(e) {
    const r = board.current?.getBoundingClientRect()
    if (!r) return -1
    const c = Math.floor(((e.clientX - r.left) / r.width) * n)
    const rr = Math.floor(((e.clientY - r.top) / r.height) * n)
    return c < 0 || rr < 0 || c >= n || rr >= n ? -1 : rr * n + c
  }

  function onDown(e) {
    if (solved) return
    const c = cellAt(e)
    if (c < 0) return
    const p = { ...pathsRef.current }
    if (dots[c] != null) {
      active.current = dots[c]
      p[dots[c]] = [c] // start fresh from this dot
    } else {
      const owner = Object.keys(p).find((k) => p[k].includes(c))
      if (owner == null) return
      active.current = Number(owner)
      p[owner] = p[owner].slice(0, p[owner].indexOf(c) + 1)
    }
    try {
      board.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* synthetic or already-released pointer */
    }
    commit(p)
  }

  function extend(to) {
    const color = active.current
    const p = { ...pathsRef.current }
    let path = p[color] ? p[color].slice() : []
    const head = path[path.length - 1]
    if (head == null || to === head || !adj(head, to)) return false
    if (path.length > 1 && path[path.length - 2] === to) path.pop()
    else if (complete(color, path)) return false
    else if (dots[to] != null && dots[to] !== color) return false
    else if (path.includes(to)) path = path.slice(0, path.indexOf(to) + 1)
    else {
      // Drawing through another colour's line cuts it back.
      for (const k of Object.keys(p)) {
        if (Number(k) !== color && p[k].includes(to)) p[k] = p[k].slice(0, p[k].indexOf(to))
      }
      path.push(to)
    }
    p[color] = path
    commit(p)
    if (complete(color, path)) {
      haptic('like')
      check(p)
    }
    return true
  }

  function onMove(e) {
    if (active.current == null || solved) return
    const to = cellAt(e)
    if (to < 0) return
    // Step one cell at a time so quick swipes don't skip.
    for (let guard = 0; guard < 12; guard++) {
      const path = pathsRef.current[active.current] || []
      const head = path[path.length - 1]
      if (head == null || head === to) break
      const hr = Math.floor(head / n)
      const hc = head % n
      const tr = Math.floor(to / n)
      const tc = to % n
      const step = Math.abs(tr - hr) >= Math.abs(tc - hc) ? head + Math.sign(tr - hr) * n : head + Math.sign(tc - hc)
      if (!extend(step)) break
    }
  }

  function onUp() {
    active.current = null
  }

  function check(p) {
    if (!level.colors.every((color) => complete(color, p[color]))) return
    setSolved(true)
    setSolvedCount((s) => s + 1)
    recordBest('connect', lv + 1)
    recordPlay('connect')
    haptic('achievement')
  }

  // cell -> colour for painting
  const paint = {}
  for (const k of Object.keys(paths)) for (const c of paths[k]) paint[c] = Number(k)
  const filled = Object.keys(paint).length
  const full = filled === n * n

  return (
    <div data-testid="heart-connect">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="rounded-full bg-ig-card px-3 py-1">
          Level <b style={{ color: '#a855f7' }}>{lv + 1}</b> · {n}×{n}
        </span>
        <span className="rounded-full bg-ig-card px-3 py-1 tabular-nums">Bhara {Math.round((filled / (n * n)) * 100)}%</span>
      </div>
      <p className="mb-2 text-center text-sm">Ek jaise dil jodiye — lines ek doosre ko kaatein nahi 💞</p>
      <div className="relative">
        {solved && <Confetti count={50} />}
        <div
          ref={board}
          data-testid="connect-board"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="zu-game-arena grid aspect-square w-full gap-[2px] overflow-hidden rounded-2xl border border-ig-border bg-ig-border p-[2px]"
          style={{ touchAction: 'none', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: n * n }, (_, c) => {
            const col = paint[c]
            const dot = dots[c]
            return (
              <div
                key={c}
                data-cell={c}
                data-dot={dot != null ? dot : undefined}
                className="flex items-center justify-center rounded-md leading-none"
                style={{
                  background: col != null ? `${HEARTS[col][1]}66` : 'var(--color-ig-black)',
                  fontSize: `${Math.round(170 / n)}px`,
                }}
              >
                {dot != null ? HEARTS[dot][0] : col != null ? <span className="size-2 rounded-full" style={{ background: HEARTS[col][1] }} /> : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 text-center">
        {solved ? (
          <>
            <p className="text-base font-semibold" style={{ color: '#25d366' }}>
              {full ? 'Perfect! Saare dil jud gaye, poora board bhara 💞' : 'Saare dil jud gaye! 💕'}
            </p>
            <button
              type="button"
              data-testid="connect-next"
              onClick={() => next(Math.min(lv + 1, LEVELS.length - 1))}
              className="mt-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(90deg,#ed4956,#a855f7)' }}
            >
              Agla level ➡️
            </button>
          </>
        ) : (
          <button type="button" onClick={() => commit({})} className="rounded-full border border-ig-border px-4 py-2 text-sm">
            Saaf kariye 🧹
          </button>
        )}
        {solvedCount > 0 && <p className="mt-2 text-[11px] text-ig-faint">Is baar {solvedCount} board hal kiye</p>}
      </div>
    </div>
  )
}
