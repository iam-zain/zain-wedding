import { useEffect, useState } from 'react'

const UPDATE_MS = 8000

// Rough activity curve across the day (IST-ish, uses the visitor's local clock).
function baseForHour(hour) {
  if (hour < 6) return 2
  if (hour < 10) return 5
  if (hour < 17) return 9
  if (hour < 23) return 14
  return 4
}

// Bounded random walk toward the current hour's base, so the number drifts
// organically instead of jumping — a small decorative "vibe" indicator, not
// a real presence count (that needs a backend we haven't deployed yet).
function nextCount(current, hour) {
  const base = baseForHour(hour)
  const min = Math.max(1, base - 3)
  const max = base + 6
  const step = Math.floor(Math.random() * 3) - 1 // -1, 0, +1
  return Math.min(max, Math.max(min, current + step))
}

/** Compact pill (icon + count only) meant for the sticky top bar. */
export default function LiveViewers() {
  const [count, setCount] = useState(() => baseForHour(new Date().getHours()))
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        const next = nextCount(c, new Date().getHours())
        if (next !== c) {
          setPulse(true)
          setTimeout(() => setPulse(false), 400)
        }
        return next
      })
    }, UPDATE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      data-testid="live-viewers"
      title="Guests browsing right now"
      className="inline-flex items-center gap-1 rounded-full border border-ig-border bg-ig-card px-2 py-0.5 text-[11px] text-ig-muted"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ig-red opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ig-red" />
      </span>
      <span className={`tabular-nums transition-transform duration-200 ${pulse ? 'scale-125' : 'scale-100'}`}>
        {count}
      </span>
      <span aria-hidden="true">👀</span>
    </div>
  )
}
