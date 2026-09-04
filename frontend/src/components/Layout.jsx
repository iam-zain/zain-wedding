import { Outlet } from 'react-router-dom'
import { useMotionPermission } from '../lib/useMotionPermission'
import BottomNav from './BottomNav'
import ShakeEasterEgg from './ShakeEasterEgg'
import TypeAnywhereEasterEgg from './TypeAnywhereEasterEgg'
import HeartGestureEasterEgg from './HeartGestureEasterEgg'
import IdleEasterEgg from './IdleEasterEgg'
import TimeOfDayEasterEgg from './TimeOfDayEasterEgg'
import BatteryEasterEgg from './BatteryEasterEgg'

export default function Layout() {
  useMotionPermission()

  return (
    <div data-testid="app-shell" className="min-h-screen bg-ig-black text-ig-text transition-opacity duration-300">
      <main
        data-testid="page-content"
        className="content-col"
        style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <Outlet />
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
