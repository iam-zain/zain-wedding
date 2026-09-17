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
import { MUSIC_TRACKS, trackLabel } from './musicConfig'
import { addToSet, KEYS } from './storage'

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

/**
 * Starts a track. `avoid` is the src currently playing, so a skip never lands
 * back on the same one — with 11 tracks a plain random pick repeats often
 * enough to look broken.
 */
function playTrack(el, avoid) {
  const pool = MUSIC_TRACKS.length > 1 ? MUSIC_TRACKS.filter((t) => t.src !== avoid) : MUSIC_TRACKS
  const track = pickRandom(pool)
  el.src = track.src
  el.volume = VOLUME
  el.play()
    // Recorded only once playback actually starts, so a track blocked by
    // autoplay policy never counts toward the "heard them all" badge.
    .then(() => {
      addToSet(KEYS.playedTracks, track.src)
      emit() // refresh the now-playing label
    })
    .catch(() => emit()) // autoplay blocked — element stays paused
}

/** Toggles playback. Must be called from a user gesture to start. */
export function toggleMusic() {
  const el = ensureAudio()
  if (!el.paused) {
    pausedByTabSwitch = false
    el.pause()
    return
  }
  playTrack(el, null)
}

/** Jumps to a different random track. Starts playback if nothing was playing. */
export function skipTrack() {
  const el = ensureAudio()
  playTrack(el, el.src ? el.src.replace(window.location.origin, '') : null)
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
  // .src, not the track object — MUSIC_TRACKS holds { src, label } now, and
  // assigning the object here would set the audio source to "[object Object]".
  storyAudio.src = pickRandom(MUSIC_TRACKS).src
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

// Both halves of the state in ONE string, because useSyncExternalStore
// compares snapshots with Object.is — returning a fresh { isPlaying, label }
// object every call would be a new reference each time and loop forever.
const getSnapshot = () => {
  if (!audio) return 'idle|'
  const src = audio.src ? audio.src.replace(window.location.origin, '') : ''
  return `${audio.paused ? 'paused' : 'playing'}|${src}`
}
const getServerSnapshot = () => 'idle|'

/** `{ isPlaying, label, toggle, skip }` — playback survives route changes. */
export function useMusic() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [state, src] = snap.split('|')
  return {
    isPlaying: state === 'playing',
    label: src ? trackLabel(src) : null,
    toggle: toggleMusic,
    skip: skipTrack,
  }
}
