import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import CatchHearts from '../components/games/CatchHearts'
import RingCatch from '../components/games/RingCatch'
import HiddenHeart from '../components/games/HiddenHeart'
import HeartMemory from '../components/games/HeartMemory'
import { useGameStats } from '../lib/games'
import { haptic } from '../lib/haptics'
import { ChevronRightIcon } from '../components/icons'

const GAMES = [
  { id: 'catch', emoji: '💕', title: 'Catch the Hearts', hint: 'Dil pakdo — 20 second mein 10 points', color: '#ff6b81', Comp: CatchHearts,
    best: (s) => (s.best.catch != null ? `Best ${s.best.catch} · ${s.hearts} dil pakde` : null) },
  { id: 'ring', emoji: '💍', title: 'Ring Catch', hint: 'Girti ring pakdo, bomb se bacho', color: '#f7971e', Comp: RingCatch,
    best: (s) => (s.best.ring != null ? `Best ${s.best.ring} · ${s.rings} rings` : null) },
  { id: 'hidden', emoji: '👀', title: 'Find the Hidden Heart', hint: 'Bheed mein chhupa ek ❤️ dhoondo', color: '#a855f7', Comp: HiddenHeart,
    best: (s) => (s.hidden ? `${s.hidden} dil mile · fastest ${s.best.hidden}s` : null) },
  { id: 'memory', emoji: '💗', title: 'Heart Memory', hint: 'Jode milao — bina galti ke', color: '#25d366', Comp: HeartMemory,
    best: (s) => (s.best.memory != null ? `Best ${s.best.memory} chaal` : null) },
]

export default function GamesPage() {
  const [params, setParams] = useSearchParams()
  const stats = useGameStats()
  const game = GAMES.find((g) => g.id === params.get('g'))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [game])

  function open(id) {
    haptic('tap')
    setParams({ g: id })
  }

  return (
    <div data-testid="games-page">
      <BackHeader title={game ? game.title : 'Games'} linkId="games" to={game ? '/games' : '/more'} />

      {game ? (
        <div className="px-4 pb-10 pt-4" data-testid={`game-${game.id}`}>
          {/* key forces a fresh game when switching between them */}
          <game.Comp key={game.id} />
        </div>
      ) : (
        <ul className="space-y-2.5 px-4 pb-10 pt-5">
          {GAMES.map((g) => {
            const best = g.best(stats)
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => open(g.id)}
                  data-testid={`game-tile-${g.id}`}
                  className="flex w-full items-center gap-3 rounded-2xl border border-ig-border p-4 text-left transition-transform active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${g.color}24, ${g.color}0a)` }}
                >
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl"
                    style={{ background: `${g.color}33` }}
                  >
                    {g.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{g.title}</span>
                    <span className="mt-0.5 block text-xs text-ig-muted">{g.hint}</span>
                    {best && (
                      <span className="mt-1 block text-[11px] font-medium" style={{ color: g.color }}>
                        🏅 {best}
                      </span>
                    )}
                  </span>
                  <ChevronRightIcon size={18} className="shrink-0 text-ig-faint" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
