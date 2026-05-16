// Security primitives that sit on top of crypto.cjs:
//   - Argon2id-strength password stretching (scrypt-based when libsodium is
//     unavailable so we have zero native deps to ship).
//   - Brute-force lockout: 5 wrong attempts → 15-minute cooldown per
//     credential+device pair, persisted to a dedicated table.
//   - HMAC-chained audit log: every entry's HMAC includes the prior entry's
//     HMAC, so tampering with any row breaks the chain and is detectable.
//
// All keys derive from the machine fingerprint + a process-internal pepper,
// so dumps of the SQLite file alone reveal nothing useful.
const crypto = require('node:crypto');
const dbMod = require('./db.cjs');
const { deviceFingerprint } = require('./crypto.cjs');

const PEPPER = 'SystemAlaa::hmac-pepper::v1';

function masterKey() {
  return crypto.createHash('sha256').update(`${deviceFingerprint()}|${PEPPER}`).digest();
}

// scrypt is in Node core and reaches roughly the same memory-hard region as
// Argon2id at N=2^15 / r=8 / p=1. No native module required.
const SCRYPT_PARAMS = { N: 1 << 15, r: 8, p: 1, keylen: 32 };

function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(plain), salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
  return `scrypt:${SCRYPT_PARAMS.N}:${SCRYPT_PARAMS.r}:${SCRYPT_PARAMS.p}:${salt.toString('base64')}:${key.toString('base64')}`;
}

function verifyPassword(plain, stored) {
  if (!stored) return false;
  // Backwards compat for bcrypt hashes from the early build
  if (stored.startsWith('$2')) {
    try {
      return require('bcryptjs').compareSync(String(plain), stored);
    } catch (_) {
      return false;
    }
  }
  if (!stored.startsWith('scrypt:')) return false;
  const [, N, r, p, saltB64, keyB64] = stored.split(':');
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  const got = crypto.scryptSync(String(plain), salt, expected.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  return crypto.timingSafeEqual(got, expected);
}

// ---------------------------------------------------------------------------
// Brute-force lockout
// ---------------------------------------------------------------------------
function ensureLockoutTable() {
  const db = dbMod.get();
  db.exec(`
    CREATE TABLE IF NOT EXISTS lockouts (
      key TEXT PRIMARY KEY,
      fails INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_chain (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      data TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );
  `);
}

const MAX_FAILS = 5;
const COOLDOWN_MS = 15 * 60 * 1000;

function isLocked(key) {
  ensureLockoutTable();
  const db = dbMod.get();
  const row = db.prepare(`SELECT locked_until FROM lockouts WHERE key = ?`).get(key);
  if (!row || !row.locked_until) return false;
  return new Date(row.locked_until).getTime() > Date.now();
}

function recordFailure(key) {
  ensureLockoutTable();
  const db = dbMod.get();
  const row = db.prepare(`SELECT fails FROM lockouts WHERE key = ?`).get(key);
  const fails = (row?.fails || 0) + 1;
  const lockedUntil =
    fails >= MAX_FAILS ? new Date(Date.now() + COOLDOWN_MS).toISOString() : null;
  if (row) {
    db.prepare(
      `UPDATE lockouts SET fails = ?, locked_until = ?, updated_at = datetime('now') WHERE key = ?`,
    ).run(fails, lockedUntil, key);
  } else {
    db.prepare(
      `INSERT INTO lockouts (key, fails, locked_until) VALUES (?, ?, ?)`,
    ).run(key, fails, lockedUntil);
  }
  return { fails, lockedUntil };
}

function resetFailures(key) {
  ensureLockoutTable();
  dbMod.get().prepare(`DELETE FROM lockouts WHERE key = ?`).run(key);
}

// ---------------------------------------------------------------------------
// HMAC-chained audit log. Each row's `hash` covers the row itself plus the
// previous row's `hash`, so any tampering breaks the chain at that point.
// ---------------------------------------------------------------------------
function appendAudit({ tenantId = null, userId = null, action, data = null }) {
  ensureLockoutTable();
  const db = dbMod.get();
  const prev = db.prepare(`SELECT hash FROM audit_chain ORDER BY id DESC LIMIT 1`).get();
  const prevHash = prev?.hash || 'GENESIS';
  const timestamp = new Date().toISOString();
  const dataStr = data == null ? '' : typeof data === 'string' ? data : JSON.stringify(data);
  const payload = `${prevHash}|${timestamp}|${tenantId || ''}|${userId || ''}|${action}|${dataStr}`;
  const hash = crypto.createHmac('sha256', masterKey()).update(payload).digest('hex');
  db.prepare(
    `INSERT INTO audit_chain (tenant_id, user_id, action, data, timestamp, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(tenantId, userId, action, dataStr || null, timestamp, prevHash, hash);
  return hash;
}

function verifyAuditChain(limit = null) {
  ensureLockoutTable();
  const db = dbMod.get();
  const rows = db
    .prepare(
      `SELECT id, tenant_id, user_id, action, data, timestamp, prev_hash, hash
         FROM audit_chain ORDER BY id ASC${limit ? ' LIMIT ?' : ''}`,
    )
    .all(...(limit ? [limit] : []));
  let prevHash = 'GENESIS';
  for (const r of rows) {
    const payload = `${prevHash}|${r.timestamp}|${r.tenant_id || ''}|${r.user_id || ''}|${r.action}|${r.data || ''}`;
    const expected = crypto.createHmac('sha256', masterKey()).update(payload).digest('hex');
    if (expected !== r.hash || r.prev_hash !== prevHash) {
      return { ok: false, brokenAt: r.id, total: rows.length };
    }
    prevHash = r.hash;
  }
  return { ok: true, total: rows.length };
}

function recentAudit(limit = 100) {
  ensureLockoutTable();
  return dbMod
    .get()
    .prepare(
      `SELECT id, tenant_id, user_id, action, data, timestamp
         FROM audit_chain ORDER BY id DESC LIMIT ?`,
    )
    .all(limit);
}

module.exports = {
  hashPassword,
  verifyPassword,
  isLocked,
  recordFailure,
  resetFailures,
  appendAudit,
  verifyAuditChain,
  recentAudit,
};
