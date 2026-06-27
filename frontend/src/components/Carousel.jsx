import { useRef, useState } from 'react'

// Square image carousel with scroll-snap, dot indicators and a count pill.
// onDoubleTap is forwarded from the parent (double-tap-to-like).
export default function Carousel({ images, onDoubleTap }) {
  const trackRef = useRef(null)
  const [index, setIndex] = useState(0)
  const list = images && images.length ? images : []

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index) setIndex(i)
  }

  const multiple = list.length > 1

  return (
    <div className="relative select-none bg-ig-black" onDoubleClick={onDoubleTap}>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x-mandatory overflow-x-auto"
      >
        {list.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            draggable={false}
            className="aspect-square w-full shrink-0 snap-center-child object-cover"
          />
        ))}
      </div>

      {multiple && (
        <>
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
            {index + 1}/{list.length}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
