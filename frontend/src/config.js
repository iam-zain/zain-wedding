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

/** Shown once per session after ~25s of no interaction. One picked at random. */
export const IDLE_EASTER_EGG_MESSAGES = [
  "👀 Abhi bhi wahin ho? Hum bhi wahin hain, guest ka intezaar karte huye.",
  "🤍 Thoda scroll karo, kahin kuch chhoot na jaye!",
  "😴 Neend aa rahi hai kya? Utho, shaadi ki taiyari abhi baaki hai!",
  "🎉 Ruk kyun gaye? Aage bhi bahut kuch dekhna baaki hai!",
  "🫠 Screen ko itni der ghoor rahe ho... hum bhi thoda sharma gaye.",
]

/** Shown once per session for visitors browsing very late at night. */
export const NIGHT_OWL_MESSAGE = "🌙 Itni raat ko bhi scroll kar rahe ho? Neend bhi zaroori hai — subah shaadi ki tayyari bhi toh karni hai!"

/** Shown once per session when the device battery is low and not charging. */
export const BATTERY_LOW_MESSAGE = "🔋 Battery kam hai — thodi charge kar lo, shaadi lambi chalegi!"

/** Printed to the browser console on app start — a little something for curious devs. */
export const CONSOLE_EASTER_EGG_MESSAGE = "Aap yahan tak dhundte huye aa gaye? Milte hain shaadi mein! 🎉"

/** Shown inline on the Nikah side of the events card for 5s on a double-tap. One picked at random. */
export const NIKAH_EGG_MESSAGES = [
  "🕌 Nikah ke woh chand lamhe humesha yaad rahenge — jald milte hain!",
  "💍 Do dilon ki ek kahani shuru hone wali hai — Nikah ka intezaar hai!",
  "🤍 Nikah ki barkat sab par ho — aap zaroor aana!",
  "📖 Ijab-o-qubool ka woh pal — sabse khaas lamha hoga.",
]

/** Shown inline on the Waleema side of the events card for 5s on a tap. One picked at random. */
export const WALEEMA_EGG_MESSAGES = [
  "🎊 Waleema ki dawat mein maza hi kuch aur hoga — miss mat karna!",
  "🍽️ Khaane ka poora intezaam hai — bas aap aa jao!",
  "✨ Waleema wali raat khaas hogi — saath mein manaate hain!",
  "🎶 Gaana-bajana, khaana aur ek yaadgaar shaam — Waleema mein zaroor aana!",
]

/** Shown once when the device loses its connection. */
export const OFFLINE_MESSAGE = "📴 Network gaya, par pyaar nahi 🤍 Jo dekh chuke ho woh yahin hai."

/** Shown once when the connection comes back. */
export const ONLINE_MESSAGE = "📶 Network wapas aa gaya — chalo, aage dekhte hain!"

/** Shown once per session when the device is plugged in and charging. */
export const BATTERY_CHARGING_MESSAGE = "🔌 Charge ho raha hai? Ab toh poori raat scroll karo!"

/** Shown when a screenshot is (heuristically) detected. */
export const SCREENSHOT_MESSAGE = "📸 Screenshot le liya? Humein bhi bhej do — group mein daal dena!"

/** Shown the first time the phone is turned sideways. */
export const LANDSCAPE_MESSAGE = "🔄 Phone ghuma diya! Ab tasveerein aur badi lagengi — maza aayega."

/** Shown when a guest pinch-zooms a post photo. One picked at random. */
export const PINCH_ZOOM_MESSAGES = [
  "🤍 Itna zoom mat karo, sab kuch dil se dikhta hai!",
  "🔍 Itna paas se dekh rahe ho? Nazar na lag jaaye!",
  "👀 Zoom karke kya dhoond rahe ho? Hum toh saamne hi hain!",
]

// ── Story replies ────────────────────────────────────────────────────────────
/** Quick-reaction emoji on the story viewer, Instagram-style. */
export const STORY_REACTIONS = ['❤️', '🔥', '😂', '🥹', '👏', '🤍']

export const STORY_REPLY_THANKS = '💬 Reply mil gaya — shukriya!'

// ── Quiz ─────────────────────────────────────────────────────────────────────
/**
 * "How well do you know us" questions. Scored entirely on the device — no
 * backend, no submission, nothing stored beyond the best score below.
 *
 * Every answer here is drawn from the `events` block in config/site.json, so
 * these two MUST be kept in step: change a date, venue or dress code there and
 * the matching question here goes stale. (Same arrangement as the RSVP_*
 * windows, which are mirrored between config.js and the rsvp Lambda.)
 *
 * `answer` is an index into `options`.
 */
export const QUIZ_QUESTIONS = [
  // ── Dates & days ───────────────────────────────────────────────────────────
  {
    id: 'nikah-date',
    question: 'Nikah kis din hai?',
    options: ['26 October 2026', '27 October 2026', '28 October 2026', '30 October 2026'],
    answer: 2,
  },
  {
    id: 'nikah-weekday',
    question: 'Nikah hafte ke kis din padta hai?',
    options: ['Monday', 'Wednesday', 'Friday', 'Sunday'],
    answer: 1,
  },
  {
    id: 'haldi-date',
    question: 'Haldi kis taareekh ko hai?',
    options: ['24 October', '26 October', '28 October', '30 October'],
    answer: 1,
  },
  {
    id: 'walima-date',
    question: 'Walima kis taareekh ko hai?',
    options: ['27 October', '28 October', '29 October', '30 October'],
    answer: 3,
  },
  {
    id: 'mehendi-weekday',
    question: 'Mehendi kis din hai?',
    options: ['Monday', 'Tuesday', 'Thursday', 'Saturday'],
    answer: 1,
  },
  {
    id: 'event-time',
    question: 'Saare functions kitne baje shuru hote hain?',
    options: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'],
    answer: 2,
  },
  {
    id: 'rest-day',
    question: '29 October ko kaunsa function hai?',
    options: ['Walima', 'Mehendi', 'Koi nahi — aaram ka din', 'Haldi'],
    answer: 2,
  },
  {
    id: 'nikah-walima-gap',
    question: 'Nikah aur Walima ke beech kitne din ka gap hai?',
    options: ['1 din', '2 din', '3 din', 'Usi din'],
    answer: 1,
  },
  {
    id: 'wedding-month',
    question: 'Shaadi kis mahine mein hai?',
    options: ['September 2026', 'October 2026', 'November 2026', 'December 2026'],
    answer: 1,
  },

  // ── Order ──────────────────────────────────────────────────────────────────
  {
    id: 'first-event',
    question: 'Sabse pehla function kaunsa hai?',
    options: ['Haldi', 'Mehendi', 'Nikah', 'Walima'],
    answer: 0,
  },
  {
    id: 'last-event',
    question: 'Sabse aakhri function kaunsa hai?',
    options: ['Haldi', 'Mehendi', 'Nikah', 'Walima'],
    answer: 3,
  },
  {
    id: 'event-count',
    question: 'Kitne events hain is shaadi mein?',
    options: ['2', '3', '4', '5'],
    answer: 2,
  },

  // ── Places ─────────────────────────────────────────────────────────────────
  {
    id: 'nikah-place',
    question: 'Nikah kahan ho raha hai?',
    options: ['Chittaranjan', 'Gaya, Bihar', 'Lucknow', 'Patna'],
    answer: 1,
  },
  {
    id: 'walima-place',
    question: 'Walima kahan hoga?',
    options: ['Gaya, Bihar', 'Area-8, Chittaranjan', 'Dhanbad', 'Asansol'],
    answer: 1,
  },
  {
    id: 'mehendi-place',
    question: 'Mehendi kahan hai?',
    options: ['Gaya, Bihar', 'Chittaranjan', 'Kolkata', 'Ranchi'],
    answer: 1,
  },
  {
    id: 'gaya-event',
    question: 'Gaya mein kaunsa function hai?',
    options: ['Haldi', 'Mehendi', 'Nikah', 'Walima'],
    answer: 2,
  },
  {
    id: 'chittaranjan-count',
    question: 'Chittaranjan mein kitne functions hain?',
    options: ['1', '2', '3', '4'],
    answer: 2,
  },

  // ── Dress codes ────────────────────────────────────────────────────────────
  {
    id: 'haldi-dress',
    question: 'Haldi ka dress code kya hai?',
    options: ['Pista Green', 'Yellow, Mustard', 'Rose Gold', 'Plum, Deep Teal'],
    answer: 1,
  },
  {
    id: 'mehendi-dress',
    question: 'Mehendi ke liye kaunsa rang?',
    options: ['Pista Green / Floral', 'Beige Cream', 'Grey, Black', 'Yellow, Mustard'],
    answer: 0,
  },
  {
    id: 'nikah-dress-men',
    question: 'Nikah mein men ka dress code?',
    options: ['Grey, Black', 'Beige Cream', 'Pista Green', 'Rose Gold'],
    answer: 1,
  },
  {
    id: 'nikah-dress-women',
    question: 'Nikah mein women ka dress code?',
    options: ['Rose Gold', 'Plum, Deep Teal', 'Yellow, Mustard', 'Pista Green'],
    answer: 0,
  },
  {
    id: 'walima-dress',
    question: 'Walima mein women ka dress code?',
    options: ['Rose Gold', 'Yellow, Mustard', 'Plum, Deep Teal', 'Pista Green'],
    answer: 2,
  },
  {
    id: 'walima-dress-men',
    question: 'Walima mein men ka dress code?',
    options: ['Beige Cream', 'Grey, Black', 'Yellow, Mustard', 'Rose Gold'],
    answer: 1,
  },

  // ── This site ──────────────────────────────────────────────────────────────
  {
    id: 'hashtag',
    question: 'Shaadi ka hashtag kya hai?',
    options: [
      '#ZainAurUzmaKiShaadi',
      '#ZainWedsUzma2026',
      '#UzmaAurZain',
      '#ZainUzmaForever',
    ],
    answer: 0,
  },
  {
    id: 'handle',
    question: 'Is page ka username kya hai?',
    options: ['@zain.weds.uzma', '@uzma.weds.zain', '@zainuzma2026', '@zain.uzma.shaadi'],
    answer: 0,
  },
]

/** How many questions one round pulls from the pool above. */
export const QUIZ_PER_ROUND = 5

/**
 * Rank earned by a round's score. `min` is the lowest score that earns it, and
 * the list runs high -> low so the first match wins.
 *
 * The title is kept alongside the badges on the More page, so it reads as
 * something you hold rather than something you saw once on a results screen.
 */
export const QUIZ_TITLES = [
  {
    min: 5,
    emoji: '🏆',
    title: 'Ghar ka aadmi',
    color: '#f7971e',
    message: 'Paanch ke paanch sahi! Aap toh ghar ke hi nikle 🤍',
  },
  {
    min: 4,
    emoji: '🎉',
    title: 'Pakka wala dost',
    color: '#a855f7',
    message: 'Chaar sahi — aap dhyan se sab padhte ho!',
  },
  {
    min: 3,
    emoji: '🙂',
    title: 'Acche padosi',
    color: '#0095f6',
    message: 'Teen sahi. Thoda aur Events page dekh lo!',
  },
  {
    min: 2,
    emoji: '😅',
    title: 'Door ke rishtedaar',
    color: '#25d366',
    message: 'Do sahi — shaadi mein milke sab seekh lenge!',
  },
  {
    min: 0,
    emoji: '🫣',
    title: 'Shaadi mein naye ho?',
    color: '#ed4956',
    message: 'Koi baat nahi — Events page pe sab likha hai, dobara try karo!',
  },
]

export const QUIZ_BEST_KEY = 'quizBest'

// ── Wishes wall ──────────────────────────────────────────────────────────────
/**
 * Synthetic post ids the wishes wall is stored under.
 *
 * The deployed comment API caps each post at MAX_COMMENTS_PER_POST (25), so a
 * single bucket would reject the 26th guest. Spreading across shards lifts the
 * ceiling to shards x 25 without touching the backend. Shards fill strictly in
 * order, which is what lets the reader stop at the first non-full one.
 *
 * Only ever APPEND to this list — removing or reordering an id orphans every
 * wish already stored under it.
 */
export const WISHES_SHARDS = [
  'wishes-1',
  'wishes-2',
  'wishes-3',
  'wishes-4',
  'wishes-5',
  'wishes-6',
]

export const WISHES_EMPTY_MESSAGE = 'Abhi tak koi paigham nahi — pehla aap likho 🤍'
export const WISHES_FULL_MESSAGE = 'Wishes wall bhar gayi 🙏 Itna pyaar dene ke liye shukriya!'
export const WISHES_THANKS_MESSAGE = '🤍 Shukriya! Aapka paigham humesha yaad rahega.'

// ── Achievements ─────────────────────────────────────────────────────────────
/**
 * Unlockable badges. `metric` names the counter the engine feeds in and `goal`
 * is either a number or 'all' (meaning "every item that exists right now").
 * Order is the order they appear on the badge shelf.
 */
export const ACHIEVEMENTS = [
  {
    id: 'like-1',
    metric: 'likes',
    goal: 1,
    emoji: '💗',
    color: '#ff6b81',
    title: 'Pehla dil',
    how: 'Kisi ek post pe dil dabao',
    message: 'Pehla dil aapka! Bas yahin se sab shuru hota hai 🤍',
  },
  {
    id: 'like-3',
    metric: 'likes',
    goal: 3,
    emoji: '❤️',
    color: '#ed4956',
    title: 'Teen dil',
    how: 'Teen alag posts ko like karo',
    message: 'Teen posts ko dil de diya — shuruaat acchi hai!',
  },
  {
    id: 'like-all',
    metric: 'likes',
    goal: 'all',
    emoji: '💘',
    color: '#f0568c',
    title: 'Dil hi dil mein',
    how: 'Feed ki har post ko like karo',
    message: 'Har ek post ko dil diya! Aap toh sachche fan nikle 🤍',
  },
  {
    id: 'comment-5',
    metric: 'comments',
    goal: 5,
    emoji: '💬',
    color: '#0095f6',
    title: 'Baatuni',
    how: 'Paanch alag posts pe comment karo',
    message: 'Paanch posts pe comment! Aapse baat karke accha laga.',
  },
  {
    id: 'comment-all',
    metric: 'comments',
    goal: 'all',
    emoji: '🗣️',
    color: '#00b8d4',
    title: 'Har baat pe haazir',
    how: 'Har post pe ek comment chhod jao',
    message: 'Har post pe kuch na kuch kaha — kamaal ho aap!',
  },
  {
    id: 'stories-all',
    metric: 'stories',
    goal: 'all',
    emoji: '👀',
    color: '#a855f7',
    title: 'Sab dekh liya',
    how: 'Upar ki saari stories khol ke dekho',
    message: 'Saari stories dekh daali — ek bhi nahi chhodi!',
  },
  {
    id: 'music-all',
    metric: 'tracks',
    goal: 'all',
    emoji: '🎧',
    color: '#25d366',
    title: 'Poora DJ',
    how: 'Profile photo tap karke saare gaane suno',
    message: 'Saare gaane sun liye! Shaadi ki playlist aapke hawale.',
  },
  {
    // Rides the same count/total engine: `count` is the best round score and
    // `total` is QUIZ_PER_ROUND, so a perfect round satisfies an 'all' goal.
    id: 'quiz-perfect',
    metric: 'quiz',
    goal: 'all',
    emoji: '🧠',
    color: '#f7971e',
    title: 'Quiz champion',
    how: 'Quiz mein paanch ke paanch sahi karo',
    message: 'Poora quiz sahi! Humse zyada toh aap jaante ho 🤍',
  },
]

/** Toast shown the moment a badge unlocks. */
export const ACHIEVEMENT_UNLOCK_PREFIX = '🏆 Unlocked'

/** Day-counts (until an event) that trigger a milestone banner. 0 = the event's own day. */
export const MILESTONE_DAYS = [50, 30, 20, 14, 10, 7, 3, 2, 1, 0]

/** Builds a milestone message for a given event label/emoji and days remaining. */
export function eventMilestoneMessage(label, emoji, days) {
  if (days === 0) return `${emoji} Aaj ${label} hai! Milte hain wahin 🎉`
  if (days === 1) return `${emoji} Kal ${label} hai — bas ek raat aur!`
  if (days === 2) return `${emoji} 2 din baaki hain ${label} ke liye!`
  if (days === 3) return `${emoji} Sirf 3 din baaki — taiyari shuru karo!`
  if (days === 7) return `${emoji} 1 hafta baaki hai ${label} ke liye! 🎊`
  if (days === 14) return `${emoji} 2 hafte baaki hain ${label} ke liye!`
  return `${emoji} ${days} din baaki hain ${label} ke liye!`
}

/** Badge shown on the post with the most likes_base among currently visible posts. */
export const MOST_LOVED_LABEL = 'Fan favorite'

// ── Access control ───────────────────────────────────────────────────────────
/** tierKey -> sharedSecret map baked into the bundle (intentional, deterrent only). */
export const ACCESS_TIERS = siteConfig.accessTiers || {}

/** Query param that carries a base64(tierKey:secret) unlock token. */
export const ACCESS_KEY_PARAM = 'key'

/** Tier 0 = visible to everyone, always considered unlocked. */
export const PUBLIC_TIER = 0

/** Rotating one-liners on the launch splash. One shown every ~1.4s, in order. */
export const SPLASH_MESSAGES = [
  "🎩 Dulhe ko sherwani pehnaayi jaa rahi hai…",
  "💃 Nachne walon ko warm-up karwa rahe hain…",
  "🍢 Kebab ginti ho rahi hai… 3 aur mile!",
  "📸 Photographer ko dhoondh rahe hain…",
  "💐 Phoolon ka rate negotiate ho raha hai…",
  "🎵 Band waale ko address bhej rahe hain…",
  "🧿 Nazar utaari jaa rahi hai…",
  "🚗 Baaraat GPS pe daali jaa rahi hai…",
  "☕ Chachu ko chai di jaa rahi hai…",
  "🤍 Bas do minute… matlab do second!",
]

// ── Guest confirmation (RSVP) ────────────────────────────────────────────────
/** The only two places guests arrive at / leave from — everything runs between them. */
export const RSVP_LOCATIONS = [
  { id: 'chittaranjan', name: 'Chittaranjan', emoji: '🚉', hint: 'Haldi • Mehendi • Walima' },
  { id: 'gaya', name: 'Gaya', emoji: '🕌', hint: 'Nikah' },
]

/** Inclusive date windows (YYYY-MM-DD) guests may pick from. */
export const RSVP_ARRIVAL_WINDOW = { start: '2026-10-24', end: '2026-10-30' }
export const RSVP_DEPARTURE_WINDOW = { start: '2026-10-28', end: '2026-11-03' }

/** Pre-filled time so a guest only has to adjust it, never type it from scratch. */
export const RSVP_DEFAULT_TIME = '12:00'

/** Contact number: Indian national format — 10 digits starting 6-9. */
export const RSVP_DIAL_CODE = '+91'
export const RSVP_PHONE_DIGITS = 10

/** True for a plausible Indian mobile number (digits only, no dial code). */
export function isValidPhone(digits) {
  return /^[6-9]\d{9}$/.test(String(digits || ''))
}
