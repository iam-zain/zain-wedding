import { useEffect, useMemo, useState } from 'react'
import { siteConfig } from '../config'
import { fetchPosts, fetchStories } from '../lib/api'
import { hasAccess, isActiveNow, isExpired, useUnlockedTiers } from '../lib/access'
import Countdown from '../components/Countdown'
import ProfileHeader from '../components/ProfileHeader'
import StoriesRow from '../components/StoriesRow'
import PostCard from '../components/PostCard'

const byCreatedDesc = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)

export default function FeedPage() {
  const [posts, setPosts] = useState(null)
  const [stories, setStories] = useState(null)
  const [error, setError] = useState(false)
  const unlocked = useUnlockedTiers()

  async function load() {
    setError(false)
    try {
      const [p, s] = await Promise.all([fetchPosts(), fetchStories()])
      setPosts(p)
      setStories(s)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    load()
  }, [])

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

  const loading = posts === null && !error

  return (
    <div>
      {/* Slim brand bar */}
      <header className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
        <div className="flex h-12 items-center justify-center px-4">
          <span className="font-logo text-2xl leading-none">{siteConfig.profile.displayName}</span>
        </div>
      </header>

      <ProfileHeader />
      <Countdown />
      <StoriesRow stories={visibleStories} />

      <div className="border-t border-ig-border" />

      {loading && (
        <div className="space-y-4 px-3 py-6">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-ig-card" />
                <div className="h-3 w-24 rounded bg-ig-card" />
              </div>
              <div className="aspect-square w-full rounded bg-ig-card" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="px-4 py-16 text-center">
          <p className="text-ig-muted">Content load nahi hua 😕</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-lg bg-ig-card px-4 py-2 text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && visiblePosts.length === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-ig-muted">Abhi koi post nahi 🌙</p>
          <p className="mt-1 text-sm text-ig-faint">Thodi der mein wapas aana!</p>
        </div>
      )}

      {!error && visiblePosts.length > 0 && (
        <div>
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
