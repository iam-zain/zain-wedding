import { useEffect, useId, useRef, useState } from 'react'
import { siteConfig, SECRET_MESSAGES, NIKAH_EGG_MESSAGES, WALEEMA_EGG_MESSAGES } from '../config'
import { countdownParts } from '../lib/time'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

const TARGET = Date.parse(siteConfig.wedding?.date)
const SEEN_KEY = 'treasure_seen'
const CLICK_WINDOW_MS = 3000
const CLICKS_REQUIRED = 5
const REVEAL_MS = 5000 // Nikah/Waleema inline reveal duration

// Hourglass replacement — a circular progress ring (hollow center, like the
// story-ring avatars). Driven frame-by-frame in JS (not CSS dasharray
// tricks, which weren't rendering reliably) so the geometry is exact and
// verifiable: the gradient grows clockwise from the top anchor to fill the
// band (10s), holds full (2s), then the anchor end sweeps forward to erase
// what it just drew — same clockwise direction, same starting point — until
// empty (6s), then holds empty (2s). Repeat.
const RING_ICON_SIZE = 26
const RING_ICON_R = 10
const RING_FILL_MS = 10000
const RING_HOLD_FULL_MS = 2000
const RING_UNFILL_MS = 6000
const RING_HOLD_EMPTY_MS = 2000
const RING_CYCLE_MS = RING_FILL_MS + RING_HOLD_FULL_MS + RING_UNFILL_MS + RING_HOLD_EMPTY_MS
const RING_TICK_MS = 100

// angleDeg: 0 = top (12 o'clock), increasing = clockwise.
function angleToPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)]
}

// Arc from startDeg to endDeg (startDeg <= endDeg), sweeping clockwise.
function ringArcPath(cx, cy, r, startDeg, endDeg) {
  const [sx, sy] = angleToPoint(cx, cy, r, startDeg)
  const [ex, ey] = angleToPoint(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`
}

// Visible arc, expressed as [startDeg, endDeg], for a given point in the cycle.
function ringAnglesAt(elapsedMs) {
  if (elapsedMs < RING_FILL_MS) {
    return [0, 360 * (elapsedMs / RING_FILL_MS)]
  }
  if (elapsedMs < RING_FILL_MS + RING_HOLD_FULL_MS) {
    return [0, 360]
  }
  if (elapsedMs < RING_FILL_MS + RING_HOLD_FULL_MS + RING_UNFILL_MS) {
    const p = (elapsedMs - RING_FILL_MS - RING_HOLD_FULL_MS) / RING_UNFILL_MS
    return [360 * p, 360] // anchor end sweeps forward, erasing 12→3→6→9 first
  }
  return [360, 360] // hold empty
}

function RingFillIcon() {
  const gradId = useId()
  const gemId = useId()
  const c = RING_ICON_SIZE / 2
  const top = c - RING_ICON_R
  const [[start, end], setAngles] = useState(() => ringAnglesAt(0))

  useEffect(() => {
    const t0 = Date.now()
    const id = setInterval(() => {
      setAngles(ringAnglesAt((Date.now() - t0) % RING_CYCLE_MS))
    }, RING_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const sweep = end - start

  return (
    <svg
      width={RING_ICON_SIZE}
      height={RING_ICON_SIZE}
      viewBox={`0 0 ${RING_ICON_SIZE} ${RING_ICON_SIZE}`}
      aria-hidden="true"
    >
      {/* always-visible faint band, like an inactive tab — this is the "ring" at rest */}
      <circle cx={c} cy={c} r={RING_ICON_R} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" />
      {/* gradient sweep — full circle, a partial arc, or nothing, depending on the phase */}
      {sweep >= 359.9 ? (
        <circle className="ring-progress-arc" cx={c} cy={c} r={RING_ICON_R} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" />
      ) : sweep > 0.5 ? (
        <path className="ring-progress-arc" d={ringArcPath(c, c, RING_ICON_R, start, end)} fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" />
      ) : null}
      {/* faceted diamond on top of the band, drawn last so it always reads through the sweep */}
      <g transform={`translate(${c} ${top})`}>
        <path d="M0,-4.4 L2.3,-2 L1.3,3.2 L-1.3,3.2 L-2.3,-2 Z" fill={`url(#${gemId})`} stroke="rgba(255,255,255,0.8)" strokeWidth="0.4" />
        <path d="M-2.3,-2 L2.3,-2 M0,-4.4 L0,-2 M-1.15,-2 L-1.3,3.2 M1.15,-2 L1.3,3.2" stroke="rgba(255,255,255,0.55)" strokeWidth="0.25" />
        <path d="M-3.6,-4.6 L-2.9,-4.6 M-3.25,-4.95 L-3.25,-4.25" stroke="#fff" strokeWidth="0.5" strokeLinecap="round" />
      </g>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ed4956" />
          <stop offset="100%" stopColor="#feda75" />
        </linearGradient>
        <linearGradient id={gemId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaf9ff" />
          <stop offset="55%" stopColor="#9adcf5" />
          <stop offset="100%" stopColor="#4fb8e6" />
        </linearGradient>
      </defs>
    </svg>
  )
}

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
  const [nikahReveal, setNikahReveal] = useState(null) // message string | null
  const [waleemaReveal, setWaleemaReveal] = useState(null)
  const clickTimesRef = useRef([])
  const pressTimerRef = useRef(null)
  const nikahRevealTimerRef = useRef(null)
  const waleemaRevealTimerRef = useRef(null)

  useEffect(
    () => () => {
      clearTimeout(nikahRevealTimerRef.current)
      clearTimeout(waleemaRevealTimerRef.current)
    },
    [],
  )

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

  function handleNikahDoubleTap() {
    setNikahReveal(NIKAH_EGG_MESSAGES[Math.floor(Math.random() * NIKAH_EGG_MESSAGES.length)])
    playChime()
    clearTimeout(nikahRevealTimerRef.current)
    nikahRevealTimerRef.current = setTimeout(() => setNikahReveal(null), REVEAL_MS)
  }

  function handleWaleemaTap() {
    setWaleemaReveal(WALEEMA_EGG_MESSAGES[Math.floor(Math.random() * WALEEMA_EGG_MESSAGES.length)])
    playChime()
    clearTimeout(waleemaRevealTimerRef.current)
    waleemaRevealTimerRef.current = setTimeout(() => setWaleemaReveal(null), REVEAL_MS)
  }

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <div
          data-testid="countdown"
          className="egg-tap rounded-xl border border-ig-border bg-ig-elevated px-4 py-3 cursor-pointer transition-transform duration-150"
          style={{ transform: pressed ? 'scale(0.97)' : 'scale(1)', opacity: pressed ? 0.85 : 1 }}
          onClick={handleClick}
        >
          <div className="flex items-center justify-center gap-5">
            <span className="text-ig-muted">
              <RingFillIcon />
            </span>
            <span className="text-[11px] tracking-[0.2em] text-ig-muted">
              {siteConfig.wedding?.hashtag || 'The big day'}
            </span>
            <span className="opacity-0" aria-hidden="true">
              <RingFillIcon />
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

      <div className="px-4 pt-2 pb-4">
        <div className="rounded-xl border border-ig-border bg-ig-elevated px-4 py-3">
          <div className="flex items-stretch gap-4">
            <div
              data-testid="nikah-card"
              onDoubleClick={handleNikahDoubleTap}
              className="egg-tap flex-1 border-r border-ig-border pr-4 text-center"
              style={{ perspective: '600px' }}
            >
              <div
                className="relative h-[104px] transition-transform duration-500"
                style={{ transformStyle: 'preserve-3d', transform: nikahReveal ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* front — original date info */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[12px] uppercase tracking-[0.22em] font-medium text-[#9CA3AF]">Nikah</p>
                  <p className="mt-2 text-[20px] font-semibold leading-none text-white">28 October 2026</p>
                  <p className="mt-2 text-sm font-medium text-ig-faint">Wednesday</p>
                  <p className="mt-1 text-sm font-medium text-white/80">7:00 PM</p>
                </div>
                {/* back — gradient reveal message */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#ed4956] to-[#feda75] px-2"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p data-testid="nikah-reveal-text" className="text-sm font-medium leading-snug text-white">
                    {nikahReveal}
                  </p>
                </div>
              </div>
            </div>
            <div
              data-testid="waleema-card"
              onClick={handleWaleemaTap}
              className="egg-tap flex-1 pl-4 text-center"
              style={{ perspective: '600px' }}
            >
              <div
                className="relative h-[104px] transition-transform duration-500"
                style={{ transformStyle: 'preserve-3d', transform: waleemaReveal ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
              >
                {/* front — original date info */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-[12px] uppercase tracking-[0.22em] font-medium text-[#9CA3AF]">Waleema</p>
                  <p className="mt-2 text-[20px] font-semibold leading-none text-white">30 October 2026</p>
                  <p className="mt-2 text-sm font-medium text-ig-faint">Friday</p>
                  <p className="mt-1 text-sm font-medium text-white/80">7:00 PM</p>
                </div>
                {/* back — gradient reveal message */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#ed4956] to-[#feda75] px-2"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p data-testid="waleema-reveal-text" className="text-sm font-medium leading-snug text-white">
                    {waleemaReveal}
                  </p>
                </div>
              </div>
            </div>
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
