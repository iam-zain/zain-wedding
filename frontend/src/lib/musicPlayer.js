// ─────────────────────────────────────────────────────────────────────────────
// Background music — one module-level <audio> element for the whole app.
//
// Module scope (not component state) on purpose: ProfileHeader unmounts on
// route changes, and a hook-owned Audio would keep playing with no UI left to
// stop it. The element is created lazily inside the first tap so iOS's
// per-element autoplay unlock sticks, and is then reused forever.
//
// `isPlaying` is *derived* from the element rather than mirrored in state, so
// browser-initiated pauses (tab switch, iOS interruptions) stay in sync for free.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react'
import { MUSIC_TRACKS } from './musicConfig'

const VOLUME = 0.85

let audio = null
let pausedByTabSwitch = false
const listeners = new Set()

const emit = () => listeners.forEach((l) => l())

function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.loop = true
  audio.volume = VOLUME
  for (const evt of ['play', 'pause', 'ended']) audio.addEventListener(evt, emit)
  return audio
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Toggles playback. Must be called from a user gesture to start. */
export function toggleMusic() {
  const el = ensureAudio()
  if (!el.paused) {
    pausedByTabSwitch = false
    el.pause()
    return
  }
  el.src = pickRandom(MUSIC_TRACKS)
  el.volume = VOLUME
  el.play().catch(() => emit()) // autoplay blocked — element stays paused
}

// Tab switch / app background: pause, and resume only if *we* paused it.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!audio) return
    if (document.hidden) {
      if (audio.paused) return
      pausedByTabSwitch = true
      audio.pause()
    } else if (pausedByTabSwitch) {
      pausedByTabSwitch = false
      audio.play().catch(() => emit())
    }
  })
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => !!audio && !audio.paused
const getServerSnapshot = () => false

/** `{ isPlaying, toggle }` — playback survives route changes. */
export function useMusic() {
  const isPlaying = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { isPlaying, toggle: toggleMusic }
}
