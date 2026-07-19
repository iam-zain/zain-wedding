# zain-wedding 💍

An Instagram-inspired wedding website (SPA) for **Zain & Uzma**. Dark mode only,
Hinglish, built for ~100 guests checking in a few times a day.

## Live URLs

| What | URL |
|---|---|
| Guest site | https://zain-wedding.pages.dev |
| Admin console | https://d1py21cjb1vbrh.cloudfront.net/admin/index.html |
| API | https://5dqmacd38g.execute-api.ap-south-1.amazonaws.com |
| CDN (media + data) | https://d1py21cjb1vbrh.cloudfront.net |

## Monorepo layout

```
/
├── frontend/          # React + Vite + Tailwind v4 SPA (guest-facing app)
├── admin/             # Standalone admin HTML portal (vanilla JS, served via CloudFront)
├── backend/           # Lambda handlers (Node.js 24)
├── cdk/               # AWS CDK (TypeScript) — all AWS infra
├── config/            # site.json — build-time FE config (single source of truth)
└── .github/workflows/ # CI/CD → Cloudflare Pages (auto-deploys on push to main)
```

## Frontend — quick start

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

The app runs **fully offline-capable in LOCAL mode** out of the box:

- Content is read from `frontend/public/data/{posts,stories}.json` (mock data with
  self-contained SVG images under `public/data/img/`).
- With `VITE_API_BASE_URL` unset, likes/comments fall back to `localStorage` so the
  app is fully demoable with no backend. Copy `.env.example` → `.env.local` and set
  the API vars to talk to the real AWS backend.

### Frontend env vars (`.env.local` for local dev)

```
VITE_API_BASE_URL=https://5dqmacd38g.execute-api.ap-south-1.amazonaws.com
VITE_API_KEY=<writeApiKey from root .env.local>
VITE_DATA_BASE_URL=https://d1py21cjb1vbrh.cloudfront.net
VITE_SITE_URL=https://zain-wedding.pages.dev
```

### Configuration

- **`config/site.json`** — profile, wedding date, events, menu links, access-tier
  secrets. Baked into the bundle at build time. Edit this for real wedding details.
- **`frontend/src/config.js`** — all FE tunables in one place (max comments, endpoints,
  data URL). Imported everywhere. Also derives a couple of computed values from
  `site.json` at load time (e.g. the random avatar pick below) so components never
  need to know about that logic.

## Housekeeping — day-to-day content changes

Everything below is edited straight in the repo; no code changes needed. After
editing, `npm run dev` picks it up on save (or redeploy for the live site).

### Events & dress codes

Edit the `events` array in **`config/site.json`**. Each event is:

```json
{
  "id": "haldi",
  "name": "Haldi",
  "emoji": "🌻",
  "date": "2026-10-26T19:00:00+05:30",
  "venue": "Chittaranjan",
  "mapUrl": "https://maps.app.goo.gl/...",
  "dresscode": "Yellow, Mustard",
  "dresscodeImage": "/assets/dresscode/haldi.svg"
}
```

`dresscodeImage` points into `frontend/public/assets/dresscode/`. Placeholder SVGs
are checked in per event (`haldi.svg`, `mehendi.svg`, `nikah.svg`, `walima.svg`) —
replace them with real photos of the same filename (any image format works, just
update the extension in `dresscodeImage`) when ready. If an event's image 404s,
the UI falls back to `placeholder.svg` automatically. Images render at a 1:1
aspect ratio without cropping (`object-contain`) — a wide or tall source photo
letterboxes on the card background rather than losing content.

### Profile avatar

`profile.avatarUrls` in **`config/site.json`** is an array, not a single URL. On
every page load, `frontend/src/config.js` picks one at random and uses it
everywhere (profile header, post avatars) — gives returning guests a fresh look
each visit. It's not sticky across a refresh by design (simplicity over
persistence); picking the same one twice in a row is fine.

Placeholder variants live in `frontend/public/assets/avatars/avatar-{1..5}.svg`.
To go live with real photos: drop new image files anywhere under
`frontend/public/assets/avatars/`, then update the `avatarUrls` array in
`site.json` to point at them (mix and match as many or as few as you like — one
entry works too, it'll just always pick that one).

### Mock feed data (local dev only)

`frontend/public/data/posts.json` and `stories.json` are what LOCAL mode serves
(see "Frontend — quick start" above) — not used in production, where real
posts/stories come from the CDN (`VITE_DATA_BASE_URL`). Edit these to try out new
post layouts (captions, multi-image carousels, access tiers) without touching the
backend. Images for mock posts live in `frontend/public/data/img/*.svg` — reuse
existing ones or add new placeholder SVGs the same way (repetition across posts
is fine, e.g. a carousel post can reuse the same image path twice).

### Access tiers

See [Access control](#access-control-client-side-only-deterrent) below —
`accessTiers` in `config/site.json`.

## Admin console

Served permanently at `https://d1py21cjb1vbrh.cloudfront.net/admin/index.html` via
CloudFront (`/admin*` behavior, caching disabled, security headers applied).

To update the admin HTML after edits:

```bash
bash admin/upload.sh
```

## Access control (client-side only, deterrent)

5 opaque tiers unlocked via a signed link shared in WhatsApp:
`?key=BASE64(tierKey:secret)` — e.g. `?key=dGllcjM6c2VjcmV0Mw==` for `tier3:secret3`.
Valid keys add the tier to `localStorage.unlockedTiers` (cumulative). Posts/stories
carry an `access: [..]` array; tier `0` is visible to everyone. No server enforcement.

Update `accessTiers` in `config/site.json` with real random secrets before going live.

## Easter eggs 🥚

Hidden interactions scattered through the guest app. Reveal messages live in
`frontend/src/config.js` (the constants ending in `_MESSAGES`/`_EGG`), so tweaking
the copy never needs a component change.

| Egg | Where | Trigger |
|---|---|---|
| Treasure hunt | Countdown timer | tap 5× within 3s |
| Profile stats | `posts` / `guests` / `families` counts | tap 5× within 3s |
| Avatar secret | Profile avatar | long-press ~600ms |
| Brand logo credits | Feed header logo | tap 7× within 3s |
| Comment secret word | Any comment box | type "shaadi mubarak" |
| Story whisper | Open story | long-press ~600ms |
| Shake for confetti | Anywhere in the app | physically shake the phone (needs `devicemotion`; may stay silent on iOS Safari, which requires a permission prompt we intentionally don't add) |
| Wedding-day reveal | Feed page, once per session | opening the app on the wedding date itself |
| Hidden page | `/psst` | visiting the URL directly — no link in the app points to it |

All reveals share one modal + confetti burst (`frontend/src/components/EasterEggModal.jsx`,
`Confetti.jsx`) and a tiny synthesized chime (`lib/sound.js`) — no audio assets, no
extra dependencies.

## PWA / offline

`vite-plugin-pwa` (Workbox) is enabled: app shell precached, `posts.json`/`stories.json`
served stale-while-revalidate, images cache-first (immutable). After the first visit the
app loads fully offline — feed, stories and images all render from cache. Installable on
home screen (manifest + maskable icons).

## Node version

**Node 24**. A `.nvmrc` is at the repo root — run `fnm use` or `nvm use`.

## Deployment

### Frontend (automatic)

Push to `main` → GitHub Actions builds the Vite SPA and deploys to Cloudflare Pages.

**GitHub repo settings required:**

| Kind | Name | Purpose |
|---|---|---|
| secret | `CLOUDFLARE_API_TOKEN` | Pages deploy auth |
| secret | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| secret | `VITE_API_KEY` | write-endpoint key, baked into FE build |
| variable | `CF_PAGES_PROJECT` | Pages project name |
| variable | `VITE_API_BASE_URL` | `https://5dqmacd38g.execute-api.ap-south-1.amazonaws.com` |
| variable | `VITE_DATA_BASE_URL` | `https://d1py21cjb1vbrh.cloudfront.net` |
| variable | `VITE_SITE_URL` | `https://zain-wedding.pages.dev` |

### AWS backend (manual, via CDK)

Stack deployed to `ap-south-1` (account `889918307088`, profile `mdadils.dev`).
See `cdk/README.md` for full deploy instructions and IAM requirements.

To redeploy after code or config changes:

```bash
cd cdk
set -a && source ../.env.local && set +a

AWS_PROFILE=mdadils.dev cdk deploy \
  -c allowedOrigins='["https://zain-wedding.pages.dev"]' \
  -c writeApiKey="$WRITE_API_KEY" \
  -c adminApiKey="$ADMIN_API_KEY"
```
