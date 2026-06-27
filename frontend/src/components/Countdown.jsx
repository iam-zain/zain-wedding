import { useEffect, useState } from 'react'
import { siteConfig } from '../config'
import { countdownParts } from '../lib/time'

const TARGET = Date.parse(siteConfig.wedding?.date)

function Cell({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="tabular-nums text-xl font-bold leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-ig-muted">{label}</span>
    </div>
  )
}

export default function Countdown() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!Number.isFinite(TARGET) || TARGET - Date.now() <= 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!Number.isFinite(TARGET) || TARGET - now <= 0) return null

  const { day, hour, min, sec } = countdownParts(TARGET, now)

  return (
    <div className="px-4 pt-4">
      <div className="rounded-xl border border-ig-border bg-ig-elevated px-4 py-3">
        <div className="text-center text-[11px] uppercase tracking-[0.2em] text-ig-muted">
          {siteConfig.wedding?.hashtag || 'The big day'}
        </div>
        <div className="mt-2 flex items-center justify-around">
          <Cell value={day} label="days" />
          <span className="text-lg text-ig-faint">:</span>
          <Cell value={hour} label="hrs" />
          <span className="text-lg text-ig-faint">:</span>
          <Cell value={min} label="min" />
          <span className="text-lg text-ig-faint">:</span>
          <Cell value={sec} label="sec" />
        </div>
      </div>
    </div>
  )
}
