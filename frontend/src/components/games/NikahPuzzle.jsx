import { useEffect, useMemo, useRef, useState } from 'react'
import { recordBest, recordPlay, shuffle } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { useVisibleFeed } from '../../lib/useVisibleFeed'
import Confetti from '../Confetti'

/** A shuffled order that isn't already solved. */
function scramble(n) {
  const solved = Array.from({ length: n }, (_, i) => i)
  let s
  do s = shuffle(solved)
  while (s.every((v, i) => v === i))
  return s
}

export default function NikahPuzzle() {
  const { visiblePosts } = useVisibleFeed()
  // The site's own post covers are the puzzle pictures.
  const images = useMemo(
    () => visiblePosts.map((p) => (Array.isArray(p.images) ? p.images[0] : null)).filter((u) => typeof u === 'string'),
    [visiblePosts],
  )
  const [size, setSize] = useState(3)
  const [img, setImg] = useState(null)
  const [order, setOrder] = useState(() => scramble(9)) // order[slot] = piece
  const [sel, setSel] = useState(null)
  const [moves, setMoves] = useState(0)
  const [secs, setSecs] = useState(0)
  const [done, setDone] = useState(false)
  const [peek, setPeek] = useState(false)
  const grid = useRef(null)
  const drag = useRef(null)

  function newPuzzle(n = size, list = images) {
    setSize(n)
    setImg(list.length ? list[Math.floor(Math.random() * list.length)] : null)
    setOrder(scramble(n * n))
    setSel(null)
    setMoves(0)
    setSecs(0)
    setDone(false)
  }

  // First picture as soon as the posts arrive.
  useEffect(() => {
    if (!img && images.length) newPuzzle(size, images)
  }, [images]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done || !img) return undefined
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [done, img])

  function swap(a, b) {
    if (a === b) return
    const next = order.slice()
    ;[next[a], next[b]] = [next[b], next[a]]
    setOrder(next)
    setMoves((m) => m + 1)
    haptic('tap')
    if (next.every((v, i) => v === i)) {
      setDone(true)
      recordBest(`puzzle${size}`, secs, true)
      recordPlay('nikahpuzzle')
      haptic('achievement')
    }
  }

  function slotAt(e) {
    const r = grid.current?.getBoundingClientRect()
    if (!r) return -1
    const c = Math.floor(((e.clientX - r.left) / r.width) * size)
    const rr = Math.floor(((e.clientY - r.top) / r.height) * size)
    return c < 0 || rr < 0 || c >= size || rr >= size ? -1 : rr * size + c
  }

  // Drag a piece onto another to swap them — or tap one, then the other.
  function onDown(e) {
    if (done) return
    const s = slotAt(e)
    if (s < 0) return
    drag.current = { from: s, moved: false }
    try {
      grid.current?.setPointerCapture?.(e.pointerId)
    } catch {
      /* synthetic or already-released pointer */
    }
  }
  function onMove(e) {
    if (drag.current && slotAt(e) !== drag.current.from) drag.current.moved = true
  }
  function onUp(e) {
    const d = drag.current
    drag.current = null
    if (!d || done) return
    const to = slotAt(e)
    if (d.moved && to >= 0) {
      setSel(null)
      swap(d.from, to)
    } else if (sel == null) setSel(d.from)
    else {
      swap(sel, d.from)
      setSel(null)
    }
  }

  const pct = 100 / size
  const bgSize = `${size * 100}% ${size * 100}%`
  const bgPos = (piece) => {
    const r = Math.floor(piece / size)
    const c = piece % size
    return `${size > 1 ? (c / (size - 1)) * 100 : 0}% ${size > 1 ? (r / (size - 1)) * 100 : 0}%`
  }

  if (!img) {
    return <p className="py-10 text-center text-sm text-ig-muted">Tasveer load ho rahi hai… 🖼️</p>
  }

  return (
    <div data-testid="nikah-puzzle">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="rounded-full bg-ig-card px-3 py-1 tabular-nums">⏱ {secs}s</span>
        <span className="rounded-full bg-ig-card px-3 py-1 tabular-nums">Chaal {moves}</span>
        <div className="flex gap-1 rounded-full bg-ig-card p-1 text-xs">
          {[3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => newPuzzle(n)}
              className="rounded-full px-2.5 py-1 font-semibold"
              style={{ background: size === n ? '#a855f7' : 'transparent' }}
            >
              {n}×{n}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-center text-xs text-ig-muted">Tukde kheench ke badlo — ya ek tap, phir doosra tap</p>

      <div className="relative">
        {done && <Confetti count={60} />}
        <div
          ref={grid}
          data-testid="puzzle-grid"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          className="zu-game-arena relative aspect-square w-full overflow-hidden rounded-2xl border-2"
          style={{ touchAction: 'none', borderColor: '#d4a64a' }}
        >
          {order.map((piece, slot) => (
            <div
              key={piece}
              data-piece={piece}
              className="absolute"
              style={{
                left: `${(slot % size) * pct}%`,
                top: `${Math.floor(slot / size) * pct}%`,
                width: `${pct}%`,
                height: `${pct}%`,
                backgroundImage: `url("${img}")`,
                backgroundSize: bgSize,
                backgroundPosition: bgPos(piece),
                transition: 'left 0.2s, top 0.2s',
                outline: done ? 'none' : sel === slot ? '3px solid #f7971e' : '1px solid rgba(0,0,0,0.5)',
                outlineOffset: -1,
                zIndex: sel === slot ? 2 : 1,
              }}
            />
          ))}
          {peek && !done && (
            <div className="absolute inset-0 z-10" style={{ backgroundImage: `url("${img}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          )}
          {done && (
            <div className="absolute inset-x-0 bottom-0 z-10 bg-black/70 p-3 text-center" style={{ animation: 'zu-pop 0.3s ease-out' }}>
              <p className="text-lg font-semibold">Alhamdulillah ❤️ Puzzle Complete!</p>
              <p className="text-xs text-ig-muted">
                {secs}s · {moves} chaal
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          onPointerDown={() => setPeek(true)}
          onPointerUp={() => setPeek(false)}
          onPointerLeave={() => setPeek(false)}
          className="rounded-full border border-ig-border px-4 py-2 text-sm font-semibold"
        >
          👀 Dabake dekho
        </button>
        <button
          type="button"
          data-testid="puzzle-new"
          onClick={() => newPuzzle()}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(90deg,#a855f7,#f472b6)' }}
        >
          {done ? 'Agli tasveer 🖼️' : 'Nayi tasveer'}
        </button>
      </div>
    </div>
  )
}
