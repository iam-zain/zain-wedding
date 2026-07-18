import { useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

// One deliberate slide change per gesture, regardless of flick speed.
const SWIPE_RATIO = 0.2
const SWIPE_MIN_PX = 40
const DRAG_INTENT_PX = 6
const EDGE_RESISTANCE = 0.35
const WHEEL_STEP_PX = 40
const WHEEL_LOCK_MS = 450

// Square image carousel: one image moves per swipe/drag/wheel gesture, with
// prev/next buttons and clickable dots. Mouse, touch and trackpad all drag
// via Pointer Events; touch-action: pan-y leaves vertical feed scroll to the
// browser so a horizontal swipe here never fights the page scroll.
// onDoubleTap is forwarded from the parent (double-tap-to-like).
export default function Carousel({ images, onDoubleTap, testId = 'carousel' }) {
  const list = images && images.length ? images : []
  const multiple = list.length > 1

  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const wheelRef = useRef({ accum: 0, locked: false })

  const [index, setIndex] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)

  const goTo = (i) => setIndex(Math.max(0, Math.min(list.length - 1, i)))

  function onPointerDown(e) {
    if (!multiple) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: containerRef.current.getBoundingClientRect().width,
      horizontal: null,
    }
    setDragging(true)
  }

  function onPointerMove(e) {
    const state = dragRef.current
    if (!state || state.pointerId !== e.pointerId) return

    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY

    if (state.horizontal === null) {
      if (Math.abs(dx) < DRAG_INTENT_PX && Math.abs(dy) < DRAG_INTENT_PX) return
      state.horizontal = Math.abs(dx) > Math.abs(dy)
      if (state.horizontal) {
        containerRef.current.setPointerCapture(e.pointerId)
      } else {
        // Vertical intent: hand the gesture back to the page scroll.
        dragRef.current = null
        setDragging(false)
        return
      }
    }
    if (!state.horizontal) return

    e.preventDefault()
    const atFirst = index === 0 && dx > 0
    const atLast = index === list.length - 1 && dx < 0
    setDragX(atFirst || atLast ? dx * EDGE_RESISTANCE : dx)
  }

  function onPointerUp(e) {
    const state = dragRef.current
    if (state && state.pointerId === e.pointerId && state.horizontal) {
      const threshold = Math.max(SWIPE_MIN_PX, state.width * SWIPE_RATIO)
      if (dragX <= -threshold) goTo(index + 1)
      else if (dragX >= threshold) goTo(index - 1)
    }
    dragRef.current = null
    setDragging(false)
    setDragX(0)
  }

  // React registers onWheel as a passive listener, so preventDefault() there
  // silently no-ops (and warns) — a horizontal trackpad swipe would still
  // trigger the browser's own scroll/back-forward gesture underneath our
  // paging. A manually attached, non-passive listener is required instead.
  useEffect(() => {
    const el = containerRef.current
    const w = wheelRef.current
    if (!el || list.length <= 1) return

    function handleWheel(e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return // vertical scroll: let the page handle it
      e.preventDefault()

      // Momentum flings keep emitting deltaX for a while after the gesture
      // ends, so extend the lock on every event and only release it once the
      // stream truly goes quiet — a fixed one-shot timer would let a long
      // fling slip a second step in before it decelerates.
      clearTimeout(w.unlockTimer)
      w.unlockTimer = setTimeout(() => {
        w.locked = false
        w.accum = 0
      }, WHEEL_LOCK_MS)

      if (w.locked) return
      w.accum += e.deltaX
      if (Math.abs(w.accum) > WHEEL_STEP_PX) {
        const delta = w.accum > 0 ? 1 : -1
        w.accum = 0
        w.locked = true
        setIndex((cur) => Math.max(0, Math.min(list.length - 1, cur + delta)))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      clearTimeout(w.unlockTimer)
    }
  }, [list.length])

  const dragPercent = dragRef.current?.width ? (dragX / dragRef.current.width) * 100 : 0

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className="group relative select-none overflow-hidden bg-ig-black"
      style={{ touchAction: 'pan-y' }}
      onDoubleClick={onDoubleTap}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="flex"
        style={{
          transform: `translateX(${-index * 100 + dragPercent}%)`,
          transition: dragging ? 'none' : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {list.map((src, i) => (
          <img
            key={src + i}
            data-testid={`${testId}-image-${i}`}
            src={src}
            alt=""
            draggable={false}
            className="aspect-square w-full shrink-0 object-cover"
          />
        ))}
      </div>

      {multiple && (
        <>
          <div
            data-testid={`${testId}-counter`}
            className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white"
          >
            {index + 1}/{list.length}
          </div>

          {index > 0 && (
            <button
              type="button"
              aria-label="Previous image"
              data-testid={`${testId}-prev`}
              onClick={(e) => {
                e.stopPropagation()
                goTo(index - 1)
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            >
              <ChevronLeftIcon size={18} />
            </button>
          )}
          {index < list.length - 1 && (
            <button
              type="button"
              aria-label="Next image"
              data-testid={`${testId}-next`}
              onClick={(e) => {
                e.stopPropagation()
                goTo(index + 1)
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
            >
              <ChevronRightIcon size={18} />
            </button>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                data-testid={`${testId}-dot-${i}`}
                onClick={(e) => {
                  e.stopPropagation()
                  goTo(i)
                }}
                onDoubleClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
