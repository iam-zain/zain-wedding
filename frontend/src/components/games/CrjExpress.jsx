import { useEffect, useRef, useState } from 'react'
import { pick, recordBest, recordPlay, shuffle, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay, GameStats } from './GameShell'

const LIVES = 3
const TARGET = 'ZainUz Wedding Station 💕'
const DECOYS = ['Asansol Jn', 'Dhanbad Jn', 'Gaya Jn', 'Chittaranjan Loco Shed', 'Rupnarayanpur', 'Jamtara', 'Patna Jn', 'Kolkata']
// Later rounds slip in look-alikes, so the sign has to be read, not glanced at.
const LOOKALIKES = ['Zain Nagar Halt', 'Uzma Colony', 'Wedding Mall Road', 'ZainUz Cold Storage 🥶', 'Zainpur Siding']
const RIGHT = ['Next Stop: Zain ❤️ Uzma', 'Sahi platform! 🚉💕', 'Baraat time pe pahunchi! 🎉', 'CRJ se seedha shaadi! 🚂']
const WRONG = ['Oops! Wrong platform 😭', 'Galat station, baraat bhatak gayi 😅', 'Yeh toh Dhanbad nikla 🙈']

// Tracks fan out from the junction at the bottom to three platforms.
const X = [16, 50, 84]

function makeRound(n) {
  const pool = n >= 4 ? [...shuffle(LOOKALIKES).slice(0, 1), ...shuffle(DECOYS).slice(0, 1)] : shuffle(DECOYS).slice(0, 2)
  return { stations: shuffle([TARGET, ...pool]), ms: Math.max(1500, 4200 - n * 230), key: `${n}-${Math.random()}` }
}

export default function CrjExpress() {
  const [phase, setPhase] = useState('ready') // ready | run | result | over
  const [round, setRound] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [cur, setCur] = useState(() => makeRound(0))
  const [track, setTrack] = useState(1)
  const [msg, setMsg] = useState(null)
  const [newBest, setNewBest] = useState(false)
  const trackRef = useRef(1)
  const roundRef = useRef(0)
  const livesRef = useRef(LIVES)
  const { later, clearAll } = useTimeouts()

  function go(n) {
    roundRef.current = n
    setRound(n)
    setCur(makeRound(n))
    trackRef.current = 1
    setTrack(1)
    setMsg(null)
    setPhase('run')
  }

  function start() {
    haptic('tap')
    clearAll()
    livesRef.current = LIVES
    setLives(LIVES)
    go(0)
  }

  // Train reaches the junction when the run ends.
  useEffect(() => {
    if (phase !== 'run') return undefined
    const t = setTimeout(() => {
      const ok = cur.stations[trackRef.current] === TARGET
      setPhase('result')
      if (ok) {
        haptic('like')
        setMsg({ ok, text: pick(RIGHT) })
        later(() => go(roundRef.current + 1), 1300)
      } else {
        haptic('warn')
        livesRef.current -= 1
        setLives(livesRef.current)
        setMsg({ ok, text: pick(WRONG) })
        later(() => {
          if (livesRef.current <= 0) {
            setNewBest(recordBest('crj', roundRef.current))
            recordPlay('crj')
            setPhase('over')
          } else go(roundRef.current)
        }, 1500)
      }
    }, cur.ms)
    return () => clearTimeout(t)
  }, [cur.key, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function setSwitch(k) {
    if (phase !== 'run') return
    haptic('tap')
    trackRef.current = k
    setTrack(k)
  }

  const arrived = phase === 'result'

  return (
    <div>
      <GameStats
        items={[
          ['Station', round, '#f7971e'],
          ['Jaan', '❤️'.repeat(Math.max(0, lives)) || '—'],
        ]}
      />
      <p className="mb-2 h-6 text-center text-sm font-semibold" style={{ color: msg ? (msg.ok ? '#25d366' : '#ed4956') : undefined }}>
        {msg ? msg.text : 'Train ko ZainUz Wedding Station bhejiye 🚂💕'}
      </p>
      <div
        data-testid="crj-arena"
        className="zu-game-arena relative h-[400px] overflow-hidden rounded-2xl border border-ig-border"
        style={{ background: 'linear-gradient(180deg, rgba(120,70,20,0.35), rgba(30,40,30,0.5))' }}
      >
        {/* Platforms */}
        <div className="absolute left-0 right-0 top-2 grid grid-cols-3 gap-1 px-1">
          {cur.stations.map((s, k) => (
            <button
              key={s}
              type="button"
              data-track={k}
              data-target={s === TARGET ? 'true' : undefined}
              onClick={() => setSwitch(k)}
              className="min-h-14 rounded-lg border-2 px-1 py-1.5 text-[11px] font-semibold leading-tight"
              style={{
                borderColor: track === k ? '#f5c518' : 'rgba(255,255,255,0.15)',
                background: track === k ? 'rgba(245,197,24,0.18)' : 'rgba(0,60,120,0.55)',
                color: '#fff',
              }}
            >
              🚉 {s}
            </button>
          ))}
        </div>

        {/* Tracks: sleepers + rails, the switched one in gold */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {X.map((x, k) => (
            <g key={k}>
              <line x1="50" y1="62" x2={x} y2="20" stroke={track === k ? '#f5c518' : '#6b5a45'} strokeWidth={track === k ? 1.6 : 1} strokeDasharray="2 1.2" />
            </g>
          ))}
          <line x1="50" y1="100" x2="50" y2="62" stroke="#6b5a45" strokeWidth="1.2" strokeDasharray="2 1.2" />
        </svg>

        {/* Switch lever */}
        <div className="absolute bottom-2 right-2 flex gap-1.5">
          {['⬅️', '⬆️', '➡️'].map((a, k) => (
            <button
              key={k}
              type="button"
              data-lever={k}
              onClick={() => setSwitch(k)}
              className="flex size-11 items-center justify-center rounded-full border-2 text-lg"
              style={{ borderColor: track === k ? '#f5c518' : 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)' }}
            >
              {a}
            </button>
          ))}
        </div>

        {/* The train: runs up the trunk line, then out along the chosen track */}
        {(phase === 'run' || phase === 'result') && (
          <div
            key={cur.key}
            className="pointer-events-none absolute text-4xl"
            style={{
              left: arrived ? `calc(${X[track]}% - 18px)` : 'calc(50% - 18px)',
              top: arrived ? '12%' : undefined,
              bottom: arrived ? undefined : '0%',
              transition: arrived ? 'left 0.5s ease-in, top 0.5s ease-in' : undefined,
              animation: arrived ? undefined : `zu-train ${cur.ms}ms linear forwards`,
            }}
          >
            🚂
          </div>
        )}
        <p className="absolute bottom-1 left-2 text-[10px] text-ig-faint">CRJ 🚂 se</p>

        {phase === 'ready' && (
          <GameOverlay
            emoji="🚂"
            title="CRJ Wedding Express"
            lines={['Chittaranjan se chali baraat wali train!', 'Switch badlo (⬅️ ⬆️ ➡️) ya platform dabaiye', 'Sirf "ZainUz Wedding Station 💕" sahi hai — nakli naamon se bachiye!']}
            button="Train chalaiye 🚂"
            onButton={start}
            color="#f7971e"
          />
        )}
        {phase === 'over' && (
          <GameOverlay
            emoji={round >= 8 ? '🏆' : '🚉'}
            title={round >= 8 ? 'Station Master! 🚉🏆' : 'Train bhatak gayi 😭'}
            lines={[`${round} baar sahi station pahunche`, newBest ? '✨ Naya best!' : '']}
            button="Phir chalaiye"
            onButton={start}
            win={round >= 8}
            color="#f7971e"
          />
        )}
      </div>
    </div>
  )
}
