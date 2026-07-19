import { useEffect, useRef, useState } from 'react'
import { siteConfig, SECRET_MESSAGES } from '../config'
import { countdownParts } from '../lib/time'
import EasterEggModal from './EasterEggModal'

const TARGET = Date.parse(siteConfig.wedding?.date)
const SEEN_KEY = 'treasure_seen'
const CLICK_WINDOW_MS = 3000
const CLICKS_REQUIRED = 5

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

function Cell({ value, label, testId }) {
  return (
    <div data-testid={testId || `countdown-cell-${label}`} className="flex flex-col items-center">
      <span className="tabular-nums text-xl font-bold leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] tracking-wider text-ig-muted">{label}</span>
    </div>
  )
}

export default function Countdown() {
  const [now, setNow] = useState(() => Date.now())
  const [alt, setAlt] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [secret, setSecret] = useState(null)
  const clickTimesRef = useRef([])
  const pressTimerRef = useRef(null)

  useEffect(() => {
    if (!Number.isFinite(TARGET) || TARGET - Date.now() <= 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!Number.isFinite(TARGET) || TARGET - now <= 0) return null

  const { day, hour, min, sec } = countdownParts(TARGET, now)
  const { months, weeks, days } = calendarParts(TARGET, now)
  const alreadySeen = localStorage.getItem(SEEN_KEY)

  function handleClick() {
    // Toggle alt view (existing behaviour)
    setAlt(a => !a)

    // Subtle press ripple
    setPressed(true)
    clearTimeout(pressTimerRef.current)
    pressTimerRef.current = setTimeout(() => setPressed(false), 150)

    // Treasure hunt — skip if already seen
    if (alreadySeen) return

    const t = Date.now()
    const recent = clickTimesRef.current.filter(ts => t - ts < CLICK_WINDOW_MS)
    recent.push(t)
    clickTimesRef.current = recent

    if (recent.length >= CLICKS_REQUIRED) {
      clickTimesRef.current = []
      const msg = SECRET_MESSAGES[Math.floor(Math.random() * SECRET_MESSAGES.length)]
      setSecret(msg)
      localStorage.setItem(SEEN_KEY, '1')
    }
  }

  return (
    <>
      <div className="px-4 py-4">
        <div
          data-testid="countdown"
          className="egg-tap rounded-xl border border-ig-border bg-ig-elevated px-4 py-3 cursor-pointer transition-transform duration-150"
          style={{ transform: pressed ? 'scale(0.97)' : 'scale(1)', opacity: pressed ? 0.85 : 1 }}
          onClick={handleClick}
        >
          <div className="flex items-center justify-center gap-5">
            <span
              className="text-base leading-none"
              style={{ animation: 'hourglass-flip 4s ease-in-out infinite' }}
            >
              ⏳
            </span>
            <span className="text-[11px] tracking-[0.2em] text-ig-muted">
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
              <Cell value={day} label="days" testId="countdown-cell-days" />
              <span className="text-lg text-ig-faint">:</span>
              <Cell value={hour} label="hrs" testId="countdown-cell-hrs" />
              <span className="text-lg text-ig-faint">:</span>
              <Cell value={min} label="min" testId="countdown-cell-min" />
              <span className="text-lg text-ig-faint">:</span>
              <Cell value={sec} label="sec" testId="countdown-cell-sec" />
            </div>

            {/* alt: months · weeks · days */}
            <div className={`absolute inset-0 flex items-center justify-center gap-5 transition-all duration-300 ease-in-out ${
              alt ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}>
              <Cell value={months} label="months" testId="countdown-cell-months" />
              <span className="text-lg text-ig-faint">·</span>
              <Cell value={weeks} label="weeks" testId="countdown-cell-weeks" />
              <span className="text-lg text-ig-faint">·</span>
              <Cell value={days} label="days" testId="countdown-cell-remainder-days" />
            </div>
          </div>

          <div className={`mt-1 text-center text-[9px] transition-opacity duration-300 ${
            alt ? 'text-ig-faint' : 'text-ig-faint opacity-60'
          }`}>
            {alt ? 'tap for live countdown' : 'tap for overview'}
          </div>
        </div>
      </div>

      {secret && (
        <EasterEggModal
          message={secret}
          icon="🗝️"
          caption="secret unlocked"
          settleMs={3000}
          onClose={() => setSecret(null)}
          testId="countdown-secret"
        />
      )}
    </>
  )
}
