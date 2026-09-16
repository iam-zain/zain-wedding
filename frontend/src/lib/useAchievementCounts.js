import { useMemo } from 'react'
import { MUSIC_TRACKS } from './musicConfig'
import { useFeedData } from './feedData'
import {
  useCommentedPosts,
  useLikedPosts,
  usePlayedTracks,
  useViewedStories,
} from './storage'

/**
 * The `counts` snapshot the achievement engine runs on. Shared by the watcher
 * (which unlocks badges) and the badge shelf (which renders progress) so the
 * two can never disagree about how far along a guest is.
 *
 * Memoised on the primitive lengths: returning a fresh object literal each
 * render would retrigger the watcher's unlock effect in a loop.
 */
export function useAchievementCounts() {
  const { posts, stories } = useFeedData()
  const { list: liked } = useLikedPosts()
  const { list: commented } = useCommentedPosts()
  const { list: viewed } = useViewedStories()
  const { list: played } = usePlayedTracks()

  const totalPosts = posts?.length ?? 0
  const totalStories = stories?.length ?? 0

  return useMemo(
    () => ({
      likes: { count: liked.length, total: totalPosts },
      comments: { count: commented.length, total: totalPosts },
      stories: { count: viewed.length, total: totalStories },
      tracks: { count: played.length, total: MUSIC_TRACKS.length },
    }),
    [liked.length, commented.length, viewed.length, played.length, totalPosts, totalStories],
  )
}
