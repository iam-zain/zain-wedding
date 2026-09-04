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
  "🤫 Ye secret code-word hai: 'Harry porter ki pen' 🐙 — Isse Waleema mein ek special dish milega! ✨",
  "🎉 Mubarak ho! Aap officially Wedding Detective ban gaye hain. 🕵️",
  "🫣 Ab itna bhi mat tap karo... website sharma jayegi.",
  "🏅 Achievement Unlocked: Curious Guest (+100 XP)",
  "🤍 Har guest humare liye khaas hai... aur aap toh secret guest bhi nikle!",
  "😊 Agar aap yahan tak aa gaye hain, toh hum waqai aapko wedding mein dekhna chahte hain.",
  "🚂 Chittaranjan ka Railway Station code hai: CRJ. Ab quiz mein aa sakta hai. 😄",
]

/** Fun messages for the profile-stats tap easter egg. One is picked at random per stat. */
export const STAT_EASTER_EGGS = {
  posts: [
    "📸 Itne saare posts scroll kar liye — you deserve a virtual hug!",
    "Behind every post, ek chhota sa kissa hai. Thanks for reading them all 🤍",
  ],
  guests: [
    "🎉 Itne guests ke beech, tum ek khaas guest ho!",
    "The more the merrier — glad you're one of them 💫",
  ],
  families: [
    "👨‍👩‍👧‍👦 Do families, ek dil se jud rahi hain — welcome to it!",
    "Families jud rahi hain, aur tum is jashn ka hissa ho ✨",
  ],
}

/** Shown on a long-press of the profile avatar. One is picked at random. */
export const AVATAR_LONGPRESS_MESSAGES = [
  "🤍 Thoda ruk kar dekhne ke liye shukriya — dil se milte hain, waqt lagta hai.",
  "🎵 Music ke peeche ek chhota sa raaz bhi hai — dhoondte rehna!",
]

/** Shown on the feed brand logo after several rapid taps. */
export const LOGO_TAP_MESSAGE = "✨ Made with 🤍 for this big day — thanks for finding this!"

/** Comment secret word — case-insensitive substring match triggers a fun reply toast. */
export const COMMENT_EASTER_EGG = {
  word: 'shaadi mubarak',
  reply: '🎊 Aapko bhi shaadi mubarak — dhundne ke liye shukriya!',
}

/** Shown once per session when the app is opened on the wedding day itself. */
export const WEDDING_DAY_MESSAGE = { title: 'Aaj wohi din hai! 🎉', subtitle: 'See you at the wedding 🤍' }

/** Shown on a long-press inside the story viewer. One is picked at random. */
export const STORY_LONGPRESS_MESSAGES = [
  "🤍 Ruk gaye? Yeh moment bhi yaad rakhna.",
  "📸 Har story ke peeche ek pal hai — dekhne ke liye shukriya.",
]

/** Shown after a very hard/vigorous shake "breaks" and reassembles the UI. One is picked at random. */
export const CHAOS_EASTER_EGG_MESSAGES = [
  "😅 Relax, relax — the app's fine! Bas thoda mazaak tha.",
  "🫠 Panicked for a sec? Same. Sab kuch wapas normal hai.",
  "🔧 Kuch nahi tuta — bas test kar rahe the kitna zor se hila sakte ho.",
]

/** Type-anywhere secret words (checked outside form fields) + messages shown on a hit. */
export const TYPE_ANYWHERE_WORDS = ['nikah', 'nikaah', 'shaadi', 'wedding', 'marriage', 'waleema', 'walima']
export const TYPE_ANYWHERE_MESSAGES = [
  "🕌 Nikah ka zikr kiya aur website bhi khush ho gayi!",
  "💍 Shaadi ho ya waleema, jo bhi type karo — dil se yehi ek baat hai.",
  "🤍 Yeh lafz humein bhi pasand hai. Milte hain jashn mein!",
]

/**
 * Like-milestone rule: every multiple of 5 up to 500, then every 50 beyond
 * that (505 isn't one, 550 is). Message is a random template with the
 * number filled in, rather than one entry per number.
 */
export function isLikeMilestone(n) {
  if (!Number.isFinite(n) || n <= 0) return false
  if (n <= 500) return n % 5 === 0
  return (n - 500) % 50 === 0
}

const LIKE_MILESTONE_TEMPLATES = [
  "🎉 {n} likes! Aapke jaisa pyaar hi toh chahiye tha.",
  "💫 {n} likes — is post ne dil jeet liya!",
  "🤍 {n} logon ne pyaar dikhaya — shukriya!",
  "✨ {n} likes ho gaye — chhota sa milestone, bada sa shukriya!",
]

export function likeMilestoneMessage(n) {
  const template = LIKE_MILESTONE_TEMPLATES[Math.floor(Math.random() * LIKE_MILESTONE_TEMPLATES.length)]
  return template.replace('{n}', n.toLocaleString('en-IN'))
}

/** Shown when the feed is pulled well past the normal refresh threshold. */
export const PULL_REFRESH_EGG_MESSAGE = "🤍 Itna kheencho ge toh rishta ban jaayega! Chalo, dobara dekhte hain kya naya hai."

/** Shown at the very bottom of the feed, after the last post. */
export const FEED_END_MESSAGE = {
  title: "Bas itna hi tha... abhi ke liye 🤍",
  subtitle: "Baaki sab shaadi mein milte hain — tab tak scroll karte raho, hum kahin nahi ja rahe!",
}

/** Shown when a heart-shaped drag gesture is recognized anywhere on screen. */
export const HEART_GESTURE_MESSAGE = "❤️ Dil banaya aapne? Humein bhi mehsoos hua — shukriya itna pyaar dikhane ke liye."

/** Shown once per session after ~15s of no interaction. */
export const IDLE_EASTER_EGG_MESSAGE = "👀 Abhi bhi wahin ho? Hum bhi wahin hain, guest ka intezaar karte huye."

/** Shown once per session for visitors browsing very late at night. */
export const NIGHT_OWL_MESSAGE = "🌙 Itni raat ko bhi scroll kar rahe ho? Neend bhi zaroori hai — subah shaadi ki tayyari bhi toh karni hai!"

/** Shown once per session when the device battery is low and not charging. */
export const BATTERY_LOW_MESSAGE = "🔋 Battery kam hai — thodi charge kar lo, shaadi lambi chalegi!"

/** Printed to the browser console on app start — a little something for curious devs. */
export const CONSOLE_EASTER_EGG_MESSAGE = "Aap yahan tak dhundte huye aa gaye? Milte hain shaadi mein! 🎉"

/** Shown on a double-tap of the Nikah side of the events card. */
export const NIKAH_EGG_MESSAGE = "🕌 Nikah ke woh chand lamhe humesha yaad rahenge — jald milte hain!"

/** Shown on a tap of the Waleema side of the events card. */
export const WALEEMA_EGG_MESSAGE = "🎊 Waleema ki dawat mein maza hi kuch aur hoga — miss mat karna!"

// ── Access control ───────────────────────────────────────────────────────────
/** tierKey -> sharedSecret map baked into the bundle (intentional, deterrent only). */
export const ACCESS_TIERS = siteConfig.accessTiers || {}

/** Query param that carries a base64(tierKey:secret) unlock token. */
export const ACCESS_KEY_PARAM = 'key'

/** Tier 0 = visible to everyone, always considered unlocked. */
export const PUBLIC_TIER = 0
