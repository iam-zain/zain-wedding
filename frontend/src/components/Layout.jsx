import { Outlet, useLocation } from 'react-router-dom'
import { useMotionPermission } from '../lib/useMotionPermission'
import { useSwipeTabNav } from '../lib/useSwipeTabNav'
import BottomNav from './BottomNav'
import ShakeEasterEgg from './ShakeEasterEgg'
import TypeAnywhereEasterEgg from './TypeAnywhereEasterEgg'
import HeartGestureEasterEgg from './HeartGestureEasterEgg'
import IdleEasterEgg from './IdleEasterEgg'
import TimeOfDayEasterEgg from './TimeOfDayEasterEgg'
import BatteryEasterEgg from './BatteryEasterEgg'

// Re-mounts (via the pathname key) on every route change so its entrance
// animation replays; direction comes from navigate(path, { state }) —
// set by the swipe gesture, and by BottomNav for tap-triggered switches too.
function PageTransition({ children }) {
  const location = useLocation()
  const dir = location.state?.swipeDir
  const animClass = dir === 'right' ? 'page-slide-from-right' : dir === 'left' ? 'page-slide-from-left' : ''
  return (
    <div key={location.pathname} className={animClass}>
      {children}
    </div>
  )
}

export default function Layout() {
  useMotionPermission()
  useSwipeTabNav()

  return (
    <div data-testid="app-shell" className="min-h-screen bg-ig-black text-ig-text transition-opacity duration-300">
      <main
        data-testid="page-content"
        className="content-col"
        style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom) + 1rem)', touchAction: 'pan-y' }}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <BottomNav />
      <ShakeEasterEgg />
      <TypeAnywhereEasterEgg />
      <HeartGestureEasterEgg />
      <IdleEasterEgg />
      <TimeOfDayEasterEgg />
      <BatteryEasterEgg />
    </div>
  )
}
