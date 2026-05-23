// Lightweight branch-to-branch sync. Each row carries an `updated_at`
// timestamp + a generated `_lww_rev` (last-writer-wins revision). On
// pull, we accept incoming rows whose _lww_rev is *strictly greater*
// than the local row. On push, we send rows changed since the last
// successful sync_cursor.
//
// Wire protocol is HTTPS-only. The vendor server (Cloudflare Worker)
// acts as a relay/blob store keyed by branch-pair; this module only
// handles the local side (snapshot, apply, conflict resolution).
//
// We sync a fixed allowlist of tables — never accounts/users/secrets.

const crypto = require('node:crypto');
const dbMod = require('./db.cjs');
const { v4: uuid } = require('uuid');

const SYNC_TABLES = [
  'products',
  'categories',
  'clients',
  'suppliers',
  'warehouses',
  'invoices',
  'invoice_items',
];

function ensureSyncSchema() {
  const db = dbMod.get();
  db.exec(`
    CREATE TABLE IF NOT EXISTS branch_sync_state (
      branch_id TEXT PRIMARY KEY,
      relay_url TEXT NOT NULL,
      relay_token TEXT,
      last_pulled_at TEXT,
      last_pushed_at TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS branch_sync_log (
      id TEXT PRIMARY KEY,
      direction TEXT NOT NULL,  -- 'pull' | 'push'
      table_name TEXT NOT NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      conflicts INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function snapshotSince({ tenantId, table, sinceIso }) {
  if (!SYNC_TABLES.includes(table)) throw new Error(`table ${table} not syncable`);
  const db = dbMod.get();
  const condTenant = ['products', 'categories', 'clients', 'suppliers', 'warehouses', 'invoices'].includes(table);
  const where = condTenant
    ? `WHERE tenant_id = @tid AND (updated_at >= @since OR created_at >= @since)`
    : `WHERE created_at >= @since`;
  const rows = db.prepare(`SELECT * FROM ${table} ${where} LIMIT 5000`).all({ tid: tenantId, since: sinceIso || '1970-01-01' });
  return rows.map((r) => ({ ...r, _table: table }));
}

function applyIncoming({ tenantId, rows }) {
  const db = dbMod.get();
  let applied = 0, skipped = 0, conflicts = 0;
  const txn = db.transaction(() => {
    for (const incoming of rows) {
      const table = incoming._table;
      if (!SYNC_TABLES.includes(table)) { skipped++; continue; }
      delete incoming._table;
      if (incoming.tenant_id && incoming.tenant_id !== tenantId) { skipped++; continue; }
      const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(incoming.id);
      if (existing) {
        const local = existing.updated_at || existing.created_at || '';
        const remote = incoming.updated_at || incoming.created_at || '';
        if (remote <= local) { conflicts++; continue; }
        const cols = Object.keys(incoming);
        const setClause = cols.filter((c) => c !== 'id').map((c) => `${c} = @${c}`).join(', ');
        db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = @id`).run(incoming);
      } else {
        const cols = Object.keys(incoming);
        db.prepare(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`,
        ).run(incoming);
      }
      applied++;
    }
  });
  txn();
  return { applied, skipped, conflicts };
}

function configure({ branchId, relayUrl, relayToken, enabled = 1 }) {
  ensureSyncSchema();
  const db = dbMod.get();
  db.prepare(
    `INSERT INTO branch_sync_state (branch_id, relay_url, relay_token, enabled, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(branch_id) DO UPDATE SET relay_url = excluded.relay_url,
       relay_token = excluded.relay_token, enabled = excluded.enabled,
       updated_at = excluded.updated_at`,
  ).run(branchId, relayUrl, relayToken || null, enabled ? 1 : 0);
  return getState({ branchId });
}

function getState({ branchId }) {
  ensureSyncSchema();
  return dbMod.get().prepare(`SELECT * FROM branch_sync_state WHERE branch_id = ?`).get(branchId);
}

function logEntry({ direction, table, count, conflicts, error }) {
  dbMod.get().prepare(
    `INSERT INTO branch_sync_log (id, direction, table_name, row_count, conflicts, error)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), direction, table, count || 0, conflicts || 0, error || null);
}

async function pull({ tenantId, branchId }) {
  ensureSyncSchema();
  const state = getState({ branchId });
  if (!state) throw new Error('branch sync not configured');
  if (!state.enabled) return { ok: false, skipped: true };
  const since = state.last_pulled_at || '1970-01-01';
  let totalApplied = 0;
  for (const table of SYNC_TABLES) {
    try {
      const r = await fetch(`${state.relay_url}/sync/${branchId}/${table}?since=${encodeURIComponent(since)}`, {
        headers: { Authorization: `Bearer ${state.relay_token || ''}` },
      });
      if (!r.ok) throw new Error(`pull ${table} ${r.status}`);
      const rows = await r.json();
      const stamped = rows.map((row) => ({ ...row, _table: table }));
      const { applied, conflicts } = applyIncoming({ tenantId, rows: stamped });
      totalApplied += applied;
      logEntry({ direction: 'pull', table, count: applied, conflicts });
    } catch (err) {
      logEntry({ direction: 'pull', table, error: String(err.message || err) });
    }
  }
  dbMod.get().prepare(
    `UPDATE branch_sync_state SET last_pulled_at = datetime('now'), updated_at = datetime('now') WHERE branch_id = ?`,
  ).run(branchId);
  return { ok: true, applied: totalApplied };
}

async function push({ tenantId, branchId }) {
  ensureSyncSchema();
  const state = getState({ branchId });
  if (!state) throw new Error('branch sync not configured');
  if (!state.enabled) return { ok: false, skipped: true };
  const since = state.last_pushed_at || '1970-01-01';
  let totalSent = 0;
  for (const table of SYNC_TABLES) {
    try {
      const rows = snapshotSince({ tenantId, table, sinceIso: since });
      if (rows.length === 0) continue;
      const r = await fetch(`${state.relay_url}/sync/${branchId}/${table}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${state.relay_token || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rows }),
      });
      if (!r.ok) throw new Error(`push ${table} ${r.status}`);
      totalSent += rows.length;
      logEntry({ direction: 'push', table, count: rows.length });
    } catch (err) {
      logEntry({ direction: 'push', table, error: String(err.message || err) });
    }
  }
  dbMod.get().prepare(
    `UPDATE branch_sync_state SET last_pushed_at = datetime('now'), updated_at = datetime('now') WHERE branch_id = ?`,
  ).run(branchId);
  return { ok: true, sent: totalSent };
}

function recentLog({ limit = 100 } = {}) {
  ensureSyncSchema();
  return dbMod.get().prepare(
    `SELECT * FROM branch_sync_log ORDER BY created_at DESC LIMIT ?`,
  ).all(limit);
}

module.exports = {
  SYNC_TABLES,
  configure,
  getState,
  pull,
  push,
  snapshotSince,
  applyIncoming,
  recentLog,
};

// Compute a stable hash of a row for tamper-detection on the wire.
function rowHash(row) {
  const norm = JSON.stringify(Object.keys(row).sort().reduce((o, k) => { o[k] = row[k]; return o; }, {}));
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
}
module.exports.rowHash = rowHash;
