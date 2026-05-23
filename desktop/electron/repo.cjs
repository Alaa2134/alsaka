// Thin "repository" over the SQLite DB. Returns plain JSON-safe objects.
// Each function decrypts sensitive columns on the way out so the renderer
// never sees ciphertext.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');
const { restaurant } = require('./verticals.cjs');
const accounting = require('./accounting.cjs');

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
      payment_method: invoice.payment_method || 'cash',
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
        // Restaurant: if the product has a recipe, decrement each
        // ingredient's stock by (recipe_qty × order_qty). Silent no-op
        // for non-restaurant products.
        try {
          restaurant.depleteForOrderItem({
            tenantId: invoice.tenant_id,
            productId: it.product_id,
            quantity: Number(it.quantity) || 0,
            db: dbMod.get(),
          });
        } catch (err) {
          console.warn('[Horus] recipe depletion failed:', err.message);
        }
      }
    }

    return id;
  });

  const id = txn();

  // Auto-post the matching double-entry journal entry. Failure here must not
  // roll back the invoice itself — accounting can be re-posted manually if a
  // system account is misconfigured.
  try {
    accounting.postSalesInvoice({
      tenantId: invoice.tenant_id,
      invoiceId: id,
      userId: invoice.user_id,
    });
  } catch (err) {
    console.warn('[SystemAlaa] sales auto-post skipped:', err.message);
  }

  // Award loyalty points for sales tied to a customer. Failure must not
  // affect the saved invoice.
  let loyaltyResult = null;
  if (invoice.client_id && invoice.type !== 'return') {
    try {
      const saved0 = getById('invoices', id);
      loyaltyResult = require('./loyalty.cjs').awardForInvoice({
        tenantId: invoice.tenant_id,
        clientId: invoice.client_id,
        invoiceId: id,
        total: saved0.total,
      });
    } catch (err) {
      console.warn('[Horus] loyalty award skipped:', err.message);
    }
  }

  const saved = getById('invoices', id);
  const items2 = dbMod.decryptRows(
    'invoice_items',
    dbMod.get().prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(id),
  );
  return { invoice: saved, items: items2, loyalty: loyaltyResult };
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

// Operational sales report — everything the /reports screen needs in
// one round-trip: a daily sales series, top products by revenue,
// sales split by payment method, low/out-of-stock items, and headline
// totals with estimated profit.
function salesReport({ tenantId, days = 30 }) {
  const db = dbMod.get();
  const since = new Date(Date.now() - Number(days) * 86400000).toISOString();

  const daily = db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day,
              COUNT(*) AS invoices,
              COALESCE(SUM(total), 0) AS sales
         FROM invoices
        WHERE tenant_id = @tid AND created_at >= @since
        GROUP BY day ORDER BY day ASC`,
    )
    .all({ tid: tenantId, since });

  const topProducts = db
    .prepare(
      `SELECT ii.product_name AS name,
              SUM(ii.quantity) AS qty,
              SUM(ii.total) AS revenue
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
        WHERE i.tenant_id = @tid AND i.created_at >= @since
        GROUP BY ii.product_name
        ORDER BY revenue DESC LIMIT 15`,
    )
    .all({ tid: tenantId, since });

  const byPayment = db
    .prepare(
      `SELECT COALESCE(payment_method, 'cash') AS method,
              COUNT(*) AS invoices,
              COALESCE(SUM(total), 0) AS sales
         FROM invoices
        WHERE tenant_id = @tid AND created_at >= @since
        GROUP BY method ORDER BY sales DESC`,
    )
    .all({ tid: tenantId, since });

  const lowStock = db
    .prepare(
      `SELECT id, name, stock, min_stock FROM products
        WHERE tenant_id = @tid AND is_active = 1 AND stock <= min_stock
        ORDER BY stock ASC LIMIT 50`,
    )
    .all({ tid: tenantId });

  const headline = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS sales,
              COALESCE(SUM(paid), 0) AS collected,
              COALESCE(SUM(remaining), 0) AS outstanding,
              COUNT(*) AS invoices
         FROM invoices WHERE tenant_id = @tid AND created_at >= @since`,
    )
    .get({ tid: tenantId, since }) || {};

  // Estimated profit = revenue − COGS, where COGS pulls product.cost.
  const profitRow = db
    .prepare(
      `SELECT COALESCE(SUM(ii.total), 0) AS revenue,
              COALESCE(SUM(ii.quantity * COALESCE(p.cost, 0)), 0) AS cogs
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
         LEFT JOIN products p ON p.id = ii.product_id
        WHERE i.tenant_id = @tid AND i.created_at >= @since`,
    )
    .get({ tid: tenantId, since }) || {};
  const estProfit = (profitRow.revenue || 0) - (profitRow.cogs || 0);

  return {
    days: Number(days),
    headline: {
      sales: headline.sales || 0,
      collected: headline.collected || 0,
      outstanding: headline.outstanding || 0,
      invoices: headline.invoices || 0,
      estProfit,
    },
    daily,
    topProducts,
    byPayment,
    lowStock,
  };
}

// Customer 360 profile: the client row + lifetime stats + recent
// invoices + their most-bought products. Powers the CRM screen.
function clientProfile({ tenantId, clientId }) {
  const db = dbMod.get();
  const client = dbMod.decryptRow(
    'clients',
    db.prepare(`SELECT * FROM clients WHERE id = ? AND tenant_id = ?`).get(clientId, tenantId),
  );
  if (!client) return null;

  const stats = db
    .prepare(
      `SELECT COUNT(*) AS invoices,
              COALESCE(SUM(total), 0) AS lifetime,
              COALESCE(SUM(remaining), 0) AS outstanding,
              MAX(created_at) AS last_at,
              MIN(created_at) AS first_at
         FROM invoices WHERE tenant_id = @t AND client_id = @c`,
    )
    .get({ t: tenantId, c: clientId }) || {};

  const invoices = db
    .prepare(
      `SELECT id, number, total, paid, remaining, status, payment_method, created_at
         FROM invoices WHERE tenant_id = @t AND client_id = @c
        ORDER BY created_at DESC LIMIT 50`,
    )
    .all({ t: tenantId, c: clientId });

  const topItems = db
    .prepare(
      `SELECT ii.product_name AS name, SUM(ii.quantity) AS qty, SUM(ii.total) AS spent
         FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
        WHERE i.tenant_id = @t AND i.client_id = @c
        GROUP BY ii.product_name ORDER BY spent DESC LIMIT 10`,
    )
    .all({ t: tenantId, c: clientId });

  return {
    client,
    stats: {
      invoices: stats.invoices || 0,
      lifetime: stats.lifetime || 0,
      outstanding: stats.outstanding || 0,
      avgTicket: stats.invoices ? (stats.lifetime || 0) / stats.invoices : 0,
      last_at: stats.last_at || null,
      first_at: stats.first_at || null,
    },
    invoices,
    topItems,
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
  salesReport,
  clientProfile,
};
