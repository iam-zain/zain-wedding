import { useEffect, useRef, useState } from 'react'
import { ACHIEVEMENT_UNLOCK_PREFIX } from '../config'
import { achievementById, earnedIds } from '../lib/achievements'
import { useAchievementCounts } from '../lib/useAchievementCounts'
import { haptic } from '../lib/haptics'
import { useAchievements } from '../lib/storage'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

/** Global — mount once inside Layout (needs FeedDataProvider above it). */
export default function AchievementWatcher() {
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

  const current = queue.length > 0 ? achievementById(queue[0]) : null

  // Celebrate as the modal appears rather than on a timer, so the buzz and the
  // chime land with the reveal.
  useEffect(() => {
    if (!current) return
    haptic('achievement')
    playChime()
  }, [current])

  // An id no longer in config (renamed or removed) would otherwise wedge the
  // queue, since there'd be nothing to render and nothing to close.
  useEffect(() => {
    if (queue.length > 0 && !achievementById(queue[0])) setQueue((q) => q.slice(1))
  }, [queue])

  if (!current) return null

  // Shown one at a time: the next badge only appears once this one is
  // dismissed, so a guest who earns several at once gets them in sequence
  // rather than stacked on top of each other.
  return (
    <EasterEggModal
      key={current.id}
      icon={current.emoji}
      message={current.message}
      caption={`${ACHIEVEMENT_UNLOCK_PREFIX} · ${current.title}`}
      testId={`achievement-unlock-${current.id}`}
      onClose={() => setQueue((q) => q.slice(1))}
    />
  )
}
