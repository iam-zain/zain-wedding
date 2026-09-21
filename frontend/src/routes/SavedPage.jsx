import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useVisibleFeed } from '../lib/useVisibleFeed'
import { useFeedData } from '../lib/feedData'
import { useBookmarkedPosts } from '../lib/storage'
import { moreLinkById } from '../lib/tabs'
import PostCard from '../components/PostCard'
import BackHeader from '../components/BackHeader'

const { from: SAVED_FROM, via: SAVED_VIA } = moreLinkById('saved')

export default function SavedPage() {
  const { likeCounts, setLikeCount } = useFeedData()
  const { visiblePosts } = useVisibleFeed()
  const { list: bookmarked } = useBookmarkedPosts()

  // Intersected with what's visible, not read straight from storage: a post
  // the couple later hides must disappear from here too, and a bookmarked id
  // whose post no longer exists would otherwise render nothing at all.
  // Ordered by when it was saved, newest first, so the last thing you kept is
  // at the top, bookmarked is append-ordered.
  const saved = useMemo(() => {
    const byId = new Map(visiblePosts.map((p) => [p.id, p]))
    return bookmarked
      .map((id) => byId.get(id))
      .filter(Boolean)
      .reverse()
  }, [visiblePosts, bookmarked])

  return (
    <div data-testid="saved-page">
      <BackHeader title="Saved" linkId="saved" />

      <div className="px-4 pt-5">
        <h2
          className="text-lg font-semibold text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${SAVED_FROM}, ${SAVED_VIA})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          }}
        >
          Aapke sambhaale hue posts 🔖
        </h2>
        <p className="mt-0.5 text-sm text-ig-muted">
          {saved.length === 0
            ? 'Kisi bhi post pe 🔖 dabaiye, woh yahan aa jayegi.'
            : saved.length === 1
              ? '1 post sambhaali hui hai'
              : `${saved.length} posts sambhaali hui hain`}
        </p>
      </div>

      {saved.length === 0 ? (
        <div data-testid="saved-empty" className="px-4 pt-10 text-center">
          <div className="text-5xl leading-none">🔖</div>
          <p className="mx-auto mt-3 max-w-xs text-sm text-ig-muted">
            Abhi kuch save nahi kiya. Feed pe jaake jo pasand aaye, uska bookmark dabate jaiye, 
            sab yahin mil jayega.
          </p>
          <Link
            to="/"
            data-testid="saved-go-feed"
            className="mt-5 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:opacity-90"
            style={{ background: `linear-gradient(135deg, ${SAVED_FROM}, ${SAVED_VIA})` }}
          >
            Feed dekhiye
          </Link>
        </div>
      ) : (
        <div data-testid="saved-list" className="pt-4">
          {saved.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liveCount={likeCounts[post.id] || 0}
              onLiveCount={setLikeCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
