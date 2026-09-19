import { useState } from 'react'
import { LINES, pick, recordBest, recordPlay, shuffle, useTimeouts } from '../../lib/games'
import { haptic } from '../../lib/haptics'
import { GameOverlay } from './GameShell'

const PER_ROUND = 6
const WORDS = [
  ['NIKAH', 'Shaadi ka sabse pyaara lamha'],
  ['MUHABBAT', 'Dil ki zubaan'],
  ['WALEEMA', 'Shaadi ke baad ki daawat'],
  ['DUA', 'Haath uthake maangi jaati hai'],
  ['ZINDAGI', 'Ab se saath saath'],
  ['SAFAR', 'Ek naya shuru hua'],
  ['RISHTA', 'Do ghar jod deta hai'],
  ['BARAKAH', 'Allah ki rehmat'],
  ['MEHENDI', 'Haathon pe rang'],
  ['HALDI', 'Peela rang, chamakta chehra'],
  ['BARAAT', 'Dhol ke saath aati hai'],
  ['DULHAN', 'Aaj ki queen'],
  ['DULHA', 'Sehra pehenta hai'],
  ['MAHR', 'Nikah ka haq'],
  ['QUBOOL', 'Teen baar kaha jaata hai'],
  ['SHAADI', 'Sab isi ke liye aaye hain'],
  ['ISHQ', 'Muhabbat ka bhai'],
  ['KHUSHI', 'Aaj har chehre pe'],
  ['SEHRA', 'Dulhe ke sar pe'],
  ['RUKHSATI', 'Aansuon wala pal'],
  ['JODI', 'Rab ne banayi'],
  ['DAAWAT', 'Biryani wali'],
  ['SALAMI', 'Lifafe mein aati hai'],
  ['GAWAH', 'Nikah mein do chahiye'],
  ['MUBARAK', 'Sab yahi kehte hain'],
]

function scrambled(word) {
  const letters = word.split('').map((ch, i) => ({ ch, id: i }))
  let s
  do s = shuffle(letters)
  while (word.length > 2 && s.map((l) => l.ch).join('') === word)
  return s
}

function buildRound() {
  return shuffle(WORDS).slice(0, PER_ROUND).map(([word, hint]) => ({ word, hint, tiles: scrambled(word) }))
}

export default function LetterScramble() {
  const [round, setRound] = useState(buildRound)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState([]) // tile ids in order
  const [state, setState] = useState(null) // null | 'right' | 'wrong'
  const [score, setScore] = useState(0)
  const [hints, setHints] = useState(0)
  const [done, setDone] = useState(false)
  const [line, setLine] = useState('')
  const [newBest, setNewBest] = useState(false)
  const { later } = useTimeouts()

  const q = round[i]
  const answer = picked.map((id) => q.tiles.find((t) => t.id === id).ch).join('')

  function advance(nextScore) {
    later(() => {
      setPicked([])
      setState(null)
      if (i + 1 < round.length) setI(i + 1)
      else {
        setDone(true)
        setNewBest(recordBest('scramble', nextScore))
        recordPlay('scramble')
      }
    }, 1200)
  }

  function tapTile(t, base = picked) {
    if (state || base.includes(t.id)) return
    haptic('tap')
    const next = [...base, t.id]
    setPicked(next)
    if (next.length === q.word.length) {
      const word = next.map((id) => q.tiles.find((x) => x.id === id).ch).join('')
      if (word === q.word) {
        haptic('like')
        setState('right')
        setLine(pick(LINES.good))
        setScore(score + 1)
        advance(score + 1)
      } else {
        haptic('warn')
        setState('wrong')
        setLine(pick(LINES.bad))
        later(() => {
          setPicked([])
          setState(null)
        }, 700)
      }
    }
  }

  function undo(k) {
    if (state) return
    haptic('tap')
    setPicked(picked.slice(0, k))
  }

  /** Reveal the next correct letter. */
  function hint() {
    if (state) return
    const correctSoFar = q.word.startsWith(answer) ? picked : []
    const need = q.word[correctSoFar.length]
    const tile = q.tiles.find((t) => t.ch === need && !correctSoFar.includes(t.id))
    if (!tile) return
    setHints((h) => h + 1)
    tapTile(tile, correctSoFar)
  }

  function skip() {
    if (state) return
    setState('wrong')
    setLine(`Jawab tha: ${q.word}`)
    setPicked([])
    advance(score)
  }

  function again() {
    haptic('tap')
    setRound(buildRound())
    setI(0)
    setScore(0)
    setHints(0)
    setDone(false)
  }

  return (
    <div data-testid="letter-scramble">
      <div className="mb-2 flex justify-between text-xs text-ig-muted">
        <span>
          Lafz {i + 1}/{round.length}
        </span>
        <span>
          Score <b className="text-ig-text">{score}</b>
        </span>
      </div>
      <div className="relative rounded-2xl border border-ig-border p-5" style={{ background: 'linear-gradient(160deg, rgba(244,114,182,0.16), rgba(247,151,30,0.1))' }}>
        <p className="text-center text-xs uppercase tracking-widest text-ig-muted">💌 Khat ke akshar bikhar gaye</p>
        <p className="mt-1 text-center text-sm">Ishaara: {q.hint}</p>

        {/* Answer slots */}
        <div className="my-4 flex flex-wrap justify-center gap-1.5" style={{ animation: state === 'wrong' ? 'zu-shake 0.3s' : undefined }}>
          {q.word.split('').map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => k < picked.length && undo(k)}
              className="flex size-9 items-center justify-center rounded-lg border-b-2 text-lg font-bold"
              style={{
                borderColor: state === 'right' ? '#25d366' : state === 'wrong' ? '#ed4956' : '#f472b6',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              {answer[k] || ''}
            </button>
          ))}
        </div>

        {/* Letter tiles */}
        <div className="flex flex-wrap justify-center gap-2" data-testid="scramble-tiles">
          {q.tiles.map((t) => {
            const used = picked.includes(t.id)
            return (
              <button
                key={`${q.word}-${t.id}`}
                type="button"
                data-ch={t.ch}
                onClick={() => tapTile(t)}
                className="flex size-11 items-center justify-center rounded-xl text-lg font-bold text-white transition-opacity"
                style={{
                  background: 'linear-gradient(135deg,#f472b6,#a855f7)',
                  opacity: used ? 0.2 : 1,
                  animation: 'zu-pop 0.25s ease-out',
                }}
              >
                {t.ch}
              </button>
            )
          })}
        </div>

        <p className="mt-3 h-5 text-center text-sm font-semibold" style={{ color: state === 'right' ? '#25d366' : '#ed4956' }}>
          {state ? line : ''}
        </p>
        <div className="mt-1 flex justify-center gap-2">
          <button type="button" onClick={hint} className="rounded-full border border-ig-border px-3 py-1.5 text-xs">
            💡 Ek akshar batao
          </button>
          <button type="button" onClick={skip} className="rounded-full border border-ig-border px-3 py-1.5 text-xs">
            ⏭️ Chhodo
          </button>
        </div>

        {done && (
          <GameOverlay
            emoji={score === round.length ? '💌' : '✍️'}
            title={score === round.length ? 'Saare lafz sahi! Khat poora 💌' : score >= 4 ? 'Wah, kya lafz jodte ho! ✍️' : 'Akshar thode ulat gaye 😅'}
            lines={[`${score}/${round.length} sahi`, hints ? `${hints} ishaare liye` : 'Bina ishaare ke! 🌟', newBest ? '✨ Naya best!' : '']}
            button="Agle lafz"
            onButton={again}
            win={score === round.length}
            color="#f472b6"
          />
        )}
      </div>
    </div>
  )
}
