# Horus Vendor SaaS

The control plane **you** (the vendor selling Horus) use to issue and
manage license keys for hundreds of customer installations. Backed by
Cloudflare Workers + D1 (edge SQLite) + R2 (binary storage).

## What this gives you

- **Issue keys** — one or 100 at a time, with HMAC signature matching
  the desktop installer.
- **Track installs** — every desktop sends a heartbeat every 6 hours
  with version, fingerprint, IP and country.
- **Revoke remotely** — flip a switch, the customer's app locks on
  next heartbeat (with a 14-day offline grace period built in).
- **Push updates** — upload a new `.exe`, every customer auto-
  downloads on next launch.
- **Audit log** — every admin action recorded with IP.

## Layout

```
vendor/
├── server/                 # Cloudflare Worker backend
│   ├── worker.ts           # All API routes
│   ├── schema.sql          # D1 schema
│   ├── wrangler.toml       # Cloudflare config
│   └── seed-admin.mjs      # Helper to insert the first admin
└── src/                    # Vite + React admin SPA
```

## Deploy in 5 minutes

```bash
cd vendor/server

# 1. Create the D1 database (edge SQLite)
npx wrangler d1 create horus-vendor
# → copy the database_id into wrangler.toml

# 2. Create the R2 bucket for hosting .exe releases
npx wrangler r2 bucket create horus-releases

# 3. Apply the schema
npm install
npm run db:init-remote

# 4. Set secrets — MUST match the desktop's HORUS_VENDOR_SECRET
npx wrangler secret put VENDOR_SECRET
npx wrangler secret put JWT_SECRET
# Optional fallback admin (you'll usually use admin_users table instead):
npx wrangler secret put ADMIN_PASSWORD_HASH  # sha256 of password

# 5. Seed the first admin
node seed-admin.mjs admin@horus.app YourStrongPassword
# → run the printed wrangler d1 execute command

# 6. Deploy the Worker
npm run deploy
# → e.g. https://horus-vendor.your-account.workers.dev

# 7. Build & deploy the admin SPA
cd ..
npm install
echo "VITE_API_BASE=https://horus-vendor.your-account.workers.dev" > .env.production
npm run build
# Deploy dist/ to Vercel / Netlify / Cloudflare Pages
```

## Wire it into the desktop

Set on every desktop install (or bake into the build):

```bash
export HORUS_VENDOR_URL=https://horus-vendor.your-account.workers.dev
export HORUS_VENDOR_SECRET=<same secret as the Worker>
```

The desktop will heartbeat every 6 hours and auto-pull updates.

## Local development

```bash
# Terminal 1: Worker
cd server && npm run dev          # http://localhost:8787

# Terminal 2: Admin SPA
cd .. && npm run dev              # http://localhost:5178
```

Vite proxies `/api/*` to `localhost:8787` so the SPA "just works".

## Pages

| Path | Description |
|---|---|
| `/login` | Admin email + password |
| `/` | KPIs + 30-day active-installs chart |
| `/customers` | All license keys with filter (active / dormant / expired / revoked), search, copy, revoke |
| `/issue` | Mint 1–100 keys with tier + days + optional customer details. Bulk copy or CSV export |
| `/releases` | Upload `.exe`, choose channel (stable/beta), see history with SHA-256 |
| `/audit` | Every admin action, who did it and from where |

## API contract

The Worker exposes:

| Method | Path | Auth | Use |
|---|---|---|---|
| GET | `/api/health` | — | Health check |
| POST | `/api/login` | — | Email+password → JWT |
| POST | `/api/hb` | — (public) | Desktop heartbeat. Returns `verdict: ok\|revoked\|expired\|unknown` |
| GET | `/api/releases/latest?channel=stable` | — | electron-updater feed |
| GET | `/api/releases/:version/download` | — | Streams the .exe from R2 |
| POST | `/api/licenses` | admin | Issue new key(s) |
| GET | `/api/licenses` | admin | List all with last heartbeat |
| POST | `/api/licenses/:key/revoke` | admin | Revoke a key |
| GET | `/api/releases` | admin | List uploaded releases |
| POST | `/api/releases` | admin | Upload new `.exe` (multipart) |
| GET | `/api/analytics` | admin | Aggregate counts + 30-day chart |
| GET | `/api/audit` | admin | Admin action log |
