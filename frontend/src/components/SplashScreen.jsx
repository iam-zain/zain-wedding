import { useEffect, useState } from 'react'
import { siteConfig, SPLASH_MESSAGES } from '../config'

const MESSAGE_INTERVAL_MS = 1400

/**
 * Launch splash. Holds the first paint until the feed's data has settled, so
 * the app opens straight into its final state instead of a skeleton that
 * reshuffles a moment later.
 */
export default function SplashScreen() {
  // Random starting line so a relaunch doesn't always open on the same joke.
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SPLASH_MESSAGES.length))

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SPLASH_MESSAGES.length), MESSAGE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      data-testid="splash-screen"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-ig-black px-8 text-center"
    >
      <div className="font-logo text-4xl leading-none">{siteConfig.profile.displayName}</div>

      <span aria-hidden="true" className="h-7 w-7 animate-spin rounded-full border-2 border-ig-border border-t-ig-text" />

      <p
        key={index}
        data-testid="splash-message"
        className="splash-message min-h-[2.5rem] max-w-xs text-sm leading-snug text-ig-muted"
      >
        {SPLASH_MESSAGES[index]}
      </p>
    </div>
  )
}
