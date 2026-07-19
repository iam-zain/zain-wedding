const COLORS = ['#0095f6', '#ed4956', '#feda75', '#25d366', '#962fbf', '#ffffff']

/** Fire-and-forget confetti burst. Mount it while an egg is active; unmount to clear. */
export default function Confetti({ count = 200 }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const delay = (i % 10) * 0.09
        const duration = 2.2 + (i % 6) * 0.2
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
