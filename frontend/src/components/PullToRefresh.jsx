import { useRef, useState } from 'react'

const NORMAL_THRESHOLD = 70 // px pulled — triggers a normal refresh
const EGG_THRESHOLD = 150 // px pulled — triggers the bonus easter egg instead
const MAX_PULL = 190
const DAMPING = 0.45

/**
 * Lightweight pull-to-refresh, built on Pointer Events so it works with
 * touch AND mouse-drag (testable on a laptop trackpad, not just a phone).
 * Only engages when the page is already at scrollY 0. Never calls
 * preventDefault, so native scrolling/taps/clicks are untouched.
 */
export default function PullToRefresh({ onRefresh, onEgg, children }) {
  const [pull, setPull] = useState(0)
  const startRef = useRef(null) // { x, y } or null
  const trackingRef = useRef(false)
  const firedRef = useRef(false)
  const pullRef = useRef(0) // mirrors `pull` so finish() reads a value that's never stale

  function onPointerDown(e) {
    if (window.scrollY > 0) {
      trackingRef.current = false
      return
    }
    startRef.current = { x: e.clientX, y: e.clientY }
    trackingRef.current = true
    firedRef.current = false
    pullRef.current = 0
  }

  function onPointerMove(e) {
    if (!trackingRef.current || !startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    if (dy < 0) {
      // Pulling back up — reset, but keep tracking in case they pull down again.
      pullRef.current = 0
      setPull(0)
      return
    }
    if (dy === 0) return
    // Momentarily more horizontal than vertical (e.g. brushing a carousel) —
    // hold the current pull rather than resetting it, so a single off-axis
    // frame doesn't kill an otherwise-good gesture.
    if (Math.abs(dy) < Math.abs(dx) * 1.5) return

    const next = Math.min(dy * DAMPING, MAX_PULL)
    pullRef.current = next
    setPull(next)
  }

  function finish() {
    if (trackingRef.current && !firedRef.current) {
      if (pullRef.current >= EGG_THRESHOLD) {
        firedRef.current = true
        onEgg?.()
      } else if (pullRef.current >= NORMAL_THRESHOLD) {
        firedRef.current = true
        onRefresh?.()
      }
    }
    trackingRef.current = false
    startRef.current = null
    pullRef.current = 0
    setPull(0)
  }

  return (
    <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finish} onPointerCancel={finish}>
      <div
        aria-hidden="true"
        className="flex items-center justify-center overflow-hidden text-xs text-ig-muted transition-[height] duration-150 ease-out"
        style={{ height: pull }}
      >
        {pull > 10 && (pull >= EGG_THRESHOLD ? '🤍 bas thoda aur…' : '↓ refresh ke liye chhodo')}
      </div>
      {children}
    </div>
  )
}
