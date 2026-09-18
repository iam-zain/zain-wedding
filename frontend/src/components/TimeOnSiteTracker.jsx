import { useEffect, useRef } from 'react'
import { KEYS, readJSON, writeJSON } from '../lib/storage'

// How often the clock is checked. Fine-grained enough that leaving mid-minute
// loses at most a few seconds, without running a timer every second.
const TICK_MS = 15_000

/**
 * Global — mount once in Layout. Accumulates whole minutes spent with the tab
 * actually visible, across visits, for the time-based badges.
 *
 * Only counts while visible: a tab left open in the background overnight would
 * otherwise "earn" every time badge without the guest reading a word.
 *
 * Seconds are kept in a ref and only written to storage when a whole minute
 * has passed. Writing every tick would be ~4 writes a minute, and since the
 * achievement counts hook subscribes to this key, each write re-renders every
 * page that mounts it — the feed included. One write per minute keeps that to
 * a single cheap re-render.
 */
export default function TimeOnSiteTracker() {
  const carryRef = useRef(0) // seconds not yet worth a write

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return

      carryRef.current += TICK_MS / 1000
      if (carryRef.current < 60) return

      const minutes = Math.floor(carryRef.current / 60)
      carryRef.current -= minutes * 60

      const stored = readJSON(KEYS.timeSpent, 0)
      const current = typeof stored === 'number' && Number.isFinite(stored) ? stored : 0
      writeJSON(KEYS.timeSpent, current + minutes)
    }, TICK_MS)

    return () => clearInterval(id)
  }, [])

  return null
}
