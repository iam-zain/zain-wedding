// Tiny synthesized sound effects — no audio assets needed, zero bundle cost.
let ctx

/** Plays a short happy 3-note chime. Silently no-ops if Web Audio is unavailable. */
export function playChime() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99] // C5 · E5 · G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ctx.currentTime + i * 0.09
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
  } catch {
    // Web Audio unsupported — visual-only egg still works
  }
}

/** Plays a short descending "uh-oh" glitch tone — used by the chaos easter egg. */
export function playGlitch() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    const start = ctx.currentTime
    osc.frequency.setValueAtTime(600, start)
    osc.frequency.exponentialRampToValueAtTime(80, start + 0.5)
    gain.gain.setValueAtTime(0.12, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.6)
  } catch {
    // Web Audio unsupported — visual-only egg still works
  }
}
