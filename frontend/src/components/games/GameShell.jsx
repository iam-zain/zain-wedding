import Confetti from '../Confetti'

/** Score/time strip above a game's arena. */
export function GameStats({ items }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 text-sm">
      {items.map(([label, value, color]) => (
        <span key={label} className="rounded-full bg-ig-card px-3 py-1 tabular-nums">
          <span className="text-ig-muted">{label} </span>
          <span className="font-semibold" style={{ color }}>{value}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Start / game-over card laid over the arena. `win` fires a small confetti
 * burst (small on purpose, old phones).
 */
export function GameOverlay({ emoji, title, lines = [], button, onButton, win = false, color = '#ed4956' }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 px-6 text-center">
      {win && <Confetti count={60} />}
      <div className="text-5xl" style={{ animation: 'zu-pop 0.35s ease-out' }}>{emoji}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      {lines.filter(Boolean).map((l) => (
        <p key={l} className="mt-1 text-sm text-ig-muted">{l}</p>
      ))}
      <button
        type="button"
        onClick={onButton}
        data-testid="game-start"
        className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white active:opacity-80"
        style={{ backgroundColor: color }}
      >
        {button}
      </button>
    </div>
  )
}
