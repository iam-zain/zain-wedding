// Single source of truth for the bottom-nav tab order. Both the nav bar and
// the swipe gesture read this, so adding a tab here wires up both at once.
//
// Order matters: 'right' means "one tab further along this list" (and plays
// the slide-from-right animation), 'left' means one tab back.
export const TABS = [
  { id: 'feed', to: '/', label: 'Feed', end: true },
  { id: 'events', to: '/events', label: 'Events', end: false },
  { id: 'rsvp', to: '/rsvp', label: 'Confirm', end: false },
]

const PATHS = TABS.map((t) => t.to)

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
