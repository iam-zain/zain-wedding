import { Link } from 'react-router-dom'
import { MORE_LINKS } from '../lib/tabs'
import { achievementList } from '../lib/achievements'
import { useAchievementCounts } from '../lib/useAchievementCounts'
import { useAchievements } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { ChevronRightIcon, QuizIcon, RsvpIcon, TrophyIcon, WishesIcon } from '../components/icons'

const LINK_ICONS = {
  rsvp: RsvpIcon,
  quiz: QuizIcon,
  wishes: WishesIcon,
}

function BadgeCard({ badge }) {
  const { unlocked, current, goal, emoji, title, message } = badge
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0

  return (
    <li
      data-testid={`achievement-${badge.id}`}
      data-unlocked={unlocked ? 'true' : 'false'}
      className={`rounded-2xl border p-3 transition-colors ${
        unlocked ? 'border-ig-blue/40 bg-ig-blue/10' : 'border-ig-border bg-ig-card'
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" className={`text-lg leading-none ${unlocked ? '' : 'grayscale opacity-40'}`}>
          {emoji}
        </span>
        <h4 className={`text-sm font-semibold ${unlocked ? '' : 'text-ig-muted'}`}>{title}</h4>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-ig-muted">
        {/* The full line is the reward for finishing — before that it'd spoil it. */}
        {unlocked ? message : `${current} / ${goal || '—'}`}
      </p>
      {!unlocked && (
        <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-ig-elevated">
          <div className="h-full rounded-full bg-wa transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  )
}

export default function MorePage() {
  const counts = useAchievementCounts()
  const { list: unlockedIds } = useAchievements()
  const badges = achievementList(counts, unlockedIds)
  const earned = badges.filter((b) => b.unlocked).length

  return (
    <div data-testid="more-page">
      <header className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
        <div className="flex h-12 items-center justify-center px-4">
          <span className="font-logo text-2xl leading-none">More</span>
        </div>
      </header>

      <nav className="px-4 pt-5">
        <ul className="space-y-2">
          {MORE_LINKS.map(({ id, to, icon, label, hint }) => {
            const Icon = LINK_ICONS[icon]
            return (
              <li key={id}>
                <Link
                  to={to}
                  onClick={() => haptic('tap')}
                  data-testid={`more-link-${id}`}
                  className="flex items-center gap-3 rounded-2xl border border-ig-border bg-ig-elevated p-4 active:opacity-80"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ig-card text-ig-text">
                    {Icon ? <Icon size={20} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-0.5 block truncate text-xs text-ig-muted">{hint}</span>
                  </span>
                  <ChevronRightIcon size={18} className="shrink-0 text-ig-faint" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <section data-testid="achievements-shelf" className="px-4 pb-8 pt-7">
        <div className="flex items-center gap-2">
          <TrophyIcon size={18} className="text-ig-muted" />
          <h3 className="text-sm font-semibold">Achievements</h3>
          <span className="text-xs text-ig-muted">
            {earned}/{badges.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ig-faint">Ghoomte raho — kuch na kuch khulta rahega 🤍</p>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </ul>
      </section>
    </div>
  )
}
