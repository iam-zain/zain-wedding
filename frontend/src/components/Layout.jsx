import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useMotionPermission } from '../lib/useMotionPermission'
import { stopMusic } from '../lib/musicPlayer'
import { useSwipeTabNav } from '../lib/useSwipeTabNav'
import BottomNav from './BottomNav'
import ShakeEasterEgg from './ShakeEasterEgg'
import TypeAnywhereEasterEgg from './TypeAnywhereEasterEgg'
import HeartGestureEasterEgg from './HeartGestureEasterEgg'
import IdleEasterEgg from './IdleEasterEgg'
import TimeOfDayEasterEgg from './TimeOfDayEasterEgg'
import BatteryEasterEgg from './BatteryEasterEgg'
import OfflineEasterEgg from './OfflineEasterEgg'
import LandscapeEasterEgg from './LandscapeEasterEgg'
import ScreenshotEasterEgg from './ScreenshotEasterEgg'
import AchievementWatcher from './AchievementWatcher'

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
  const { pathname } = useLocation()
  useMotionPermission()
  useSwipeTabNav()

  // The record player lives on the feed's avatar, and that's the only place
  // with a control to stop it — so leaving the feed stops the track rather
  // than stranding a guest on another tab with unstoppable music.
  useEffect(() => {
    if (pathname !== '/') stopMusic()
  }, [pathname])

  return (
    <div data-testid="app-shell" className="min-h-screen bg-ig-black text-ig-text transition-opacity duration-300">
      <main
        data-testid="page-content"
        className="content-col"
        // pan-y hands us the horizontal axis (see useSwipeTabNav); pinch-zoom keeps
        // two-finger zoom working, which a bare `pan-y` would have disabled.
        style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom) + 1rem)', touchAction: 'pan-y pinch-zoom' }}
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
      <OfflineEasterEgg />
      <LandscapeEasterEgg />
      <ScreenshotEasterEgg />
      <AchievementWatcher />
    </div>
  )
}
