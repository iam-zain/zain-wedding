const COLORS = ['#0095f6', '#ed4956', '#feda75', '#25d366', '#962fbf', '#ffffff']

/** Fire-and-forget confetti burst. Mount it while an egg is active; unmount to clear. */
export default function Confetti({ count = 28 }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const delay = (i % 8) * 0.08
        const duration = 1.6 + (i % 5) * 0.15
        return (
          <span
            key={i}
            className="absolute block h-2.5 w-1.5 rounded-[1px]"
            style={{
              left: `${(i * 37) % 100}%`,
              top: '-5%',
              backgroundColor: COLORS[i % COLORS.length],
              animation: `confetti-fall ${duration}s ease-in ${delay}s forwards`,
            }}
          />
        )
      })}
    </div>
  )
}
