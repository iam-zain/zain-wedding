import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_COMMENT_LENGTH,
  WISHES_EMPTY_MESSAGE,
  WISHES_FULL_MESSAGE,
  WISHES_THANKS_MESSAGE,
} from '../config'
import { getLikeCounts, getWishes, likePost, postWish } from '../lib/api'
import { getUserId, useLikedWishes, useUserName } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { relativeTime } from '../lib/time'
import { playChime } from '../lib/sound'
import { useToast } from '../components/toast-context'
import BackHeader from '../components/BackHeader'
import { moreLinkById } from '../lib/tabs'
import { HeartIcon } from '../components/icons'

// Same gradient the Wishes tile on the hub wears.
const { from: WISH_FROM, via: WISH_VIA } = moreLinkById('wishes')

// Each wish card takes the next accent in this rotation, so a long wall reads
// as a colourful stream rather than a column of identical grey boxes.
const CARD_ACCENTS = ['#a855f7', '#0095f6', '#ed4956', '#25d366', '#f7971e', '#00b8d4']

// Wish likes live in the same counter table as post likes, under their own
// prefix so a wish id can never collide with a post id.
const likeKey = (wish) => `wish_${wish.id}`

/**
 * A starting count of 5-9 so a fresh wish doesn't sit at zero. Derived from
 * the wish id rather than Math.random(), so every guest sees the same number
 * for the same wish and it doesn't jump on reload.
 */
function baseLikes(id) {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return 5 + (h % 5)
}

function WishCard({ wish, isMine, accent, liked, live, onLike }) {
  const [pop, setPop] = useState(false)
  // Floor at 1 once liked: in LOCAL_MODE (and in the moment before the POST
  // returns) there is no server count to reflect this device's own like.
  const total = baseLikes(wish.id) + Math.max(live || 0, liked ? 1 : 0)

  const sentRef = useRef(false)
  // A failed like is rolled back (liked -> false); release the latch so the
  // guest can try again.
  useEffect(() => {
    if (!liked) sentRef.current = false
  }, [liked])

  function tap() {
    // `liked` comes from props and may not have re-rendered between two fast
    // taps, so latch locally too — otherwise one double-tap posts two likes.
    if (liked || sentRef.current) return // one like per device
    sentRef.current = true
    setPop(true)
    setTimeout(() => setPop(false), 850)
    onLike(wish)
  }

  return (
    <li
      data-testid={`wish-${wish.id}`}
      className="rounded-2xl border p-3.5"
      style={{
        borderColor: `${accent}59`,
        background: `linear-gradient(135deg, ${accent}1f, ${accent}08)`,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold" style={{ color: accent }}>
          {isMine ? 'You' : wish.userName}
        </p>
        <p className="shrink-0 text-[10px] uppercase tracking-wide text-ig-faint">
          {relativeTime(wish.createdAt)}
        </p>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-snug text-ig-text">
        {wish.text}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          aria-label={liked ? 'Liked' : 'Like this wish'}
          aria-pressed={liked}
          data-testid={`wish-like-${wish.id}`}
          onClick={tap}
          style={{ touchAction: 'manipulation' }}
          className="relative active:scale-90"
        >
          <HeartIcon filled={liked} size={20} className={liked ? 'text-ig-red' : 'text-ig-muted'} />
          {pop && (
            <span aria-hidden="true" className="pointer-events-none absolute -top-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center">
              <span className="like-react-glow absolute inset-0 rounded-full" />
              <HeartIcon filled size={28} className="like-react-pop relative text-ig-red" />
            </span>
          )}
        </button>
        <span data-testid={`wish-like-count-${wish.id}`} className="text-xs font-semibold tabular-nums text-ig-muted">
          {total}
        </span>
      </div>
    </li>
  )
}

export default function WishesPage() {
  const toast = useToast()
  const userId = getUserId()
  const [savedName, setSavedName] = useUserName()

  const [wishes, setWishes] = useState(null) // null = not fetched yet
  const [nextShard, setNextShard] = useState(null)
  const [full, setFull] = useState(false)
  const [error, setError] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const { has: isLiked, add: addLiked, remove: removeLiked } = useLikedWishes()
  const [likeCounts, setLikeCounts] = useState({}) // likeKey -> live count beyond base

  const load = useCallback(async () => {
    setError(false)
    try {
      const res = await getWishes()
      setWishes(res.wishes)
      setNextShard(res.nextShard)
      setFull(res.full)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // One batched read for every wish on the wall, after the wall loads.
  const wishIds = wishes ? wishes.map(likeKey).join(',') : ''
  useEffect(() => {
    if (!wishIds) return
    let cancelled = false
    getLikeCounts(wishIds.split(','))
      .then((counts) => { if (!cancelled) setLikeCounts((cur) => ({ ...cur, ...counts })) })
      .catch(() => {}) // counts are decoration — the wall still works without them
    return () => { cancelled = true }
  }, [wishIds])

  async function likeWish(wish) {
    const key = likeKey(wish)
    haptic('like')
    addLiked(wish.id)
    setLikeCounts((cur) => ({ ...cur, [key]: (cur[key] || 0) + 1 }))
    try {
      const { count } = await likePost(key, userId)
      if (count != null) setLikeCounts((cur) => ({ ...cur, [key]: count }))
    } catch {
      removeLiked(wish.id)
      setLikeCounts((cur) => ({ ...cur, [key]: Math.max(0, (cur[key] || 1) - 1) }))
      toast('Like nahi hua, dobara try kariye')
    }
  }

  const needsName = !savedName
  const canSend =
    text.trim().length > 0 && (savedName || nameDraft.trim().length > 0) && !sending && !full

  async function submit(e) {
    e.preventDefault()
    if (!canSend) return
    const name = (savedName || nameDraft).trim()
    const body = text.trim()
    setSending(true)
    try {
      const created = await postWish({ text: body, userName: name, userId }, nextShard)
      if (!savedName) setSavedName(name)
      // Prepended rather than refetched: the wall is newest-first, so the
      // guest sees their own wish land instantly without a second round trip.
      setWishes((cur) => [created, ...(cur || [])])
      setText('')
      setNameDraft('')
      haptic('success')
      playChime()
      toast(WISHES_THANKS_MESSAGE, { duration: 4000 })
    } catch (err) {
      if (err?.message === 'WISHES_FULL') {
        setFull(true)
        toast(WISHES_FULL_MESSAGE, { duration: 5000 })
      } else {
        toast('Paigham nahi bheja gaya 😕 Dobara try kariye')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div data-testid="wishes-page">
      <BackHeader title="Wishes" linkId="wishes" />

      <div className="px-4 pt-5">
        <h2
          className="text-lg font-semibold text-transparent"
          style={{
            backgroundImage: `linear-gradient(90deg, ${WISH_FROM}, ${WISH_VIA})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          }}
        >
          Duaon ka silsila 🤍
        </h2>
        <p className="mt-0.5 text-sm text-ig-muted">
          Do lafz likh jaiye — dua, mubarakbaad ya koi purani yaad. Hum sab padhenge.
        </p>
      </div>

      {!full && (
        <form onSubmit={submit} className="space-y-2 px-4 pt-4">
          {needsName && (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              autoComplete="name"
              data-testid="wishes-name-input"
              className="w-full rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm outline-none placeholder:text-ig-faint focus:border-ig-muted"
            />
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Apna paigham likhiye…"
            rows={3}
            maxLength={MAX_COMMENT_LENGTH}
            data-testid="wishes-text-input"
            className="w-full resize-none rounded-xl border border-ig-border bg-ig-card px-3 py-2.5 text-sm outline-none placeholder:text-ig-faint focus:border-ig-muted"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-ig-faint">
              {text.length}/{MAX_COMMENT_LENGTH}
            </span>
            <button
              type="submit"
              disabled={!canSend}
              data-testid="wishes-submit"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 active:opacity-90"
              style={{ background: `linear-gradient(135deg, ${WISH_FROM}, ${WISH_VIA})` }}
            >
              {sending ? 'Bhej rahe hain…' : 'Bhejiye 🤍'}
            </button>
          </div>
        </form>
      )}

      {full && (
        <p data-testid="wishes-full" className="px-4 pt-4 text-sm text-ig-muted">
          {WISHES_FULL_MESSAGE}
        </p>
      )}

      <section className="px-4 pb-8 pt-6">
        {wishes === null && !error && <p className="text-sm text-ig-faint">Paighaam load ho rahe hain…</p>}

        {error && (
          <button
            type="button"
            onClick={load}
            data-testid="wishes-retry"
            className="text-sm text-ig-blue"
          >
            Load nahi hua — dobara try kariye
          </button>
        )}

        {wishes?.length === 0 && <p className="text-sm text-ig-faint">{WISHES_EMPTY_MESSAGE}</p>}

        {wishes && wishes.length > 0 && (
          <>
            <p className="mb-3 text-xs text-ig-muted">
              {wishes.length === 1 ? '1 paigham' : `${wishes.length} paighaam`}
            </p>
            <ul data-testid="wishes-list" className="space-y-2">
              {wishes.map((wish, i) => (
                <WishCard
                  key={wish.id || `${wish.createdAt}-${wish.userId}`}
                  wish={wish}
                  isMine={wish.userId === userId}
                  accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
                  liked={isLiked(wish.id)}
                  live={likeCounts[likeKey(wish)]}
                  onLike={likeWish}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
