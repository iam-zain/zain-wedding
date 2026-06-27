# zain-wedding 💍

An Instagram-inspired wedding website (SPA) for **Zain & Aisha**. Dark mode only,
Hinglish, built for ~100 guests checking in a few times a day.

## Monorepo layout

```
/
├── frontend/          # React + Vite + Tailwind v4 SPA (the guest-facing app)
├── admin/             # Standalone admin HTML portal (vanilla JS)
├── backend/           # Lambda handlers (Node.js 20)
├── cdk/               # AWS CDK (TypeScript) — all AWS infra
├── config/            # site.json — build-time FE config (single source of truth)
└── .github/workflows/ # CI/CD → Cloudflare Pages
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
- With `VITE_API_BASE_URL` unset, likes/comments fall back to `localStorage`, so the
  app is fully demoable with **no backend**. Copy `.env.example` → `.env.local` and
  set the API vars to talk to the real AWS backend.

### Configuration

- **`config/site.json`** — profile, wedding date, events, menu links, access-tier
  secrets. Baked into the bundle at build time. Edit this for real wedding details.
- **`frontend/src/config.js`** — all FE tunables in one place (max comments, endpoints,
  data URL). Imported everywhere.

## Access control (client-side only, deterrent)

5 opaque tiers unlocked via a signed link shared in WhatsApp:
`?key=BASE64(tierKey:secret)` (e.g. `?key=dGllcjM6c2VjcmV0Mw==` for `tier3:secret3`).
Valid keys add the tier to `localStorage.unlockedTiers` (cumulative). Posts/stories
carry an `access: [..]` array; tier `0` is visible to everyone. No server enforcement.

## PWA / offline

`vite-plugin-pwa` (Workbox) is enabled: app shell precached, `posts.json`/`stories.json`
served stale-while-revalidate, images cache-first (immutable). **After the first visit the
app loads fully offline** — feed, stories and images all render from cache. Installable on
home screen (manifest + maskable icons).

## Deployment (build-first; nothing is provisioned yet)

- **Frontend** → Cloudflare Pages via GitHub Actions (`.github/workflows/deploy.yml`) on
  push to `main`.
- **Admin** → optional second Cloudflare Pages project (same workflow, gated on a var).
- **AWS** (S3 + CloudFront + DynamoDB + HTTP API + Lambda) is defined in `cdk/`. Validate
  offline with `cd cdk && npm install && npm run synth`. Deploy later — see `cdk/README.md`.
  All resources target the AWS free tier; no WAF.

### CI configuration (GitHub repo settings)

| Kind     | Name                   | Purpose                                  |
| -------- | ---------------------- | ---------------------------------------- |
| secret   | `CLOUDFLARE_API_TOKEN` | Pages deploy auth                        |
| secret   | `CLOUDFLARE_ACCOUNT_ID`| Cloudflare account                       |
| secret   | `VITE_API_KEY`         | write-endpoint key, baked into FE build  |
| variable | `CF_PAGES_PROJECT`     | Pages project name (frontend)            |
| variable | `CF_ADMIN_PROJECT`     | (optional) Pages project name (admin)    |
| variable | `VITE_API_BASE_URL`    | HTTP API base URL (from CDK output)      |
| variable | `VITE_DATA_BASE_URL`   | CloudFront base URL (from CDK output)    |
| variable | `VITE_SITE_URL`        | canonical site URL (for Web Share)       |

## Build status

All six stages are built and verified locally: scaffold → app shell → **Feed + Stories** →
Events → CDK backend (synth-validated, **not deployed**) → admin portal → PWA + CI.
Swap real details into `config/site.json`, replace the placeholder SVG media, set the
access-tier secrets, then deploy.
