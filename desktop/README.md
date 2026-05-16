# SystemAlaa Desktop

Arabic RTL invoice & inventory desktop app — built **from scratch** as an
Electron + React + TypeScript + Vite + Tailwind project with an embedded
SQLite database (`better-sqlite3`).

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

## First run

```bash
cd desktop
npm install
npm run dev:electron   # spins Vite + Electron with live reload
```

Default seeded admin (created on first launch):

```
admin@systemalaa.app / admin
Access code: 000000  (set a new one from the access-code screen)
```

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
