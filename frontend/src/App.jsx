import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import SplashScreen from './components/SplashScreen'
import { FeedDataProvider, useFeedData } from './lib/feedData'
import FeedPage from './routes/FeedPage'
import EventsPage from './routes/EventsPage'
import RSVPPage from './routes/RSVPPage'
import SecretPage from './routes/SecretPage'
import { consumeAccessKeyFromUrl } from './lib/access'
import { getUserId } from './lib/storage'
import { useToast } from './components/toast-context'

// Holds the app behind the splash until the feed's data has settled, so the
// first paint is the final one.
function SplashGate({ children }) {
  const { ready } = useFeedData()
  // A hard failure still drops through: the feed's own error card offers a
  // retry, which is more useful than a dead-end splash.
  if (!ready) return <SplashScreen />
  return children
}

export default function App() {
  const toast = useToast()

  // Consume the ?key= unlock during the very first render (lazy initializer),
  // so unlockedTiers is set BEFORE the feed mounts and filters posts.
  const [unlockedTier] = useState(() => {
    getUserId() // ensure a device identity exists on first visit
    return consumeAccessKeyFromUrl()
  })

  useEffect(() => {
    if (unlockedTier != null) toast('🔓 Naya content unlock ho gaya!', { duration: 3500 })
  }, [unlockedTier, toast])

  return (
    <FeedDataProvider>
      <SplashGate>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/rsvp" element={<RSVPPage />} />
            <Route path="/psst" element={<SecretPage />} />
            <Route path="*" element={<FeedPage />} />
          </Route>
        </Routes>
      </SplashGate>
    </FeedDataProvider>
  )
}
