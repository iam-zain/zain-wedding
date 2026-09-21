import { useRef, useState } from 'react'
import { MAX_COMMENT_LENGTH, STORY_REACTIONS, STORY_REPLY_THANKS } from '../config'
import { postComment } from '../lib/api'
import { getUserId, getUserName, setUserName } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { useToast } from './toast-context'

// Emoji that float up after a reaction. Matches the feed's like animation so
// the two gestures feel like the same app.
const FLOAT_COUNT = 6
const FLOAT_MS = 1900

/** Comments key a story's replies live under, kept clear of real post ids. */
const storyThreadId = (storyId) => `story_${storyId}`

export default function StoryReplyBar({ storyId, onActivity }) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [floats, setFloats] = useState([])
  const floatSeq = useRef(0)

  function burst(emoji) {
    const items = Array.from({ length: FLOAT_COUNT }, () => {
      floatSeq.current += 1
      return {
        id: floatSeq.current,
        emoji,
        left: `${45 + Math.random() * 10}%`,
        driftX: Math.round((Math.random() - 0.5) * 160),
        size: 20 + Math.round(Math.random() * 16),
        delay: Math.round(Math.random() * 260),
      }
    })
    setFloats((cur) => [...cur, ...items])
    // Only this burst's ids are removed, so a second tap mid-animation doesn't
    // cut the first one short.
    const ids = new Set(items.map((i) => i.id))
    setTimeout(() => setFloats((cur) => cur.filter((f) => !ids.has(f.id))), FLOAT_MS + 400)
  }

  async function send(body, { silent = false } = {}) {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    // Stories are anonymous-ish: reuse the saved name if there is one, else a
    // friendly default rather than blocking the gesture behind a name prompt.
    const name = getUserName() || 'Guest'
    if (!getUserName()) setUserName(name)

    setSending(true)
    try {
      await postComment(storyThreadId(storyId), {
        text: trimmed,
        userName: name,
        userId: getUserId(),
      })
      if (!silent) toast(STORY_REPLY_THANKS, { duration: 3000 })
    } catch (err) {
      // A full thread isn't the guest's fault and the reaction already played,
      // so say something soft rather than surfacing a limit error.
      toast(
        err?.message === 'COMMENT_LIMIT'
          ? 'Is story pe bahut replies aa gaye 🙏'
          : 'Reply nahi gaya 😕 Dobara try kariye',
        { duration: 3000 },
      )
    } finally {
      setSending(false)
    }
  }

  function react(emoji) {
    haptic('like')
    burst(emoji)
    onActivity?.()
    send(emoji, { silent: true })
  }

  function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    haptic('tap')
    send(text)
    setText('')
  }

  return (
    <>
      {floats.length > 0 && (
        <div aria-hidden="true" data-testid="story-reply-floats" className="pointer-events-none fixed inset-0 z-[70]">
          {floats.map((f) => (
            <span
              key={f.id}
              className="floating-heart absolute"
              style={{
                left: f.left,
                top: '78%',
                fontSize: `${f.size}px`,
                '--drift-x': `${f.driftX}px`,
                animationDuration: `${FLOAT_MS}ms`,
                animationDelay: `${f.delay}ms`,
              }}
            >
              {f.emoji}
            </span>
          ))}
        </div>
      )}

      {/*
        z-20 puts this above the prev/next tap zones (z-10) — without that the
        zones would swallow every tap here and advance the story instead.
        Pointer events are stopped so the card's long-press egg doesn't arm
        while someone is typing a reply.
      */}
      <div
        data-testid="story-reply-bar"
        className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        // The backdrop closes the viewer on a downward swipe; without these a
        // scroll or drag that starts in this bar would dismiss the story.
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-center gap-1">
          {STORY_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React ${emoji}`}
              data-testid={`story-react-${emoji}`}
              onClick={() => react(emoji)}
              className="rounded-full px-2 py-1 text-2xl leading-none transition-transform active:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={onActivity}
            placeholder="Reply bhejiye…"
            maxLength={MAX_COMMENT_LENGTH}
            data-testid="story-reply-input"
            className="min-w-0 flex-1 rounded-full border border-white/40 bg-white/10 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/60 focus:border-white/80"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            data-testid="story-reply-send"
            className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 active:opacity-70"
          >
            {sending ? '…' : 'Send'}
          </button>
        </form>
      </div>
    </>
  )
}
