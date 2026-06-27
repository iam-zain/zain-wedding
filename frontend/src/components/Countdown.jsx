import { useEffect, useState } from 'react'
import { siteConfig } from '../config'
import { countdownParts } from '../lib/time'

const TARGET = Date.parse(siteConfig.wedding?.date)

function calendarParts(targetMs, now) {
  const target = new Date(targetMs)
  const cur = new Date(now)
  let months = (target.getFullYear() - cur.getFullYear()) * 12 + (target.getMonth() - cur.getMonth())
  const after = new Date(cur.getFullYear(), cur.getMonth() + months, cur.getDate(),
    cur.getHours(), cur.getMinutes(), cur.getSeconds())
  if (after > target) months--
  const base = new Date(cur.getFullYear(), cur.getMonth() + months, cur.getDate(),
    cur.getHours(), cur.getMinutes(), cur.getSeconds())
  const remDays = Math.floor(Math.max(0, targetMs - base.getTime()) / 86400000)
  return { months: Math.max(0, months), weeks: Math.floor(remDays / 7), days: remDays % 7 }
}

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
  const [alt, setAlt] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(TARGET) || TARGET - Date.now() <= 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!Number.isFinite(TARGET) || TARGET - now <= 0) return null

  const { day, hour, min, sec } = countdownParts(TARGET, now)
  const { months, weeks, days } = calendarParts(TARGET, now)

  return (
    <div className="px-4 py-4">
      <div
        className="rounded-xl border border-ig-border bg-ig-elevated px-4 py-3 cursor-pointer select-none"
        onClick={() => setAlt(a => !a)}
      >
        <div className="flex items-center justify-center gap-5">
          <span
            className="text-base leading-none"
            style={{ animation: 'hourglass-flip 4s ease-in-out infinite' }}
          >
            ⏳
          </span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-ig-muted">
            {siteConfig.wedding?.hashtag || 'The big day'}
          </span>
          <span
            className="text-base leading-none opacity-0"
            aria-hidden="true"
          >
            ⏳
          </span>
        </div>

        <div className="relative mt-2 h-10 overflow-hidden">
          {/* primary: days · hrs · min · sec */}
          <div className={`absolute inset-0 flex items-center justify-center gap-5 transition-all duration-300 ease-in-out ${
            alt ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}>
            <Cell value={day} label="days" />
            <span className="text-lg text-ig-faint">:</span>
            <Cell value={hour} label="hrs" />
            <span className="text-lg text-ig-faint">:</span>
            <Cell value={min} label="min" />
            <span className="text-lg text-ig-faint">:</span>
            <Cell value={sec} label="sec" />
          </div>

          {/* alt: months · weeks · days */}
          <div className={`absolute inset-0 flex items-center justify-center gap-5 transition-all duration-300 ease-in-out ${
            alt ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}>
            <Cell value={months} label="months" />
            <span className="text-lg text-ig-faint">·</span>
            <Cell value={weeks} label="weeks" />
            <span className="text-lg text-ig-faint">·</span>
            <Cell value={days} label="days" />
          </div>
        </div>

        <div className={`mt-1 text-center text-[9px] transition-opacity duration-300 ${
          alt ? 'text-ig-faint' : 'text-ig-faint opacity-60'
        }`}>
          {alt ? 'tap for live countdown' : 'tap for overview'}
        </div>
      </div>
    </div>
  )
}
