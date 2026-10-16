# Krylo Market

A dynamic Roblox gaming store — **Krylo Market** — with a glitch intro animation
("go with gaming?" → *gaming* glitches into **Krylo**), USD pricing, user & admin
login, admin item listings with thumbnail uploads, and a built-in message system.

## Features
- **Glitch intro** — plays once per tab session; refreshes don't replay it (sessionStorage).
- **Accounts** — register / login with scrypt-hashed passwords, HMAC cookie sessions.
- **Admin panel** (`#/admin`) — post items for sale: name, USD price, description,
  thumbnail via image upload (base64) or URL. Delete listings.
- **Store** — searchable item grid, item detail pages, all prices in **USD**.
- **Message system** — "Contact Seller" on any item opens a conversation;
  threaded inbox with unread badges and replies (for buyers AND sellers).
- **Database** — zero-dependency JSON database (seeded with an admin account and demo items).

## Run locally
```bash
node server.js        # → http://localhost:3000
```

## Deploy on Vercel — checklist
1. The files must sit at the **repository root** — Vercel must see `index.html`,
   `api/`, `lib/` etc. directly when it opens the repo (no nested folder like
   `krylo-market/index.html`). If they are nested, set **Root Directory** in
   Vercel → Project → Settings → General.
2. In Vercel choose **"Import Git Repository"**, framework preset: **Other**,
   build command: *(empty)*, output directory: *(empty)*. Vercel auto-detects
   every `.js` file inside `api/` as a serverless function — no build needed.
3. Deploy, then open the generated `*.vercel.app` URL (use the URL shown on the
   "Congratulations" screen — the project dashboard page can 404 right after
   deploy while DNS propagates).
4. API endpoints to verify after deploy:
   - `https://YOUR-APP.vercel.app/api/items` → should return JSON with items
   - `https://YOUR-APP.vercel.app/` → Krylo Market homepage

### Troubleshooting 404 / 500 on Vercel
- **404 on every page** → files are not at the repo root, or you opened the
  project dashboard URL instead of the deployment URL. Fix Root Directory.
- **404/500 on /api/... only** → check Vercel → Deployments → [latest] → Logs.
  Shared code lives in `/lib` (NOT inside `api/`) on purpose — anything inside
  `api/` becomes an endpoint.
- **Data disappears after redeploy** → expected on serverless `/tmp`; use
  `KRYLO_DATA_DIR` or swap `lib/db.js` for a real database (see note below).

### Default admin account
| Email | Password |
|---|---|
| `admin@krylo.market` | `admin123` |

Override at first launch with env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `KRYLO_SECRET`.

## Important: data persistence on Vercel
Vercel serverless filesystems are **ephemeral** — the JSON database resets when a
function instance restarts. For a hobby/demo deploy this works, but for real
persistent data use one of:
- `KRYLO_DATA_DIR` env var pointing at persistent storage, **or**
- Swap `api/lib/db.js` for Vercel Postgres / Neon / Supabase (keep the same exported
  function signatures and nothing else changes).

## Files
```
index.html  style.css  app.js  logo.png   ← frontend (logo.png = site logo)
server.js                                  ← local dev server
api/                                       ← Vercel serverless API (FLAT — no subfolders!)
  health.js                                ← test endpoint: /api/health
  register.js login.js logout.js me.js
  items.js                                 ← GET list, POST create (admin)
  item.js                                  ← GET/PUT/DELETE one item via ?id=
  messages.js                              ← inbox / send / mark-read
lib/ db.js auth.js http.js                 ← shared code (NOT inside api/ on purpose)
```

## ⚠️ Upgrading from an older upload?
Delete these from your repo BEFORE uploading the new zip, or old/broken files linger:
- the whole `api/items/` **folder** (old `[id].js` route — replaced by flat `api/item.js`)
- any `api/lib/` folder (shared code now lives in root `lib/`)
- any nested `api/items/items.js`
Then commit, and Vercel will redeploy automatically.
