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

  const toggle = useCallback(() => {
    clearInterval(fadeRef.current)

    if (isPlaying) {
      const audio = audioRef.current
      if (!audio) { setIsPlaying(false); return }
      fadeRef.current = fadeVolume(audio, audio.volume, 0, 600, () => {
        audio.pause()
        audioRef.current = null
      })
      setIsPlaying(false)
      return
    }

    const track = pickRandom(MUSIC_TRACKS)
    const audio = new Audio(track)
    audio.loop = true
    audio.volume = 0
    audioRef.current = audio

    audio.play().catch(() => setIsPlaying(false))
    fadeRef.current = fadeVolume(audio, 0, 0.85, 1200, null)
    setIsPlaying(true)
  }, [isPlaying])

  return { isPlaying, toggle }
}
