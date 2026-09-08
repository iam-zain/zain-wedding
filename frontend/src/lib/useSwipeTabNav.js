import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { stepTo } from './tabs'

// ── Gesture thresholds ───────────────────────────────────────────────────────
const MIN_DISTANCE_PX = 60 // a deliberate drag
const FLICK_DISTANCE_PX = 32 // a quick flick counts at a shorter distance…
const FLICK_MAX_MS = 300 // …if it finishes this fast
const MAX_DURATION_MS = 1500
const INTENT_PX = 12 // travel before we decide horizontal-vs-vertical, once, per gesture
const HORIZONTAL_DOMINANCE = 1.15 // |dx| must beat |dy| by this much to count as horizontal

// ── Trackpad / mouse-wheel swipe ─────────────────────────────────────────────
const WHEEL_TRIGGER_PX = 120
const WHEEL_IDLE_RESET_MS = 200
const WHEEL_LOCK_MS = 600 // cooldown after a nav-triggering swipe so one long fling can't fire twice

// Elements that own their own horizontal gesture (the photo carousel, the
// RSVP day strip) opt out via this attribute, so this never steals a swipe
// mid-photo-browse.
const EXEMPT_SELECTOR = '[data-swipe-exempt]'

function isBlocked(target) {
  // A modal/overlay (EasterEggModal, StoryViewer) is open — they all set
  // this while visible, so don't navigate out from under one.
  if (document.body.style.overflow === 'hidden') return true
  return !!target?.closest?.(EXEMPT_SELECTOR)
}

/**
 * Global — mount once in Layout. A horizontal swipe moves one step along the
 * bottom-nav tab order (see lib/tabs.js): swipe right to go forward, left to
 * go back.
 *
 * Touch is handled with native Touch Events rather than Pointer Events. The
 * pointer-based version kept dying on real phones: the browser hands a touch
 * off to its own scroll/back-navigation gesture partway through and fires
 * `pointercancel`, and `setPointerCapture` — the workaround for that — fails
 * silently whenever the captured node re-renders out from under it, which the
 * feed does constantly. Touch Events don't get retargeted, `touchend` always
 * carries the final coordinates in `changedTouches`, and a non-passive
 * `touchmove` + `touch-action: pan-y` is the combination browsers actually
 * respect for "this axis is mine".
 */
export function useSwipeTabNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function go(dir) {
      const to = stepTo(pathname, dir)
      if (to) navigate(to, { state: { swipeDir: dir } })
    }

    // Shared decision logic for touch and mouse drags.
    // state: { x, y, t, horizontal: null | boolean }
    let g = null

    function begin(x, y, target) {
      g = isBlocked(target) ? null : { x, y, t: Date.now(), horizontal: null }
    }

    /** Returns true once the gesture is confirmed horizontal (caller may preventDefault). */
    function update(x, y) {
      if (!g) return false
      const dx = x - g.x
      const dy = y - g.y
      if (g.horizontal === null) {
        if (Math.hypot(dx, dy) < INTENT_PX) return false
        g.horizontal = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE
        if (!g.horizontal) {
          g = null // vertical intent — this is a scroll, abandon for good
          return false
        }
      }
      return g.horizontal
    }

    function finish(x, target) {
      const gesture = g
      g = null
      if (!gesture?.horizontal) return
      if (isBlocked(target)) return
      const dx = x - gesture.x
      const duration = Date.now() - gesture.t
      if (duration > MAX_DURATION_MS) return
      const far = Math.abs(dx) >= MIN_DISTANCE_PX
      const flick = Math.abs(dx) >= FLICK_DISTANCE_PX && duration <= FLICK_MAX_MS
      if (!far && !flick) return
      go(dx > 0 ? 'right' : 'left')
    }

    // ── Touch ─────────────────────────────────────────────────────────────
    function onTouchStart(e) {
      if (e.touches.length !== 1) {
        g = null // pinch / multi-finger — never a tab swipe
        return
      }
      const t = e.touches[0]
      begin(t.clientX, t.clientY, e.target)
    }

    function onTouchMove(e) {
      if (!g) return
      if (e.touches.length !== 1) {
        g = null
        return
      }
      const t = e.touches[0]
      // Claim the gesture so the browser can't turn it into a horizontal
      // overscroll / back-navigation halfway through.
      if (update(t.clientX, t.clientY) && e.cancelable) e.preventDefault()
    }

    function onTouchEnd(e) {
      const t = e.changedTouches[0]
      if (!t) {
        g = null
        return
      }
      finish(t.clientX, e.target)
    }

    function onTouchCancel() {
      g = null
    }

    // Touch pointers fire `pointercancel` the moment the browser takes an
    // interest in the gesture — the very failure mode this rewrite exists to
    // dodge. Only a cancelled *mouse* drag should abandon the gesture; a
    // cancelled touch pointer is ignored, because the Touch Events above are
    // still delivering it.
    function onPointerCancel(e) {
      if (e.pointerType === 'mouse') g = null
    }

    // ── Mouse drag (desktop only — touch is handled above) ────────────────
    function onPointerDown(e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      begin(e.clientX, e.clientY, e.target)
    }

    function onPointerMove(e) {
      if (e.pointerType !== 'mouse' || !g) return
      if (update(e.clientX, e.clientY)) e.preventDefault()
    }

    function onPointerUp(e) {
      if (e.pointerType !== 'mouse') return
      finish(e.clientX, e.target)
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
      if (e.cancelable) e.preventDefault()

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

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchCancel)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchCancel)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('wheel', onWheel)
      clearTimeout(wheelResetTimer)
      clearTimeout(wheelLockTimer)
    }
  }, [pathname, navigate])
}
