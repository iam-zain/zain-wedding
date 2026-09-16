import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'
import { haptic } from '../lib/haptics'

/**
 * Sticky header for a page that lives under the More hub.
 *
 * These pages are intentionally outside the swipe order (see lib/tabs.js), so
 * this arrow is the way back up — without it a guest deep in the RSVP form has
 * only the browser's own back button, which PWA guests don't have on screen.
 *
 * The back link carries swipeDir 'left' so returning to the hub plays the same
 * backwards slide a swipe would.
 */
export default function BackHeader({ title, to = '/more' }) {
  return (
    <header className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
      <div className="relative flex h-12 items-center justify-center px-4">
        <Link
          to={to}
          state={{ swipeDir: 'left' }}
          onClick={() => haptic('tap')}
          aria-label="Back"
          data-testid="back-header-link"
          className="absolute left-2 flex size-9 items-center justify-center rounded-full text-ig-text active:opacity-60"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <span className="font-logo text-2xl leading-none">{title}</span>
      </div>
    </header>
  )
}
