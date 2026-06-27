// ─────────────────────────────────────────────────────────────────────────────
// localStorage access + reactive hooks. All persisted keys live here.
// Same-key hook instances stay in sync via a tiny pub/sub.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useState } from 'react'

export const KEYS = {
  userId: 'userId',
  userName: 'userName',
  unlockedTiers: 'unlockedTiers',
  viewedStories: 'viewedStories',
  likedPosts: 'likedPosts',
  bookmarkedPosts: 'bookmarkedPosts',
}

// ── Raw JSON get/set ─────────────────────────────────────────────────────────
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota / private mode — ignore */
  }
  emit(key)
}

// ── pub/sub so hooks with the same key re-render together ─────────────────────
const listeners = new Map() // key -> Set<fn>

function emit(key) {
  listeners.get(key)?.forEach((fn) => fn())
}

function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set())
  listeners.get(key).add(fn)
  return () => listeners.get(key)?.delete(fn)
}

// ── Reactive hook ─────────────────────────────────────────────────────────────
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => readJSON(key, initial))

  useEffect(() => subscribe(key, () => setValue(readJSON(key, initial))), [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback(
    (next) => {
      const resolved = typeof next === 'function' ? next(readJSON(key, initial)) : next
      writeJSON(key, resolved)
    },
    [key], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return [value, set]
}

// ── Identity (non-reactive; created once on first visit) ─────────────────────
export function getUserId() {
  let id = localStorage.getItem(KEYS.userId)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.floor(Math.random() * 1e9)}`
    try {
      localStorage.setItem(KEYS.userId, id)
    } catch {
      /* ignore */
    }
  }
  return id
}

export function getUserName() {
  return readJSON(KEYS.userName, '')
}

export function setUserName(name) {
  writeJSON(KEYS.userName, name)
}

// Reactive userName: [name, setName]
export const useUserName = () => useLocalStorage(KEYS.userName, '')

// ── Convenience hooks for set-membership keys ────────────────────────────────
function useStringSet(key) {
  const [list, setList] = useLocalStorage(key, [])
  const has = useCallback((id) => list.includes(id), [list])
  const add = useCallback((id) => setList((cur) => (cur.includes(id) ? cur : [...cur, id])), [setList])
  const remove = useCallback((id) => setList((cur) => cur.filter((x) => x !== id)), [setList])
  const toggle = useCallback(
    (id) => setList((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])),
    [setList],
  )
  return { list, has, add, remove, toggle }
}

export const useViewedStories = () => useStringSet(KEYS.viewedStories)
export const useLikedPosts = () => useStringSet(KEYS.likedPosts)
export const useBookmarkedPosts = () => useStringSet(KEYS.bookmarkedPosts)
