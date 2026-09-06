// ─────────────────────────────────────────────────────────────────────────────
// Single owner of the feed's remote data: posts, stories and live like counts.
//
// Everything is loaded once behind the launch splash so the feed paints its
// final state in one go — no skeleton, no cached-then-fresh content swap, and
// no like counts jumping a second after the photos appear. Falls back to
// whatever the service worker has cached when the network is unavailable.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fetchPosts, fetchPostsFresh, fetchStories, fetchStoriesFresh, getLikeCounts } from './api'

// Don't hold the splash hostage to a slow network — fall back to cache after this.
const FIRST_LOAD_TIMEOUT = 6000
// On a warm cache the data lands in ~50ms; without a floor the splash is a
// flicker rather than a moment. Long enough to read one line.
const MIN_SPLASH_MS = 1400
// How long before a tab-return / pull triggers another content refresh (ms).
const REFRESH_COOLDOWN = 60_000
// One coordinated like-count poll for the whole feed (ms).
const LIKES_POLL_INTERVAL = 30_000

const FeedDataContext = createContext(null)

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export function FeedDataProvider({ children }) {
  const [posts, setPosts] = useState(null)
  const [stories, setStories] = useState(null)
  const [likeCounts, setLikeCounts] = useState({})
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [offline, setOffline] = useState(false)

  const lastFreshAt = useRef(0)
  // Every known post — access filtering is the feed's business, and polling a
  // locked post's count is harmless.
  const likeIdsRef = useRef([])
  const likesInFlightRef = useRef(null)

  // Merges server counts in, but never lets a stale server value pull a count
  // below what this device already shows (its own like may not be in the
  // response yet). Coalesces concurrent callers onto one in-flight pass.
  const refreshLikes = useCallback(() => {
    const ids = likeIdsRef.current
    if (ids.length === 0) return Promise.resolve()
    if (likesInFlightRef.current) return likesInFlightRef.current
    const run = getLikeCounts(ids)
      .then((fresh) => {
        setLikeCounts((cur) => {
          const next = { ...cur }
          for (const [id, count] of Object.entries(fresh)) next[id] = Math.max(count, cur[id] || 0)
          return next
        })
      })
      .catch(() => {}) // partial/failed refresh — keep showing what we have
      .finally(() => { likesInFlightRef.current = null })
    likesInFlightRef.current = run
    return run
  }, [])

  const setLikeCount = useCallback((postId, count) => {
    setLikeCounts((cur) => ({ ...cur, [postId]: count }))
  }, [])

  // Network-first content refresh (bypasses the SW cache). Used by the splash,
  // pull-to-refresh and tab-return alike.
  const refreshContent = useCallback(async () => {
    lastFreshAt.current = Date.now() // stamp early to block concurrent calls
    try {
      const [p, s] = await Promise.all([fetchPostsFresh(), fetchStoriesFresh()])
      likeIdsRef.current = p.map((post) => post.id)
      setPosts(p)
      setStories(s)
      setError(false)
      setOffline(false)
      return true
    } catch {
      lastFreshAt.current = 0 // let the next visibility event retry
      return false
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([refreshContent(), refreshLikes()])
  }, [refreshContent, refreshLikes])

  // First launch: network, then SW cache, then give up with an offline notice.
  useEffect(() => {
    let cancelled = false
    const startedAt = Date.now()
    ;(async () => {
      let loaded = false
      try {
        loaded = await withTimeout(refreshContent(), FIRST_LOAD_TIMEOUT)
      } catch {
        loaded = false // timed out — cache below
      }
      if (cancelled) return
      if (!loaded) {
        try {
          const [p, s] = await Promise.all([fetchPosts(), fetchStories()])
          if (cancelled) return
          likeIdsRef.current = p.map((post) => post.id)
          setPosts(p)
          setStories(s)
          setOffline(true)
        } catch {
          if (cancelled) return
          setError(true)
        }
      }
      // Like counts are best-effort: never let them hold up the splash.
      await refreshLikes()
      const remaining = MIN_SPLASH_MS - (Date.now() - startedAt)
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining))
      if (!cancelled) setReady(true)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch when the user returns to the tab / app.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      // Background timers are throttled (frozen outright on mobile), so the
      // poll below can't be trusted to have kept up — always pull counts on
      // return, independent of the content-refresh cooldown.
      refreshLikes()
      if (Date.now() - lastFreshAt.current < REFRESH_COOLDOWN) return
      refreshContent()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refreshContent, refreshLikes])

  // One coordinated poll for every post, only while the tab is visible.
  useEffect(() => {
    if (!ready) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshLikes()
    }, LIKES_POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [ready, refreshLikes])

  const value = useMemo(
    () => ({ posts, stories, likeCounts, ready, error, offline, refresh, refreshLikes, setLikeCount }),
    [posts, stories, likeCounts, ready, error, offline, refresh, refreshLikes, setLikeCount],
  )

  return <FeedDataContext.Provider value={value}>{children}</FeedDataContext.Provider>
}

export function useFeedData() {
  const ctx = useContext(FeedDataContext)
  if (!ctx) throw new Error('useFeedData must be used inside <FeedDataProvider>')
  return ctx
}
