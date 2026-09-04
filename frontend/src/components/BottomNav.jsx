import { NavLink } from 'react-router-dom'
import { CalendarIcon, HomeIcon } from './icons'

// swipeDir mirrors the swipe gesture's directions, so a bottom-nav tap
// animates the same way a swipe between these two tabs would.
const tabs = [
  { to: '/', label: 'Feed', Icon: HomeIcon, end: true, swipeDir: 'left' },
  { to: '/events', label: 'Events', Icon: CalendarIcon, end: false, swipeDir: 'right' },
]

export default function BottomNav() {
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ig-border bg-ig-black/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="content-col flex h-12 items-stretch">
        {tabs.map(({ to, label, Icon, end, swipeDir }) => (
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
        ))}
      </div>
    </nav>
  )
}
