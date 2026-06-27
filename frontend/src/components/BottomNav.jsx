import { NavLink } from 'react-router-dom'
import { CalendarIcon, HomeIcon } from './icons'

const tabs = [
  { to: '/', label: 'Feed', Icon: HomeIcon, end: true },
  { to: '/events', label: 'Events', Icon: CalendarIcon, end: false },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ig-border bg-ig-black/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="content-col flex h-12 items-stretch">
        {tabs.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="flex flex-1 items-center justify-center text-ig-text"
          >
            {({ isActive }) => <Icon active={isActive} size={26} className={isActive ? '' : 'text-ig-text'} />}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
