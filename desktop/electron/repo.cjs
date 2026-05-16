// Thin "repository" over the SQLite DB. Returns plain JSON-safe objects.
// Each function decrypts sensitive columns on the way out so the renderer
// never sees ciphertext.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

const allowedTables = new Set([
  'products',
  'clients',
  'categories',
  'warehouses',
  'invoices',
  'invoice_items',
  'payments',
  'returns',
  'return_items',
  'company_settings',
  'invoice_templates',
  'label_templates',
  'security_events',
  'audit_logs',
  'store_orders',
  'store_order_items',
  'notifications',
  'pending_operations',
  'app_users',
  'tenants',
]);

function assertTable(name) {
  if (!allowedTables.has(name)) throw new Error(`unsupported table: ${name}`);
}

function newId() {
  return uuid();
}

function list(table, { tenantId, where = {}, orderBy = 'created_at DESC', limit = 500 } = {}) {
  assertTable(table);
  const db = dbMod.get();
  const conditions = [];
  const params = {};
  if (tenantId) {
    conditions.push('tenant_id = @tenantId');
    params.tenantId = tenantId;
  }
  for (const [k, v] of Object.entries(where)) {
    conditions.push(`${k} = @${k}`);
    params[k] = v;
  }
  const sql = `SELECT * FROM ${table}${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''} ORDER BY ${orderBy} LIMIT ${Number(limit) || 500}`;
  return dbMod.decryptRows(table, db.prepare(sql).all(params));
}

function getById(table, id) {
  assertTable(table);
  const db = dbMod.get();
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  return dbMod.decryptRow(table, row);
}

function insert(table, row) {
  assertTable(table);
  const db = dbMod.get();
  const data = dbMod.encryptRow(table, { id: row.id || newId(), ...row });
  const cols = Object.keys(data);
  const placeholders = cols.map((c) => '@' + c).join(', ');
  db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(data);
  return getById(table, data.id);
}

function update(table, id, patch) {
  assertTable(table);
  const db = dbMod.get();
  const data = dbMod.encryptRow(table, { ...patch });
  const cols = Object.keys(data);
  if (!cols.length) return getById(table, id);
  const setClause = cols.map((c) => `${c} = @${c}`).join(', ');
  db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = @id`).run({ ...data, id });
  return getById(table, id);
}

function remove(table, id) {
  assertTable(table);
  const db = dbMod.get();
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  return { ok: true };
}

// Invoice composite: header + items in one transaction, with stock decrement.
function saveInvoice({ invoice, items }) {
  const db = dbMod.get();
  const txn = db.transaction(() => {
    const id = invoice.id || newId();
    const existing = db.prepare(`SELECT id FROM invoices WHERE id = ?`).get(id);

    const total = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
    const discount = Number(invoice.discount) || 0;
    const paid = Number(invoice.paid) || 0;
    const remaining = total - discount - paid;

    const header = {
      id,
      tenant_id: invoice.tenant_id,
      client_id: invoice.client_id || null,
      user_id: invoice.user_id || null,
      number: invoice.number || null,
      type: invoice.type || 'sales',
      total,
      discount,
      paid,
      remaining,
      status: invoice.status || (remaining <= 0 ? 'paid' : 'open'),
      notes: invoice.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const cols = Object.keys(header);
      const setClause = cols.map((c) => `${c} = @${c}`).join(', ');
      db.prepare(`UPDATE invoices SET ${setClause} WHERE id = @id`).run(header);
      db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`).run(id);
    } else {
      const cols = Object.keys(header);
      const placeholders = cols.map((c) => '@' + c).join(', ');
      db.prepare(`INSERT INTO invoices (${cols.join(', ')}) VALUES (${placeholders})`).run(header);
    }

    const itemInsert = db.prepare(
      `INSERT INTO invoice_items (id, invoice_id, product_id, product_name, quantity, price, total, commission_rate)
       VALUES (@id, @invoice_id, @product_id, @product_name, @quantity, @price, @total, @commission_rate)`,
    );
    const decStock = db.prepare(
      `UPDATE products SET stock = MAX(0, stock - @qty), updated_at = datetime('now') WHERE id = @pid`,
    );
    for (const it of items) {
      const rowId = it.id || newId();
      itemInsert.run({
        id: rowId,
        invoice_id: id,
        product_id: it.product_id || null,
        product_name: it.product_name,
        quantity: Number(it.quantity) || 0,
        price: Number(it.price) || 0,
        total: Number(it.total) || 0,
        commission_rate: it.commission_rate == null ? null : Number(it.commission_rate),
      });
      if (!existing && it.product_id && invoice.type !== 'return') {
        decStock.run({ qty: Number(it.quantity) || 0, pid: it.product_id });
      }
    }

    return id;
  });

  const id = txn();
  const saved = getById('invoices', id);
  const items2 = dbMod.decryptRows(
    'invoice_items',
    dbMod.get().prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(id),
  );
  return { invoice: saved, items: items2 };
}

function searchProducts({ tenantId, query, limit = 20 }) {
  const db = dbMod.get();
  const q = `${query || ''}%`;
  return db
    .prepare(
      `SELECT * FROM products
        WHERE tenant_id = @tid AND is_active = 1
          AND (name LIKE @q OR item_number LIKE @q OR barcode = @exact)
        ORDER BY name ASC
        LIMIT @limit`,
    )
    .all({ tid: tenantId, q, exact: query || '', limit });
}

function dashboardStats({ tenantId }) {
  const db = dbMod.get();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const get = (sql, params) => db.prepare(sql).get(params) || {};

  return {
    salesToday: get(
      `SELECT COALESCE(SUM(total), 0) AS v FROM invoices WHERE tenant_id = @tid AND created_at >= @from`,
      { tid: tenantId, from: startOfDay },
    ).v,
    salesMonth: get(
      `SELECT COALESCE(SUM(total), 0) AS v FROM invoices WHERE tenant_id = @tid AND created_at >= @from`,
      { tid: tenantId, from: startOfMonth },
    ).v,
    invoicesCount: get(
      `SELECT COUNT(*) AS v FROM invoices WHERE tenant_id = @tid`,
      { tid: tenantId },
    ).v,
    productsCount: get(
      `SELECT COUNT(*) AS v FROM products WHERE tenant_id = @tid AND is_active = 1`,
      { tid: tenantId },
    ).v,
    clientsCount: get(
      `SELECT COUNT(*) AS v FROM clients WHERE tenant_id = @tid`,
      { tid: tenantId },
    ).v,
    lowStock: db
      .prepare(
        `SELECT id, name, stock, min_stock FROM products
         WHERE tenant_id = @tid AND stock <= min_stock AND is_active = 1
         ORDER BY stock ASC LIMIT 10`,
      )
      .all({ tid: tenantId }),
    recentInvoices: db
      .prepare(
        `SELECT id, number, total, paid, remaining, status, created_at
         FROM invoices WHERE tenant_id = @tid ORDER BY created_at DESC LIMIT 10`,
      )
      .all({ tid: tenantId }),
  };
}

module.exports = {
  list,
  getById,
  insert,
  update,
  remove,
  saveInvoice,
  searchProducts,
  dashboardStats,
};
