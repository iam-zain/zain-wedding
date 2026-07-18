// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for all front-end configuration & tunables.
// Edit here — not scattered across components.
// ─────────────────────────────────────────────────────────────────────────────
import siteConfig from '@config/site.json'

// Pick one avatar per page load from `profile.avatarUrls` — gives returning
// guests a fresh look each visit. No persistence needed; re-picking the same
// one on a later refresh is fine.
const AVATAR_FALLBACK = '/assets/avatars/avatar-1.png'
const avatarUrls = siteConfig.profile?.avatarUrls
siteConfig.profile.avatarUrl =
  Array.isArray(avatarUrls) && avatarUrls.length > 0
    ? avatarUrls[Math.floor(Math.random() * avatarUrls.length)]
    : AVATAR_FALLBACK

export { siteConfig }

// ── Tunables ────────────────────────────────────────────────────────────────
/** Max comments shown/allowed per post (UI disables submit at this count). */
export const MAX_COMMENTS_PER_POST = 25

/** Comment text length cap (client-side; server also validates). */
export const MAX_COMMENT_LENGTH = 500

// ── Endpoints ────────────────────────────────────────────────────────────────
/** HTTP API base (no trailing slash). Empty => LOCAL mode (offline-friendly). */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

/** x-api-key sent on write endpoints. */
export const API_KEY = import.meta.env.VITE_API_KEY || ''

/** Where posts.json / stories.json + images live. */
export const DATA_BASE_URL = (import.meta.env.VITE_DATA_BASE_URL || '/data').replace(/\/$/, '')

/** True when no real API is configured — likes/comments fall back to localStorage. */
export const LOCAL_MODE = API_BASE_URL === ''

/** Canonical URL shared via the Web Share API. */
export const SITE_URL =
  import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')

// ── Easter egg ───────────────────────────────────────────────────────────────
/** Secret messages shown on the countdown treasure hunt. One is picked at random. */
export const SECRET_MESSAGES = [
  "🤫 ye secret code-word hai: 'Harry porter ki pen' 🐙 — Isse Walima mein ek special dish milega! ✨",
  "Shhh… the secret is out: love is in the air ✨",
  "5 taps? Impressive. You clearly care. See you at the wedding 💍",
  "A treasure hunter AND a wedding guest? You're invited twice 🎊",
  "This message will self-destruct… just kidding. But come to the wedding!",
]

// ── Access control ───────────────────────────────────────────────────────────
/** tierKey -> sharedSecret map baked into the bundle (intentional, deterrent only). */
export const ACCESS_TIERS = siteConfig.accessTiers || {}

/** Query param that carries a base64(tierKey:secret) unlock token. */
export const ACCESS_KEY_PARAM = 'key'

/** Tier 0 = visible to everyone, always considered unlocked. */
export const PUBLIC_TIER = 0
