import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BackHeader from '../components/BackHeader'
import CatchHearts from '../components/games/CatchHearts'
import RingCatch from '../components/games/RingCatch'
import HiddenHeart from '../components/games/HiddenHeart'
import HeartMemory from '../components/games/HeartMemory'
import MatchThree from '../components/games/MatchThree'
import TrueHeart from '../components/games/TrueHeart'
import LoveMeter from '../components/games/LoveMeter'
import EmojiPuzzle, { PUZZLES } from '../components/games/EmojiPuzzle'
import TapCorrect from '../components/games/TapCorrect'
import { useGameStats } from '../lib/games'
import { haptic } from '../lib/haptics'
import { ChevronRightIcon } from '../components/icons'

const GAMES = [
  { id: 'catch', emoji: '💘', title: 'Catch the Hearts', hint: 'Dil pakdo — 20 second mein 10 points', color: '#ff6b81', Comp: CatchHearts,
    best: (s) => (s.best.catch != null ? `Best ${s.best.catch} · ${s.hearts} dil pakde` : null) },
  { id: 'trueheart', emoji: '😳', title: "Don't Tap the Wrong Heart", hint: 'Sirf sachha dil ❤️ dabao — 💔 se bacho', color: '#ed4956', Comp: TrueHeart,
    best: (s) => (s.best.trueheart != null ? `Best ${s.best.trueheart} rounds · kul ${s.trueHeart}` : null) },
  { id: 'puzzle', emoji: '🥰', title: 'Emoji Love Puzzle', hint: 'Emoji padho, shaadi ki rasm pehchano', color: '#f7971e', Comp: EmojiPuzzle,
    best: (s) => (s.puzzles.length ? `${s.puzzles.length}/${PUZZLES.length} puzzles hal kiye` : null) },
  { id: 'hidden', emoji: '👀', title: 'Find the Hidden Heart', hint: 'Bheed mein chhupa dil dhoondo — sirf 5 second', color: '#a855f7', Comp: HiddenHeart,
    best: (s) => (s.hidden ? `${s.hidden} dil mile · fastest ${s.best.hidden}s` : null) },
  { id: 'memory', emoji: '💗', title: 'Heart Memory', hint: 'Jode milao — bina galti ke', color: '#25d366', Comp: HeartMemory,
    best: (s) => (s.best.memory != null ? `Best ${s.best.memory} chaal` : null) },
  { id: 'love', emoji: '💞', title: 'Love-o-Meter', hint: 'Zain ❤️ Uzma — connection naapo', color: '#a855f7', Comp: LoveMeter,
    best: (s) => (s.best.love != null ? `Best ${s.best.love}%${s.best.love === 100 ? ' ♾️' : ''}` : null) },
  { id: 'ring', emoji: '💍', title: 'Ring Catch', hint: 'Girti ring pakdo, bomb se bacho', color: '#f7971e', Comp: RingCatch,
    best: (s) => (s.best.ring != null ? `Best ${s.best.ring} · ${s.rings} rings` : null) },
  { id: 'tap', emoji: '🎯', title: 'Tap the Correct One', hint: 'Uchhalti cheezon mein sahi wali dabao', color: '#0095f6', Comp: TapCorrect,
    best: (s) => (s.best.tap != null ? `Best ${s.best.tap} · kul ${s.quick} sahi tap` : null) },
  { id: 'match', emoji: '💕', title: 'Wedding Crush', hint: 'Teen milao, dil banao! 💖 Love Blast bhi', color: '#ff6b81', Comp: MatchThree,
    best: (s) => (s.best.match != null ? `Best ${s.best.match} points` : null) },
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
