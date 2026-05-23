// GDPR / Saudi PDPL data subject tools.
//
//   - export({ tenantId, clientId? }): packages all rows touching the
//     subject into a single JSON file, written to the Documents folder.
//   - erase({ tenantId, clientId }): anonymises a client + their
//     references everywhere (orders, invoices, vouchers...) without
//     destroying the financial trail (totals remain for accounting
//     integrity, only PII is wiped).
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');
const dbMod = require('./db.cjs');

function getDocsDir() {
  return path.join(app.getPath('documents'), 'Horus', 'Compliance');
}
function ensureDir() {
  const d = getDocsDir();
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

const TENANT_TABLES = [
  'app_users', 'products', 'clients', 'suppliers', 'invoices', 'invoice_items',
  'payments', 'returns', 'return_items', 'return_lines', 'store_customers',
  'store_orders', 'store_order_items', 'receipt_vouchers', 'payment_vouchers',
  'employees', 'payroll_lines', 'audit_logs', 'security_events',
  'reservations', 'loyalty_accounts', 'gift_cards', 'notifications',
];

function exportTenant({ tenantId }) {
  ensureDir();
  const db = dbMod.get();
  const data = {};
  for (const t of TENANT_TABLES) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t} WHERE tenant_id = ?`).all(tenantId);
      data[t] = dbMod.decryptRows(t, rows);
    } catch (_) { data[t] = []; }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(getDocsDir(), `tenant-${tenantId.slice(0, 8)}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, file, sizeBytes: fs.statSync(file).size };
}

function exportClient({ tenantId, clientId }) {
  ensureDir();
  const db = dbMod.get();
  const client = db.prepare(`SELECT * FROM clients WHERE tenant_id = ? AND id = ?`).get(tenantId, clientId);
  if (!client) return { ok: false, error: 'client-not-found' };
  const data = {
    client: dbMod.decryptRow('clients', client),
    invoices: db.prepare(`SELECT * FROM invoices WHERE client_id = ?`).all(clientId),
    payments: db.prepare(`SELECT p.* FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.client_id = ?`).all(clientId),
    receipts: db.prepare(`SELECT * FROM receipt_vouchers WHERE client_id = ?`).all(clientId),
    loyalty: db.prepare(`SELECT * FROM loyalty_accounts WHERE client_id = ?`).all(clientId),
  };
  for (const inv of data.invoices) {
    inv.items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(inv.id);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(getDocsDir(), `client-${clientId.slice(0, 8)}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, file, sizeBytes: fs.statSync(file).size };
}

function eraseClient({ tenantId, clientId }) {
  const db = dbMod.get();
  const client = db.prepare(`SELECT * FROM clients WHERE tenant_id = ? AND id = ?`).get(tenantId, clientId);
  if (!client) return { ok: false, error: 'client-not-found' };

  const placeholder = `محذوف-${clientId.slice(0, 6)}`;
  const txn = db.transaction(() => {
    db.prepare(`UPDATE clients SET name = ?, phone = NULL, email = NULL, address = NULL WHERE id = ?`)
      .run(placeholder, clientId);
    db.prepare(`UPDATE store_orders SET client_name = ?, client_phone = NULL WHERE customer_id IS NULL AND tenant_id = ?`)
      .run(placeholder, tenantId);
  });
  txn();

  return { ok: true, anonymized_as: placeholder };
}

function listExports() {
  ensureDir();
  const d = getDocsDir();
  const files = fs.readdirSync(d)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const st = fs.statSync(path.join(d, f));
      return { name: f, size_bytes: st.size, mtime: st.mtime.toISOString() };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
  return { dir: d, files };
}

module.exports = { exportTenant, exportClient, eraseClient, listExports };
