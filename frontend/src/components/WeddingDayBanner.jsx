import { useEffect, useState } from 'react'
import { siteConfig, WEDDING_DAY_MESSAGE } from '../config'
import { playChime } from '../lib/sound'
import EasterEggModal from './EasterEggModal'

const TARGET = Date.parse(siteConfig.wedding?.date)
const SEEN_KEY = 'wedding_day_banner_seen'
const DAY_MS = 24 * 60 * 60 * 1000

/** Shows once per session if the app is opened on the wedding day itself. */
export default function WeddingDayBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(TARGET) || sessionStorage.getItem(SEEN_KEY)) return
    const now = Date.now()
    if (now >= TARGET && now - TARGET < DAY_MS) {
      setShow(true)
      sessionStorage.setItem(SEEN_KEY, '1')
      playChime()
    }
  }, [])

  if (!show) return null

  return (
    <EasterEggModal
      message={WEDDING_DAY_MESSAGE.title}
      icon="🎉"
      caption={WEDDING_DAY_MESSAGE.subtitle}
      onClose={() => setShow(false)}
      testId="wedding-day-banner"
    />
  )
}
