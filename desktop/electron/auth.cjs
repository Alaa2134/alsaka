// Auth helpers running in the main process. Renderer never sees bcrypt
// hashes or the device fingerprint directly.
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { authenticator } = require('otplib');
const dbMod = require('./db.cjs');
const { deviceFingerprint } = require('./crypto.cjs');
const accounting = require('./accounting.cjs');
const security = require('./security.cjs');

const BCRYPT_COST = 12;

function ensureSeedTenantAndAdmin() {
  const db = dbMod.get();
  const tenantCount = db.prepare(`SELECT COUNT(*) AS n FROM tenants`).get().n;
  if (tenantCount > 0) {
    // Tenant exists but may have been seeded before the accounting tables
    // were added — make sure the chart of accounts is in place.
    const tenants = db.prepare(`SELECT id FROM tenants`).all();
    for (const t of tenants) accounting.ensureChartOfAccounts(t.id);
    return;
  }

  const tenantId = uuid();
  db.prepare(
    `INSERT INTO tenants (id, name, slug, is_active) VALUES (?, ?, ?, 1)`,
  ).run(tenantId, 'SystemAlaa', 'systemalaa');

  const adminId = uuid();
  const passwordHash = security.hashPassword('admin');
  const accessHash = security.hashPassword('000000');
  db.prepare(
    `INSERT INTO app_users (id, tenant_id, email, name, password_hash, access_code_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
  ).run(adminId, tenantId, 'admin@systemalaa.app', 'System Manager', passwordHash, accessHash, 'system_manager');

  db.prepare(`INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`).run(
    uuid(),
    adminId,
    'system_manager',
  );

  // Seed the standard Arabic chart of accounts + system-account mapping.
  accounting.ensureChartOfAccounts(tenantId);
}

function recordEvent({ tenantId, userId, eventType, metadata }) {
  const db = dbMod.get();
  db.prepare(
    `INSERT INTO security_events (id, tenant_id, user_id, event_type, metadata)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(uuid(), tenantId || null, userId || null, eventType, metadata ? JSON.stringify(metadata) : null);
}

function sanitizeUser(user) {
  if (!user) return null;
  const decrypted = dbMod.decryptRow('app_users', user);
  return {
    id: decrypted.id,
    tenant_id: decrypted.tenant_id,
    email: decrypted.email,
    name: decrypted.name,
    role: decrypted.role,
    is_active: !!decrypted.is_active,
    two_factor_enabled: !!decrypted.two_factor_secret,
    last_login: decrypted.last_login,
  };
}

function login({ email, password }) {
  const db = dbMod.get();
  const lockKey = `login:${String(email || '').toLowerCase()}`;
  if (security.isLocked(lockKey)) {
    security.appendAudit({ action: 'login.locked', data: { email } });
    return { ok: false, error: 'locked-out' };
  }

  const user = db
    .prepare(`SELECT * FROM app_users WHERE LOWER(email) = LOWER(?) AND is_active = 1`)
    .get(email);
  if (!user) {
    const status = security.recordFailure(lockKey);
    security.appendAudit({ action: 'login.failed', data: { email, reason: 'no-user', ...status } });
    recordEvent({ eventType: 'login.failed', metadata: { email, reason: 'no-user' } });
    return { ok: false, error: 'invalid-credentials' };
  }
  if (!security.verifyPassword(password, user.password_hash)) {
    const status = security.recordFailure(lockKey);
    security.appendAudit({
      tenantId: user.tenant_id,
      userId: user.id,
      action: 'login.failed',
      data: { reason: 'bad-password', ...status },
    });
    recordEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      eventType: 'login.failed',
      metadata: { reason: 'bad-password' },
    });
    return { ok: false, error: 'invalid-credentials' };
  }

  // Successful login → reset lockout counter and opportunistically upgrade
  // legacy bcrypt hashes to scrypt.
  security.resetFailures(lockKey);
  if (user.password_hash && user.password_hash.startsWith('$2')) {
    db.prepare(`UPDATE app_users SET password_hash = ? WHERE id = ?`).run(
      security.hashPassword(password),
      user.id,
    );
  }

  const decryptedUser = dbMod.decryptRow('app_users', user);
  const needsTwoFactor = !!decryptedUser.two_factor_secret;

  db.prepare(`UPDATE app_users SET last_login = datetime('now') WHERE id = ?`).run(user.id);
  security.appendAudit({ tenantId: user.tenant_id, userId: user.id, action: 'login.success' });
  recordEvent({ tenantId: user.tenant_id, userId: user.id, eventType: 'login.success' });

  return {
    ok: true,
    user: sanitizeUser(user),
    needsTwoFactor,
    needsAccessCode: !!user.access_code_hash,
  };
}

function verifyAccessCode({ userId, code }) {
  const db = dbMod.get();
  const user = db.prepare(`SELECT * FROM app_users WHERE id = ?`).get(userId);
  if (!user || !user.access_code_hash) return { ok: false, error: 'no-code' };

  // Hardware-lock: if device_fingerprint exists, it must match this machine.
  const currentFp = deviceFingerprint();
  if (user.device_fingerprint && user.device_fingerprint !== currentFp) {
    recordEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      eventType: 'access_code.device_mismatch',
    });
    return { ok: false, error: 'device-mismatch' };
  }

  const lockKey = `access_code:${user.id}`;
  if (security.isLocked(lockKey)) {
    return { ok: false, error: 'locked-out' };
  }
  if (!security.verifyPassword(String(code), user.access_code_hash)) {
    const status = security.recordFailure(lockKey);
    security.appendAudit({
      tenantId: user.tenant_id,
      userId: user.id,
      action: 'access_code.failed',
      data: status,
    });
    recordEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      eventType: 'access_code.failed',
    });
    return { ok: false, error: 'invalid-code' };
  }
  security.resetFailures(lockKey);

  // First successful verify on a fresh user binds the device fingerprint.
  if (!user.device_fingerprint) {
    db.prepare(`UPDATE app_users SET device_fingerprint = ? WHERE id = ?`).run(currentFp, user.id);
  }
  recordEvent({
    tenantId: user.tenant_id,
    userId: user.id,
    eventType: 'access_code.success',
  });
  return { ok: true };
}

function setAccessCode({ userId, code }) {
  if (!/^\d{6}$/.test(String(code))) return { ok: false, error: 'invalid-format' };
  const db = dbMod.get();
  const hash = security.hashPassword(String(code));
  db.prepare(
    `UPDATE app_users SET access_code_hash = ?, device_fingerprint = NULL WHERE id = ?`,
  ).run(hash, userId);
  security.appendAudit({ userId, action: 'access_code.set' });
  return { ok: true };
}

function setupTwoFactor({ userId }) {
  const db = dbMod.get();
  const user = db.prepare(`SELECT email FROM app_users WHERE id = ?`).get(userId);
  if (!user) return { ok: false, error: 'no-user' };
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, 'SystemAlaa', secret);
  // Stored only after the user confirms (verifyTwoFactor)
  return { ok: true, secret, otpauth };
}

function verifyTwoFactor({ userId, secret, code }) {
  const ok = authenticator.check(String(code), secret);
  if (!ok) return { ok: false, error: 'invalid-code' };
  const db = dbMod.get();
  // Generate 8 backup codes
  const backups = Array.from({ length: 8 }, () =>
    Math.random().toString(36).slice(2, 10).toUpperCase(),
  );
  const row = dbMod.encryptRow('app_users', {
    two_factor_secret: secret,
    backup_codes: JSON.stringify(backups),
  });
  db.prepare(
    `UPDATE app_users SET two_factor_secret = @two_factor_secret, backup_codes = @backup_codes WHERE id = @id`,
  ).run({ ...row, id: userId });
  return { ok: true, backupCodes: backups };
}

function checkTwoFactor({ userId, code }) {
  const db = dbMod.get();
  const user = dbMod.decryptRow(
    'app_users',
    db.prepare(`SELECT * FROM app_users WHERE id = ?`).get(userId),
  );
  if (!user || !user.two_factor_secret) return { ok: false, error: 'no-2fa' };
  if (authenticator.check(String(code), user.two_factor_secret)) {
    recordEvent({ tenantId: user.tenant_id, userId, eventType: '2fa.success' });
    return { ok: true };
  }
  try {
    const list = JSON.parse(user.backup_codes || '[]');
    const idx = list.indexOf(String(code).toUpperCase());
    if (idx !== -1) {
      list.splice(idx, 1);
      const row = dbMod.encryptRow('app_users', { backup_codes: JSON.stringify(list) });
      db.prepare(`UPDATE app_users SET backup_codes = @backup_codes WHERE id = @id`).run({
        ...row,
        id: userId,
      });
      recordEvent({ tenantId: user.tenant_id, userId, eventType: '2fa.backup_used' });
      return { ok: true, backupUsed: true };
    }
  } catch (_) {
    /* ignore */
  }
  recordEvent({ tenantId: user.tenant_id, userId, eventType: '2fa.failed' });
  return { ok: false, error: 'invalid-code' };
}

function changePassword({ userId, currentPassword, newPassword }) {
  const db = dbMod.get();
  const user = db.prepare(`SELECT password_hash FROM app_users WHERE id = ?`).get(userId);
  if (!user) return { ok: false, error: 'no-user' };
  if (!security.verifyPassword(currentPassword, user.password_hash)) {
    return { ok: false, error: 'bad-current' };
  }
  const hash = security.hashPassword(newPassword);
  db.prepare(`UPDATE app_users SET password_hash = ? WHERE id = ?`).run(hash, userId);
  security.appendAudit({ userId, action: 'password.changed' });
  return { ok: true };
}

function listUsers({ tenantId }) {
  const db = dbMod.get();
  const rows = db
    .prepare(
      `SELECT id, tenant_id, email, name, role, is_active, last_login, created_at,
              (two_factor_secret IS NOT NULL) AS two_factor_enabled
         FROM app_users WHERE tenant_id = ? ORDER BY created_at DESC`,
    )
    .all(tenantId);
  return rows.map((r) => ({ ...r, is_active: !!r.is_active, two_factor_enabled: !!r.two_factor_enabled }));
}

function createUser({ tenantId, email, name, password, role = 'cashier' }) {
  const db = dbMod.get();
  const id = uuid();
  const hash = security.hashPassword(password);
  db.prepare(
    `INSERT INTO app_users (id, tenant_id, email, name, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  ).run(id, tenantId, email, name || '', hash, role);
  db.prepare(`INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)`).run(uuid(), id, role);
  return { ok: true, id };
}

module.exports = {
  ensureSeedTenantAndAdmin,
  login,
  verifyAccessCode,
  setAccessCode,
  setupTwoFactor,
  verifyTwoFactor,
  checkTwoFactor,
  changePassword,
  listUsers,
  createUser,
  sanitizeUser,
};
