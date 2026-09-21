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
import WeddingMaze from '../components/games/WeddingMaze'
import ChooseYours from '../components/games/ChooseYours'
import RingBox from '../components/games/RingBox'
import NikahPuzzle from '../components/games/NikahPuzzle'
import HeartConnect from '../components/games/HeartConnect'
import LetterScramble from '../components/games/LetterScramble'
import BrideOrGroom from '../components/games/BrideOrGroom'
import CrjExpress from '../components/games/CrjExpress'
import PackWaleema from '../components/games/PackWaleema'
import ShootHearts from '../components/games/ShootHearts'
import HoldHeart from '../components/games/HoldHeart'
import BuildBouquet from '../components/games/BuildBouquet'
import RingStack from '../components/games/RingStack'
import GiftRush from '../components/games/GiftRush'
import WeddingSpotter from '../components/games/WeddingSpotter'
import ArrangeNikah from '../components/games/ArrangeNikah'
import { useGameStats } from '../lib/games'
import { haptic } from '../lib/haptics'
import { ChevronRightIcon } from '../components/icons'

const GAMES = [
  { id: 'arrange', emoji: '📜', title: 'Arrange the Nikah', hint: 'Rasmein sahi tartib mein lagaiye', color: '#25d366', Comp: ArrangeNikah,
    best: (s) => (s.best.arrange != null ? `Best ${s.best.arrange}/8` : null) },
  { id: 'tap', emoji: '🎯', title: 'Baraat Reflex', hint: 'Uchhalti cheezon mein sahi wali dabaiye', color: '#0095f6', Comp: TapCorrect,
    best: (s) => (s.best.tap != null ? `Best ${s.best.tap} · kul ${s.quick} sahi tap` : null) },
  { id: 'brideorgroom', emoji: '👰', title: 'Bride or Groom?', hint: 'Dulhan ka, dulhe ka, ya dono ka? 😉', color: '#f472b6', Comp: BrideOrGroom,
    best: (s) => (s.best.brideorgroom != null ? `Best ${s.best.brideorgroom}/10` : null) },
  { id: 'bouquet', emoji: '💐', title: 'Build the Bouquet', hint: 'Order pe bouquet banaiye, ya apna', color: '#f472b6', Comp: BuildBouquet,
    best: (s) => (s.best.bouquet ? `Best ${s.best.bouquet} bouquet` : null) },
  { id: 'hidden', emoji: '👀', title: 'Chhupa Dil', hint: 'Bheed mein chhupa dil dhoondiye, sirf 5 second', color: '#a855f7', Comp: HiddenHeart,
    best: (s) => (s.hidden ? `${s.hidden} dil mile · fastest ${s.best.hidden}s` : null) },
  { id: 'ttt', emoji: '🤵', title: 'Choose Yours', hint: 'Zain 🤵 vs Uzma 👰, shaadi wale tic-tac-toe', color: '#0095f6', Comp: ChooseYours,
    best: () => null },
  { id: 'crj', emoji: '🚂', title: 'CRJ Wedding Express', hint: 'Switch badaliye, train ko shaadi tak pahunchaiye', color: '#f7971e', Comp: CrjExpress,
    best: (s) => (s.best.crj ? `Best ${s.best.crj} station` : null) },
  { id: 'shoot', emoji: '💘', title: "Cupid's Arrow", hint: 'Dil pe nishana, ☠️ se bachiye!', color: '#ed4956', Comp: ShootHearts,
    best: (s) => (s.best.shoot != null ? `Best ${s.best.shoot}` : null) },
  { id: 'catch', emoji: '💘', title: 'Dil Pakdo', hint: 'Dil pakdiye, 20 second mein 10 points', color: '#ff6b81', Comp: CatchHearts,
    best: (s) => (s.best.catch != null ? `Best ${s.best.catch} · ${s.hearts} dil pakde` : null) },
  { id: 'hold', emoji: '🫶', title: 'Dil Sambhalo', hint: 'Tokri se girte dil pakdiye', color: '#a855f7', Comp: HoldHeart,
    best: (s) => (s.best.hold != null ? `Best ${s.best.hold}` : null) },
  { id: 'puzzle', emoji: '🥰', title: 'Emoji Shaadi Puzzle', hint: 'Emoji padhiye, shaadi ki rasm pehchaniye', color: '#f7971e', Comp: EmojiPuzzle,
    best: (s) => (s.puzzles.length ? `${s.puzzles.length}/${PUZZLES.length} puzzles hal kiye` : null) },
  { id: 'connect', emoji: '💞', title: 'Heart Connect', hint: 'Ek jaise dil jodiye, lines na kaatein', color: '#ed4956', Comp: HeartConnect,
    best: (s) => (s.best.connect ? `Level ${s.best.connect} tak` : null) },
  { id: 'memory', emoji: '💗', title: 'Jodi Milao', hint: 'Jode milaiye, bina galti ke', color: '#25d366', Comp: HeartMemory,
    best: (s) => (s.best.memory != null ? `Best ${s.best.memory} chaal` : null) },
  { id: 'scramble', emoji: '💌', title: 'Love Letter Scramble', hint: 'Bikhre akshar, MUHABBAT banaiye', color: '#f472b6', Comp: LetterScramble,
    best: (s) => (s.best.scramble != null ? `Best ${s.best.scramble}/6` : null) },
  { id: 'love', emoji: '💞', title: 'Love-o-Meter', hint: 'Zain ❤️ Uzma, connection naapiye', color: '#a855f7', Comp: LoveMeter,
    best: (s) => (s.best.love != null ? `Best ${s.best.love}%${s.best.love === 100 ? ' ♾️' : ''}` : null) },
  { id: 'nikahpuzzle', emoji: '🧩', title: 'Nikah Puzzle', hint: 'Shaadi ki tasveer jodiye, 3×3 ya 4×4', color: '#a855f7', Comp: NikahPuzzle,
    best: (s) => (s.best.puzzle3 != null ? `3×3 best ${s.best.puzzle3}s` : null) },
  { id: 'pack', emoji: '🧳', title: 'Pack for the Waleema', hint: 'Belt se sahi saamaan uthaiye', color: '#0095f6', Comp: PackWaleema,
    best: (s) => (s.best.pack != null ? `Best ${s.best.pack}` : null) },
  { id: 'ring', emoji: '💍', title: 'Ring Catch', hint: 'Girti ring pakdiye, bomb se bachiye', color: '#f7971e', Comp: RingCatch,
    best: (s) => (s.best.ring != null ? `Best ${s.best.ring} · ${s.rings} rings` : null) },
  { id: 'ringbox', emoji: '🎁', title: 'Ring in the Box', hint: 'Dabbe ghoomenge, ring wale pakdiye', color: '#f7971e', Comp: RingBox,
    best: (s) => (s.best.ringbox ? `Best ${s.best.ringbox} round` : null) },
  { id: 'ringstack', emoji: '💍', title: 'Ring Stack', hint: 'Rings ko sahi order mein lagaiye', color: '#f5c518', Comp: RingStack,
    best: (s) => (s.best.ringstack ? `Best level ${s.best.ringstack}` : null) },
  { id: 'trueheart', emoji: '😳', title: "Sachha Dil", hint: 'Sirf sachha dil ❤️ dabaiye, 💔 se bachiye', color: '#ed4956', Comp: TrueHeart,
    best: (s) => (s.best.trueheart != null ? `Best ${s.best.trueheart} rounds · kul ${s.trueHeart}` : null) },
  { id: 'gift', emoji: '🎁', title: 'Tohfa Rush', hint: 'Tohfe sahi dabbe mein daaliye', color: '#f7971e', Comp: GiftRush,
    best: (s) => (s.best.gift != null ? `Best ${s.best.gift}` : null) },
  { id: 'match', emoji: '💕', title: 'Wedding Crush', hint: 'Teen milaiye, dil banaiye! 💖 Love Blast bhi', color: '#ff6b81', Comp: MatchThree,
    best: (s) => (s.best.match != null ? `Best ${s.best.match} points` : null) },
  { id: 'maze', emoji: '👰', title: 'Wedding Maze', hint: 'Ungli se rasta banaiye, dulhan ko dulhe tak', color: '#d4a64a', Comp: WeddingMaze,
    best: (s) => (s.best.maze ? `Best ${s.best.maze} maze paar` : null) },
  { id: 'spotter', emoji: '📸', title: 'Wedding Spotter', hint: 'Scene mein 7 cheezein dhoondiye', color: '#f7971e', Comp: WeddingSpotter,
    best: (s) => (s.best.spotter != null ? `Fastest ${s.best.spotter}s` : null) },
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
