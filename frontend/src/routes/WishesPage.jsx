import { useCallback, useEffect, useState } from 'react'
import {
  MAX_COMMENT_LENGTH,
  WISHES_EMPTY_MESSAGE,
  WISHES_FULL_MESSAGE,
  WISHES_THANKS_MESSAGE,
} from '../config'
import { getWishes, postWish } from '../lib/api'
import { getUserId, useUserName } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { relativeTime } from '../lib/time'
import { playChime } from '../lib/sound'
import { useToast } from '../components/toast-context'
import BackHeader from '../components/BackHeader'

function WishCard({ wish, isMine }) {
  return (
    <li
      data-testid={`wish-${wish.id}`}
      className="rounded-2xl border border-ig-border bg-ig-elevated p-3.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-semibold">
          {isMine ? 'You' : wish.userName}
        </p>
        <p className="shrink-0 text-[10px] uppercase tracking-wide text-ig-faint">
          {relativeTime(wish.createdAt)}
        </p>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-snug text-ig-text">
        {wish.text}
      </p>
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
        toast('Paigham nahi bheja gaya 😕 Dobara try karo')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div data-testid="wishes-page">
      <BackHeader title="Wishes" />

      <div className="px-4 pt-5">
        <h2 className="text-lg font-semibold">Duaon ka silsila 🤍</h2>
        <p className="mt-0.5 text-sm text-ig-muted">
          Do lafz likh jao — dua, mubarakbaad ya koi purani yaad. Hum sab padhenge.
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
            placeholder="Apna paigham likho…"
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
              className="rounded-xl bg-ig-blue px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 active:opacity-90"
            >
              {sending ? 'Bhej rahe hain…' : 'Bhejo 🤍'}
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
            Load nahi hua — dobara try karo
          </button>
        )}

        {wishes?.length === 0 && <p className="text-sm text-ig-faint">{WISHES_EMPTY_MESSAGE}</p>}

        {wishes && wishes.length > 0 && (
          <>
            <p className="mb-3 text-xs text-ig-muted">
              {wishes.length === 1 ? '1 paigham' : `${wishes.length} paighaam`}
            </p>
            <ul data-testid="wishes-list" className="space-y-2">
              {wishes.map((wish) => (
                <WishCard
                  key={wish.id || `${wish.createdAt}-${wish.userId}`}
                  wish={wish}
                  isMine={wish.userId === userId}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
