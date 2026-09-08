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
// Story playback is a SEPARATE element, not a reuse of the one above. Sharing
// it would leave the avatar reporting itself as playing (isPlaying is derived
// from that element) and spinning while a story's track was the thing making
// the sound.
let storyAudio = null
let storyPausedByTabSwitch = false
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

/**
 * Stops playback outright. No-op when nothing is playing.
 *
 * Clears `pausedByTabSwitch` deliberately: a stop the guest asked for must not
 * come back to life the next time the tab regains focus.
 */
export function stopMusic() {
  if (!audio || audio.paused) return
  pausedByTabSwitch = false
  audio.pause()
}

/**
 * One random track for a story viewing. Plays ONCE — not looped — and any
 * avatar track is stopped first so the two can never overlap.
 *
 * Reuses a single element across viewings rather than making a new Audio each
 * time, so iOS's per-element autoplay unlock survives from the first story
 * onward. Must be called from (or just after) a user gesture.
 */
export function startStoryMusic() {
  stopMusic()
  if (!storyAudio) {
    storyAudio = new Audio()
    storyAudio.loop = false
  }
  storyAudio.src = pickRandom(MUSIC_TRACKS)
  storyAudio.volume = VOLUME
  storyPausedByTabSwitch = false
  storyAudio.play().catch(() => {}) // autoplay blocked — silence, not an error
}

/** Stops the story track and rewinds it. No-op when nothing is playing. */
export function stopStoryMusic() {
  if (!storyAudio) return
  storyPausedByTabSwitch = false
  storyAudio.pause()
  storyAudio.currentTime = 0
}

// Tab switch / app background: pause, and resume only what *we* paused.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (audio && !audio.paused) {
        pausedByTabSwitch = true
        audio.pause()
      }
      if (storyAudio && !storyAudio.paused) {
        storyPausedByTabSwitch = true
        storyAudio.pause()
      }
      return
    }
    if (pausedByTabSwitch) {
      pausedByTabSwitch = false
      audio?.play().catch(() => emit())
    }
    if (storyPausedByTabSwitch) {
      storyPausedByTabSwitch = false
      storyAudio?.play().catch(() => {})
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
