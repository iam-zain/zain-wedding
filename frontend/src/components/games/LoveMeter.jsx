import { useRef, useState } from 'react'
import { recordBest, recordPlay, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import Confetti from '../Confetti'

// Purely for fun, the result is just the two sliders averaged.
const BANDS = [
  [25, 'Abhi baat shuru hui hai 😅', '#94a3b8'],
  [50, 'Kuch toh hai 👀', '#f7971e'],
  [75, 'Dil ka connection 💕', '#f472b6'],
  [99, 'Almost a perfect couple ❤️', '#ed4956'],
]
const FACES = ['😐', '🙂', '😊', '😍', '🥰']
const face = (v) => FACES[Math.min(FACES.length - 1, Math.floor(v / 21))]
// Tongue-in-cheek nudges shown while the sliders are still short of 100.
const NUDGES = ['Thoda aur upar! ⬆️', 'Kanjoosi mat kariye pyaar mein 😄', 'Dono ko 100 tak le jaiye 💯', 'Itna kam? Sharma rahe hain? 🙈']

function Slider({ label, emoji, value, onChange, color, testid }) {
  return (
    <label className="block rounded-2xl border border-ig-border bg-ig-card p-4">
      <span className="flex items-center justify-between text-sm font-semibold">
        <span>
          {emoji} {label}
        </span>
        <span className="flex items-center gap-2 tabular-nums" style={{ color }}>
          <span className="text-xl">{face(value)}</span>
          {value}%
        </span>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        data-testid={testid}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full"
        style={{ accentColor: color, height: 28 }}
      />
    </label>
  )
}

export default function LoveMeter() {
  const [zain, setZain] = useState(30)
  const [uzma, setUzma] = useState(30)
  const [shown, setShown] = useState(null) // the number the meter is counting up to/at
  const [final, setFinal] = useState(null)
  const [nudge, setNudge] = useState(null)
  const counting = useRef(false)
  const { later, clearAll } = useTimeouts()

  function change(set) {
    return (v) => {
      set(v)
      if (final != null) {
        clearAll()
        setFinal(null)
        setShown(null)
        counting.current = false
      }
      if (v % 10 === 0) haptic('tap')
    }
  }

  function measure() {
    if (counting.current) return
    counting.current = true
    haptic('tap')
    const target = Math.round((zain + uzma) / 2)
    setFinal(null)
    setNudge(null)
    // Count up in ~20 steps so the needle "thinks" about it.
    const steps = 20
    for (let k = 1; k <= steps; k++) {
      later(() => setShown(Math.round((target * k) / steps)), k * 55)
    }
    later(() => {
      counting.current = false
      setFinal(target)
      recordBest('love', target)
      recordPlay('love', false)
      haptic(target === 100 ? 'achievement' : 'like')
      if (target < 100) setNudge(NUDGES[Math.floor(Math.random() * NUDGES.length)])
    }, steps * 55 + 150)
  }

  const value = shown ?? 0
  const band = final == null ? null : final === 100 ? null : BANDS.find(([max]) => final <= max)
  const perfect = final === 100

  return (
    <div data-testid="love-meter">
      <p className="mb-3 text-center text-sm text-ig-muted">Dono sliders ko 100% tak le jaiye aur pyaar naapiye 💕</p>
      <div className="space-y-3">
        <Slider label="Zain" emoji="🤵" value={zain} onChange={change(setZain)} color="#0095f6" testid="love-zain" />
        <Slider label="Uzma" emoji="👰" value={uzma} onChange={change(setUzma)} color="#f472b6" testid="love-uzma" />
      </div>

      <div className="relative mt-5 overflow-hidden rounded-2xl border border-ig-border p-5 text-center" style={{ background: 'linear-gradient(160deg, rgba(237,73,86,0.16), rgba(168,85,247,0.12))' }}>
        {perfect && <Confetti count={70} />}
        <div className="text-5xl" style={{ transform: `scale(${0.8 + value / 250})`, transition: 'transform 0.1s' }}>
          {perfect ? '💞' : '❤️'}
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-ig-card">
          <div
            className="h-full rounded-full"
            style={{ width: `${value}%`, background: 'linear-gradient(90deg,#f472b6,#ed4956,#a855f7)', transition: 'width 0.06s linear' }}
          />
        </div>
        <p className="mt-3 text-3xl font-bold tabular-nums" data-testid="love-result">
          {shown == null ? ', %' : perfect ? '❤️ 100% Muhabbat' : `${value}%`}
        </p>
        {perfect && (
          <>
            <p className="mt-1 text-lg font-semibold">Zain + Uzma = ♾️</p>
            <p className="text-xs text-ig-muted">Connection level: Infinity</p>
          </>
        )}
        {band && (
          <p className="mt-1 text-base font-semibold" style={{ color: band[2] }}>
            {band[1]}
          </p>
        )}
        {nudge && <p className="mt-1 text-xs text-ig-muted">{nudge}</p>}

        <button
          type="button"
          onClick={measure}
          data-testid="love-measure"
          className="mt-4 rounded-full px-6 py-2.5 text-sm font-semibold text-white active:opacity-80"
          style={{ background: 'linear-gradient(90deg,#ed4956,#a855f7)' }}
        >
          {final == null ? 'Pyaar naapiye 💕' : 'Phir se naapiye 🔁'}
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-ig-faint">Sirf mazaak ke liye 😄, asli pyaar naapa nahi ja sakta.</p>
    </div>
  )
}
