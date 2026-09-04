import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// ── Touch/mouse drag ─────────────────────────────────────────────────────────
const MIN_DISTANCE_PX = 90
const MAX_DURATION_MS = 1200
const INTENT_PX = 8 // first movement past this decides horizontal-vs-vertical, once, per gesture
const HORIZONTAL_DOMINANCE = 2 // |dx| must exceed |dy| times this to count as horizontal

// ── Trackpad / mouse-wheel swipe ─────────────────────────────────────────────
const WHEEL_TRIGGER_PX = 120
const WHEEL_IDLE_RESET_MS = 200
const WHEEL_LOCK_MS = 600 // cooldown after a nav-triggering swipe so one long fling can't fire twice

// Elements that own their own horizontal gesture (the photo carousel) opt
// out via this attribute, so this never steals a swipe mid-photo-browse.
const EXEMPT_SELECTOR = '[data-swipe-exempt]'

function isBlocked(target) {
  // A modal/overlay (EasterEggModal, StoryViewer) is open — they all set
  // this while visible, so don't navigate out from under one.
  if (document.body.style.overflow === 'hidden') return true
  return !!target?.closest?.(EXEMPT_SELECTOR)
}

/**
 * Global — mount once in Layout. Right-swipe/right-trackpad-swipe on the
 * Feed tab opens Events; left on Events returns to the Feed. Vertical
 * intent is locked in (and the gesture abandoned) within the first ~8px of
 * movement, so a normal scroll can never later resolve into a tab switch.
 */
export function useSwipeTabNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function go(dir) {
      if (pathname === '/' && dir === 'right') navigate('/events', { state: { swipeDir: 'right' } })
      else if (pathname === '/events' && dir === 'left') navigate('/', { state: { swipeDir: 'left' } })
    }

    // ── Touch / mouse drag ────────────────────────────────────────────────
    let start = null // { x, y, t, horizontal: null|boolean } | null

    function onDown(e) {
      start = isBlocked(e.target) ? null : { x: e.clientX, y: e.clientY, t: Date.now(), horizontal: null }
    }

    function onMove(e) {
      if (!start || start.horizontal === false) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (start.horizontal === null) {
        if (Math.abs(dx) < INTENT_PX && Math.abs(dy) < INTENT_PX) return
        start.horizontal = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE
        if (!start.horizontal) {
          start = null // vertical intent — abandon for good, this is a scroll
          return
        }
      }
      // Confirmed horizontal — stop the browser from taking this touch over
      // for its own scroll/back-navigation gesture partway through, which
      // on mobile fires pointercancel and silently kills the swipe before
      // it reaches MIN_DISTANCE_PX. Carousel's own drag does the same.
      e.preventDefault()
    }

    function onUp(e) {
      if (!start || !start.horizontal) {
        start = null
        return
      }
      const dx = e.clientX - start.x
      const duration = Date.now() - start.t
      start = null
      if (isBlocked(e.target)) return
      if (duration > MAX_DURATION_MS) return
      if (Math.abs(dx) < MIN_DISTANCE_PX) return
      go(dx > 0 ? 'right' : 'left')
    }

    function onCancel() {
      start = null
    }

    // ── Trackpad two-finger horizontal swipe ─────────────────────────────
    let wheelAccum = 0
    let wheelResetTimer = null
    let wheelLocked = false
    let wheelLockTimer = null

    function onWheel(e) {
      if (isBlocked(e.target)) return
      // Vertical scroll clearly dominates — not a swipe attempt at all, ignore entirely.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) {
        wheelAccum = 0
        return
      }
      // A horizontal-dominant two-finger gesture — stop the browser's own
      // back/forward-navigation swipe from firing underneath ours.
      e.preventDefault()

      clearTimeout(wheelResetTimer)
      wheelResetTimer = setTimeout(() => {
        wheelAccum = 0
      }, WHEEL_IDLE_RESET_MS)

      if (wheelLocked) return
      wheelAccum += e.deltaX
      if (Math.abs(wheelAccum) < WHEEL_TRIGGER_PX) return

      const dir = wheelAccum > 0 ? 'right' : 'left'
      wheelAccum = 0
      wheelLocked = true
      clearTimeout(wheelLockTimer)
      wheelLockTimer = setTimeout(() => {
        wheelLocked = false
      }, WHEEL_LOCK_MS)

      go(dir)
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('wheel', onWheel)
      clearTimeout(wheelResetTimer)
      clearTimeout(wheelLockTimer)
    }
  }, [pathname, navigate])
}
