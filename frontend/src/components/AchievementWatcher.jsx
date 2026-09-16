import { useEffect, useRef, useState } from 'react'
import { ACHIEVEMENT_UNLOCK_PREFIX } from '../config'
import { achievementById, earnedIds } from '../lib/achievements'
import { useAchievementCounts } from '../lib/useAchievementCounts'
import { haptic } from '../lib/haptics'
import { useAchievements } from '../lib/storage'
import { useToast } from './toast-context'

// Gap between two badges unlocking at once, so a returning guest who already
// qualifies for several gets them one at a time instead of a stack of toasts.
const QUEUE_GAP_MS = 3200
const TOAST_MS = 4500

/** Global — mount once inside Layout (needs FeedDataProvider above it). */
export default function AchievementWatcher() {
  const toast = useToast()
  const counts = useAchievementCounts()
  const { list: unlocked, add: unlock } = useAchievements()

  const [queue, setQueue] = useState([])
  // Ids handled in THIS session. Without it, a localStorage write that silently
  // fails (private mode, quota) would leave the id out of `unlocked` forever
  // and this effect would re-queue it on every render.
  const handledRef = useRef(new Set())

  useEffect(() => {
    const fresh = earnedIds(counts).filter(
      (id) => !unlocked.includes(id) && !handledRef.current.has(id),
    )
    if (fresh.length === 0) return
    for (const id of fresh) {
      handledRef.current.add(id)
      unlock(id)
    }
    setQueue((q) => [...q, ...fresh])
  }, [counts, unlocked, unlock])

  // Drain one badge at a time.
  useEffect(() => {
    if (queue.length === 0) return
    const def = achievementById(queue[0])
    if (def) {
      haptic('achievement')
      toast(`${ACHIEVEMENT_UNLOCK_PREFIX} ${def.emoji} ${def.title} — ${def.message}`, {
        duration: TOAST_MS,
      })
    }
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), QUEUE_GAP_MS)
    return () => clearTimeout(timer)
  }, [queue, toast])

  return null
}
