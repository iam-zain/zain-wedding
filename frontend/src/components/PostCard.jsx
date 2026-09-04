import { useState, useEffect, useRef } from 'react'
import { siteConfig, SITE_URL, isLikeMilestone, likeMilestoneMessage, MOST_LOVED_LABEL } from '../config'
import { likePost, getLikeCount } from '../lib/api'
import { shareUrl } from '../lib/share'
import { relativeTime } from '../lib/time'
import { getUserId, useBookmarkedPosts, useLikedPosts } from '../lib/storage'
import Carousel from './Carousel'
import Comments from './Comments'
import EasterEggModal from './EasterEggModal'
import { useToast } from './toast-context'
import { BookmarkIcon, CommentIcon, HeartIcon, ShareIcon } from './icons'

// Holding the like button this long triggers the rising-hearts shower.
const HEART_LONG_PRESS_MS = 450
const FLOAT_HEART_COUNT = 7
const FLOAT_HEART_LIFE_MS = 1800
// 8 evenly-spaced directions (every 45°) for the YouTube-style radiating burst.
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

export default function PostCard({ post, isMostLoved = false }) {
  const { profile } = siteConfig
  const userId = getUserId()
  const toast = useToast()

  const { has: isLiked, add: addLike, remove: removeLike } = useLikedPosts()
  const { has: isBookmarked, toggle: toggleBookmark } = useBookmarkedPosts()

  const liked = isLiked(post.id)
  const bookmarked = isBookmarked(post.id)

  // liveCount = likes beyond likes_base. Seed optimistically from local "liked".
  const [liveCount, setLiveCount] = useState(liked ? 1 : 0)
  const [burst, setBurst] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [likeEgg, setLikeEgg] = useState(null)
  const [buttonReact, setButtonReact] = useState(false)
  const [radiatingBurst, setRadiatingBurst] = useState(false)
  const [floatingHearts, setFloatingHearts] = useState([])
  const [heartHolding, setHeartHolding] = useState(false)
  const lastMilestoneRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const longPressFiredRef = useRef(false)
  const heartButtonRef = useRef(null)

  // Fetch authoritative live delta on mount and poll periodically so counts
  // converge across devices. This merges server-side delta into local state.
  useEffect(() => {
    let mounted = true
    let timer = null

    async function fetchCount() {
      try {
        const { count } = await getLikeCount(post.id)
        if (!mounted || count == null) return
        setLiveCount(count)
      } catch (err) {
        // ignore network errors; keep optimistic UI
      }
    }

    fetchCount()
    timer = setInterval(fetchCount, 30000)
    return () => {
      mounted = false
      if (timer) clearInterval(timer)
    }
  }, [post.id])

  const totalLikes = (post.likes_base || 0) + liveCount

  // Fires at most once per milestone total (guards against the optimistic
  // bump and the later authoritative count both landing on the same number).
  function checkLikeMilestone(count) {
    const total = (post.likes_base || 0) + count
    if (isLikeMilestone(total) && lastMilestoneRef.current !== total) {
      lastMilestoneRef.current = total
      setLikeEgg(likeMilestoneMessage(total))
    }
  }

  async function like() {
    if (liked) return // like-once (backend only increments)
    addLike(post.id)
    const optimisticCount = liveCount + 1
    setLiveCount(optimisticCount)
    checkLikeMilestone(optimisticCount)
    try {
      const { count } = await likePost(post.id, userId)
      if (count != null) {
        setLiveCount(count) // authoritative live delta
        checkLikeMilestone(count)
      }
    } catch {
      removeLike(post.id)
      setLiveCount((c) => Math.max(0, c - 1))
      toast('Like nahi hua, dobara try karo')
    }
  }

  // Big centered burst over the photo — the classic double-tap-to-like moment.
  function triggerPhotoBurst() {
    setBurst(true)
    setTimeout(() => setBurst(false), 900)
  }

  // Floating reaction anchored right at the like button — used for every
  // button-triggered interaction, so feedback always appears where the
  // thumb actually is (rather than up on the photo, easy to miss).
  function triggerButtonReaction() {
    setButtonReact(true)
    setTimeout(() => setButtonReact(false), 850)
  }

  // YouTube-like-button style: short lines radiate outward from the heart, evenly spaced.
  function triggerRadiatingBurst() {
    setRadiatingBurst(true)
    setTimeout(() => setRadiatingBurst(false), 600)
  }

  // A handful of small hearts, random size/drift/duration, rising from the
  // button toward the top of the screen and fading — fixed-positioned (not
  // relative to the button) so they can travel well past the post card.
  function spawnFloatingHearts() {
    const rect = heartButtonRef.current?.getBoundingClientRect()
    if (!rect) return
    const originX = rect.left + rect.width / 2
    const originY = rect.top + rect.height / 2
    const batchId = Date.now()
    const hearts = Array.from({ length: FLOAT_HEART_COUNT }, (_, i) => ({
      id: `${batchId}-${i}`,
      left: originX + (Math.random() * 36 - 18),
      top: originY,
      size: 8 + Math.random() * 14,
      driftX: Math.random() * 70 - 35,
      duration: 1100 + Math.random() * 600,
      delay: Math.random() * 300,
    }))
    setFloatingHearts((cur) => [...cur, ...hearts])
    const ids = new Set(hearts.map((h) => h.id))
    setTimeout(() => {
      setFloatingHearts((cur) => cur.filter((h) => !ids.has(h.id)))
    }, FLOAT_HEART_LIFE_MS + 400)
  }

  function onDoubleTap() {
    triggerPhotoBurst()
    if (!liked) like()
  }

  // Single tap on the heart button: first like also reacts; re-tapping an
  // already-liked post reacts again instead of doing nothing (like() itself
  // is a no-op once liked).
  function onLikeButtonClick() {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false // long-press already reacted for this press
      return
    }
    triggerButtonReaction()
    if (!liked) like()
  }

  function onLikeButtonDoubleClick() {
    triggerButtonReaction()
    triggerRadiatingBurst()
    if (!liked) like()
  }

  // Holding the heart: a slow grow while held, then a shower of small
  // hearts rising off the screen once the hold clears the threshold.
  function onHeartPointerDown() {
    longPressFiredRef.current = false
    setHeartHolding(true)
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      setHeartHolding(false)
      spawnFloatingHearts()
      if (!liked) like()
    }, HEART_LONG_PRESS_MS)
  }

  function endHeartPress() {
    clearTimeout(longPressTimerRef.current)
    setHeartHolding(false)
  }

  useEffect(() => () => clearTimeout(longPressTimerRef.current), [])

  function onPinchZoom() {
    toast('🤍 Itna zoom mat karo, sab kuch dil se dikhta hai!')
  }

  async function share() {
    const result = await shareUrl({
      url: SITE_URL,
      title: post.title || profile.displayName,
      text: post.title || 'Check this out! 🎉',
    })
    if (result === 'copied') toast('🔗 Link copy ho gaya!')
    else if (result === 'failed') toast('Share nahi ho paaya 😅')
  }

  return (
    <article data-testid={`post-card-${post.id}`} className="mb-1 border-b border-ig-border pb-2">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-3 py-2">
        <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-ig-border" />
        <span className="text-sm font-semibold">{profile.username}</span>
      </header>

      {/* Media + double-tap burst */}
      <div className="relative">
        <Carousel images={post.images} onDoubleTap={onDoubleTap} onPinch={onPinchZoom} testId={`post-carousel-${post.id}`} />
        {isMostLoved && (
          <div
            data-testid={`post-most-loved-${post.id}`}
            className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
          >
            <span aria-hidden="true">🏆</span> {MOST_LOVED_LABEL}
          </div>
        )}
        {burst && (
          <div
            data-testid={`post-like-burst-${post.id}`}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="relative flex h-28 w-28 items-center justify-center">
              <span className="like-burst-glow absolute inset-0 rounded-full" />
              <HeartIcon filled size={96} className="like-burst relative text-white" />
            </span>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-4">
          <button
            ref={heartButtonRef}
            type="button"
            aria-label="Like"
            aria-pressed={liked}
            data-testid={`post-like-button-${post.id}`}
            onClick={onLikeButtonClick}
            onDoubleClick={onLikeButtonDoubleClick}
            onPointerDown={onHeartPointerDown}
            onPointerUp={endHeartPress}
            onPointerLeave={endHeartPress}
            onPointerCancel={endHeartPress}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'manipulation' }}
            className="egg-tap relative outline-none active:scale-90"
          >
            <HeartIcon
              filled={liked}
              size={26}
              className={`transition-transform duration-[450ms] ease-out ${heartHolding ? 'scale-150' : 'scale-100'} ${
                liked ? 'text-ig-red' : 'text-ig-text'
              }`}
            />
            {buttonReact && (
              <span
                aria-hidden="true"
                data-testid={`post-like-react-${post.id}`}
                className="pointer-events-none absolute -top-1 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center"
              >
                <span className="like-react-glow absolute inset-0 rounded-full" />
                <HeartIcon filled size={34} className="like-react-pop relative text-ig-red" />
              </span>
            )}
            {radiatingBurst && (
              <span
                aria-hidden="true"
                data-testid={`post-like-burst-lines-${post.id}`}
                className="pointer-events-none absolute inset-0"
              >
                {BURST_ANGLES.map((angle) => (
                  <span key={angle} className="burst-line" style={{ '--burst-angle': `${angle}deg` }} />
                ))}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="Comments"
            data-testid={`post-comment-button-${post.id}`}
            onClick={() => setCommentsOpen((v) => !v)}
            className="outline-none active:scale-90"
          >
            <CommentIcon size={26} />
          </button>
          <button
            type="button"
            aria-label="Share"
            data-testid={`post-share-button-${post.id}`}
            onClick={share}
            className="outline-none active:scale-90"
          >
            <ShareIcon size={26} />
          </button>
        </div>
        <button
          type="button"
          aria-label="Bookmark"
          aria-pressed={bookmarked}
          data-testid={`post-bookmark-button-${post.id}`}
          onClick={() => toggleBookmark(post.id)}
          className="outline-none active:scale-90"
        >
          <BookmarkIcon filled={bookmarked} size={26} />
        </button>
      </div>

      {/* Likes */}
      {totalLikes > 0 && (
        <div data-testid={`post-likes-count-${post.id}`} className="px-3 pt-2 text-sm font-semibold">
          {totalLikes.toLocaleString('en-IN')} {totalLikes === 1 ? 'like' : 'likes'}
        </div>
      )}

      {/* Caption + description */}
      <div className="px-3 pt-1">
        {post.title && (
          <p data-testid={`post-caption-${post.id}`} className="text-sm leading-snug">
            <span className="font-semibold">{profile.username}</span> {post.title}
          </p>
        )}
        {post.description && (
          <div
            data-testid={`post-description-${post.id}`}
            className="post-html mt-1 text-sm leading-snug text-ig-text"
            dangerouslySetInnerHTML={{ __html: post.description }}
          />
        )}
      </div>

      {/* Comments */}
      <div className="pt-1">
        <Comments postId={post.id} expanded={commentsOpen} onToggle={() => setCommentsOpen((v) => !v)} />
      </div>

      {/* Timestamp */}
      {post.created_at && (
        <time
          data-testid={`post-timestamp-${post.id}`}
          className="block px-3 pt-0.5 text-[10px] tracking-wide text-ig-faint"
        >
          {relativeTime(post.created_at)}
        </time>
      )}

      {likeEgg && (
        <EasterEggModal
          message={likeEgg}
          icon="🎊"
          onClose={() => setLikeEgg(null)}
          testId={`post-like-egg-${post.id}`}
        />
      )}

      {floatingHearts.length > 0 && (
        <div
          aria-hidden="true"
          data-testid={`post-floating-hearts-${post.id}`}
          className="pointer-events-none fixed inset-0 z-[70]"
        >
          {floatingHearts.map((h) => (
            <HeartIcon
              key={h.id}
              filled
              size={h.size}
              className="floating-heart absolute text-ig-red"
              style={{
                left: h.left,
                top: h.top,
                '--drift-x': `${h.driftX}px`,
                animationDuration: `${h.duration}ms`,
                animationDelay: `${h.delay}ms`,
              }}
            />
          ))}
        </div>
      )}
    </article>
  )
}
