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

// Elements that own their own horizontal gesture opt out via this attribute.
//
// The value names WHICH directions they claim, because a blanket opt-out made
// tab-swiping impossible in practice: nearly every post is a multi-image
// carousel and its photos fill the screen, so a finger almost always landed on
// an exempt element and the gesture died there. A carousel now claims only the
// direction it can still page in, so a swipe at either end falls through to us
// — the usual nested-gesture behaviour.
//
//   data-swipe-exempt="left"        claims finger-left only
//   data-swipe-exempt="left right"  claims both
//   data-swipe-exempt="true"        claims everything (the RSVP day strip)
const EXEMPT_SELECTOR = '[data-swipe-exempt]'
const BOTH = new Set(['left', 'right'])

// ── Two vocabularies, deliberately kept apart ────────────────────────────────
// FINGER direction — which way the fingers physically moved. `claims` are
// keyed by this, because a carousel reasons about its own drag.
// TAB direction — which side the incoming page slides in from, which is also
// how stepTo() reads it ('right' = further along the tab bar).
//
// They are opposites: dragging the fingers LEFT pulls the NEXT tab in from the
// right, exactly as every mobile tab UI behaves. Conflating the two is what
// made swiping go the wrong way.
const fingerDirFromDrag = (dx) => (dx > 0 ? 'right' : 'left')
// Wheel deltaX is the scroll amount, which runs opposite to the fingers:
// a two-finger swipe LEFT reports deltaX > 0.
const fingerDirFromWheel = (deltaX) => (deltaX > 0 ? 'left' : 'right')
const tabDirFor = (fingerDir) => (fingerDir === 'left' ? 'right' : 'left')

/** Directions already claimed by whatever sits under the finger, or null. */
function claimedDirections(target) {
  const el = target?.closest?.(EXEMPT_SELECTOR)
  if (!el) return null
  const raw = (el.getAttribute('data-swipe-exempt') || '').trim()
  if (raw === '' || raw === 'true') return BOTH
  return new Set(raw.split(/\s+/))
}

/**
 * A modal/overlay (EasterEggModal, StoryViewer) is open — they all set this
 * while visible, so don't navigate out from under one. Re-checked at the end
 * of a gesture as well, since one can open mid-swipe.
 */
function isBlocked() {
  return document.body.style.overflow === 'hidden'
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
      g = isBlocked() ? null : { x, y, t: Date.now(), horizontal: null, claims: claimedDirections(target) }
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
        // Whatever is under the finger can still move this way itself (a
        // carousel that has another photo in that direction) — let it.
        if (g.claims?.has(fingerDirFromDrag(dx))) {
          g = null
          return false
        }
      }
      return g.horizontal
    }

    function finish(x) {
      const gesture = g
      g = null
      if (!gesture?.horizontal) return
      if (isBlocked()) return
      const dx = x - gesture.x
      const duration = Date.now() - gesture.t
      if (duration > MAX_DURATION_MS) return
      const far = Math.abs(dx) >= MIN_DISTANCE_PX
      const flick = Math.abs(dx) >= FLICK_DISTANCE_PX && duration <= FLICK_MAX_MS
      if (!far && !flick) return
      go(tabDirFor(fingerDirFromDrag(dx)))
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
      finish(t.clientX)
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
      finish(e.clientX)
    }

    // ── Trackpad two-finger horizontal swipe ─────────────────────────────
    let wheelAccum = 0
    let wheelResetTimer = null
    let wheelLocked = false
    let wheelLockTimer = null

    function onWheel(e) {
      if (isBlocked()) return
      const claims = claimedDirections(e.target)
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

      const fingerDir = fingerDirFromWheel(wheelAccum)
      wheelAccum = 0
      if (claims?.has(fingerDir)) return // the carousel under the cursor pages this way itself
      wheelLocked = true
      clearTimeout(wheelLockTimer)
      wheelLockTimer = setTimeout(() => {
        wheelLocked = false
      }, WHEEL_LOCK_MS)

      go(tabDirFor(fingerDir))
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
