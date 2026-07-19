import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import ShakeEasterEgg from './ShakeEasterEgg'

export default function Layout() {
  return (
    <div data-testid="app-shell" className="min-h-screen bg-ig-black text-ig-text">
      <main
        data-testid="page-content"
        className="content-col"
        style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <Outlet />
      </main>
      <BottomNav />
      <ShakeEasterEgg />
    </div>
  )
}
