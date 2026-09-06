import { useEffect, useMemo, useRef, useState } from 'react'
import { siteConfig, LOGO_TAP_MESSAGE, PULL_REFRESH_EGG_MESSAGE, FEED_END_MESSAGE } from '../config'
import { hasAccess, isActiveNow, isExpired, useUnlockedTiers } from '../lib/access'
import { useFeedData } from '../lib/feedData'
import { playChime } from '../lib/sound'
import Countdown from '../components/Countdown'
import ProfileHeader from '../components/ProfileHeader'
import StoriesRow from '../components/StoriesRow'
import PostCard from '../components/PostCard'
import WeddingDayBanner from '../components/WeddingDayBanner'
import MilestoneBanner from '../components/MilestoneBanner'
import EasterEggModal from '../components/EasterEggModal'
import PullToRefresh from '../components/PullToRefresh'
import HeroGlow from '../components/HeroGlow'
import LiveViewers from '../components/LiveViewers'

const byCreatedDesc = (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)

// Brand-logo tap easter egg.
const LOGO_TAP_WINDOW_MS = 3000
const LOGO_TAPS_REQUIRED = 7

export default function FeedPage() {
  const { posts, stories, likeCounts, error, offline, refresh, setLikeCount } = useFeedData()
  const unlocked = useUnlockedTiers()
  const logoTapTimesRef = useRef([])
  const [logoEgg, setLogoEgg] = useState(false)
  const [pullEgg, setPullEgg] = useState(false)
  const [endCardVisible, setEndCardVisible] = useState(false)
  const endCardRef = useRef(null)

  function handleLogoTap() {
    const now = Date.now()
    const recent = logoTapTimesRef.current.filter((ts) => now - ts < LOGO_TAP_WINDOW_MS)
    recent.push(now)
    logoTapTimesRef.current = recent
    if (recent.length < LOGO_TAPS_REQUIRED) return
    logoTapTimesRef.current = []
    setLogoEgg(true)
    playChime()
  }

  const visiblePosts = useMemo(() => {
    if (!posts) return []
    const now = Date.now()
    return posts
      .filter((p) => !p.hidden && hasAccess(p.access, unlocked) && isActiveNow(p, now))
      .sort(byCreatedDesc)
  }, [posts, unlocked])

  // "Fan favorite" badge — ranked by likes_base (synchronous, admin-seeded)
  // rather than each PostCard's own live-polled count, so it doesn't need
  // to wait on N separate network calls to settle.
  const mostLovedPostId = useMemo(() => {
    if (visiblePosts.length < 2) return null
    const top = visiblePosts.reduce(
      (best, p) => ((p.likes_base || 0) > (best.likes_base || 0) ? p : best),
      visiblePosts[0],
    )
    return (top.likes_base || 0) > 0 ? top.id : null
  }, [visiblePosts])

  const visibleStories = useMemo(() => {
    if (!stories) return []
    const now = Date.now()
    return stories
      .filter((s) => !s.hidden && hasAccess(s.access, unlocked) && !isExpired(s, now))
      .sort(byCreatedDesc)
  }, [stories, unlocked])

  const hasEndCard = !error && visiblePosts.length > 0

  // Reveal the end-of-feed note only once it actually scrolls into view.
  useEffect(() => {
    if (!hasEndCard) return
    const el = endCardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEndCardVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasEndCard])

  return (
    <div data-testid="feed-page" className="relative">
      <HeroGlow />

      {/* Slim brand bar */}
      <header data-testid="feed-header" className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
        <div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center px-4">
          <span aria-hidden="true" />
          <button
            type="button"
            data-testid="feed-logo"
            onClick={handleLogoTap}
            className="egg-tap font-logo text-2xl leading-none justify-self-center"
          >
            {siteConfig.profile.displayName}
          </button>
          <span className="justify-self-end">
            <LiveViewers />
          </span>
        </div>
      </header>

      <PullToRefresh
        onRefresh={refresh}
        onEgg={() => {
          setPullEgg(true)
          playChime()
        }}
      >
        <ProfileHeader />
        <Countdown />
        <WeddingDayBanner />
        <MilestoneBanner />
        <StoriesRow stories={visibleStories} />

        <div className="border-t border-ig-border" />

        {error && (
          <div data-testid="feed-error" className="px-4 py-16 text-center">
            <p className="text-ig-muted">Content load nahi hua 😕</p>
            <button
              type="button"
              data-testid="feed-error-retry"
              onClick={refresh}
              className="mt-3 rounded-lg bg-ig-card px-4 py-2 text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {!error && visiblePosts.length === 0 && (
          <div data-testid="feed-empty" className="px-4 py-16 text-center">
            <p className="text-ig-muted">Abhi koi post nahi 🌙</p>
            <p className="mt-1 text-sm text-ig-faint">Thodi der mein wapas aana!</p>
          </div>
        )}

        {offline && (
          <div data-testid="feed-offline-note" className="px-4 py-2 text-center text-xs text-ig-faint">
            📵 Offline — purana content dikha rahe hain
          </div>
        )}

        {!error && visiblePosts.length > 0 && (
          <div data-testid="feed-posts">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isMostLoved={post.id === mostLovedPostId}
                liveCount={likeCounts[post.id] || 0}
                onLiveCount={setLikeCount}
              />
            ))}
          </div>
        )}

        {hasEndCard && (
          <div
            ref={endCardRef}
            data-testid="feed-end-card"
            className={`px-4 py-10 text-center transition-all duration-700 ease-out ${
              endCardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <p className={`text-2xl ${endCardVisible ? 'feed-end-heart' : ''}`}>🤍</p>
            <p className="mt-2 text-sm text-ig-muted">{FEED_END_MESSAGE.title}</p>
            <p className="mt-1 text-xs text-ig-faint">{FEED_END_MESSAGE.subtitle}</p>
          </div>
        )}
      </PullToRefresh>

      {pullEgg && (
        <EasterEggModal
          message={PULL_REFRESH_EGG_MESSAGE}
          icon="🤍"
          onClose={() => setPullEgg(false)}
          testId="pull-refresh-egg"
        />
      )}

      {logoEgg && (
        <EasterEggModal
          message={LOGO_TAP_MESSAGE}
          icon="✨"
          onClose={() => setLogoEgg(false)}
          testId="feed-logo-egg"
        />
      )}
    </div>
  )
}
