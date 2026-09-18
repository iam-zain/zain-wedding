import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EXPLORE_DONE_MESSAGE, EXPLORE_TITLE, QUIZ_BEST_KEY, QUIZ_PER_ROUND } from '../config'
import { MORE_LINKS } from '../lib/tabs'
import { titleFor } from '../lib/quiz'
import { achievementList } from '../lib/achievements'
import { useAchievementCounts } from '../lib/useAchievementCounts'
import { useAchievements, useLocalStorage } from '../lib/storage'
import { haptic } from '../lib/haptics'
import { BookmarkIcon, ChevronRightIcon, QuizIcon, RsvpIcon, TrophyIcon, WishesIcon } from '../components/icons'

const LINK_ICONS = {
  rsvp: RsvpIcon,
  quiz: QuizIcon,
  saved: BookmarkIcon,
  wishes: WishesIcon,
}

/**
 * Centred detail sheet for one badge. Deliberately NOT EasterEggModal: that one
 * fires confetti, which would be a strange thing to celebrate when the guest
 * has just tapped a badge they haven't earned yet.
 */
function BadgeInfoModal({ badge, onClose }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const { unlocked, current, goal, emoji, title, how, message, color, unit } = badge

  return (
    <div
      data-testid={`badge-info-${badge.id}`}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xs rounded-2xl border bg-ig-elevated px-6 py-7 text-center shadow-2xl"
        style={{ borderColor: unlocked ? color : 'var(--color-ig-border)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-testid={`badge-info-${badge.id}-close`}
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-ig-muted transition-colors hover:bg-ig-border hover:text-ig-text"
        >
          ✕
        </button>

        <div className={`text-4xl ${unlocked ? '' : 'opacity-40 grayscale'}`}>{emoji}</div>
        <h3 className="mt-2 text-base font-semibold" style={{ color: unlocked ? color : undefined }}>
          {title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-ig-text">{unlocked ? message : how}</p>

        {!unlocked && goal > 0 && (
          <>
            <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-ig-card">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${(current / goal) * 100}%`, backgroundColor: color }}
              />
            </div>
            <p className="mt-2 text-xs tabular-nums text-ig-muted">
              {current} / {goal}{unit ? ` ${unit}` : ''}
            </p>
          </>
        )}

        <p className="mt-4 text-[10px] uppercase tracking-widest text-ig-muted">
          {unlocked ? '🏆 Unlocked' : '🔒 Abhi baaki hai'}
        </p>
      </div>
    </div>
  )
}

function BadgeCard({ badge, onOpen }) {
  const { unlocked, current, goal, emoji, title, how, color, unit } = badge
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        data-testid={`achievement-${badge.id}`}
        data-unlocked={unlocked ? 'true' : 'false'}
        className="h-full w-full rounded-2xl border p-3 text-left transition-transform active:scale-[0.97]"
        style={{
          borderColor: unlocked ? color : 'var(--color-ig-border)',
          // A soft wash of the badge's own colour once earned, so the shelf
          // reads as a row of trophies rather than a grid of grey boxes.
          background: unlocked
            ? `linear-gradient(145deg, ${color}2e, ${color}0d)`
            : 'var(--color-ig-card)',
          boxShadow: unlocked ? `0 0 18px ${color}26` : 'none',
        }}
      >
        <div className="flex items-baseline gap-2">
          <span aria-hidden="true" className={`text-lg leading-none ${unlocked ? '' : 'opacity-40 grayscale'}`}>
            {emoji}
          </span>
          <h4
            className={`text-sm font-semibold ${unlocked ? '' : 'text-ig-muted'}`}
            style={{ color: unlocked ? color : undefined }}
          >
            {title}
          </h4>
        </div>

        <p className="mt-1 text-[11px] leading-snug text-ig-muted">
          {/* Locked cards teach the guest how to earn it; earned ones pay off. */}
          {unlocked ? '🏆 Mil gaya!' : how}
        </p>

        {!unlocked && (
          <>
            <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-ig-elevated">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <p className="mt-1 text-[10px] tabular-nums text-ig-faint">
              {current} / {goal || '—'}{goal && unit ? ` ${unit}` : ''}
            </p>
          </>
        )}
      </button>
    </li>
  )
}

export default function MorePage() {
  const counts = useAchievementCounts()
  const { list: unlockedIds } = useAchievements()
  const badges = achievementList(counts, unlockedIds)
  const earned = badges.filter((b) => b.unlocked).length
  const achievedPct = badges.length > 0 ? Math.round((earned / badges.length) * 100) : 0
  const [openBadge, setOpenBadge] = useState(null)
  const [quizBest] = useLocalStorage(QUIZ_BEST_KEY, null)
  const rank = titleFor(typeof quizBest === 'number' ? quizBest : 0)
  const explored = counts.explored
  const explorePct = explored.total > 0 ? Math.round((explored.count / explored.total) * 100) : 0

  return (
    <div data-testid="more-page">
      <header className="sticky top-0 z-20 border-b border-ig-border bg-ig-black/90 backdrop-blur">
        <div className="flex h-12 items-center justify-center px-4">
          <span
            className="font-logo text-2xl leading-none text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg,#f7971e,#ed4956,#a855f7)', backgroundClip: 'text', WebkitBackgroundClip: 'text' }}
          >
            More
          </span>
        </div>
      </header>

      <nav className="px-4 pt-5">
        <ul className="space-y-2.5">
          {MORE_LINKS.map(({ id, to, icon, label, hint, from, via }) => {
            const Icon = LINK_ICONS[icon]
            return (
              <li key={id}>
                <Link
                  to={to}
                  onClick={() => haptic('tap')}
                  data-testid={`more-link-${id}`}
                  className="flex items-center gap-3 rounded-2xl border border-ig-border p-4 transition-transform active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${from}1f, ${via}14)` }}
                >
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: `linear-gradient(135deg, ${from}, ${via})` }}
                  >
                    {Icon ? <Icon size={21} /> : null}
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
        {/* The quiz rank sits above the badge grid rather than inside it: it's
            a title you hold, not a one-off unlock, and it can change. */}
        {quizBest !== null && (
          <div
            data-testid="quiz-title-card"
            className="mb-5 flex items-center gap-3 rounded-2xl border p-4"
            style={{
              borderColor: rank.color,
              background: `linear-gradient(135deg, ${rank.color}2e, ${rank.color}0d)`,
            }}
          >
            <span aria-hidden="true" className="text-3xl leading-none">{rank.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] uppercase tracking-widest text-ig-muted">
                Quiz ka title
              </span>
              <span className="block text-base font-semibold" style={{ color: rank.color }}>
                {rank.title}
              </span>
              <span className="mt-0.5 block text-[11px] text-ig-faint">
                Best {quizBest}/{QUIZ_PER_ROUND} · dobara khel ke badlo
              </span>
            </span>
            <Link
              to="/quiz"
              onClick={() => haptic('tap')}
              data-testid="quiz-title-play"
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white active:opacity-80"
              style={{ backgroundColor: rank.color }}
            >
              Khelo
            </Link>
          </div>
        )}

        {/* Explore meter — a summary of the badges directly below it, so it
            belongs here rather than competing for space on the profile. */}
        <div data-testid="explore-meter" className="mb-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">🧭 {EXPLORE_TITLE}</h3>
            <span className="text-xs tabular-nums text-ig-muted">{explorePct}%</span>
          </div>
          <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-ig-card">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${explorePct}%`,
                background: 'linear-gradient(90deg,#f472b6,#a855f7,#0095f6)',
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ig-faint">
            {explorePct === 100
              ? EXPLORE_DONE_MESSAGE
              : `${explored.count}/${explored.total} pages dekh liye — baaki bhi ghoom aao`}
          </p>
        </div>

        {/* Same shape as the explore meter above, so the two read as a pair. */}
        <div data-testid="achievements-meter">
          <div className="flex items-baseline justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <TrophyIcon size={18} style={{ color: '#f7971e' }} />
              Achievements
            </h3>
            <span className="text-xs tabular-nums text-ig-muted">
              {earned}/{badges.length} · {achievedPct}%
            </span>
          </div>
          <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-ig-card">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${achievedPct}%`,
                background: 'linear-gradient(90deg,#f7971e,#ed4956,#a855f7)',
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ig-faint">
            {earned === badges.length
              ? '🏆 Saare achievements mil gaye — aap champion ho!'
              : 'Tap karke dekho kaise milega 🤍'}
          </p>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {badges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} onOpen={() => { haptic('tap'); setOpenBadge(badge.id) }} />
          ))}
        </ul>
      </section>

      {/* Looked up rather than stored so the modal re-renders with live
          progress; the guard covers an id that's no longer in config. */}
      {openBadge && badges.some((b) => b.id === openBadge) && (
        <BadgeInfoModal
          badge={badges.find((b) => b.id === openBadge)}
          onClose={() => setOpenBadge(null)}
        />
      )}
    </div>
  )
}
