import { useEffect, useState } from 'react'
import { siteConfig, BAAT_PAKKI } from '../config'

// How long each step holds the spotlight before it moves on.
const GLOW_MS = 5000

/**
 * Baat pakki through Walima, built from site.json rather than restated, so a
 * date change there moves this too.
 */
const STEPS = [BAAT_PAKKI, ...(siteConfig.events || [])]
  .map((e) => ({
    label: e.label || e.name,
    emoji: e.emoji || '💫',
    time: Date.parse(e.date),
    short: new Date(e.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    }),
  }))
  .filter((e) => Number.isFinite(e.time))
  .sort((a, b) => a.time - b.time)

/** Each step's own colour, so it glows in the shade of its own function. */
const STEP_COLORS = ['#f0b429', '#f7c948', '#79b473', '#e8b4a0', '#a1547f']

/**
 * The whole story in one row, with a spotlight that walks along it — one step
 * lit at a time, five seconds each, then round again.
 *
 * The cycle is a plain index on a timer rather than CSS animation-delay per
 * step, so the "only one lit at a time" rule holds no matter how many steps
 * site.json grows to.
 */
export default function EventTimeline() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (STEPS.length < 2) return
    const id = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length)
    }, GLOW_MS)
    return () => clearInterval(id)
  }, [])

  if (STEPS.length === 0) return null

  return (
    <div
      data-testid="event-timeline"
      className="mt-4 rounded-2xl border border-ig-border bg-ig-elevated px-2 py-3"
    >
      <div className="flex items-start justify-between gap-1">
        {STEPS.map((step, i) => {
          const lit = i === active
          const color = STEP_COLORS[i % STEP_COLORS.length]
          return (
            <div
              key={step.label}
              data-testid={`timeline-step-${i}`}
              data-lit={lit ? 'true' : 'false'}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full border text-base transition-all duration-500"
                style={{
                  borderColor: lit ? color : 'var(--color-ig-border)',
                  backgroundColor: lit ? `${color}2e` : 'var(--color-ig-card)',
                  boxShadow: lit ? `0 0 14px 2px ${color}66` : 'none',
                  transform: lit ? 'scale(1.12)' : 'scale(1)',
                  opacity: lit ? 1 : 0.45,
                }}
              >
                {step.emoji}
              </span>
              <span
                className="mt-1.5 w-full truncate text-center text-[10px] font-semibold leading-tight transition-colors duration-500"
                style={{ color: lit ? color : 'var(--color-ig-muted)' }}
              >
                {step.label}
              </span>
              <span className="text-[9px] leading-tight text-ig-faint">{step.short}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
