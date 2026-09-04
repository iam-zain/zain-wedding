import { useEffect, useRef, useState } from 'react'
import { HEART_GESTURE_MESSAGE } from '../config'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

const MIN_POINTS = 8
const MIN_SIZE = 60 // px
const MAX_SIZE = 500 // px — ignore huge full-screen drags
const MIN_DURATION_MS = 250
const MAX_DURATION_MS = 5000
const COOLDOWN_MS = 15000
const MAX_TRACKED_POINTS = 300

// Heuristic, not a strict shape match: a heart-ish drag has two "humps" near
// the top (a couple of vertical direction changes) and tapers to a point
// near the horizontal middle at the bottom.
function looksLikeHeart(points) {
  if (points.length < MIN_POINTS) return false

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX
  const h = maxY - minY
  if (w < MIN_SIZE || h < MIN_SIZE || w > MAX_SIZE || h > MAX_SIZE) return false

  const aspect = w / h
  if (aspect < 0.5 || aspect > 1.8) return false

  const tip = points.reduce((a, b) => (b.y > a.y ? b : a))
  const tipXRatio = (tip.x - minX) / w
  if (tipXRatio < 0.2 || tipXRatio > 0.8) return false

  let turns = 0
  let prevDir = 0
  for (let i = 1; i < points.length; i++) {
    const dy = points[i].y - points[i - 1].y
    if (Math.abs(dy) < 1) continue
    const dir = dy > 0 ? 1 : -1
    if (prevDir !== 0 && dir !== prevDir) turns++
    prevDir = dir
  }
  return turns >= 2
}

/**
 * Global — mount once in Layout. Passive pointer tracking only (never calls
 * preventDefault), so it can't interfere with scrolling, taps, or swipes
 * elsewhere on the page.
 */
export default function HeartGestureEasterEgg() {
  const [egg, setEgg] = useState(false)
  const pointsRef = useRef([])
  const draggingRef = useRef(false)
  const startTimeRef = useRef(0)
  const lastTriggerRef = useRef(0)

  useEffect(() => {
    function onDown(e) {
      draggingRef.current = true
      startTimeRef.current = Date.now()
      pointsRef.current = [{ x: e.clientX, y: e.clientY }]
    }

    function onMove(e) {
      if (!draggingRef.current) return
      pointsRef.current.push({ x: e.clientX, y: e.clientY })
      if (pointsRef.current.length > MAX_TRACKED_POINTS) pointsRef.current.shift()
    }

    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      const duration = Date.now() - startTimeRef.current
      const points = pointsRef.current
      pointsRef.current = []

      const now = Date.now()
      if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) return
      if (now - lastTriggerRef.current < COOLDOWN_MS) return
      if (!looksLikeHeart(points)) return

      lastTriggerRef.current = now
      setEgg(true)
      playChime()
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  if (!egg) return null
  return <EasterEggModal message={HEART_GESTURE_MESSAGE} icon="❤️" onClose={() => setEgg(false)} testId="heart-gesture-egg" />
}
