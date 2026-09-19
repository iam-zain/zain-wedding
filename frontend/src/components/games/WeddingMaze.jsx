import { useEffect, useRef, useState } from 'react'
import { pick, recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import Confetti from '../Confetti'
import { GameOverlay, GameStats } from './GameShell'

const BRIDE = '👰'
const GROOM = '🤵'
// Level n (0-based): a bigger maze each time, a little more time for it.
const levelSize = (n) => ({ cols: Math.min(6 + n, 11), rows: Math.min(8 + n, 14) })
const levelTime = (n) => 30 + n * 6
const FLOWERS = ['🌸', '🌼', '🌺', '🌷', '🪔']
const MEET_LINES = ['Mil gaye! 💕', 'Jodi ban gayi 💍', 'Qubool hai! 🤲', 'Rasta mil gaya 🌸', 'Dil se dil tak 💞']

/**
 * A perfect maze (exactly one route between any two cells) by iterative
 * depth-first search. walls[i] = [top, right, bottom, left].
 */
function makeMaze(cols, rows) {
  const n = cols * rows
  const walls = Array.from({ length: n }, () => [true, true, true, true])
  const seen = new Array(n).fill(false)
  const stack = [0]
  seen[0] = true
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const r = Math.floor(cur / cols)
    const c = cur % cols
    const options = []
    if (r > 0 && !seen[cur - cols]) options.push([cur - cols, 0, 2])
    if (c < cols - 1 && !seen[cur + 1]) options.push([cur + 1, 1, 3])
    if (r < rows - 1 && !seen[cur + cols]) options.push([cur + cols, 2, 0])
    if (c > 0 && !seen[cur - 1]) options.push([cur - 1, 3, 1])
    if (!options.length) {
      stack.pop()
      continue
    }
    const [next, wall, back] = pick(options)
    walls[cur][wall] = false
    walls[next][back] = false
    seen[next] = true
    stack.push(next)
  }
  // Opposite corners, picked at random, and who walks is random too.
  const corners = [0, cols - 1, n - cols, n - 1]
  const s = Math.floor(Math.random() * 4)
  const start = corners[s]
  const goal = corners[3 - s]
  const walker = Math.random() < 0.5 ? BRIDE : GROOM
  // A few flowers along the way, purely decorative.
  const flowers = {}
  for (let k = 0; k < Math.round(n / 9); k++) {
    const i = Math.floor(Math.random() * n)
    if (i !== start && i !== goal) flowers[i] = pick(FLOWERS)
  }
  return { cols, rows, walls, start, goal, walker, other: walker === BRIDE ? GROOM : BRIDE, flowers }
}

/** Is there an open passage between neighbouring cells a and b? */
function open(m, a, b) {
  const { cols, walls } = m
  if (b === a - cols) return !walls[a][0]
  if (b === a + 1 && a % cols !== cols - 1) return !walls[a][1]
  if (b === a + cols) return !walls[a][2]
  if (b === a - 1 && a % cols !== 0) return !walls[a][3]
  return false
}

export default function WeddingMaze() {
  const [phase, setPhase] = useState('ready') // ready | play | won | over
  const [level, setLevel] = useState(0)
  const [maze, setMaze] = useState(() => makeMaze(levelSize(0).cols, levelSize(0).rows))
  const [path, setPath] = useState([])
  const [left, setLeft] = useState(levelTime(0))
  const [msg, setMsg] = useState('')
  const [newBest, setNewBest] = useState(false)
  const [endLine, setEndLine] = useState('')
  const board = useRef(null)
  const drawing = useRef(false)
  const pathRef = useRef([])
  const levelRef = useRef(0)
  const { later, clearAll } = useTimeouts()

  function setP(p) {
    pathRef.current = p
    setPath(p)
  }

  function loadLevel(n) {
    const { cols, rows } = levelSize(n)
    const m = makeMaze(cols, rows)
    levelRef.current = n
    setLevel(n)
    setMaze(m)
    setP([m.start])
    setLeft(levelTime(n))
    setMsg(`${m.walker === BRIDE ? 'Dulhan' : 'Dulha'} ko ${m.other === BRIDE ? 'dulhan' : 'dulhe'} tak pahunchao!`)
    setPhase('play')
  }

  function start() {
    haptic('tap')
    clearAll()
    loadLevel(0)
  }

  // Countdown.
  useEffect(() => {
    if (phase !== 'play') return undefined
    if (left <= 0) {
      haptic('warn')
      setNewBest(recordBest('maze', levelRef.current))
      recordPlay('maze')
      setEndLine(levelRef.current >= 3 ? 'Kya rasta nikala! 🏆' : pick(['Time khatam! ⏰', 'Baraat raste mein atak gayi 😅', 'Agli baar pakka milenge 🤞']))
      setPhase('over')
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase])

  function cellAt(e) {
    const el = board.current
    if (!el) return -1
    const rect = el.getBoundingClientRect()
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * maze.cols)
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * maze.rows)
    if (c < 0 || r < 0 || c >= maze.cols || r >= maze.rows) return -1
    return r * maze.cols + c
  }

  /** Extend or rewind the pencil line toward cell `to`, one step at a time. */
  function stepToward(to) {
    let p = pathRef.current
    let guard = 0
    while (to >= 0 && p[p.length - 1] !== to && guard++ < 30) {
      const head = p[p.length - 1]
      // Going back over the line erases it.
      if (p.length > 1 && p.includes(to)) {
        p = p.slice(0, p.indexOf(to) + 1)
        break
      }
      const hr = Math.floor(head / maze.cols)
      const hc = head % maze.cols
      const tr = Math.floor(to / maze.cols)
      const tc = to % maze.cols
      // One cell along the longer axis first, so fast swipes still follow corridors.
      const dr = Math.sign(tr - hr)
      const dc = Math.sign(tc - hc)
      const tries = Math.abs(tr - hr) >= Math.abs(tc - hc) ? [[dr, 0], [0, dc]] : [[0, dc], [dr, 0]]
      let moved = false
      for (const [a, b] of tries) {
        if (!a && !b) continue
        const next = head + a * maze.cols + b
        if (open(maze, head, next)) {
          if (p.length > 1 && p[p.length - 2] === next) p = p.slice(0, -1)
          else if (!p.includes(next)) p = [...p, next]
          else break
          moved = true
          break
        }
      }
      if (!moved) break
    }
    if (p !== pathRef.current) {
      setP(p)
      if (p[p.length - 1] === maze.goal) win()
    }
  }

  function win() {
    drawing.current = false
    haptic('achievement')
    setMsg(pick(MEET_LINES))
    setPhase('won')
    later(() => loadLevel(levelRef.current + 1), 1500)
  }

  function onDown(e) {
    if (phase !== 'play') return
    const c = cellAt(e)
    if (c < 0) return
    // Start from anywhere on the line (or the head's neighbour) — like lifting a pencil.
    if (pathRef.current.includes(c)) setP(pathRef.current.slice(0, pathRef.current.indexOf(c) + 1))
    drawing.current = true
    try {
      board.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* synthetic or already-released pointer */
    }
    stepToward(c)
  }

  function onMove(e) {
    if (!drawing.current || phase !== 'play') return
    stepToward(cellAt(e))
  }

  function onUp() {
    drawing.current = false
  }

  const onPath = new Set(path)
  const head = path[path.length - 1]
  const wall = '2px solid #d4a64a'
  const urgent = left <= 8

  return (
    <div>
      <GameStats
        items={[
          ['⏱', `${Math.max(0, left)}s`, urgent ? '#ed4956' : undefined],
          ['Level', level + 1, '#a855f7'],
        ]}
      />
      <p className="mb-2 h-5 text-center text-sm font-semibold" style={{ color: phase === 'won' ? '#25d366' : undefined }}>
        {phase === 'play' || phase === 'won' ? msg : 'Rasta banao, jodi milao 💕'}
      </p>
      <div className="relative">
        {phase === 'won' && <Confetti count={50} />}
        <div
          ref={board}
          data-testid="maze-board"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="zu-game-arena relative grid overflow-hidden rounded-2xl p-1"
          style={{
            touchAction: 'none',
            gridTemplateColumns: `repeat(${maze.cols}, minmax(0, 1fr))`,
            // Red-carpet floor with a golden border — the "road" to the stage.
            background: 'radial-gradient(circle at 50% 40%, rgba(190,30,60,0.35), rgba(80,10,30,0.55))',
            border: '3px solid #d4a64a',
          }}
        >
          {maze.walls.map((w, i) => {
            const isStart = i === maze.start
            const isGoal = i === maze.goal
            const lit = onPath.has(i)
            return (
              <div
                key={i}
                data-cell={i}
                className="flex aspect-square items-center justify-center leading-none"
                style={{
                  borderTop: w[0] ? wall : '2px solid transparent',
                  borderRight: w[1] ? wall : '2px solid transparent',
                  borderBottom: w[2] ? wall : '2px solid transparent',
                  borderLeft: w[3] ? wall : '2px solid transparent',
                  background: lit ? 'rgba(255,182,193,0.45)' : undefined,
                  fontSize: `${Math.max(12, 150 / maze.cols)}px`,
                }}
              >
                {i === head ? (
                  <span style={{ animation: 'zu-pop 0.15s ease-out' }}>{maze.walker}</span>
                ) : isGoal ? (
                  <span>{maze.other}</span>
                ) : isStart ? (
                  <span className="opacity-60">🚪</span>
                ) : lit ? (
                  <span className="text-[60%] opacity-80">🌸</span>
                ) : maze.flowers[i] ? (
                  <span className="text-[60%] opacity-40">{maze.flowers[i]}</span>
                ) : null}
              </div>
            )
          })}

          {phase === 'ready' && (
            <GameOverlay
              emoji="👰💕🤵"
              title="Wedding Maze"
              lines={['Ungli se rasta banao — dulhan ko dulhe tak (ya ulta!)', 'Galat raasta? Wapas line pe ungli le jao, mit jayega', 'Har level bada maze, time chal raha hai ⏱']}
              button="Shuru karo"
              onButton={start}
              color="#d4a64a"
            />
          )}
          {phase === 'over' && (
            <GameOverlay
              emoji="⏰"
              title={endLine}
              lines={[`${level} maze paar kiye`, newBest ? '✨ Naya best!' : '']}
              button="Dobara khelo"
              onButton={start}
              win={level >= 3}
              color="#d4a64a"
            />
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-ig-faint">Ungli uthaye bina chalao — ya ek-ek khaana tap karo</p>
    </div>
  )
}
