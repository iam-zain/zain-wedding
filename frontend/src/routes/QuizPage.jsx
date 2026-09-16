import { useMemo, useState } from 'react'
import { QUIZ_BEST_KEY, QUIZ_QUESTIONS, QUIZ_RESULTS } from '../config'
import { useLocalStorage } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { playChime } from '../lib/sound'
import BackHeader from '../components/BackHeader'
import Confetti from '../components/Confetti'

// How long the right/wrong colours stay up before the next question slides in.
const REVEAL_MS = 900

// Indexed by option position. Long enough for any question config: falls back
// to the number if a question ever carries more options than letters.
const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function resultFor(score) {
  // QUIZ_RESULTS is ordered high -> low, so the first match is the best band
  // this score qualifies for.
  return QUIZ_RESULTS.find((r) => score >= r.min) ?? QUIZ_RESULTS[QUIZ_RESULTS.length - 1]
}

export default function QuizPage() {
  const total = QUIZ_QUESTIONS.length
  const [best, setBest] = useLocalStorage(QUIZ_BEST_KEY, null)

  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState(null) // index of the tapped option, or null
  const [done, setDone] = useState(false)

  const question = QUIZ_QUESTIONS[index]
  const result = useMemo(() => resultFor(score), [score])
  const perfect = done && score === total

  function choose(optionIndex) {
    if (picked !== null) return // already answering — ignore double taps
    setPicked(optionIndex)

    const correct = optionIndex === question.answer
    const nextScore = correct ? score + 1 : score
    if (correct) {
      setScore(nextScore)
      haptic('like')
    } else {
      haptic('warn')
    }

    setTimeout(() => {
      setPicked(null)
      if (index + 1 < total) {
        setIndex(index + 1)
        return
      }
      setDone(true)
      // Compare against nextScore, not `score`: this runs before React has
      // necessarily applied the state update above, so `score` would still be
      // the pre-answer value and a perfect run would save as total - 1.
      if (best === null || nextScore > best) setBest(nextScore)
      if (nextScore === total) playChime()
    }, REVEAL_MS)
  }

  function restart() {
    setIndex(0)
    setScore(0)
    setPicked(null)
    setDone(false)
    haptic('tap')
  }

  return (
    <div data-testid="quiz-page">
      <BackHeader title="Quiz" />

      {perfect && <Confetti count={160} />}

      {!done ? (
        <div className="px-4 pt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Humein kitna jaante ho? 🤔</h2>
            <span data-testid="quiz-progress" className="shrink-0 text-xs text-ig-muted">
              {index + 1}/{total}
            </span>
          </div>

          <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-ig-card">
            <div
              className="h-full rounded-full bg-wa transition-[width] duration-300"
              style={{ width: `${((index + (picked !== null ? 1 : 0)) / total) * 100}%` }}
            />
          </div>

          {/* Keyed so each question replays the entrance animation. */}
          <div key={question.id} className="page-slide-from-right mt-6">
            <p data-testid="quiz-question" className="text-base font-semibold leading-snug">
              {question.question}
            </p>

            <ul className="mt-4 space-y-2">
              {question.options.map((option, i) => {
                const isAnswer = i === question.answer
                const isPicked = picked === i
                // Colours only appear once an answer is locked in: the correct
                // one always turns green, and a wrong pick turns red so the
                // guest sees both what they chose and what was right.
                const state =
                  picked === null
                    ? 'border-ig-border bg-ig-card text-ig-text active:opacity-80'
                    : isAnswer
                      ? 'border-wa bg-wa/15 text-ig-text'
                      : isPicked
                        ? 'border-ig-red bg-ig-red/15 text-ig-text'
                        : 'border-ig-border bg-ig-card text-ig-muted opacity-60'

                // Letter chip matches the answer's own state, so a revealed
                // question reads as "C was right" rather than just a colour.
                const chip =
                  picked === null
                    ? 'border-ig-border text-ig-muted'
                    : isAnswer
                      ? 'border-wa bg-wa text-black'
                      : isPicked
                        ? 'border-ig-red bg-ig-red text-white'
                        : 'border-ig-border text-ig-faint'

                return (
                  <li key={option}>
                    <button
                      type="button"
                      disabled={picked !== null}
                      onClick={() => choose(i)}
                      data-testid={`quiz-option-${i}`}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-colors ${state}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold uppercase ${chip}`}
                      >
                        {OPTION_LETTERS[i] ?? i + 1}
                      </span>
                      <span className="min-w-0 flex-1 break-words">{option}</span>
                      {picked !== null && isAnswer && <span aria-hidden="true">✓</span>}
                      {picked !== null && isPicked && !isAnswer && <span aria-hidden="true">✕</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div data-testid="quiz-result" className="px-4 pt-8 text-center">
          <div className="text-5xl leading-none">{result.emoji}</div>
          <h2 className="mt-3 text-xl font-semibold">{result.title}</h2>
          <p data-testid="quiz-score" className="mt-1 text-3xl font-semibold tabular-nums">
            {score}/{total}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-ig-muted">{result.message}</p>

          {best !== null && (
            <p className="mt-3 text-xs text-ig-faint">
              Best score: {best}/{total}
            </p>
          )}

          <button
            type="button"
            onClick={restart}
            data-testid="quiz-restart"
            className="mt-6 w-full rounded-xl bg-ig-blue py-3 text-sm font-semibold text-white active:opacity-90"
          >
            Dobara khelo 🔁
          </button>
        </div>
      )}
    </div>
  )
}
