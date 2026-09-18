// ─────────────────────────────────────────────────────────────────────────────
// Shared bits for the mini-games: persisted stats (which feed the achievement
// engine) and a timeout tracker so a game can't leave timers running after
// the guest leaves mid-round.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef } from 'react'
import { KEYS, readJSON, useLocalStorage, writeJSON } from './storage'

const EMPTY = { hearts: 0, rings: 0, hidden: 0, memoryPerfect: 0, best: {} }

function read() {
  const s = readJSON(KEYS.gameStats, EMPTY)
  return s && typeof s === 'object' ? { ...EMPTY, ...s, best: { ...(s.best || {}) } } : { ...EMPTY }
}

/** Adds `n` to a lifetime counter (hearts, rings, hidden, memoryPerfect). */
export function bumpStat(field, n = 1) {
  const s = read()
  s[field] = (Number(s[field]) || 0) + n
  writeJSON(KEYS.gameStats, s)
}

/** Records a best score; `lowerIsBetter` for move counts. Returns true on a new best. */
export function recordBest(game, value, lowerIsBetter = false) {
  const s = read()
  const cur = s.best[game]
  const better = typeof cur !== 'number' || (lowerIsBetter ? value < cur : value > cur)
  if (better) {
    s.best[game] = value
    writeJSON(KEYS.gameStats, s)
  }
  return better
}

/** Reactive, always-complete stats object. */
export function useGameStats() {
  const [raw] = useLocalStorage(KEYS.gameStats, EMPTY)
  const s = raw && typeof raw === 'object' ? raw : EMPTY
  return { ...EMPTY, ...s, best: { ...(s.best || {}) } }
}

/** setTimeout that is cleared automatically on unmount (or via clearAll). */
export function useTimeouts() {
  const ids = useRef(new Set())
  const clearAll = useCallback(() => {
    ids.current.forEach(clearTimeout)
    ids.current.clear()
  }, [])
  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      ids.current.delete(id)
      fn()
    }, ms)
    ids.current.add(id)
    return id
  }, [])
  useEffect(() => clearAll, [clearAll])
  return { later, clearAll }
}

export const rand = (min, max) => min + Math.random() * (max - min)

/** Picks from [[value, weight], ...]. */
export function weighted(table) {
  let r = Math.random() * table.reduce((t, [, w]) => t + w, 0)
  for (const [v, w] of table) {
    if ((r -= w) < 0) return v
  }
  return table[0][0]
}

export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
