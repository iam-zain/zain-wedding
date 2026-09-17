import { useMemo } from 'react'
import { EXPLORE_PAGES, QUIZ_BEST_KEY, QUIZ_PER_ROUND } from '../config'
import { MUSIC_TRACKS } from './musicConfig'
import { useVisibleFeed } from './useVisibleFeed'
import {
  useCommentedPosts,
  useLikedPosts,
  useLocalStorage,
  usePlayedTracks,
  useViewedStories,
  useVisitedPages,
} from './storage'

/**
 * The `counts` snapshot the achievement engine runs on. Shared by the watcher
 * (which unlocks badges) and the badge shelf (which renders progress) so the
 * two can never disagree about how far along a guest is.
 *
 * Totals come from useVisibleFeed, NOT from feedData's raw arrays. The raw
 * files hold hidden posts, tier-locked items, out-of-window posts and expired
 * stories that this guest will never see — counting those made "like every
 * post" read 0/16 when only 8 were reachable, so the badge could never be
 * earned. The goal has to be what's actually on screen.
 *
 * Memoised on the primitive lengths: returning a fresh object literal each
 * render would retrigger the watcher's unlock effect in a loop.
 */
export function useAchievementCounts() {
  const { visiblePosts, visibleStories } = useVisibleFeed()
  const { list: liked } = useLikedPosts()
  const { list: commented } = useCommentedPosts()
  const { list: viewed } = useViewedStories()
  const { list: played } = usePlayedTracks()
  const [quizBest] = useLocalStorage(QUIZ_BEST_KEY, null)
  const { list: visited } = useVisitedPages()

  const totalPosts = visiblePosts.length
  const totalStories = visibleStories.length
  // Best round score, not the latest: a badge earned once shouldn't evaporate
  // because the guest replayed and did worse.
  const bestScore = typeof quizBest === 'number' ? quizBest : 0

  // A guest can like a post that later gets hidden, so their stored count can
  // exceed what's currently visible. Clamping keeps the shelf from showing an
  // impossible "9 / 8" — progressFor still treats count >= goal as complete.
  const visibleIds = useMemo(() => new Set(visiblePosts.map((p) => p.id)), [visiblePosts])
  const visibleStoryIds = useMemo(() => new Set(visibleStories.map((s) => s.id)), [visibleStories])

  // Counted against the current page list, so a route removed from
  // EXPLORE_PAGES can't leave someone stuck above 100%.
  const exploredCount = EXPLORE_PAGES.filter((path) => visited.includes(path)).length

  const likedVisible = liked.filter((id) => visibleIds.has(id)).length
  const commentedVisible = commented.filter((id) => visibleIds.has(id)).length
  const viewedVisible = viewed.filter((id) => visibleStoryIds.has(id)).length

  return useMemo(
    () => ({
      likes: { count: likedVisible, total: totalPosts },
      comments: { count: commentedVisible, total: totalPosts },
      stories: { count: viewedVisible, total: totalStories },
      tracks: { count: played.length, total: MUSIC_TRACKS.length },
      quiz: { count: bestScore, total: QUIZ_PER_ROUND },
      explored: { count: exploredCount, total: EXPLORE_PAGES.length },
    }),
    [likedVisible, commentedVisible, viewedVisible, played.length, totalPosts, totalStories, bestScore, exploredCount],
  )
}
