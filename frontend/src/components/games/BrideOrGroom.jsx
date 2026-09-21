import { useState } from 'react'
import { recordBest, recordPlay, shuffle, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay } from './GameShell'

const PER_ROUND = 10
// b = bride, g = groom, both = trick question. `why` is the punchline.
const ITEMS = [
  ['💄', 'Lipstick', 'b', 'Obviously 💋'],
  ['🌿', 'Haathon pe mehendi', 'b', 'Dulhe ke haath mein bas naam likha hota hai 😄'],
  ['👑', 'Sehra', 'g', 'Sehra dulhe ke sar pe sajta hai'],
  ['🐎', 'Ghodi pe aana', 'g', 'Ghodi dulhe ki sawari hai 🐎'],
  ['👟', 'Joote chori hona', 'g', 'Saaliyon ka target dulhe ke joote 😅'],
  ['💍', 'Ring pehenna', 'both', 'Dono pehente hain, trick question! 😉'],
  ['⌚', 'Watch dekhte rehna', 'both', 'Dono late hain, dono ghadi dekhte hain ⌚'],
  ['😭', 'Rukhsati pe rona', 'b', 'Ab dulha bhi ro de toh alag baat hai 😄'],
  ['📸', '"Bas ek aur photo"', 'both', 'Ye bimari dono ko hai 📸'],
  ['🤲', 'Qubool hai kehna', 'both', 'Nikah mein dono kehte hain 🤲'],
  ['🧣', 'Dupatta sambhalna', 'b', 'Bhaari dupatta, bhaari zimmedari'],
  ['👔', 'Sherwani ka button', 'g', 'Ek button hamesha dheela hota hai 😄'],
  ['💵', 'Salami baantna', 'g', 'Saaliyon ki salami dulhe ki jeb se 💸'],
  ['😴', 'Shaadi ke din neend nahi aana', 'both', 'Excitement dono taraf barabar 😴'],
  ['🥘', 'Khana chakhne ka time na milna', 'both', 'Dono stage pe, biryani doosron ki plate mein 😭'],
  ['💅', 'Nail art', 'b', 'Mehendi ke saath matching 💅'],
  ['🕶️', 'Dost ke saath bhangra', 'g', 'Baraat mein dulhe ke dost hi naachte hain'],
  ['📱', 'Phone pe "pahunch gaye?" message', 'both', 'Dono ek doosre ko baar baar puchte hain 📱'],
  ['🌸', 'Phoolon ki chaadar ke neeche aana', 'b', 'Dulhan ki entry 🌸'],
  ['🗡️', 'Talwar / kataar', 'g', 'Kuch dulhe sherwani ke saath rakhte hain'],
  ['💖', 'Ek doosre ko dekh ke muskurana', 'both', 'Ye toh dono karenge 💖'],
  ['🎤', 'Stage pe sharmana', 'both', 'Dono sharmaate hain, bas maante nahi 😊'],
  ['👛', 'Clutch purse', 'b', 'Lipstick aur tissue ka ghar'],
  ['🧢', 'Saafa baandhna', 'g', 'Dulhe ka saafa 🧢'],
]
const CHOICES = [
  ['b', '👰', 'Bride', '#f472b6'],
  ['both', '💞', 'Dono', '#a855f7'],
  ['g', '🤵', 'Groom', '#0095f6'],
]

export default function BrideOrGroom() {
  const [round, setRound] = useState(() => shuffle(ITEMS).slice(0, PER_ROUND))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [newBest, setNewBest] = useState(false)
  const { later } = useTimeouts()
  const [emoji, label, answer, why] = round[i]

  function choose(c) {
    if (picked) return
    setPicked(c)
    const ok = c === answer
    haptic(ok ? 'like' : 'warn')
    const s = ok ? score + 1 : score
    setScore(s)
    later(() => {
      setPicked(null)
      if (i + 1 < round.length) setI(i + 1)
      else {
        setDone(true)
        setNewBest(recordBest('brideorgroom', s))
        recordPlay('brideorgroom')
      }
    }, ok ? 1500 : 2400)
  }

  function again() {
    haptic('tap')
    setRound(shuffle(ITEMS).slice(0, PER_ROUND))
    setI(0)
    setScore(0)
    setDone(false)
  }

  const ok = picked === answer

  return (
    <div data-testid="bride-or-groom">
      <div className="mb-2 flex justify-between text-xs text-ig-muted">
        <span>
          {i + 1}/{round.length}
        </span>
        <span>
          Score <b className="text-ig-text">{score}</b>
        </span>
      </div>
      <div className="relative rounded-2xl border border-ig-border p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.18), rgba(0,149,246,0.16))' }}>
        <p className="text-xs uppercase tracking-widest text-ig-muted">Yeh kiska hai?</p>
        <div key={i} style={{ animation: 'zu-pop 0.3s ease-out' }}>
          <p className="mt-3 text-6xl leading-none">{emoji}</p>
          <p className="mt-3 text-lg font-semibold">{label}</p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {CHOICES.map(([id, e, name, color]) => {
            const isAnswer = picked && id === answer
            const isWrong = picked === id && !ok
            return (
              <button
                key={id}
                type="button"
                data-choice={id}
                data-answer={id === answer ? 'true' : undefined}
                onClick={() => choose(id)}
                className="rounded-2xl border-2 py-3 active:scale-95"
                style={{
                  borderColor: isAnswer ? '#25d366' : isWrong ? '#ed4956' : color,
                  background: isAnswer ? 'rgba(37,211,102,0.2)' : isWrong ? 'rgba(237,73,86,0.2)' : `${color}1f`,
                }}
              >
                <span className="block text-3xl">{e}</span>
                <span className="mt-1 block text-xs font-semibold">{name}</span>
              </button>
            )
          })}
        </div>

        <p className="mt-4 min-h-10 text-sm">
          {picked && (
            <>
              <b style={{ color: ok ? '#25d366' : '#ed4956' }}>{ok ? (answer === 'both' ? 'Pakad liya trick! 😎 ' : 'Sahi! ') : 'Galat! '}</b>
              {why}
            </>
          )}
        </p>

        {done && (
          <GameOverlay
            emoji={score >= 8 ? '💞' : '😄'}
            title={score >= 8 ? 'Shaadi expert! 💞' : score >= 5 ? 'Achha andaaza hai! 👏' : 'Dulha dulhan confuse kar diye 😅'}
            lines={[`${score}/${round.length} sahi`, newBest ? '✨ Naya best!' : '']}
            button="Aur kheliye"
            onButton={again}
            win={score >= 8}
            color="#a855f7"
          />
        )}
      </div>
    </div>
  )
}
