import { useCallback, useEffect, useState } from 'react'
import { MAX_COMMENTS_PER_POST, MAX_COMMENT_LENGTH } from '../config'
import { getComments, postComment } from '../lib/api'
import { getUserId, useUserName } from '../lib/storage'
import { useToast } from './toast-context'

function plural(n) {
  return n === 1 ? '1 comment' : `${n} comments`
}

// Expansion is controlled by the parent PostCard (so the 💬 icon can open it too).
export default function Comments({ postId, expanded, onToggle }) {
  const [comments, setComments] = useState(null) // null = not fetched yet
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const [savedName, setSavedName] = useUserName()
  const [nameDraft, setNameDraft] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const userId = getUserId()

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setComments(await getComments(postId))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [postId])

  // Lazy fetch the first time the section is opened.
  useEffect(() => {
    if (expanded && comments === null && !loading && !error) load()
  }, [expanded, comments, loading, error, load])

  const atLimit = (comments?.length ?? 0) >= MAX_COMMENTS_PER_POST
  const needsName = !savedName
  const canSubmit =
    text.trim().length > 0 && (savedName || nameDraft.trim().length > 0) && !atLimit && !submitting

  async function submit(e) {
    e.preventDefault()
    if (!canSubmit) return
    const name = (savedName || nameDraft).trim()
    const body = text.trim()
    setSubmitting(true)
    try {
      const created = await postComment(postId, { text: body, userName: name, userId })
      if (!savedName) setSavedName(name)
      setComments((cur) => [...(cur || []), created])
      setText('')
      setNameDraft('')
    } catch (err) {
      if (err?.message === 'COMMENT_LIMIT') {
        toast('Is post pe comments full ho gaye 🙏')
        load()
      } else {
        toast('Comment post nahi hua 😕')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const count = comments?.length

  return (
    <div className="px-3 pb-1">
      <button type="button" onClick={onToggle} className="py-1 text-sm text-ig-muted active:opacity-70">
        {count === undefined
          ? 'View comments'
          : count === 0
            ? 'Be the first to comment'
            : expanded
              ? 'Hide comments'
              : `View all ${plural(count)}`}
      </button>

      {expanded && (
        <div className="pb-2">
          {loading && comments === null && <p className="py-2 text-sm text-ig-faint">Loading comments…</p>}
          {error && (
            <button type="button" onClick={load} className="py-2 text-sm text-ig-blue">
              Couldn’t load — tap to retry
            </button>
          )}

          {comments && comments.length > 0 && (
            <ul className="space-y-2 py-1">
              {comments.map((c) => (
                <li key={c.id || c.createdAt + c.userId} className="text-sm leading-snug">
                  <span className="font-semibold">{c.userId === userId ? 'You' : c.userName}</span>{' '}
                  <span className="break-words">{c.text}</span>
                </li>
              ))}
            </ul>
          )}

          {comments !== null &&
            (atLimit ? (
              <p className="py-2 text-xs text-ig-faint">
                Comment limit ({MAX_COMMENTS_PER_POST}) reached for this post.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-1 flex flex-col gap-2">
                {needsName && (
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Your name"
                    maxLength={40}
                    className="w-full rounded-lg border border-ig-border bg-ig-card px-3 py-2 text-sm outline-none placeholder:text-ig-faint focus:border-ig-faint"
                  />
                )}
                <div className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a comment…"
                    maxLength={MAX_COMMENT_LENGTH}
                    className="flex-1 rounded-lg border border-ig-border bg-ig-card px-3 py-2 text-sm outline-none placeholder:text-ig-faint focus:border-ig-faint"
                  />
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="shrink-0 text-sm font-semibold text-ig-blue disabled:opacity-40"
                  >
                    {submitting ? '…' : 'Post'}
                  </button>
                </div>
              </form>
            ))}
        </div>
      )}
    </div>
  )
}
