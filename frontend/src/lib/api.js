// ─────────────────────────────────────────────────────────────────────────────
// API client. When VITE_API_BASE_URL is unset (LOCAL_MODE), likes & comments
// fall back to localStorage so the app is fully demoable without a backend.
// Content (posts/stories) is always fetched from the data URL.
// ─────────────────────────────────────────────────────────────────────────────
import { API_BASE_URL, API_KEY, DATA_BASE_URL, LOCAL_MODE } from '../config'
import { readJSON, writeJSON } from './storage'

// ── Content (posts.json / stories.json) ──────────────────────────────────────
async function fetchJSON(url, opts = {}) {
  const { headers: extraHeaders, ...rest } = opts
  const res = await fetch(url, { ...rest, headers: { Accept: 'application/json', ...extraHeaders } })
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`)
  return res.json()
}

export async function fetchPosts() {
  const data = await fetchJSON(`${DATA_BASE_URL}/posts.json`)
  return Array.isArray(data) ? data : data.posts || []
}

export async function fetchStories() {
  const data = await fetchJSON(`${DATA_BASE_URL}/stories.json`)
  return Array.isArray(data) ? data : data.stories || []
}

// Bypass-SW variants: ?_fresh=1 skips the StaleWhileRevalidate rule;
// cache:'no-store' also skips the browser HTTP cache. Always hits the CDN.
export async function fetchPostsFresh() {
  const data = await fetchJSON(`${DATA_BASE_URL}/posts.json?_fresh=1`, { cache: 'no-store' })
  return Array.isArray(data) ? data : data.posts || []
}

export async function fetchStoriesFresh() {
  const data = await fetchJSON(`${DATA_BASE_URL}/stories.json?_fresh=1`, { cache: 'no-store' })
  return Array.isArray(data) ? data : data.stories || []
}

// ── Likes ─────────────────────────────────────────────────────────────────────
// Requests per batch when refreshing many posts — under the API Gateway burst limit.
const LIKE_FETCH_CHUNK = 4

/**
 * Register a like. Returns { count } where count is the live DynamoDB count
 * (likes beyond likes_base), or null in LOCAL_MODE (caller does optimistic +1).
 */
export async function likePost(postId, userId) {
  if (LOCAL_MODE) return { count: null }
  const res = await fetch(`${API_BASE_URL}/like/${encodeURIComponent(postId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error(`Like failed: ${res.status}`)
  const data = await res.json().catch(() => ({}))
  return { count: typeof data.count === 'number' ? data.count : null }
}

// GET /like is unauthenticated — sending x-api-key would force a CORS
// preflight on every poll for nothing.
export async function getLikeCount(postId) {
  if (LOCAL_MODE) return { count: null }
  const res = await fetch(`${API_BASE_URL}/like/${encodeURIComponent(postId)}`, {
    method: 'GET',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Get like count failed: ${res.status}`)
  const data = await res.json().catch(() => ({}))
  return { count: typeof data.count === 'number' ? data.count : null }
}

/**
 * Fetches live like counts for many posts in one coordinated pass.
 * Returns a { [postId]: count } map, skipping posts whose request failed —
 * a partial refresh is better than dropping the whole cycle.
 * TODO: replace the fan-out with a batch `GET /likes?ids=` endpoint.
 */
export async function getLikeCounts(postIds) {
  if (LOCAL_MODE || postIds.length === 0) return {}
  const counts = {}
  // API Gateway's default burst limit for this stage is 5. Firing one request
  // per post at once trips it the moment the feed grows past that, and the
  // 429s are what stopped counts from ever refreshing — so go in chunks.
  for (let i = 0; i < postIds.length; i += LIKE_FETCH_CHUNK) {
    const chunk = postIds.slice(i, i + LIKE_FETCH_CHUNK)
    const results = await Promise.allSettled(chunk.map((id) => getLikeCount(id)))
    results.forEach((r, j) => {
      if (r.status === 'fulfilled' && typeof r.value.count === 'number') {
        counts[chunk[j]] = r.value.count
      }
    })
  }
  return counts
}

// ── Comments ──────────────────────────────────────────────────────────────────
const localCommentsKey = (postId) => `localComments:${postId}`

function sortByCreatedAsc(list) {
  return [...list].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
}

/** Returns array of { id, text, userId, userName, createdAt } sorted ascending. */
export async function getComments(postId) {
  if (LOCAL_MODE) return sortByCreatedAsc(readJSON(localCommentsKey(postId), []))
  const data = await fetchJSON(`${API_BASE_URL}/comments/${encodeURIComponent(postId)}`)
  const list = Array.isArray(data) ? data : data.comments || []
  return sortByCreatedAsc(list)
}

/** Creates a comment; returns the created comment object. */
export async function postComment(postId, { text, userName, userId }) {
  if (LOCAL_MODE) {
    const comment = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `c_${Date.now()}`,
      text,
      userName,
      userId,
      createdAt: new Date().toISOString(),
    }
    const cur = readJSON(localCommentsKey(postId), [])
    writeJSON(localCommentsKey(postId), [...cur, comment])
    return comment
  }
  const res = await fetch(`${API_BASE_URL}/comment/${encodeURIComponent(postId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ text, userName, userId }),
  })
  if (res.status === 409) throw new Error('COMMENT_LIMIT')
  if (!res.ok) throw new Error(`Comment failed: ${res.status}`)
  return res.json()
}
