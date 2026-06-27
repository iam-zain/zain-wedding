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
  data URL). Imported everywhere.

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
