// ─────────────────────────────────────────────────────────────────────────────
// Shared bits for the mini-games: persisted stats (which feed the achievement
// engine) and a timeout tracker so a game can't leave timers running after
// the guest leaves mid-round.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef } from 'react'
import { KEYS, readJSON, useLocalStorage, writeJSON } from './storage'

// Every game on the hub; `tried` lists the ones this device has played.
export const GAME_IDS = ['match', 'catch', 'ring', 'trueheart', 'tap', 'hidden', 'memory', 'puzzle', 'love', 'maze', 'ttt',
  'ringbox', 'nikahpuzzle', 'connect', 'scramble', 'brideorgroom', 'crj', 'pack',
  'shoot', 'hold', 'bouquet', 'ringstack', 'gift', 'spotter', 'arrange']

const EMPTY = {
  hearts: 0,
  rings: 0,
  hidden: 0,
  memoryPerfect: 0,
  trueHeart: 0, // Sachha Dil — rounds cleared, lifetime
  quick: 0, // Baraat Reflex — correct taps, lifetime
  puzzles: [], // Emoji Shaadi Puzzle — ids ever solved
  played: 0,
  tried: [],
  best: {},
}

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

/**
 * Counts one finished round of `game` (feeds the games-played badges).
 * `countRound: false` marks the game as tried without adding to the round
 * total — for toys like the Love-o-Meter that "finish" in one tap.
 */
export function recordPlay(game, countRound = true) {
  const s = read()
  if (countRound) s.played = (Number(s.played) || 0) + 1
  const tried = Array.isArray(s.tried) ? s.tried : []
  s.tried = tried.includes(game) ? tried : [...tried, game]
  writeJSON(KEYS.gameStats, s)
}

/** Adds `id` to a lifetime list (e.g. puzzles solved). */
export function addStatId(field, id) {
  const s = read()
  const cur = Array.isArray(s[field]) ? s[field] : []
  if (cur.includes(id)) return
  s[field] = [...cur, id]
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

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ── One-liners ───────────────────────────────────────────────────────────────
export const LINES = {
  good: ['Kya nazar hai! ✨', 'Wah! 👏', 'Zabardast 💕', 'Ekdum sahi!', 'Mashallah! 🤍', 'Kya baat hai! 🔥', 'Pakad liya! 💪'],
  bad: ['Yeh nahi 😅', 'Arre nahi! 🙈', 'Galat jagah 😬', 'Dhyaan se! 👀', 'Oops! 😵', 'Thoda aur dekhiye 🔍'],
  hiddenFound: ['Kya nazar hai! 👀', 'Mil gaya dil 💕', 'Detective ho aap 🕵️', 'Wah! Agla dhoondiye', 'Itni jaldi? Kamaal! ⚡', 'Dil ne dil ko pehchaan liya 🤍'],
  hiddenMissed: ['Time khatam! ⏰', 'Dil bhaag gaya 🏃', 'Agli baar pakka! 🤞', 'Chhup gaya tha shaitan 😄'],
  catchWin: ['Jeet gaye! Dil hi dil 💕', 'Dilon ke badshah! 👑', 'Itne dil? Kamaal ho aap 💖', 'Pyaar hi pyaar! 💕'],
  catchLose: ['Thoda aur tez! 😅', 'Dil haath se nikal gaye 💔', 'Agli baar pakka! 💪', 'Ungliyan garam kariye 🔥'],
  ringWin: ['Ring Master! 💍', 'Uzma ki ring safe hai 💍', 'Ek bhi ring nahi giri (lagbhag) 😄', 'Dulha khush ho gaya 🤵'],
  ringLose: ['Achha khela! 💍', 'Ring phisal gayi 😅', 'Bomb se bach ke! 💣', 'Dobara try kariye 💪'],
  memoryWin: ['Saare jode mil gaye! 💗', 'Jodi no. 1 💕', 'Yaaddasht tez hai 🧠', 'Rab ne bana di jodi 🤍'],
}
