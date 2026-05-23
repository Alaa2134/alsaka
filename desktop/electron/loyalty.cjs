// Loyalty engine: customers earn points on every linked sale and can
// redeem them for discounts. Tiers upgrade automatically with lifetime
// earnings. Rules are per-tenant and stored in company_settings.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

const DEFAULTS = {
  enabled: true,
  earn_per_currency: 1,   // points earned per 1 EGP spent
  redeem_value: 0.1,      // EGP value of 1 point when redeemed
  tier_silver: 1000,      // lifetime points to reach each tier
  tier_gold: 5000,
  tier_platinum: 20000,
};

const TIER_ORDER = ['standard', 'silver', 'gold', 'platinum'];

function getConfig(tenantId) {
  const db = dbMod.get();
  const rows = db
    .prepare(`SELECT key, value FROM company_settings WHERE tenant_id = ? AND key LIKE 'loyalty.%'`)
    .all(tenantId);
  const cfg = { ...DEFAULTS };
  for (const r of rows) {
    const k = r.key.replace(/^loyalty\./, '');
    if (k === 'enabled') cfg[k] = r.value === '1';
    else cfg[k] = Number(r.value);
  }
  return cfg;
}

function setConfig({ tenantId, patch }) {
  const db = dbMod.get();
  const upsert = db.prepare(
    `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  for (const [k, v] of Object.entries(patch)) {
    const val = typeof v === 'boolean' ? (v ? '1' : '0') : String(v ?? '');
    upsert.run(uuid(), tenantId, `loyalty.${k}`, val);
  }
  return getConfig(tenantId);
}

function tierFor(totalEarned, cfg) {
  if (totalEarned >= cfg.tier_platinum) return 'platinum';
  if (totalEarned >= cfg.tier_gold) return 'gold';
  if (totalEarned >= cfg.tier_silver) return 'silver';
  return 'standard';
}

function ensureAccount(db, tenantId, clientId) {
  let acc = db.prepare(`SELECT * FROM loyalty_accounts WHERE tenant_id = ? AND client_id = ?`).get(tenantId, clientId);
  if (!acc) {
    const id = uuid();
    db.prepare(
      `INSERT INTO loyalty_accounts (id, tenant_id, client_id) VALUES (?, ?, ?)`,
    ).run(id, tenantId, clientId);
    acc = db.prepare(`SELECT * FROM loyalty_accounts WHERE id = ?`).get(id);
  }
  return acc;
}

// Award points for a sale. Called from repo.saveInvoice. Silent no-op
// if loyalty is disabled or the invoice has no client.
function awardForInvoice({ tenantId, clientId, invoiceId, total, db }) {
  if (!clientId) return null;
  const conn = db || dbMod.get();
  const cfg = getConfig(tenantId);
  if (!cfg.enabled) return null;
  const earned = Math.floor((Number(total) || 0) * cfg.earn_per_currency);
  if (earned <= 0) return null;

  const acc = ensureAccount(conn, tenantId, clientId);
  const newTotal = acc.total_earned + earned;
  const newTier = tierFor(newTotal, cfg);
  conn.prepare(
    `UPDATE loyalty_accounts SET points = points + ?, total_earned = ?, tier = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(earned, newTotal, newTier, acc.id);
  conn.prepare(
    `INSERT INTO loyalty_transactions (id, account_id, kind, points, invoice_id, note)
     VALUES (?, ?, 'earn', ?, ?, ?)`,
  ).run(uuid(), acc.id, earned, invoiceId || null, `كسب من فاتورة`);

  const upgraded = TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(acc.tier);
  return { earned, points: acc.points + earned, tier: newTier, upgraded };
}

// Redeem points → returns the EGP discount value to apply.
function redeem({ tenantId, clientId, points }) {
  const db = dbMod.get();
  const cfg = getConfig(tenantId);
  const acc = db.prepare(`SELECT * FROM loyalty_accounts WHERE tenant_id = ? AND client_id = ?`).get(tenantId, clientId);
  if (!acc) return { ok: false, error: 'no-account' };
  const use = Math.min(Number(points) || 0, acc.points);
  if (use <= 0) return { ok: false, error: 'no-points' };
  db.prepare(
    `UPDATE loyalty_accounts SET points = points - ?, total_redeemed = total_redeemed + ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(use, use, acc.id);
  db.prepare(
    `INSERT INTO loyalty_transactions (id, account_id, kind, points, note) VALUES (?, ?, 'redeem', ?, ?)`,
  ).run(uuid(), acc.id, -use, `استبدال`);
  return { ok: true, redeemed: use, discountValue: use * cfg.redeem_value, remaining: acc.points - use };
}

function accountFor({ tenantId, clientId }) {
  const db = dbMod.get();
  return db.prepare(`SELECT * FROM loyalty_accounts WHERE tenant_id = ? AND client_id = ?`).get(tenantId, clientId) || null;
}

function leaderboard({ tenantId, limit = 50 }) {
  const db = dbMod.get();
  return db
    .prepare(
      `SELECT la.*, c.name AS client_name, c.phone AS client_phone
         FROM loyalty_accounts la JOIN clients c ON c.id = la.client_id
        WHERE la.tenant_id = ? ORDER BY la.total_earned DESC LIMIT ?`,
    )
    .all(tenantId, limit);
}

module.exports = { getConfig, setConfig, awardForInvoice, redeem, accountFor, leaderboard, tierFor, DEFAULTS };
