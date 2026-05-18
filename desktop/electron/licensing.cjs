// Hardware-bound licensing. Each license key:
//   1. Is HMAC-signed by the vendor secret (no signing → invalid key).
//   2. On first activation, binds to this machine's strong fingerprint
//      (hostname + CPU + machine GUID + MAC + anchor UUID).
//   3. The whole license ROW gets a second HMAC computed from
//      (key + fingerprint + activated_at) so tampering with the SQLite
//      file directly is detected on next boot.
//   4. The fingerprint anchor file lives outside the DB — if a user
//      copies the DB to another machine without the anchor, the app
//      refuses to start.
//   5. A `last_check_at` timestamp is updated on every status() call
//      and compared on next boot — clock-rewinding attacks against the
//      trial expiry are detected.
//
// Key layout: SA-<TIER>-<EXPIRY_YYYYMMDD>-<NONCE>-<HMAC10>
const crypto = require('node:crypto');
const dbMod = require('./db.cjs');
const { deviceFingerprint, fingerprintMatches, verifyAnchor, ensureAnchor } = require('./crypto.cjs');

const VENDOR_SECRET =
  process.env.SYSTEMALAA_VENDOR_SECRET ||
  process.env.HORUS_VENDOR_SECRET ||
  'SystemAlaa::vendor-secret::change-me-before-release';

const TRIAL_DAYS = 30;
let userDataDir = null;

function attachApp(electronApp) {
  if (electronApp) userDataDir = electronApp.getPath('userData');
}

function getDir() {
  return userDataDir;
}

// ---------------------------------------------------------------------------
// Schema (idempotent — adds the new tamper-evidence columns if missing)
// ---------------------------------------------------------------------------
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
  const cols = new Set(db.prepare(`PRAGMA table_info(license)`).all().map((r) => r.name));
  if (!cols.has('row_hmac')) {
    try { db.exec(`ALTER TABLE license ADD COLUMN row_hmac TEXT`); } catch (_) { /* ignore */ }
  }
  if (!cols.has('last_check_at')) {
    try { db.exec(`ALTER TABLE license ADD COLUMN last_check_at TEXT`); } catch (_) { /* ignore */ }
  }
  if (!cols.has('check_count')) {
    try { db.exec(`ALTER TABLE license ADD COLUMN check_count INTEGER NOT NULL DEFAULT 0`); } catch (_) { /* ignore */ }
  }
  const trialCols = new Set(db.prepare(`PRAGMA table_info(trial)`).all().map((r) => r.name));
  if (!trialCols.has('last_seen_at')) {
    try { db.exec(`ALTER TABLE trial ADD COLUMN last_seen_at TEXT`); } catch (_) { /* ignore */ }
  }
}

// HMAC of the key payload — used to validate the key shape itself.
function signPayload(payload) {
  return crypto
    .createHmac('sha256', VENDOR_SECRET)
    .update(payload)
    .digest('hex')
    .slice(0, 10)
    .toUpperCase();
}

// HMAC of the WHOLE license row — used to detect tampering of the
// SQLite file. Includes the vendor secret + the device fingerprint so
// copying the row to another machine fails the check.
function signRow({ key, tier, expiry, fingerprint, activatedAt }) {
  return crypto
    .createHmac('sha256', VENDOR_SECRET)
    .update(`row|${key}|${tier}|${expiry}|${fingerprint}|${activatedAt}`)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Vendor issuer helpers
// ---------------------------------------------------------------------------
function issue({ tier = 'PRO', expiry, nonce } = {}) {
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

// ---------------------------------------------------------------------------
// Activate — binds the key to this machine
// ---------------------------------------------------------------------------
function activate(rawKey) {
  ensureTable();
  if (userDataDir) ensureAnchor(userDataDir);

  const key = String(rawKey || '').trim().toUpperCase();
  const parsed = parse(key);
  if (!parsed) return { ok: false, error: 'invalid-key' };

  const exp = `${parsed.expiry.slice(0, 4)}-${parsed.expiry.slice(4, 6)}-${parsed.expiry.slice(6, 8)}`;
  if (new Date(exp) < new Date()) return { ok: false, error: 'expired' };

  const db = dbMod.get();
  const fp = deviceFingerprint(userDataDir);

  const existing = db
    .prepare(`SELECT key, device_fingerprint FROM license WHERE key = ?`)
    .get(key);
  if (existing) {
    if (!fingerprintMatches(existing.device_fingerprint, userDataDir)) {
      return { ok: false, error: 'device-mismatch' };
    }
    return { ok: true, tier: parsed.tier, expiry: exp, alreadyActivated: true };
  }

  // Drop any old license on this machine — only one active key per install.
  db.prepare(`DELETE FROM license`).run();

  const activatedAt = new Date().toISOString();
  const rowHmac = signRow({ key, tier: parsed.tier, expiry: exp, fingerprint: fp, activatedAt });

  db.prepare(
    `INSERT INTO license (key, tier, expiry, device_fingerprint, activated_at, row_hmac, last_check_at, check_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(key, parsed.tier, exp, fp, activatedAt, rowHmac, activatedAt);

  return { ok: true, tier: parsed.tier, expiry: exp };
}

// ---------------------------------------------------------------------------
// Status — strict validation called on boot AND every renderer check
// ---------------------------------------------------------------------------
function ensureTrial() {
  ensureTable();
  const db = dbMod.get();
  const t = db.prepare(`SELECT started_at, last_seen_at FROM trial WHERE id = 1`).get();
  if (!t) {
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO trial (id, started_at, last_seen_at) VALUES (1, ?, ?)`).run(now, now);
    return { started_at: now, last_seen_at: now };
  }
  return t;
}

function touchTrial() {
  const db = dbMod.get();
  db.prepare(`UPDATE trial SET last_seen_at = datetime('now') WHERE id = 1`).run();
}

function status() {
  ensureTable();

  // 1. Anchor file integrity — if removed, refuse to claim ANY licence
  //    is valid. The trial path also requires the anchor to stop a
  //    "copy DB to fresh machine" replay.
  let anchorOk = true;
  let anchorReason = null;
  if (userDataDir) {
    const v = verifyAnchor(userDataDir);
    if (!v.ok) {
      anchorOk = false;
      anchorReason = v.reason;
    }
  }

  const db = dbMod.get();
  const lic = db.prepare(`SELECT * FROM license LIMIT 1`).get();

  if (lic) {
    const fp = deviceFingerprint(userDataDir);

    // 2. Device fingerprint must match (or be the legacy weak one for
    //    grace migration — in which case we silently upgrade the row).
    if (!fingerprintMatches(lic.device_fingerprint, userDataDir)) {
      return {
        active: false,
        reason: 'device-mismatch',
        message: 'الترخيص مفعّل على جهاز آخر. تواصل مع البائع لإعادة الإصدار.',
      };
    }
    if (lic.device_fingerprint !== fp) {
      // Migrate the row to the new strong fingerprint silently
      const newHmac = signRow({
        key: lic.key, tier: lic.tier, expiry: lic.expiry, fingerprint: fp, activatedAt: lic.activated_at,
      });
      db.prepare(
        `UPDATE license SET device_fingerprint = ?, row_hmac = ? WHERE key = ?`,
      ).run(fp, newHmac, lic.key);
    }

    // 3. Anchor must be intact
    if (!anchorOk) {
      return {
        active: false,
        reason: 'anchor-' + (anchorReason || 'missing'),
        message: 'ملف ربط الجهاز مفقود أو تالف — تواصل مع البائع.',
      };
    }

    // 4. Row HMAC must match (catches direct SQLite edits)
    if (lic.row_hmac) {
      const expected = signRow({
        key: lic.key, tier: lic.tier, expiry: lic.expiry,
        fingerprint: lic.device_fingerprint, activatedAt: lic.activated_at,
      });
      if (expected !== lic.row_hmac) {
        return {
          active: false,
          reason: 'tamper-detected',
          message: 'تم اكتشاف تعديل غير مصرّح به على بيانات الترخيص.',
        };
      }
    }

    // 5. Expiry
    const expired = new Date(lic.expiry) < new Date();
    if (expired) {
      return { active: false, reason: 'expired', tier: lic.tier, expiry: lic.expiry };
    }

    // 6. Update last_check_at + count (clock rewind detection)
    const now = new Date();
    const last = lic.last_check_at ? new Date(lic.last_check_at) : null;
    if (last && now < last) {
      // System clock moved backwards — suspicious. Refuse.
      return {
        active: false,
        reason: 'clock-rewind',
        message: 'تم اكتشاف تعديل في توقيت النظام — اضبط الساعة وأعد المحاولة.',
      };
    }
    db.prepare(
      `UPDATE license SET last_check_at = datetime('now'), check_count = check_count + 1 WHERE key = ?`,
    ).run(lic.key);

    return {
      active: true,
      reason: 'ok',
      tier: lic.tier,
      expiry: lic.expiry,
      activated_at: lic.activated_at,
      check_count: (lic.check_count || 0) + 1,
      key_masked: lic.key.replace(/[A-Z0-9]+-[A-F0-9]{10}$/i, '****-**********'),
    };
  }

  // ---- Trial path ----
  if (!anchorOk) {
    return {
      active: false,
      reason: 'anchor-' + (anchorReason || 'missing'),
      message: 'ملف ربط الجهاز مفقود — يبدو أن البيانات نُقلت من جهاز آخر.',
    };
  }

  const t = ensureTrial();
  const now = new Date();
  // Clock-rewind detection on trial too
  if (t.last_seen_at && now < new Date(t.last_seen_at)) {
    return {
      active: false,
      reason: 'clock-rewind',
      message: 'تم اكتشاف تعديل في توقيت النظام.',
    };
  }
  touchTrial();

  const started = new Date(t.started_at);
  const elapsedDays = Math.floor((now.getTime() - started.getTime()) / 86400000);
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

// ---------------------------------------------------------------------------
// Boot check — called once on app.whenReady. Logs to console and
// returns a status object the main process can react to.
// ---------------------------------------------------------------------------
function bootCheck() {
  try {
    ensureTable();
    if (userDataDir) ensureAnchor(userDataDir);
    const s = status();
    if (!s.active) {
      console.warn('[Horus] license boot check FAILED:', s.reason, s.message || '');
    } else {
      console.log('[Horus] license boot check OK:', s.tier, '(', s.reason, ')');
    }
    return s;
  } catch (err) {
    console.error('[Horus] license boot check error:', err.message);
    return { active: false, reason: 'boot-error', message: String(err.message || err) };
  }
}

module.exports = { issue, parse, activate, status, deactivate, bootCheck, attachApp };
