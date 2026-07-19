import { useCallback, useRef, useState } from 'react'
import { MUSIC_TRACKS } from './musicConfig'

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fadeVolume(audio, from, to, durationMs, onDone) {
  const steps = 20
  const interval = durationMs / steps
  const delta = (to - from) / steps
  let vol = from
  const id = setInterval(() => {
    vol = Math.min(1, Math.max(0, vol + delta))
    audio.volume = vol
    if ((delta > 0 && vol >= to) || (delta < 0 && vol <= to)) {
      clearInterval(id)
      onDone?.()
    }
  }, interval)
  return id
}

export function useRecordPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const fadeRef = useRef(null)
  // Source of truth for toggle() — a ref updates synchronously, so rapid
  // clicks can't all read the same stale `isPlaying` from a batched render
  // and each spin up their own overlapping Audio instance.
  const playingRef = useRef(false)

  const toggle = useCallback(() => {
    if (playingRef.current) {
      playingRef.current = false
      clearInterval(fadeRef.current)
      const audio = audioRef.current
      if (!audio) { setIsPlaying(false); return }
      fadeRef.current = fadeVolume(audio, audio.volume, 0, 600, () => {
        audio.pause()
        // Only clear the ref if a newer track hasn't already replaced it.
        if (audioRef.current === audio) audioRef.current = null
      })
      setIsPlaying(false)
      return
    }

    // Starting fresh — if a fade-out from a moment ago is still in-flight,
    // clearing its interval here would cancel the audio.pause() living in
    // its onDone callback, leaving that track playing forever at whatever
    // partial volume it had faded down to. Hard-stop it now instead.
    clearInterval(fadeRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    playingRef.current = true
    const track = pickRandom(MUSIC_TRACKS)
    const audio = new Audio(track)
    audio.loop = true
    audio.volume = 0
    audioRef.current = audio

    audio.play().catch(() => { playingRef.current = false; setIsPlaying(false) })
    fadeRef.current = fadeVolume(audio, 0, 0.85, 1200, null)
    setIsPlaying(true)
  }, [])

  return { isPlaying, toggle }
}
