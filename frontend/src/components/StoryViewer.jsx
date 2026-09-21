import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { STORY_LONGPRESS_MESSAGES } from '../config'
import { stopStoryMusic } from '../lib/musicPlayer'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'
import StoryReplyBar from './StoryReplyBar'
import { CloseIcon } from './icons'

const LONG_PRESS_MS = 600

export default function StoryViewer({ stories, startIndex = 0, onClose, onViewed }) {
  const [index, setIndex] = useState(startIndex)
  const touchStart = useRef(null)
  const longPressTimerRef = useRef(null)
  const [egg, setEgg] = useState(null)

  const current = stories[index]

  // Mark the visible story as viewed.
  useEffect(() => {
    if (current) onViewed?.(current.id)
  }, [current, onViewed])

  // Which way the last move went, so the incoming story slides in from the
  // side the guest came from. Set before the index changes; the image wrapper
  // is keyed on the index, so it remounts and replays the animation.
  const [dir, setDir] = useState('next')

  const next = () => {
    setDir('next')
    setIndex((i) => (i + 1 < stories.length ? i + 1 : (onClose(), i)))
  }
  const prev = () => {
    setDir('prev')
    setIndex((i) => (i > 0 ? i - 1 : i))
  }

  // The track is started by the story circle's tap handler (see StoriesRow, 
  // it has to happen inside the gesture for mobile autoplay), so this owns
  // only the other half: stop it when the viewer closes. Not keyed on `index`,
  // so moving between stories neither restarts nor swaps the music.
  useEffect(() => stopStoryMusic, [])

  // Keyboard + scroll lock
  useEffect(() => {
    const onKey = (e) => {
      // Typing a reply must not drive the story. Arrow keys move the caret
      // inside the input, and Escape gives the guest a way to bail out of the
      // field without also closing the whole viewer.
      const el = e.target
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      if (typing) {
        if (e.key === 'Escape') el.blur()
        return
      }
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null

  function handleLongPressStart() {
    clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      const msg = STORY_LONGPRESS_MESSAGES[Math.floor(Math.random() * STORY_LONGPRESS_MESSAGES.length)]
      setEgg(msg)
      playChime()
    }, LONG_PRESS_MS)
  }

  function handleLongPressEnd() {
    clearTimeout(longPressTimerRef.current)
  }

  function onTouchStart(e) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  function onTouchEnd(e) {
    if (!touchStart.current) return
    const t = e.changedTouches[0]
    const dy = t.clientY - touchStart.current.y
    const dx = t.clientX - touchStart.current.x
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose()
    touchStart.current = null
  }

  // Rendered into <body> rather than in place. A full-screen overlay must not
  // depend on its ancestors staying transform-free: any transformed ancestor
  // becomes the containing block for position: fixed and the overlay silently
  // anchors to that box instead of the viewport. The page-slide animation used
  // to do exactly that, which left this viewer centred somewhere down the
  // document with only its music audible.
  return createPortal(
    /* Backdrop, full screen, dims on desktop */
    <div
      data-testid="story-viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 sm:bg-black/60"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Story card, full screen on mobile, phone-sized panel on desktop */}
      <div
        className="egg-tap relative flex flex-col bg-black
          w-full h-full
          sm:w-[400px] sm:h-[calc(100vh-48px)] sm:max-h-[860px] sm:rounded-2xl sm:overflow-hidden sm:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleLongPressStart}
        onPointerUp={handleLongPressEnd}
        onPointerLeave={handleLongPressEnd}
      >
        {/* Progress segments */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-2 pt-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
          {stories.map((s, i) => (
            <div key={s.id} data-testid={`story-viewer-progress-${i}`} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className={`h-full bg-white ${i <= index ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        {/* Close */}
        <button
          type="button"
          aria-label="Close"
          data-testid="story-viewer-close"
          onClick={onClose}
          className="absolute right-3 z-20 rounded-full p-1.5 text-white active:bg-white/10"
          style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
        >
          <CloseIcon size={26} />
        </button>

        {/* Image. Keyed on the index so each change remounts this wrapper and
            replays the slide; only the photo moves, so the progress bars and
            close button stay put. */}
        <div
          key={index}
          className={`flex flex-1 items-center justify-center overflow-hidden ${
            dir === 'prev' ? 'story-swap-from-left' : 'story-swap-from-right'
          }`}
        >
          <img
            src={current.imageUrl}
            alt=""
            data-testid="story-viewer-image"
            className="egg-tap max-h-full max-w-full object-contain"
            draggable={false}
          />
        </div>

        {/* Tap zones */}
        <button type="button" aria-label="Previous" data-testid="story-viewer-prev" onClick={prev} className="egg-tap absolute inset-y-0 left-0 z-10 w-1/3" />
        <button type="button" aria-label="Next" data-testid="story-viewer-next" onClick={next} className="egg-tap absolute inset-y-0 right-0 z-10 w-2/3" />

        {/* Reply bar sits above the tap zones so it can be used at all. */}
        <StoryReplyBar storyId={current.id} onActivity={handleLongPressEnd} />
      </div>

      {egg && (
        <EasterEggModal message={egg} icon="🤍" onClose={() => setEgg(null)} testId="story-egg" />
      )}
    </div>,
    document.body,
  )
}
