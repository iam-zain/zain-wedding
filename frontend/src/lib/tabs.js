// Single source of truth for the bottom-nav tab order. Both the nav bar and
// the swipe gesture read this, so adding a tab here wires up both at once.
//
// Order matters: 'right' means "one tab further along this list" (and plays
// the slide-from-right animation), 'left' means one tab back.
// `color` is worn by the icon ONLY while its tab is active; the other two stay
// plain white, so the bar reads as "you are here" at a glance rather than as a
// row of competing colours.
export const TABS = [
  { id: 'feed', to: '/', label: 'Feed', end: true, color: '#ed4956' },
  { id: 'events', to: '/events', label: 'Events', end: false, color: '#f7971e' },
  { id: 'more', to: '/more', label: 'More', end: false, color: '#a855f7' },
]

/**
 * Entries on the options hub, alphabetical. The hub is the third tab, so new
 * destinations go here rather than widening the nav bar.
 *
 * `to` routes are deliberately NOT tabs: swiping between the feed and a
 * half-filled RSVP form would be a trap, so they're reached (and left) by tap.
 */
export const MORE_LINKS = [
  {
    id: 'rsvp',
    to: '/rsvp',
    icon: 'rsvp',
    label: 'Confirmation',
    hint: 'Aana confirm karo — kab aur kahan',
    // `from`/`to` drive the tile's gradient. Kept here with the entry so a new
    // destination arrives with its own colour rather than inheriting a default.
    from: '#25d366',
    via: '#0aa7a0',
  },
  {
    id: 'quiz',
    to: '/quiz',
    icon: 'quiz',
    label: 'Quiz',
    hint: 'Humein kitna jaante ho? Test karo',
    from: '#f7971e',
    via: '#ed4956',
  },
  {
    id: 'wishes',
    to: '/wishes',
    icon: 'wishes',
    label: 'Wishes',
    hint: 'Dua ya paigham chhod jao 🤍',
    from: '#a855f7',
    via: '#0095f6',
  },
]

const PATHS = TABS.map((t) => t.to)
const MORE_PATHS = MORE_LINKS.map((l) => l.to)

/**
 * True on a page that lives *under* the hub (/rsvp, /quiz, /wishes).
 *
 * Used only to keep the More tab lit while a guest is on one of its pages.
 * Deliberately separate from tabIndexFor: these routes must stay outside the
 * swipe order, so a half-filled RSVP form can't be swiped away by accident.
 */
export function isUnderMore(pathname) {
  return MORE_PATHS.includes(pathname)
}

/** Index of the tab a pathname belongs to, or -1 when it isn't a tab route. */
export function tabIndexFor(pathname) {
  return PATHS.indexOf(pathname)
}

/**
 * The tab a swipe should land on, or null when there's nowhere to go
 * (either end of the list, or a non-tab route like /psst).
 */
export function stepTo(pathname, dir) {
  const i = tabIndexFor(pathname)
  if (i === -1) return null
  const next = dir === 'right' ? i + 1 : i - 1
  return next >= 0 && next < PATHS.length ? PATHS[next] : null
}
