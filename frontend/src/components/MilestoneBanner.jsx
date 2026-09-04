import { useEffect, useState } from 'react'
import { siteConfig, MILESTONE_DAYS, eventMilestoneMessage } from '../config'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

function startOfDay(ms) {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daysUntil(targetMs, nowMs) {
  return Math.round((startOfDay(targetMs) - startOfDay(nowMs)) / 86400000)
}

/**
 * Shows once per calendar day (localStorage-gated, same idea as the treasure
 * hunt / wedding-day banner) when today lands on one of MILESTONE_DAYS out
 * from Nikah or Waleema. Nikah's day-0 is skipped — WeddingDayBanner already
 * covers "aaj wohi din hai" for that date.
 */
export default function MilestoneBanner() {
  const [banner, setBanner] = useState(null) // { message, icon } | null

  useEffect(() => {
    const now = Date.now()
    const walima = (siteConfig.events || []).find((e) => e.id === 'walima')

    const candidates = [
      { id: 'nikah', label: 'Nikah', emoji: '💍', targetMs: Date.parse(siteConfig.wedding?.date), skipToday: true },
      { id: 'waleema', label: 'Waleema', emoji: '🍽️', targetMs: walima ? Date.parse(walima.date) : NaN, skipToday: false },
    ]

    for (const c of candidates) {
      if (!Number.isFinite(c.targetMs)) continue
      const days = daysUntil(c.targetMs, now)
      if (days < 0 || (days === 0 && c.skipToday)) continue
      if (!MILESTONE_DAYS.includes(days)) continue

      const todayKey = new Date(now).toISOString().slice(0, 10)
      const seenKey = `milestone_seen_${c.id}_${todayKey}`
      if (localStorage.getItem(seenKey)) continue
      localStorage.setItem(seenKey, '1')

      setBanner({ message: eventMilestoneMessage(c.label, c.emoji, days), icon: c.emoji })
      playChime()
      break // one banner per load even if both events happen to match the same day
    }
  }, [])

  if (!banner) return null
  return (
    <EasterEggModal
      message={banner.message}
      icon={banner.icon}
      onClose={() => setBanner(null)}
      testId="milestone-banner"
    />
  )
}
