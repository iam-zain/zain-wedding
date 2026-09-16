import { useMemo } from 'react'
import { hasAccess, isActiveNow, isExpired, useUnlockedTiers } from './access'
import { useFeedData } from './feedData'

/**
 * The posts and stories a guest can actually see, newest first.
 *
 * Single source of truth for "what's on screen". posts.json and stories.json
 * hold plenty a given guest never sees — admin-hidden items, ones behind a
 * locked access tier, posts outside their active window, and expired stories —
 * so the raw arrays are always a larger set than the feed renders.
 *
 * Anything that counts feed items MUST go through this rather than reading
 * feedData's raw arrays. The achievement badges originally used the raw
 * lengths, which made "like every post" read 0/16 when only 8 were reachable —
 * a goal no guest could ever complete.
 */
const byCreatedDesc = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)

export function useVisibleFeed() {
  const { posts, stories } = useFeedData()
  const unlocked = useUnlockedTiers()

  const visiblePosts = useMemo(() => {
    if (!posts) return []
    const now = Date.now()
    return posts
      .filter((p) => !p.hidden && hasAccess(p.access, unlocked) && isActiveNow(p, now))
      .sort(byCreatedDesc)
  }, [posts, unlocked])

  const visibleStories = useMemo(() => {
    if (!stories) return []
    const now = Date.now()
    return stories
      .filter((s) => !s.hidden && hasAccess(s.access, unlocked) && !isExpired(s, now))
      .sort(byCreatedDesc)
  }, [stories, unlocked])

  return { visiblePosts, visibleStories }
}
