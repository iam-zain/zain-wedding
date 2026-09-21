// ─────────────────────────────────────────────────────────────────────────────
// Haptic feedback. `navigator.vibrate` is an Android/Chrome API, iOS Safari
// has never supported it, so roughly half the guests get nothing. Every call
// is therefore best-effort decoration: never await it, never branch on it, and
// never let it throw (some browsers expose the method but reject the call when
// the page hasn't been interacted with yet).
// ─────────────────────────────────────────────────────────────────────────────

// Durations in ms. A single number is one buzz; an array alternates
// vibrate/pause/vibrate, so [12, 40, 18] is two taps with a gap between.
const PATTERNS = {
  tap: 10, // any ordinary button press
  like: [12, 40, 18], // the double-beat of a heart
  unlike: 8,
  story: 6, // advancing a story, must stay subtle, it fires a lot
  success: [10, 60, 10, 60, 24], // RSVP saved, quiz finished
  achievement: [14, 50, 14, 50, 30], // something was unlocked
  warn: [24, 40, 24],
}

/**
 * Fires a named haptic pattern. Unknown names fall back to `tap` so a typo
 * degrades to a buzz rather than silence.
 */
export function haptic(kind = 'tap') {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    // Guests who asked the OS for less animation get no buzzing either, the
    // two settings travel together for people sensitive to either.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    navigator.vibrate(PATTERNS[kind] ?? PATTERNS.tap)
  } catch {
    // Unsupported, blocked by permissions policy, or called before any user
    // gesture, all of them mean "no haptics", which is never an error here.
  }
}
