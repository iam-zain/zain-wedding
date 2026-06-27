Project Bootstrap Prompt

---
Build a wedding website — an Instagram-inspired SPA called [zain-wedding]. This is a fun, polished, high-quality product for a real wedding with ~100 guests visiting 2-5 times a day. Language is Hinglish. Dark mode only. Clone Instagram's visual language: fonts (Billabong/similar for logo, system sans-serif for body), color palette (black #000, dark gray #121212, #262626 for cards, Instagram gradient for story rings, white text), and UX patterns (stories row, feed scroll, full-screen story viewer, inline comments).

---
Tech Stack

┌──────────────┬──────────────────────────────────────────────────────────────────┐
│    Layer     │                              Choice                              │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ Frontend     │ React + Vite + Tailwind CSS (dark theme)                         │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ Host         │ Cloudflare Pages (free tier), GitHub auto-deploy                 │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ CDN + Images │ AWS CloudFront + S3                                              │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ API          │ AWS HTTP API Gateway + Lambda (Node.js 20.x)                     │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ Database     │ AWS DynamoDB (single table)                                      │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ IaC          │ AWS CDK (TypeScript) for all AWS resources                       │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ Admin        │ Standalone single-page HTML + vanilla fetch, deployed separately │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ PWA          │ vite-plugin-pwa — full offline after first visit                 │
├──────────────┼──────────────────────────────────────────────────────────────────┤
│ CI/CD        │ GitHub Actions → Cloudflare Pages auto-deploy on push to main    │
└──────────────┴──────────────────────────────────────────────────────────────────┘

All AWS resources must stay within AWS free tier. No AWS WAF. Rate limiting via API Gateway throttle only.

---
Repository Structure

/
├── frontend/          # React + Vite SPA
├── admin/             # Standalone admin HTML portal
├── backend/           # Lambda handlers (Node.js)
├── cdk/               # AWS CDK TypeScript stack
├── config/            # Static site config JSON (FE only, build-time)
└── .github/workflows/ # CI/CD

---
Frontend — Feature Spec

Profile Header (data from config/site.json, baked at build time)

- Instagram-style profile block at top of feed page
- Avatar image, username, display name
- Decorative post/follower/following counts (static numbers from config)
- Bio text + optional link
- "Connect with wedding manager" button — WhatsApp green (#25D366), opens a fixed WhatsApp group URL from config (not pre-filled message, just opens the group)
- "Share Profile" button — native Web Share API sharing the site URL
- Top-right ... menu — dropdown with configurable items from config/site.json:
  - Download Wedding Invite (PDF link)
  - Any number of additional URL entries (label + url pairs)
  - No backend, pure FE config

Stories Row

- Horizontal scroll row below profile header
- Each story: circular avatar/thumbnail
  - Unviewed: colored gradient ring border (Instagram-style)
  - Viewed: no border (gray or none)
  - View history stored in localStorage as a Set of story IDs (viewedStories)
- Expired stories (expires_at < now) hidden client-side
- Stories filtered by user's unlocked access tiers (see Access Control)
- On tap: full-screen story viewer
  - Full bleed image, dark background
  - Tap right half → next story, tap left half → previous story
  - Progress bar at top (static, no timer auto-advance)
  - Swipe down or X button to close
  - Mark as viewed in localStorage on open
  - Single image per story (no multi-frame)

Feed Page — the only main content page

- No individual post pages. Everything lives in the feed. Single route /.
- Load all posts at once from posts.json (no pagination, no infinite scroll slicing — just one fetch, render all, scroll naturally)
- Posts sorted by created_at descending (latest first)
- Client-side filters applied:
  - Hide posts where now < active_from or now > active_upto
  - Hide posts where user has none of the required access tiers
- Each post card (Instagram style):
  - Image carousel if multiple images (swipe/dot navigation), single image if one
  - Caption/title (plain text)
  - Description rendered as HTML (admin-authored, trusted — allows <a> links for venue, maps etc.)
  - Action bar: ❤️ Like · 💬 Comments · ➦ Share · 🔖 Bookmark
  - Like count: likes_base (from JSON) + live count from DynamoDB, displayed as total. Tap to like — POST to Lambda, store likedPosts: [id1, id2] in localStorage to prevent re-like. Show filled heart if liked.
  - Comments section inline below post (no modal, no new page):
      - Show comment count. Tap "View all N comments" to expand inline.
    - Comments fetched lazily (GET /comments/:postId) when section is first expanded
    - Max 25 comments per post — UI disables submit when limit reached, shown in UI. 25 is a FE config, can be modified later, keep all the config in one single file.
    - Each comment shows: display name + text. Own comments show "You" instead of name.
    - Comment input: text field + submit button
    - On first-ever comment attempt: name field appears inline next to text box. Name is mandatory — submit button stays disabled until both name and text are non-empty. Name saved to localStorage as userName. Never asked again.
    - Comments are plain text only. No HTML rendering of user input (XSS safe).
    - POST /comment/:postId → Lambda → DynamoDB
  - Share: native Web Share API with post URL (which is just the feed URL since no post pages)
  - Bookmark: toggle stored in localStorage as bookmarkedPosts: [id1, id2]. No backend. No bookmarks view needed for now.
  - Timestamp shown as relative ("3 days ago")

Event Schedule Page — route /events

- Timeline of each wedding ceremony
- Each event: name, date/time, venue name, venue map link, dress code
- Data from config/site.json (build-time, no backend)
- Simple RSVP: button per event → opens WhatsApp group URL (same URL as Connect button, or per-event URL from config)

Countdown Timer

- Shown in feed header below profile block, above stories
- Live countdown to wedding date (config/site.json): Days · Hours · Minutes · Seconds
- Disappears after wedding date passes

Navigation / Routing

- React Router, 2 routes: / (feed) and /events
- Bottom tab bar (Instagram style): Feed icon, Events icon
- No top nav bar needed beyond the profile header

---
Access Control

5 access tiers, opaque to users. Each tier unlocked via a signed URL shared in a WhatsApp group.

URL format: ?key=BASE64(tierId:sharedSecret) — e.g. ?key=dGllcjM6d2VkU2VjcmV0

Client-side flow:
1. On app load, check for ?key= query param
2. Decode base64, validate against a hardcoded map in the bundle: { "tier1": "secret1", "tier2": "secret2", ... }
3. If valid, add tier to localStorage unlockedTiers: [1, 3] (cumulative — never remove)
4. Remove key from URL (replace state) so it's not visible
5. Render feed filtered by cumulative unlocked tiers

Post/story access field: "access": [0, 1, 2] — visible if user has unlocked any tier in the array. Tier 0 = visible to everyone (no unlock needed).

No server-side enforcement. No concern for tampering. Basic deterrent only.

---
User Identity

- On first app load, generate a UUID v4 and store as userId in localStorage
- This ID is sent with every like and comment POST
- Used client-side to show "You" on own comments (match userId in returned comment data)
- No auth, no login, no tracking in backend beyond the comment record itself

---
PWA / Offline

- vite-plugin-pwa with Workbox
- Cache strategy: app shell (precache), posts.json + stories.json (stale-while-revalidate), images (cache-first, Cache-Control: immutable, max-age=31536000)
- Full offline: after first visit, app loads and feeds display from cache
- Images served via CloudFront with Cache-Control: immutable header — browsers cache forever

---
Backend — AWS CDK Stack

All defined in cdk/ as a single CDK stack (WeddingStack).

S3 Buckets

1. wedding-media-bucket — stores post/story images. Not public. CloudFront Origin Access Control only. Bucket policy: deny all direct S3 access.
2. wedding-data-bucket — stores posts.json, stories.json. Served via CloudFront with CORS headers allowing only the wedding domain.

CloudFront Distribution

- Origin 1: wedding-media-bucket (OAC, no public access)
- Origin 2: wedding-data-bucket (OAC)
- CORS response headers policy: Access-Control-Allow-Origin: https://[your-domain]
- Cache policy for images: max-age=31536000, immutable
- Cache policy for JSON data: max-age=300 (5 min) with revalidation

DynamoDB — Single Table (WeddingTable)

┌───────────┬────────────────────────────┬───────────────────────────────────┐
│    pk     │             sk             │            attributes             │
├───────────┼────────────────────────────┼───────────────────────────────────┤
│ POST#<id> │ LIKES                      │ count: Number                     │
├───────────┼────────────────────────────┼───────────────────────────────────┤
│ POST#<id> │ COMMENT#<timestamp>#<uuid> │ text, userId, userName, createdAt │
└───────────┴────────────────────────────┴───────────────────────────────────┘

Lambda Functions (Node.js 20.x, plain handlers — no Express)

1. PostLike — POST /like/:postId
  - Atomic increment on POST#{postId} / LIKES using DynamoDB ADD
  - Returns updated count
  - Throttle: 5 req/sec burst via API Gateway
2. PostComment — POST /comment/:postId
  - Validates: non-empty text (plain text only, strip any HTML tags server-side), non-empty userName, non-empty userId
  - Checks comment count for post (query sk begins_with COMMENT#) — rejects if ≥ 25
  - Puts item, returns created comment
  - Throttle: 2 req/sec burst
3. GetComments — GET /comments/:postId
  - Query all sk begins_with COMMENT# for given post
  - Returns array sorted by createdAt ascending
  - No auth required

HTTP API Gateway

- Attach all 3 Lambda integrations
- x-api-key header required on write endpoints (POST /like, POST /comment) — key stored in FE env var at build time
- CORS configured for wedding domain
- Default throttle: 10 req/sec, 5 burst

---
Admin Portal (admin/index.html)

Standalone HTML file with vanilla JS + fetch. No framework. Deployed to a separate Cloudflare Pages project or S3 static site. Protected by a hardcoded admin API key checked client-side (basic deterrent, technical admin only).

Features:
- Posts tab:
  - List all posts (read posts.json from S3 via admin Lambda or direct SDK call)
  - Create post form: title, description (HTML textarea), image upload (to S3 via presigned URL), active_from datetime, active_upto datetime, access tiers (multi-select checkboxes 0-4), carousel (multiple image upload)
  - Delete post (removes from posts.json, optionally deletes S3 images)
- Stories tab:
  - List all stories
  - Create story: image upload to S3, expires_at datetime, access tiers
  - Delete story
- On any create/delete, admin Lambda regenerates and writes posts.json / stories.json to S3 data bucket

Admin Lambda (separate from public API, or same with admin key guard):
- GET /admin/posts — read posts.json
- POST /admin/post — add post, rewrite posts.json
- DELETE /admin/post/:id — remove post, rewrite posts.json
- POST /admin/story — add story, rewrite stories.json
- DELETE /admin/story/:id — remove story
- GET /admin/presign — generate S3 presigned PUT URL for image upload

---
Data Schemas

config/site.json (build-time baked into FE bundle):
{
  "profile": {
    "username": "@the_khans_2025",
    "displayName": "The Khan Wedding 2025",
    "bio": "Two families, one celebration 🎉",
    "postCount": "142",
    "followersCount": "1.2K",
    "followingCount": "892",
    "avatarUrl": "/assets/profile.jpg",
    "whatsappGroupUrl": "https://wa.me/groupinvitelink"
  },
  "wedding": {
    "date": "2025-10-18T00:00:00+05:30"
  },
  "menu": [
    { "label": "Download Wedding Invite", "url": "https://cdn.../invite.pdf" },
    { "label": "Venue on Maps", "url": "https://maps.google.com/..." }
  ],
  "events": [
    {
      "id": "mehendi",
      "name": "Mehendi",
      "date": "2025-10-16T16:00:00+05:30",
      "venue": "Khan Residence, Delhi",
      "mapUrl": "https://maps.google.com/...",
      "dresscode": "Yellow / Green / Floral",
      "rsvpWhatsappUrl": "https://wa.me/groupinvitelink"
    }
  ],
  "accessTiers": {
    "tier1": "secret1",
    "tier2": "secret2",
    "tier3": "secret3",
    "tier4": "secret4",
    "tier5": "secret5"
  }
}

posts.json (S3, served via CloudFront):
{
  "posts": [
    {
      "id": "post_abc123",
      "title": "Roka ceremony vibes ✨",
      "description": "<p>Venue: <a href='https://maps...'>The Grand Lawn</a></p>",
      "images": ["https://cdn.../img1.jpg", "https://cdn.../img2.jpg"],
      "likes_base": 27,
      "access": [0, 1, 2],
      "active_from": "2025-09-20T00:00:00Z",
      "active_upto": "2025-12-31T00:00:00Z",
      "created_at": "2025-09-20T10:30:00Z"
    }
  ]
}

stories.json (S3, served via CloudFront):
{
  "stories": [
    {
      "id": "story_xyz",
      "imageUrl": "https://cdn.../story1.jpg",
      "access": [0, 1],
      "expires_at": "2025-10-20T00:00:00Z",
      "created_at": "2025-10-18T08:00:00Z"
    }
  ]
}

---
LocalStorage Keys Reference

┌─────────────────┬────────────────────────────────────────────────────────┐
│       Key       │                         Value                          │
├─────────────────┼────────────────────────────────────────────────────────┤
│ userId          │ UUID v4, generated on first visit                      │
├─────────────────┼────────────────────────────────────────────────────────┤
│ userName        │ Display name, set on first comment                     │
├─────────────────┼────────────────────────────────────────────────────────┤
│ unlockedTiers   │ [0, 1, 3] — cumulative unlocked access tiers           │
├─────────────────┼────────────────────────────────────────────────────────┤
│ viewedStories   │ ["story_xyz", "story_abc"] — Set of viewed story IDs   │
├─────────────────┼────────────────────────────────────────────────────────┤
│ likedPosts      │ ["post_123", "post_456"] — posts this device has liked │
├─────────────────┼────────────────────────────────────────────────────────┤
│ bookmarkedPosts │ ["post_789"] — bookmarked post IDs                     │
└─────────────────┴────────────────────────────────────────────────────────┘

---
Key Constraints to Respect

- All AWS resources within free tier limits. No WAF, no Cognito, no RDS.
- No individual post pages. Feed is the only content view.
- Admin-authored HTML in post descriptions is trusted and rendered. User-authored comment text is always escaped.
- Access control is client-side only. No server enforcement. Secrets are in the FE bundle — this is intentional and acceptable.
- Only soft delete by admin, nothing gets deleted. Only hidden from UI.
- No comment moderation. No user account system.
- Images never served directly from S3. Always via CloudFront.
- posts.json and stories.json are the source of truth for content. DynamoDB only stores user-generated data (likes, comments).

---
Start by scaffolding the repository structure, CDK stack skeleton, and Vite + React + Tailwind frontend shell with dark theme and Instagram-like base styles. Then we'll build feature by feature.