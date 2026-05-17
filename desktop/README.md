# SystemAlaa Desktop

The ultimate Arabic-first commerce platform for the Middle East &
beyond: a hardware-bound, encrypted desktop POS + accounting + e-
commerce + AI brain — paired with a public storefront SPA, a mobile
PWA cashier, and a customer-facing second-screen display.

This monorepo holds **four** apps:

| Directory | What it is |
|---|---|
| `desktop/` | Main Electron POS + back-office (this README) |
| `store/` | Public storefront SPA — one site per tenant |
| `mobile/` | Mobile PWA cashier that uses the REST API |
| `customer-display/` | Second-monitor display facing the customer at checkout |

## Tech

| Layer | Choice |
|---|---|
| Shell | Electron 33 (frameless, system tray, native menus, global shortcuts) |
| Renderer | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3 with the spec's exact HSL token palette + Cairo font |
| Routing | React Router (HashRouter under `file://`, BrowserRouter in dev) |
| State | TanStack Query (offline-first) + React Context (auth/theme/offline) |
| Database | SQLite via `better-sqlite3` — all 21 spec tables + indexes |
| Auth | bcrypt password + 6-digit access code (device-locked) + TOTP 2FA |
| Crypto | AES-256-GCM at rest for `two_factor_secret`, `backup_codes`, `clients.phone` |
| Build | electron-builder → NSIS single-file `.exe` for Windows |

## Platform-grade features at a glance

| Domain | Capabilities |
|---|---|
| **POS** | 5 selectable cashier layouts (Classic / Touch Grid / Restaurant / Quick Service / Dual screen), multi-pricing (retail/wholesale/VIP), hold & resume invoices, partial returns, cashier shifts with X/Z reports |
| **Invoice Designer** | Drag-style section reorder, paper size (A4/A5/thermal 80/58), 6 colour presets, live preview, per-user templates |
| **Storefront** | Per-tenant public shop, live theme builder with desktop/mobile preview, coupons, shipping carriers (Aramex/Bosta/J&T/...), payment gateways (Paymob/Fawry/Stripe/...), order workflow |
| **Restaurant mode** | Table floor plan with zones, KOT to kitchen, Kitchen Display Screen (KDS) with timer alerts, reservations |
| **Accounting** | Double-entry, Arabic chart of accounts seeded, journal entries, trial balance, income statement, balance sheet, AR aging, multi-currency, bank accounts + transactions, fixed assets, cost centers, budgets, payroll, recurring invoices |
| **Inventory** | Multi-warehouse, product variants (size/colour/SKU), stock transfers, physical stock counts, purchase orders, expiry dates |
| **Customers** | Loyalty points with tiers, gift cards, product bundles |
| **AI** | Anthropic Claude chat assistant with live business context (today/week/month sales, top sellers, low stock) |
| **Integrations** | WhatsApp QR login + auto-send invoice images + offline outbox, REST API + scoped keys, webhooks with HMAC signing, Marketplace catalog (Talabat, Mrsool, Jahez, Uber Eats, Jumia, Noon, Salla, Zid, Shopify, WooCommerce, ...), ZATCA/ETA QR for e-invoices, thermal printer (ESC/POS USB/network) |
| **Multi-tenant** | Branches with manager assignment, 8 industry templates (retail / supermarket / restaurant / coffee shop / pharmacy / salon / professional services / auto workshop) that one-click set the entire experience |
| **Security** | scrypt password stretching, 5-fail/15-min lockout, HMAC-chained audit log, AES-256-GCM at rest, hardware-bound device login, hardened renderer (no DevTools in prod), CSP, single-instance |
| **Backups** | Nightly Google Drive backup via OAuth-PKCE, file is updated in place (storage stays flat), offline-safe fallback to local file, daily JSON snapshot |
| **Voice POS** | Arabic Web Speech commands (افتح المنتجات، فاتورة جديدة، طباعة، حفظ، ركّز الباركود...) |
| **i18n** | Arabic/English toggle in the title bar, document direction flips automatically |
| **Licensing** | One-key-one-device activation with HMAC-signed keys + 30-day trial |

## Login flow (one device per account)

The app uses a two-step login model that **binds each account to exactly
one machine**:

1. **First time on a fresh device** — the user enters the *vendor-issued*
   email + temporary password, then picks their own new password. The
   account is now hardware-bound to this machine and the temporary
   password is destroyed.
2. **Every subsequent launch on the same machine** — the login screen
   shows the bound account's email as a label and asks for the chosen
   password only. The password must be entered every time (no "remember
   me" — closing the app logs you out).
3. **Any other machine** — the same credentials are refused with
   `device-mismatch`. The bound account simply cannot log in elsewhere.

If a customer changes hardware, the *Activation* screen has a "فك ربط
هذا الجهاز" action that releases the binding and assigns a new temporary
password. The customer then claims their account again on the new
machine. The `system_manager` can do the same remotely via
`window.electronAPI.auth.releaseDevice({ userId, newTemporaryPassword })`.

## First run

```bash
cd desktop
npm install
npm run dev:electron   # spins Vite + Electron with live reload
```

Default seeded admin (created on first launch):

```
admin@systemalaa.app / admin    ← temporary, only works once
```

On first login you'll be asked to pick your own password — that's the
one you use from now on, on this device only.

The SQLite file lives at the Electron `userData` dir
(`%APPDATA%/SystemAlaa/systemalaa.db` on Windows). Daily JSON backups land
in `Documents/SystemAlaa/Backups/` (last 30 kept).

## Build the Windows installer

```bash
npm run dist:win
```

Output:
```
release/SystemAlaa Setup x.y.z.exe
```

Place a 256×256 PNG icon at `build/icon.png` (or `build/icon.ico`) before
packaging for a branded installer.

## Project layout

```
desktop/
├── electron/                # Main-process Node code (no React)
│   ├── main.cjs             # Window, tray, menus, shortcuts, IPC, backups
│   ├── preload.cjs          # contextBridge — typed renderer API
│   ├── db.cjs               # SQLite schema + encrypted columns
│   ├── repo.cjs             # CRUD repository
│   ├── auth.cjs             # bcrypt + TOTP + device-locked access codes
│   └── crypto.cjs           # AES-256-GCM helpers, machine fingerprint
├── src/
│   ├── components/          # ui/ + layout/ + auth/ + shared/
│   ├── contexts/            # AuthContext, ThemeContext, OfflineContext
│   ├── lib/                 # utils, ipc, rbac, format
│   ├── screens/             # LoginScreen, InvoiceScreen, etc.
│   ├── App.tsx              # Router + provider tree
│   ├── main.tsx
│   ├── index.css            # All design tokens (light + dark)
│   └── global.d.ts          # Renderer-side electronAPI types
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

## E-commerce storefront

Each tenant gets a public-facing online shop at `/<slug>` with the
following plumbing:

- **`store_settings`** — brand name, slug, tagline, logo, hero image,
  primary colour (HSL), currency, contact info, social links, policies
  (delivery / return / privacy / terms), inventory tracking toggles.
- **Inventory linkage** — products opt in via `products.store_visible`.
  The customer sees stock in real time; the desktop app decrements
  inventory atomically on each order with stock guards (won't oversell
  unless `allow_out_of_stock` is on).
- **Coupons** — percent, fixed, or free-shipping. Usage limits, expiry,
  minimum subtotal, max-discount cap, automatic usage counter.
- **Shipping carriers** — pluggable provider model (Aramex, Bosta, J&T,
  Mylerz, FedEx, custom). Each carrier stores its API credentials in
  `config_json`; `electron/shipping.cjs` is the abstraction point for
  drop-in real SDK calls.
- **Payment gateways** — Paymob, Fawry, Vodafone Cash, InstaPay, Stripe,
  PayPal, COD, bank transfer. Same `config_json` pattern; stubs return
  the right shape so the checkout flow is end-to-end testable before
  live keys are wired.
- **Order workflow** — `new → confirmed → preparing → shipped →
  delivered` (with `cancelled` / `returned` branches), full history in
  `store_order_status_history`, change-tracker UI in the Store Orders
  screen.
- **Customers** — separate `store_customers` table (phone-encrypted)
  with `orders_count`/`total_spent` rollups updated on every order.
- **Standalone storefront SPA** lives under `store/` — a separate Vite
  project ready to be deployed to any static host. See
  `store/README.md`. The desktop app exports the tenant feed as a JSON
  file the storefront can read directly.

## Accounting (full double-entry)

- **Chart of Accounts** seeded with a standard Arabic palette (Assets,
  Liabilities, Equity, Revenue, Expenses — 40+ accounts) plus a
  system-account mapping (`sales_revenue`, `accounts_receivable`,
  `accounts_payable`, `vat_payable`, `inventory`, `cogs`, `cash_default`,
  `capital`, `retained_earnings`).
- **Journal entries** with double-entry validation: every entry is
  rejected if `total_debit ≠ total_credit`.
- **Auto-posting** from operational documents:
  - Sales invoice → `DR Cash/AR` + `CR Sales` + `CR VAT` (+ optional
    `DR COGS / CR Inventory` from product cost).
  - Purchase invoice → `DR Inventory + DR VAT` / `CR Cash/AP`.
  - Receipt voucher → `DR Cash / CR AR`.
  - Payment voucher → `DR AP / CR Cash`.
- **Reports**: Trial Balance, Income Statement, Balance Sheet (with
  balanced-check), General Ledger per account, AR Aging (current /
  1-30 / 31-60 / 61-90 / 90+ buckets).

## WhatsApp integration

- QR-code login from the *إعدادات واتساب* screen (same flow as WhatsApp
  Web — scan once, session is persisted to `<userData>/wa-session/`).
- After a sales invoice is saved, the app renders it as a high-DPI PNG
  (via `html2canvas`) and sends it to the client's phone with a caption
  containing the invoice number and total — fully automatic when the
  client has a phone number on file.
- Manual send button on the invoice screen as a fallback.
- A test-message panel inside *إعدادات واتساب* lets you verify the
  connection without saving an invoice.

> Note: `whatsapp-web.js` ships Puppeteer under the hood and downloads
> Chromium on install (~170 MB) — first install is slower than usual.

## Licensing — one key, one device

- Activation key format `SA-<TIER>-<EXPIRY>-<NONCE>-<HMAC10>`, signed
  with an HMAC-SHA256 vendor secret.
- **Hard device binding**: on first activation the key is stored
  together with this machine's hardware fingerprint hash. The same key
  on a different machine is refused.
- A 30-day free trial starts automatically on first launch (no key
  needed) so you can test before activating.
- `electron/licensing.cjs::issue()` mints keys for your own testing.
  Replace `SYSTEMALAA_VENDOR_SECRET` (env var) with a real 32-byte
  random secret before shipping retail builds.

## Google Drive backup (nightly, offline-safe, single-file)

- **OAuth via PKCE** — no `client_secret` in the binary. The vendor
  registers a Desktop OAuth client at Google Cloud Console and exports
  `SYSTEMALAA_GOOGLE_CLIENT_ID` before shipping. Scope is the safest
  one: `drive.file` (the app can only see files it created itself).
- **One file, updated in place** — uploads use
  `PATCH /upload/drive/v3/files/{fileId}?uploadType=media`, so every
  night the same Drive file is replaced. The user's Drive usage stays
  flat instead of accumulating one file per day. Old revisions auto-
  expire from Drive after 30 days.
- **Offline fallback that doesn't grow** — at the scheduled hour the
  payload is always written to `<userData>/last-backup.bin` first,
  overwriting yesterday's local snapshot. If `fetch` fails the run is
  marked offline; the scheduler retries every 5 minutes and uploads as
  soon as the network is back. No queue / no growing folder.
- **AES-256-GCM at rest before upload** (toggle in the settings card).
  The key is derived from the machine fingerprint + pepper, so even if
  a Drive account is compromised the dumped file is unintelligible
  without this exact machine.
- **Daily, not hourly** — the scheduler is a 5-minute ticker; once a
  successful backup has run for the current calendar day it skips
  silently until tomorrow.
- **UI** at *النسخة الاحتياطية - Google Drive*: connect button (opens
  system browser), live status with file-id + size, schedule slider
  (hour of day), encryption toggle, manual run button, last-attempt /
  last-success / last-error tiles, local fallback path.

## Security hardening

- **scrypt** (N=2^15, r=8, p=1, 32-byte output) for passwords and
  access codes. Legacy bcrypt hashes upgrade automatically on the next
  successful login.
- **Brute-force lockout**: 5 wrong attempts (per email and per access
  code) → 15-minute cooldown, persisted to the `lockouts` table so a
  process restart doesn't reset it.
- **HMAC-chained audit log** (`audit_chain` table): every row's HMAC
  covers the previous row's HMAC, so tampering with any row breaks the
  whole chain. The *سجل الأحداث* screen runs the verifier and shows a
  green badge when intact and a red badge with the broken row when not.
- **AES-256-GCM at rest** for `two_factor_secret`, `backup_codes`,
  `clients.phone`, `suppliers.phone`. Key derived from machine
  fingerprint + pepper.
- **Hardened renderer in production**: DevTools blocked, `F12` /
  `Ctrl+Shift+I` swallowed, `will-navigate` refuses any non-app origin.

## Implemented (functional today)

- **Frameless window** with custom RTL titlebar (minimize/maximize/close)
- **System tray** with Arabic context menu (open, new invoice, settings, quit)
- **Native menus** in Arabic — File / Edit / View / Tools / Help
- **Global shortcuts**: `Ctrl+Shift+N` (new invoice), `Ctrl+Shift+P` (print last),
  `Ctrl+Shift+F` (focus barcode)
- **Daily auto-backup** to JSON in `Documents/SystemAlaa/Backups/` (keeps last 30)
- **Native printing** via `webContents.print()` and `printToPDF`
- **Native notifications** (toast on the OS)
- **Single-instance lock** + "minimize to tray on close"
- **Auth**: bcrypt login + secondary 6-digit code (device-locked) + TOTP 2FA scaffolding
- **15-minute inactivity lock** → re-prompts for the access code
- **6 RBAC roles** with route guards and hierarchy
- **Encrypted sensitive columns** at rest (AES-256-GCM with machine-derived key)
- **Multi-tenant schema**: all 21 tables from the spec, with required indexes
- **Dashboard**: live tiles, low-stock alerts, recent invoices
- **Invoice screen** (the spec's headline feature):
  - RTL fixed table, columns right-to-left
  - No "Add Item" button — Enter in the barcode adds the row
  - Inline ghost autocomplete with first-character matching
  - Real-time totals; remaining is red when positive, green when paid in full
  - Auto-save draft every 30s to localStorage (restored on reload)
  - Keyboard shortcuts: `F2` new row, `F9` print, `Ctrl+S` save
  - On save: writes invoice + items in one transaction and decrements stock
- **Products screen**: search, add, delete; live stock badges (red/orange/green)
- **Clients screen**: search, add, delete; balance & credit-limit columns
- **Invoices list screen**: status + remaining color-coded
- **All 27 spec routes** mounted with role guards. Screens not yet fleshed out
  render a clearly-marked placeholder so the shell stays complete.

## Design tokens

`src/index.css` contains the spec's HSL palette verbatim for both light and
dark modes, plus the signature gradients (`gradient-primary`,
`gradient-success`, `gradient-warning`), shadow tokens
(`--shadow-soft`, `--shadow-glow`, `--shadow-elevated`) and the
glassmorphism `.glass` helper.

## Notes & deliberate trade-offs

- The renderer never touches Node: every DB/auth call crosses IPC.
- `better-sqlite3` is a native module; `npm install` runs `electron-builder
  install-app-deps` automatically to rebuild it against the Electron ABI.
- HashRouter under `file://` is used so deep-linked routes survive a reload.
- A `pending_operations` table is in place for the Supabase sync engine; the
  remote sync HTTP loop itself is left out (the app is fully usable offline).
- Storefront (`/store/:slug`) and 3D components are deferred — the schema
  (`store_orders`, `store_order_items`) is provisioned and ready.
