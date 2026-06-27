// ─────────────────────────────────────────────────────────────────────────────
// Client-side access control (deterrent only — no server enforcement).
// Unlock link format:  ?key=BASE64(tierKey:secret)   e.g. tier3:secret3
// Valid keys add the tier number to localStorage.unlockedTiers (cumulative).
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react'
import { ACCESS_KEY_PARAM, ACCESS_TIERS, PUBLIC_TIER } from '../config'
import { KEYS, readJSON, useLocalStorage, writeJSON } from './storage'

/** "tier3" -> 3 ; returns null if not a tierN key */
function tierNumber(tierKey) {
  const m = /^tier(\d+)$/.exec(tierKey)
  return m ? Number(m[1]) : null
}

function decodeBase64(str) {
  try {
    return atob(str)
  } catch {
    return null
  }
}

/** Current cumulative unlocked tiers, always including the public tier (0). */
export function getUnlockedTiers() {
  const stored = readJSON(KEYS.unlockedTiers, [])
  const set = new Set(Array.isArray(stored) ? stored : [])
  set.add(PUBLIC_TIER)
  return [...set].sort((a, b) => a - b)
}

/** Reactive cumulative unlocked tiers (always includes public tier 0). */
export function useUnlockedTiers() {
  const [stored] = useLocalStorage(KEYS.unlockedTiers, [])
  return useMemo(() => {
    const set = new Set(Array.isArray(stored) ? stored : [])
    set.add(PUBLIC_TIER)
    return [...set].sort((a, b) => a - b)
  }, [stored])
}

function addUnlockedTier(n) {
  const next = new Set(getUnlockedTiers())
  next.add(n)
  writeJSON(KEYS.unlockedTiers, [...next].sort((a, b) => a - b))
}

/**
 * Reads ?key= from the URL, validates it, unlocks the tier, and strips the key
 * from the address bar (replaceState). Returns the unlocked tier number or null.
 * Safe to call on every app load.
 */
export function consumeAccessKeyFromUrl() {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  const key = url.searchParams.get(ACCESS_KEY_PARAM)
  if (!key) return null

  let unlocked = null
  const decoded = decodeBase64(key)
  if (decoded && decoded.includes(':')) {
    const idx = decoded.indexOf(':')
    const tierKey = decoded.slice(0, idx)
    const secret = decoded.slice(idx + 1)
    const n = tierNumber(tierKey)
    if (n != null && ACCESS_TIERS[tierKey] != null && ACCESS_TIERS[tierKey] === secret) {
      addUnlockedTier(n)
      unlocked = n
    }
  }

  // Always strip the key from the URL so it isn't visible / re-shared from the bar.
  url.searchParams.delete(ACCESS_KEY_PARAM)
  const qs = url.searchParams.toString()
  window.history.replaceState({}, '', url.pathname + (qs ? `?${qs}` : '') + url.hash)

  return unlocked
}

/** Visible if the item targets the public tier or any unlocked tier. */
export function hasAccess(accessArray, unlockedTiers) {
  if (!Array.isArray(accessArray) || accessArray.length === 0) return true
  return accessArray.some((t) => t === PUBLIC_TIER || unlockedTiers.includes(t))
}

/** posts: active when now is within [active_from, active_upto] (inclusive-ish). */
export function isActiveNow(post, now = Date.now()) {
  const from = post.active_from ? Date.parse(post.active_from) : null
  const upto = post.active_upto ? Date.parse(post.active_upto) : null
  if (from != null && now < from) return false
  if (upto != null && now > upto) return false
  return true
}

/** stories: hidden once expires_at has passed. */
export function isExpired(story, now = Date.now()) {
  if (!story.expires_at) return false
  const exp = Date.parse(story.expires_at)
  return Number.isFinite(exp) && now > exp
}
