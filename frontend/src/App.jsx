import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import FeedPage from './routes/FeedPage'
import EventsPage from './routes/EventsPage'
import SecretPage from './routes/SecretPage'
import { consumeAccessKeyFromUrl } from './lib/access'
import { getUserId } from './lib/storage'
import { useToast } from './components/toast-context'

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
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<FeedPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/psst" element={<SecretPage />} />
        <Route path="*" element={<FeedPage />} />
      </Route>
    </Routes>
  )
}
