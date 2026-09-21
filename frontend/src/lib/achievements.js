// ─────────────────────────────────────────────────────────────────────────────
// Achievement engine. Pure functions over a `counts` snapshot, no storage and
// no React in here, so the rules stay testable and the UI owns the side effects.
//
// counts shape:
//   { likes:    { count, total },
//     comments: { count, total },
//     stories:  { count, total },
//     tracks:   { count, total } }
// where `count` is what this device has done and `total` is how many exist.
// ─────────────────────────────────────────────────────────────────────────────
import { ACHIEVEMENTS } from '../config'

const EMPTY = { count: 0, total: 0 }

/**
 * Progress toward one badge: `{ current, goal, done }`.
 *
 * A 'all' goal resolves against however many items exist *right now*. That
 * total is 0 on a cold start (posts are fetched asynchronously) and can be
 * legitimately 0 forever (a wedding with no stories yet), so a goal of 0 is
 * treated as not-yet-achievable. Without that guard `0 >= 0` would unlock
 * every 'all' badge the instant the app booted, before the guest did anything.
 */
export function progressFor(def, counts) {
  const { count, total } = counts?.[def.metric] ?? EMPTY
  const goal = def.goal === 'all' ? total : def.goal
  if (!goal || goal <= 0) return { current: count, goal: 0, done: false }
  return { current: Math.min(count, goal), goal, done: count >= goal }
}

/** Ids of every badge currently satisfied by `counts`. */
export function earnedIds(counts) {
  return ACHIEVEMENTS.filter((def) => progressFor(def, counts).done).map((def) => def.id)
}

/** Definition lookup, or undefined for an id that's no longer in config. */
export function achievementById(id) {
  return ACHIEVEMENTS.find((def) => def.id === id)
}

/** Every badge paired with this device's progress, drives the badge shelf. */
export function achievementList(counts, unlockedIds = []) {
  return ACHIEVEMENTS.map((def) => ({
    ...def,
    ...progressFor(def, counts),
    // Once earned a badge stays earned, even if the totals later grow (a new
    // post is added after someone had liked them all). Taking a badge back
    // would feel like a bug to the guest, so `unlocked` is sticky.
    unlocked: unlockedIds.includes(def.id),
  }))
}
