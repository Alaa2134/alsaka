-- Horus Vendor SaaS — D1 schema
-- Run with: wrangler d1 execute horus-vendor --file=schema.sql

CREATE TABLE IF NOT EXISTS licenses (
  key TEXT PRIMARY KEY,
  tier TEXT NOT NULL,                  -- BASIC | PRO | ENTERPRISE | TRIAL
  expiry TEXT NOT NULL,                -- YYYY-MM-DD
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT,
  revoked_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS heartbeats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key TEXT NOT NULL,
  fingerprint_short TEXT,
  version TEXT,
  ip TEXT,
  country TEXT,
  city TEXT,
  user_agent TEXT,
  install_count INTEGER NOT NULL DEFAULT 1,
  metadata TEXT,                        -- JSON for extra signals
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_heartbeats_key_received ON heartbeats(license_key, received_at DESC);

-- A materialised view of the latest heartbeat per license — refreshed
-- on each heartbeat insert (or queried as a sub-select).
CREATE TABLE IF NOT EXISTS last_heartbeat (
  license_key TEXT PRIMARY KEY,
  fingerprint_short TEXT,
  version TEXT,
  ip TEXT,
  country TEXT,
  city TEXT,
  received_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS releases (
  version TEXT PRIMARY KEY,             -- semver e.g. "1.2.3"
  channel TEXT NOT NULL DEFAULT 'stable', -- stable | beta
  notes TEXT,
  exe_url TEXT NOT NULL,                -- R2 public URL
  exe_size_bytes INTEGER,
  exe_sha256 TEXT,                      -- for integrity check
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_email TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT,
  ip TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
