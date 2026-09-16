// ─────────────────────────────────────────────────────────────────────────────
// Quiz round building. Pure functions so the shuffling can be reasoned about
// (and checked) without mounting the page.
// ─────────────────────────────────────────────────────────────────────────────
import { QUIZ_PER_ROUND, QUIZ_QUESTIONS, QUIZ_TITLES } from '../config'

/** Fisher-Yates on a copy. Never mutates the config array. */
function shuffled(list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Shuffles a question's options and follows the correct one to its new slot.
 *
 * The answer is tracked by identity rather than by re-finding the string,
 * because two options could in principle share text — re-finding would then
 * mark the wrong slot correct.
 */
function shuffleOptions(question) {
  const paired = question.options.map((option, i) => ({ option, correct: i === question.answer }))
  const mixed = shuffled(paired)
  return {
    ...question,
    options: mixed.map((p) => p.option),
    answer: mixed.findIndex((p) => p.correct),
  }
}

/**
 * One round: QUIZ_PER_ROUND questions drawn at random from the pool, each with
 * its options shuffled too — so a guest replaying can't coast on remembering
 * that the answer was "C" last time.
 *
 * Takes whatever the pool holds if it's smaller than a full round, so trimming
 * QUIZ_QUESTIONS can never produce a round padded with undefined.
 */
export function buildRound() {
  return shuffled(QUIZ_QUESTIONS).slice(0, QUIZ_PER_ROUND).map(shuffleOptions)
}

/** The rank a score earns. QUIZ_TITLES runs high -> low, so first match wins. */
export function titleFor(score) {
  return QUIZ_TITLES.find((t) => score >= t.min) ?? QUIZ_TITLES[QUIZ_TITLES.length - 1]
}
