import { useEffect, useState } from 'react'
import { pick, recordBest, recordPlay } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import Confetti from '../Confetti'
import { GameOverlay } from './GameShell'

const FLOWERS = ['🌹', '🌷', '🌸', '🌼', '🌺', '🌻']
const ROUND_S = 60
const MAX = 7
// Named orders; counts per flower.
const ORDERS = [
  ['Romantic Bouquet ❤️', { '🌹': 3, '🌸': 1 }],
  ['Nikah Bouquet 🤍', { '🌼': 2, '🌸': 2, '🌷': 1 }],
  ['Waleema Bouquet 🎉', { '🌺': 2, '🌻': 1, '🌷': 2 }],
  ['Mehendi Bouquet 💛', { '🌼': 2, '🌻': 2 }],
  ['Uzma ka Favourite 👰', { '🌹': 2, '🌷': 2, '🌸': 1 }],
  ['Zain ki Surprise 🤵', { '🌹': 1, '🌺': 1, '🌻': 1, '🌼': 1 }],
  ['Rukhsati Bouquet 🥹', { '🌸': 3, '🌷': 1 }],
  ['Pehli Mulaqat 🌹', { '🌹': 5 }],
]

/** A name for whatever the guest made in free mode. */
function nameFor(b) {
  const c = {}
  b.forEach((f) => (c[f] = (c[f] || 0) + 1))
  const [top, n] = Object.entries(c).sort((x, y) => y[1] - x[1])[0] || []
  const kinds = Object.keys(c).length
  if (!top) return ''
  if (kinds >= 5) return 'Rangeen Waleema Bouquet 🎉'
  if (top === '🌹' && n >= b.length / 2) return 'Romantic Bouquet ❤️'
  if ((top === '🌼' || top === '🌸') && kinds <= 3) return 'Nikah Bouquet 🤍'
  if (top === '🌻') return 'Sunshine Bouquet ☀️'
  if (top === '🌷') return 'Tulip Tales Bouquet 🌷'
  if (top === '🌺') return 'Mehendi Masti Bouquet 💃'
  return pick(['Dil Se Bouquet 💞', 'Shaadi Special Bouquet 💐', 'Pyaar Bhara Bouquet 💕'])
}

const matches = (b, want) => {
  const c = {}
  b.forEach((f) => (c[f] = (c[f] || 0) + 1))
  const keys = new Set([...Object.keys(c), ...Object.keys(want)])
  return [...keys].every((k) => (c[k] || 0) === (want[k] || 0))
}

function Bouquet({ flowers, big }) {
  return (
    <div className="relative mx-auto flex h-40 w-48 flex-col items-center justify-end">
      <div className="flex max-w-[170px] flex-wrap-reverse justify-center" style={{ fontSize: big ? 38 : 32, lineHeight: 1 }}>
        {flowers.map((f, k) => (
          <span key={k} style={{ animation: 'zu-pop 0.2s ease-out', margin: -3 }}>
            {f}
          </span>
        ))}
      </div>
      {/* Wrapping paper */}
      <div className="h-14 w-24" style={{ clipPath: 'polygon(0 0, 100% 0, 60% 100%, 40% 100%)', background: 'linear-gradient(180deg,#f472b6,#be185d)' }} />
      <div className="absolute bottom-6 text-lg">🎀</div>
    </div>
  )
}

export default function BuildBouquet() {
  const [mode, setMode] = useState('orders') // orders | free
  const [phase, setPhase] = useState('ready')
  const [left, setLeft] = useState(ROUND_S)
  const [order, setOrder] = useState(() => pick(ORDERS))
  const [bq, setBq] = useState([])
  const [made, setMade] = useState(0)
  const [flash, setFlash] = useState(null)
  const [freeName, setFreeName] = useState('')
  const [newBest, setNewBest] = useState(false)

  useEffect(() => {
    if (mode !== 'orders' || phase !== 'play') return undefined
    if (left <= 0) {
      setNewBest(recordBest('bouquet', made))
      recordPlay('bouquet')
      setPhase('over')
      return undefined
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left, phase, mode, made])

  function start() {
    haptic('tap')
    setLeft(ROUND_S)
    setMade(0)
    setBq([])
    setOrder(pick(ORDERS))
    setPhase('play')
  }

  function add(f) {
    if (mode === 'orders' && phase !== 'play') return
    if (bq.length >= MAX || flash) return
    haptic('tap')
    const next = [...bq, f]
    setBq(next)
    setFreeName('')
    if (mode === 'orders') {
      const want = order[1]
      if (matches(next, want)) {
        haptic('like')
        setMade((m) => m + 1)
        setFlash({ ok: true, text: `${order[0]} taiyaar! 💐` })
        setTimeout(() => {
          setFlash(null)
          setBq([])
          setOrder((o) => {
            let n
            do n = pick(ORDERS)
            while (n === o)
            return n
          })
        }, 900)
      } else if ((next.filter((x) => x === f).length || 0) > (want[f] || 0)) {
        haptic('warn')
        setFlash({ ok: false, text: `${f} is order mein itne nahi chahiye! 🙈` })
        setTimeout(() => {
          setFlash(null)
          setBq(next.slice(0, -1))
        }, 700)
      }
    }
  }

  function removeLast() {
    haptic('tap')
    setBq((b) => b.slice(0, -1))
    setFreeName('')
  }

  function switchMode(m) {
    haptic('tap')
    setMode(m)
    setBq([])
    setFlash(null)
    setFreeName('')
    setPhase('ready')
  }

  return (
    <div data-testid="build-bouquet">
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-ig-card p-1 text-xs font-semibold">
        {[
          ['orders', '⏱ Orders'],
          ['free', '🎨 Apna bouquet'],
        ].map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className="rounded-full py-2"
            style={{ background: mode === m ? 'linear-gradient(90deg,#f472b6,#f7971e)' : 'transparent', color: mode === m ? '#fff' : undefined }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'orders' && (
        <div className="mb-2 flex justify-between text-sm">
          <span className="rounded-full bg-ig-card px-3 py-1 tabular-nums">⏱ {Math.max(0, left)}s</span>
          <span className="rounded-full bg-ig-card px-3 py-1">
            Bane <b style={{ color: '#f472b6' }}>{made}</b>
          </span>
        </div>
      )}

      <div className="relative rounded-2xl border border-ig-border p-4" style={{ background: 'linear-gradient(160deg, rgba(244,114,182,0.16), rgba(37,211,102,0.08))' }}>
        {flash?.ok && <Confetti count={30} />}
        {mode === 'orders' ? (
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-ig-muted">Order aaya hai</p>
            <p className="text-base font-semibold">{order[0]}</p>
            <p className="mt-1 text-xl" data-testid="bouquet-order">
              {Object.entries(order[1]).map(([f, n]) => (
                <span key={f} className="mx-1">
                  {f}×{n}
                </span>
              ))}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm text-ig-muted">Phool chuno ({MAX} tak) — hum naam denge 💐</p>
        )}

        <Bouquet flowers={bq} big={mode === 'free'} />

        <p className="h-6 text-center text-sm font-semibold" style={{ color: flash ? (flash.ok ? '#25d366' : '#ed4956') : '#f472b6' }}>
          {flash ? flash.text : freeName}
        </p>

        <div className="mt-2 grid grid-cols-6 gap-1.5">
          {FLOWERS.map((f) => (
            <button key={f} type="button" data-flower={f} onClick={() => add(f)} className="flex aspect-square items-center justify-center rounded-xl bg-white/10 text-3xl active:scale-90">
              {f}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          <button type="button" onClick={removeLast} className="rounded-full border border-ig-border px-4 py-1.5 text-xs">
            ↩️ Ek hatao
          </button>
          {mode === 'free' && (
            <button
              type="button"
              data-testid="bouquet-name"
              disabled={bq.length < 3}
              onClick={() => {
                haptic('like')
                setFreeName(nameFor(bq))
                recordPlay('bouquet', false)
              }}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(90deg,#f472b6,#f7971e)' }}
            >
              ✨ Naam do
            </button>
          )}
        </div>

        {mode === 'orders' && phase === 'ready' && (
          <GameOverlay
            emoji="💐"
            title="Build the Bouquet"
            lines={['Order ke hisaab se phool lagao', `${ROUND_S} second — jitne bouquet utne points`, 'Galat phool apne aap hat jayega']}
            button="Dukaan kholo 💐"
            onButton={start}
            color="#f472b6"
          />
        )}
        {mode === 'orders' && phase === 'over' && (
          <GameOverlay
            emoji={made >= 8 ? '🏆' : '💐'}
            title={made >= 8 ? 'Shaadi ka florist aap hi ho! 💐' : made >= 4 ? 'Khoobsurat bouquets! 🌸' : 'Phool thode bikhar gaye 😅'}
            lines={[`${made} bouquet banaye`, newBest ? '✨ Naya best!' : '']}
            button="Phir se"
            onButton={start}
            win={made >= 8}
            color="#f472b6"
          />
        )}
      </div>
    </div>
  )
}
