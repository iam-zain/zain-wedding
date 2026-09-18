import { useState, useEffect, useRef } from 'react'
import {
  siteConfig,
  SITE_URL,
  isLikeMilestone,
  likeMilestoneMessage,
  MOST_LOVED_LABEL,
  PINCH_ZOOM_MESSAGES,
  POST_HEADER_TAP_MESSAGES,
} from '../config'
import { likePost } from '../lib/api'
import { shareUrl } from '../lib/share'
import { haptic } from '../lib/haptics'
import { relativeTime } from '../lib/time'
import { getUserId, useBookmarkedPosts, useLikedPosts } from '../lib/storage'
import Carousel from './Carousel'
import Comments from './Comments'
import EasterEggModal from './EasterEggModal'
import { useToast } from './toast-context'
import { BookmarkIcon, CommentIcon, HeartIcon, ShareIcon } from './icons'

// Holding the like button this long triggers the rising-hearts shower.
const HEART_LONG_PRESS_MS = 450
// A tap's own animation waits this long before playing. A second tap inside
// the window makes it a double-tap, which owns a different animation — so the
// single-tap pop has to be cancellable rather than fire the instant it lands.
const DOUBLE_TAP_WINDOW_MS = 250
const BUTTON_REACT_MS = 850
const FLOAT_HEART_COUNT = 7
const FLOAT_HEART_LIFE_MS = 1800
// 8 evenly-spaced directions (every 45°) for the YouTube-style radiating burst.
const BURST_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

/** [r, g, b] with each 0-255, or null — anything else is ignored. */
function validTint(t) {
  if (!Array.isArray(t) || t.length !== 3) return null
  return t.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? t : null
}

export default function PostCard({ post, isMostLoved = false, liveCount = 0, onLiveCount }) {
  const { profile } = siteConfig
  const userId = getUserId()
  const toast = useToast()

  const { has: isLiked, add: addLike, remove: removeLike } = useLikedPosts()
  const { has: isBookmarked, toggle: toggleBookmark } = useBookmarkedPosts()

  const liked = isLiked(post.id)
  const bookmarked = isBookmarked(post.id)

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
  const singleTapTimerRef = useRef(null)
  const buttonReactTimerRef = useRef(null)
  // A double-tap emits click, click AND dblclick, so like() can be re-entered
  // two or three times before `liked` has re-rendered — each one POSTing
  // another increment. This latches on the first call instead.
  const likeSentRef = useRef(false)

  // liveCount = likes beyond likes_base, owned + polled by FeedPage. The floor
  // keeps this device's own like visible in LOCAL_MODE, where there is no
  // server count to report it back.
  const setLiveCount = (count) => onLiveCount?.(post.id, count)
  const shownLiveCount = Math.max(liveCount, liked ? 1 : 0)

  const totalLikes = (post.likes_base || 0) + shownLiveCount

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
    if (liked || likeSentRef.current) return // like-once (backend only increments)
    likeSentRef.current = true
    haptic('like')
    addLike(post.id)
    const optimisticCount = shownLiveCount + 1
    setLiveCount(optimisticCount)
    checkLikeMilestone(optimisticCount)
    try {
      const { count } = await likePost(post.id, userId)
      if (count != null) {
        setLiveCount(count) // authoritative live delta
        checkLikeMilestone(count)
      }
    } catch {
      likeSentRef.current = false // let them try again
      removeLike(post.id)
      setLiveCount(Math.max(0, shownLiveCount))
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
    clearTimeout(buttonReactTimerRef.current)
    setButtonReact(true)
    buttonReactTimerRef.current = setTimeout(() => setButtonReact(false), BUTTON_REACT_MS)
  }

  /**
   * Drops the single-tap pop, whether it is still queued or already on screen.
   * The richer gestures call this first so their own animation plays alone —
   * a slow double-tap can outrun DOUBLE_TAP_WINDOW_MS, and clearing the timer
   * alone would leave the pop mid-flight underneath the burst.
   */
  function cancelButtonReaction() {
    clearTimeout(singleTapTimerRef.current)
    clearTimeout(buttonReactTimerRef.current)
    setButtonReact(false)
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

  // One gesture, one animation. A tap's pop is deferred by the double-tap
  // window so it can be withdrawn if a second tap follows; the like itself is
  // never deferred, so the heart still fills instantly.
  //
  // longPressFiredRef is deliberately NOT reset here — the pointerdown that
  // starts the next press owns that, so the trailing click AND dblclick of a
  // press that turned into a long-press are both suppressed.
  function onLikeButtonClick() {
    if (longPressFiredRef.current) return
    clearTimeout(singleTapTimerRef.current)
    singleTapTimerRef.current = setTimeout(triggerButtonReaction, DOUBLE_TAP_WINDOW_MS)
    if (!liked) like()
  }

  function onLikeButtonDoubleClick() {
    if (longPressFiredRef.current) return
    cancelButtonReaction() // the pop is the single-tap animation; burst plays alone
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
      cancelButtonReaction() // hearts shower alone, no pop underneath it
      spawnFloatingHearts()
      if (!liked) like()
    }, HEART_LONG_PRESS_MS)
  }

  function endHeartPress() {
    clearTimeout(longPressTimerRef.current)
    setHeartHolding(false)
  }

  useEffect(
    () => () => {
      clearTimeout(longPressTimerRef.current)
      clearTimeout(singleTapTimerRef.current)
      clearTimeout(buttonReactTimerRef.current)
    },
    [],
  )

  function onPinchZoom() {
    haptic('tap')
    toast(PINCH_ZOOM_MESSAGES[Math.floor(Math.random() * PINCH_ZOOM_MESSAGES.length)])
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

  // The cover's colour, worked out once when the post was uploaded and stored
  // on the post. Read from data rather than sampled in the browser: CloudFront
  // doesn't send CORS headers for images, and the covers are ~2 MB each, so
  // sampling here would mean re-downloading every cover on every guest's phone.
  const tint = validTint(post.tint)

  // Avatar / username jump back to the profile at the top, like tapping the
  // header on a long Instagram scroll.
  function toTop() {
    haptic('tap')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast(POST_HEADER_TAP_MESSAGES[Math.floor(Math.random() * POST_HEADER_TAP_MESSAGES.length)])
  }

  return (
    <article
      data-testid={`post-card-${post.id}`}
      data-tint={tint ? tint.join(',') : ''}
      className="mb-1 border-b border-ig-border pb-2 transition-[background] duration-700"
      // The cover's own colour, faint at the top and fading to black at the
      // bottom — enough to give each post a mood without competing with the
      // photo. Stays plain black until (or unless) the colour is known.
      style={
        tint
          ? { background: `linear-gradient(to bottom, rgba(${tint.join(',')},0.22) 0%, rgba(${tint.join(',')},0.08) 55%, rgba(${tint.join(',')},0) 100%)` }
          : undefined
      }
    >
      {/* Header */}
      <header className="flex items-center gap-2.5 px-3 py-2">
        <button
          type="button"
          onClick={toTop}
          aria-label="Back to top"
          data-testid={`post-header-${post.id}`}
          className="flex items-center gap-2.5 rounded-full pr-2 active:opacity-70"
        >
          <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-ig-border" />
          <span className="text-sm font-semibold">{profile.username}</span>
        </button>
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
