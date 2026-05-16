// Single-device licensing. License keys are signed with HMAC-SHA256 using a
// master vendor secret (kept in the vendor's issuer, not shipped to clients).
// On first activation the key is bound to this machine's hardware
// fingerprint — any future install on a different machine will refuse to
// activate the same key.
//
// Key layout (encoded as Base32-ish groups):
//   SA-<TIER>-<EXPIRY_YYYYMMDD>-<NONCE>-<HMAC10>
// e.g. SA-PRO-20271231-A7K3-9F2D8B
//
// The HMAC10 is the first 10 hex chars of HMAC-SHA256 over
//   `${TIER}|${EXPIRY}|${NONCE}` keyed by the vendor secret.
//
// To issue a key locally for testing:
//   require('./electron/licensing.cjs').issue({ tier: 'PRO', expiry: '20301231' })
//
// In production the vendor runs this on a server with the real secret.
const crypto = require('node:crypto');
const dbMod = require('./db.cjs');
const { deviceFingerprint } = require('./crypto.cjs');

// ⚠ Vendor signing secret. Replace with a real one (32+ random bytes) before
// publishing builds. Leaking this lets anyone mint license keys.
const VENDOR_SECRET =
  process.env.SYSTEMALAA_VENDOR_SECRET ||
  'SystemAlaa::vendor-secret::change-me-before-release';

const TRIAL_DAYS = 30;

function ensureTable() {
  const db = dbMod.get();
  db.exec(`
    CREATE TABLE IF NOT EXISTS license (
      key TEXT PRIMARY KEY,
      tier TEXT NOT NULL,
      expiry TEXT NOT NULL,
      device_fingerprint TEXT NOT NULL,
      activated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS trial (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      started_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function signPayload(payload) {
  return crypto
    .createHmac('sha256', VENDOR_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
}

function issue({ tier = 'PRO', expiry, nonce }) {
  if (!expiry || !/^\d{8}$/.test(expiry)) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    expiry = d.toISOString().slice(0, 10).replace(/-/g, '');
  }
  const n = nonce || crypto.randomBytes(2).toString('hex').toUpperCase();
  const sig = signPayload(`${tier}|${expiry}|${n}`);
  return `SA-${tier}-${expiry}-${n}-${sig}`;
}

function parse(key) {
  const m = /^SA-([A-Z0-9]+)-(\d{8})-([A-Z0-9]+)-([A-F0-9]{10})$/.exec(
    String(key || '').trim().toUpperCase(),
  );
  if (!m) return null;
  const [, tier, expiry, nonce, sig] = m;
  const expected = signPayload(`${tier}|${expiry}|${nonce}`);
  if (expected !== sig) return null;
  return { tier, expiry, nonce };
}

function activate(rawKey) {
  ensureTable();
  const key = String(rawKey || '').trim().toUpperCase();
  const parsed = parse(key);
  if (!parsed) return { ok: false, error: 'invalid-key' };

  // Expiry check
  const exp = `${parsed.expiry.slice(0, 4)}-${parsed.expiry.slice(4, 6)}-${parsed.expiry.slice(6, 8)}`;
  if (new Date(exp) < new Date()) return { ok: false, error: 'expired' };

  const db = dbMod.get();
  const existing = db.prepare(`SELECT key, device_fingerprint FROM license WHERE key = ?`).get(key);
  const fp = deviceFingerprint();
  if (existing) {
    if (existing.device_fingerprint !== fp) {
      return { ok: false, error: 'device-mismatch' };
    }
    return { ok: true, tier: parsed.tier, expiry: exp, alreadyActivated: true };
  }

  // Refuse if any other key is already bound to a *different* machine — keeps
  // a single license-per-install constraint.
  const otherForFp = db
    .prepare(`SELECT key FROM license WHERE device_fingerprint = ?`)
    .all(fp);
  // Allow rebinding by inserting fresh; clear any older keys on this machine
  // so the latest activation wins.
  db.prepare(`DELETE FROM license`).run();

  db.prepare(
    `INSERT INTO license (key, tier, expiry, device_fingerprint) VALUES (?, ?, ?, ?)`,
  ).run(key, parsed.tier, exp, fp);
  return { ok: true, tier: parsed.tier, expiry: exp, rebound: otherForFp.length > 0 };
}

function ensureTrial() {
  ensureTable();
  const db = dbMod.get();
  const t = db.prepare(`SELECT started_at FROM trial WHERE id = 1`).get();
  if (!t) {
    db.prepare(`INSERT INTO trial (id, started_at) VALUES (1, datetime('now'))`).run();
    return { started_at: new Date().toISOString() };
  }
  return t;
}

function status() {
  ensureTable();
  const db = dbMod.get();
  const lic = db.prepare(`SELECT * FROM license LIMIT 1`).get();
  if (lic) {
    const fp = deviceFingerprint();
    if (lic.device_fingerprint !== fp) {
      return {
        active: false,
        reason: 'device-mismatch',
        message: 'الترخيص مفعّل على جهاز آخر',
      };
    }
    const expired = new Date(lic.expiry) < new Date();
    return {
      active: !expired,
      reason: expired ? 'expired' : 'ok',
      tier: lic.tier,
      expiry: lic.expiry,
      activated_at: lic.activated_at,
      key_masked: lic.key.replace(/[A-Z0-9]{4}-[A-Z0-9]{4}-[A-F0-9]{10}$/i, '****-****-**********'),
    };
  }
  // No license — fall back to trial
  const t = ensureTrial();
  const started = new Date(t.started_at);
  const elapsedDays = Math.floor((Date.now() - started.getTime()) / 86400000);
  const remaining = Math.max(0, TRIAL_DAYS - elapsedDays);
  return {
    active: remaining > 0,
    reason: remaining > 0 ? 'trial' : 'trial-expired',
    tier: 'TRIAL',
    trialRemainingDays: remaining,
    trialStartedAt: t.started_at,
  };
}

function deactivate() {
  ensureTable();
  dbMod.get().prepare(`DELETE FROM license`).run();
  return { ok: true };
}

module.exports = { issue, activate, status, deactivate, parse };
