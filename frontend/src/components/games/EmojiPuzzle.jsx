import { useState } from 'react'
import { addStatId, LINES, pick, recordBest, recordPlay, shuffle, useGameStats, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay } from './GameShell'

const PER_ROUND = 5
const LETTERS = ['A', 'B', 'C', 'D']

// `answer` is always options[0]; options are shuffled at play time.
export const PUZZLES = [
  { id: 'nikah', q: '👰 + 🤵 + 💍 + 🌙', options: ['Nikah', 'Mehendi', 'Haldi', 'Walima'] },
  { id: 'zindagi', q: '❤️ + 🏡 + ♾️', options: ['Zindagi saath', 'Ghar jamai', 'Naya ghar', 'Lambi chhutti'] },
  { id: 'mehendi', q: '🌿 + ✋ + 🎨', options: ['Mehendi', 'Haldi', 'Rangoli', 'Holi'] },
  { id: 'haldi', q: '💛 + 🌼 + 🧴', options: ['Haldi', 'Mehendi', 'Spa day', 'Basant'] },
  { id: 'walima', q: '🍽️ + 🎉 + 👪', options: ['Walima', 'Birthday party', 'Iftar', 'Picnic'] },
  { id: 'baraat', q: '🐎 + 🥁 + 🎺', options: ['Baraat', 'Circus', 'Parade', 'Mela'] },
  { id: 'rukhsati', q: '👰 + 😢 + 🚗', options: ['Rukhsati', 'Traffic jam', 'Road trip', 'Exam result'] },
  { id: 'joota', q: '👟 + 🙈 + 💰', options: ['Joota chhupai', 'Shoe sale', 'Chor police', 'Jooton ki dukaan'] },
  { id: 'nikahnama', q: '📜 + ✍️ + 🤲', options: ['Nikahnama', 'Exam paper', 'Rent agreement', 'Love letter'] },
  { id: 'biryani', q: '🍚 + 🍗 + 🔥', options: ['Biryani', 'Khichdi', 'Pulao', 'Chowmein'] },
  { id: 'baat-pakki', q: '🍬 + 🤝 + 💍', options: ['Baat pakki', 'Business deal', 'Dosti', 'Mithai shop'] },
  { id: 'salami', q: '🎁 + 💵 + ✉️', options: ['Salami', 'Bijli ka bill', 'Salary', 'Parcel'] },
  { id: 'munh-dikhai', q: '👀 + 👰 + 🎁', options: ['Munh dikhai', 'Aankh micholi', 'Photo shoot', 'Chashma'] },
  { id: 'dholki', q: '🥁 + 🎶 + 👯', options: ['Dholki', 'Concert', 'Gym class', 'School assembly'] },
  { id: 'honeymoon', q: '✈️ + 🏝️ + 💑', options: ['Honeymoon', 'Business trip', 'Hajj', 'Office picnic'] },
  { id: 'late-baraat', q: '⏰ + 🐢 + 🐎', options: ['Late baraat', 'Kachhua race', 'Subah ki alarm', 'Traffic'] },
  { id: 'makeup', q: '💄 + 💅 + 👰', options: ['Dulhan ka makeup', 'Selfie', 'Salon ka bill', 'Theatre'] },
  { id: 'doodh-pilai', q: '🥛 + 👭 + 🤵', options: ['Doodh pilai', 'Breakfast', 'Chai break', 'Dairy farm'] },
  { id: 'card', q: '💌 + 📬 + 🎊', options: ['Shaadi ka card', 'Bijli ka bill', 'Report card', 'Eid card'] },
  { id: 'photo', q: '📸 + 🤳 + 😁', options: ['Bas ek aur photo', 'Passport photo', 'CCTV', 'Selfie stick sale'] },
]

/** Unsolved puzzles first, so the "solve all" badge is reachable in a few rounds. */
function buildRound(solved) {
  const fresh = shuffle(PUZZLES.filter((p) => !solved.includes(p.id)))
  const old = shuffle(PUZZLES.filter((p) => solved.includes(p.id)))
  return [...fresh, ...old].slice(0, PER_ROUND).map((p) => {
    const options = shuffle(p.options)
    return { ...p, options, answer: options.indexOf(p.options[0]) }
  })
}

export default function EmojiPuzzle() {
  const stats = useGameStats()
  const [round, setRound] = useState(() => buildRound(stats.puzzles))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [line, setLine] = useState('')
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [newBest, setNewBest] = useState(false)
  const { later } = useTimeouts()

  const p = round[i]

  function choose(k) {
    if (picked != null) return
    setPicked(k)
    const ok = k === p.answer
    setLine(ok ? pick(LINES.good) : `Sahi jawab: ${p.options[p.answer]}`)
    haptic(ok ? 'like' : 'warn')
    const nextScore = ok ? score + 1 : score
    if (ok) {
      setScore(nextScore)
      addStatId('puzzles', p.id)
    }
    later(() => {
      setPicked(null)
      if (i + 1 < round.length) setI(i + 1)
      else {
        setDone(true)
        setNewBest(recordBest('puzzle', nextScore))
        recordPlay('puzzle')
      }
    }, ok ? 1300 : 2400)
  }

  function again() {
    haptic('tap')
    setRound(buildRound(stats.puzzles))
    setI(0)
    setScore(0)
    setDone(false)
  }

  const solvedCount = stats.puzzles.length

  return (
    <div data-testid="emoji-puzzle">
      <div className="mb-2 flex items-center justify-between text-xs text-ig-muted">
        <span>
          Sawaal {Math.min(i + 1, round.length)}/{round.length}
        </span>
        <span>
          Score <b className="text-ig-text">{score}</b> · Hal kiye {solvedCount}/{PUZZLES.length}
        </span>
      </div>
      <div className="relative rounded-2xl border border-ig-border p-5" style={{ background: 'linear-gradient(160deg, rgba(247,151,30,0.14), rgba(244,114,182,0.1))' }}>
        <p className="text-center text-xs uppercase tracking-widest text-ig-muted">Emoji padho, jawab do 🥰</p>
        <p key={p.id} className="my-5 text-center text-4xl leading-snug" style={{ animation: 'zu-pop 0.3s ease-out' }}>
          {p.q}
        </p>
        <ul className="space-y-2">
          {p.options.map((o, k) => {
            const reveal = picked != null
            const correct = reveal && k === p.answer
            const wrong = reveal && k === picked && !correct
            return (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => choose(k)}
                  data-correct={k === p.answer ? 'true' : undefined}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    borderColor: correct ? '#25d366' : wrong ? '#ed4956' : 'var(--color-ig-border)',
                    background: correct ? 'rgba(37,211,102,0.18)' : wrong ? 'rgba(237,73,86,0.18)' : 'var(--color-ig-card)',
                  }}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ig-elevated text-xs font-bold">{LETTERS[k]}</span>
                  {o}
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 h-5 text-center text-sm font-semibold" style={{ color: picked === p.answer ? '#25d366' : '#ed4956' }}>
          {picked == null ? '' : line}
        </p>

        {done && (
          <GameOverlay
            emoji={score === round.length ? '🏆' : '🥰'}
            title={score === round.length ? 'Emoji Pandit! Sab sahi 🏆' : score >= 3 ? 'Wah! Achha dimaag hai 🧠' : 'Emoji mushkil the? 😅'}
            lines={[`${score}/${round.length} sahi`, `Kul hal kiye: ${solvedCount}/${PUZZLES.length}`, newBest ? '✨ Naya best!' : '']}
            button="Agla round"
            onButton={again}
            win={score === round.length}
            color="#f7971e"
          />
        )}
      </div>
    </div>
  )
}
