import { NavLink, useLocation } from 'react-router-dom'
import { CalendarIcon, HomeIcon, RsvpIcon } from './icons'
import { TABS, tabIndexFor } from '../lib/tabs'

const ICONS = {
  feed: HomeIcon,
  events: CalendarIcon,
  rsvp: RsvpIcon,
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const currentIndex = tabIndexFor(pathname)

  return (
    <nav
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ig-border bg-ig-black/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="content-col flex h-12 items-stretch">
        {TABS.map(({ id, to, label, end }, i) => {
          const Icon = ICONS[id]
          // Animate a tap the same way a swipe to that tab would: forward in
          // the tab order slides in from the right, backward from the left.
          const swipeDir = currentIndex === -1 || i === currentIndex ? undefined : i > currentIndex ? 'right' : 'left'
          return (
            <NavLink
              key={to}
              to={to}
              state={{ swipeDir }}
              end={end}
              aria-label={label}
              data-testid={`bottom-nav-tab-${label.toLowerCase()}`}
              className="flex flex-1 items-center justify-center text-ig-text"
            >
              {({ isActive }) => <Icon active={isActive} size={26} className={isActive ? '' : 'text-ig-text'} />}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
