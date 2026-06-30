import { useState } from 'react'
import { siteConfig, SITE_URL } from '../config'
import { likePost } from '../lib/api'
import { shareUrl } from '../lib/share'
import { relativeTime } from '../lib/time'
import { getUserId, useBookmarkedPosts, useLikedPosts } from '../lib/storage'
import Carousel from './Carousel'
import Comments from './Comments'
import { useToast } from './toast-context'
import { BookmarkIcon, CommentIcon, HeartIcon, ShareIcon } from './icons'

export default function PostCard({ post }) {
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

  const totalLikes = (post.likes_base || 0) + liveCount

  async function like() {
    if (liked) return // like-once (backend only increments)
    addLike(post.id)
    setLiveCount((c) => c + 1)
    try {
      const { count } = await likePost(post.id, userId)
      if (count != null) setLiveCount(count) // authoritative live delta
    } catch {
      removeLike(post.id)
      setLiveCount((c) => Math.max(0, c - 1))
      toast('Like nahi hua, dobara try karo')
    }
  }

  function onDoubleTap() {
    setBurst(true)
    setTimeout(() => setBurst(false), 900)
    if (!liked) like()
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
    <article className="mb-1 border-b border-ig-border pb-2">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-3 py-2">
        <img src={profile.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-ig-border" />
        <span className="text-sm font-semibold">{profile.username}</span>
      </header>

      {/* Media + double-tap burst */}
      <div className="relative">
        <Carousel images={post.images} onDoubleTap={onDoubleTap} />
        {burst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <HeartIcon filled size={96} className="like-burst text-white drop-shadow-lg" />
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Like" aria-pressed={liked} onClick={like} className="outline-none active:scale-90">
            <HeartIcon filled={liked} size={26} className={liked ? 'text-ig-red' : 'text-ig-text'} />
          </button>
          <button
            type="button"
            aria-label="Comments"
            onClick={() => setCommentsOpen((v) => !v)}
            className="outline-none active:scale-90"
          >
            <CommentIcon size={26} />
          </button>
          <button type="button" aria-label="Share" onClick={share} className="outline-none active:scale-90">
            <ShareIcon size={26} />
          </button>
        </div>
        <button
          type="button"
          aria-label="Bookmark"
          aria-pressed={bookmarked}
          onClick={() => toggleBookmark(post.id)}
          className="outline-none active:scale-90"
        >
          <BookmarkIcon filled={bookmarked} size={26} />
        </button>
      </div>

      {/* Likes */}
      {totalLikes > 0 && (
        <div className="px-3 pt-2 text-sm font-semibold">
          {totalLikes.toLocaleString('en-IN')} {totalLikes === 1 ? 'like' : 'likes'}
        </div>
      )}

      {/* Caption + description */}
      <div className="px-3 pt-1">
        {post.title && (
          <p className="text-sm leading-snug">
            <span className="font-semibold">{profile.username}</span> {post.title}
          </p>
        )}
        {post.description && (
          <div
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
        <time className="block px-3 pt-0.5 text-[10px] tracking-wide text-ig-faint">
          {relativeTime(post.created_at)}
        </time>
      )}
    </article>
  )
}
