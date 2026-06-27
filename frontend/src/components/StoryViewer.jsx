import { useEffect, useRef, useState } from 'react'
import { CloseIcon } from './icons'

export default function StoryViewer({ stories, startIndex = 0, onClose, onViewed }) {
  const [index, setIndex] = useState(startIndex)
  const touchStart = useRef(null)

  const current = stories[index]

  // Mark the visible story as viewed.
  useEffect(() => {
    if (current) onViewed?.(current.id)
  }, [current, onViewed])

  const next = () => setIndex((i) => (i + 1 < stories.length ? i + 1 : (onClose(), i)))
  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i))

  // Keyboard + scroll lock
  useEffect(() => {
    const onKey = (e) => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Progress segments */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-2 pt-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        {stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className={`h-full bg-white ${i <= index ? 'w-full' : 'w-0'}`} />
          </div>
        ))}
      </div>

      {/* Close */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-3 z-20 rounded-full p-1.5 text-white active:bg-white/10"
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <CloseIcon size={26} />
      </button>

      {/* Image */}
      <div className="flex flex-1 items-center justify-center">
        <img
          src={current.imageUrl}
          alt=""
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Tap zones */}
      <button type="button" aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 z-10 w-1/3" />
      <button type="button" aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 z-10 w-2/3" />
    </div>
  )
}
