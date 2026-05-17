// Tiny embedded REST API. Lets external systems (mobile app, partner
// integrations, delivery aggregators) read/write SystemAlaa data with
// scoped API keys. The server uses Node's built-in http module so no
// extra deps are required.
const http = require('node:http');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const dbMod = require('./db.cjs');
const repo = require('./repo.cjs');
const store = require('./store.cjs');
const qrMenu = require('./qr-menu.cjs');

const PORT = Number(process.env.SYSTEMALAA_API_PORT || 27817);
let server = null;
let listening = false;

function start() {
  if (listening) return { ok: true, port: PORT };
  server = http.createServer(handle);
  return new Promise((resolve, reject) => {
    server.once('error', (err) => reject(err));
    server.listen(PORT, '127.0.0.1', () => {
      listening = true;
      resolve({ ok: true, port: PORT });
    });
  });
}

function stop() {
  if (!server) return;
  server.close();
  listening = false;
  server = null;
}

function getServerState() {
  return { listening, port: PORT };
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function authenticate(req) {
  const auth = req.headers['authorization'] || '';
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
  if (!m) return null;
  const key = m[1];
  const db = dbMod.get();
  const row = db.prepare(`SELECT * FROM api_keys WHERE is_active = 1`).all().find((r) => {
    try {
      const decrypted = dbMod.decryptRow('api_keys', r);
      return decrypted.key_hash === key;
    } catch { return false; }
  });
  if (!row) return null;
  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  return { tenantId: row.tenant_id, scopes: (row.scopes || '').split(',') };
}

async function handle(req, res) {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, {});
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;

    // Public health check
    if (path === '/health') return send(res, 200, { ok: true, server: 'SystemAlaa', port: PORT });

    // Public store feed (matches the standalone storefront)
    if (req.method === 'GET' && path.startsWith('/v1/store/')) {
      const slug = path.split('/')[3];
      const feed = store.buildStorefrontFeed(slug);
      if (!feed) return send(res, 404, { error: 'store not found' });
      return send(res, 200, feed);
    }

    // Public menu feed (QR menu pages on customer phones)
    if (req.method === 'GET' && path.startsWith('/menu/')) {
      const slug = decodeURIComponent(path.split('/')[2] || '');
      const feed = qrMenu.buildMenuFeed({ slug });
      if (!feed) return send(res, 404, { error: 'menu not found' });
      return send(res, 200, feed);
    }

    // Public order placement (matches the storefront API surface)
    if (req.method === 'POST' && path === '/v1/orders') {
      const body = await readJsonBody(req);
      const settings = dbMod.get()
        .prepare(`SELECT tenant_id FROM store_settings WHERE slug = ?`)
        .get(body.slug);
      if (!settings) return send(res, 404, { error: 'store not found' });
      try {
        const result = store.placeOrder({ ...body, tenantId: settings.tenant_id });
        return send(res, 201, { ok: true, order_number: result.order.order_number, id: result.order.id });
      } catch (err) {
        return send(res, 400, { error: String(err.message || err) });
      }
    }

    // Authenticated endpoints
    const auth = authenticate(req);
    if (!auth) return send(res, 401, { error: 'invalid api key' });

    // GET /v1/products
    if (req.method === 'GET' && path === '/v1/products') {
      const rows = repo.list('products', { tenantId: auth.tenantId, limit: 1000 });
      return send(res, 200, { data: rows });
    }
    // GET /v1/clients
    if (req.method === 'GET' && path === '/v1/clients') {
      const rows = repo.list('clients', { tenantId: auth.tenantId, limit: 1000 });
      return send(res, 200, { data: rows });
    }
    // GET /v1/invoices
    if (req.method === 'GET' && path === '/v1/invoices') {
      const rows = repo.list('invoices', { tenantId: auth.tenantId, limit: 200 });
      return send(res, 200, { data: rows });
    }
    // POST /v1/invoices
    if (req.method === 'POST' && path === '/v1/invoices') {
      if (!auth.scopes.includes('write') && !auth.scopes.includes('admin')) {
        return send(res, 403, { error: 'scope: write required' });
      }
      const body = await readJsonBody(req);
      const result = repo.saveInvoice({
        invoice: { ...body.invoice, tenant_id: auth.tenantId },
        items: body.items || [],
      });
      return send(res, 201, result);
    }
    // GET /v1/dashboard
    if (req.method === 'GET' && path === '/v1/dashboard') {
      return send(res, 200, repo.dashboardStats({ tenantId: auth.tenantId }));
    }

    // GET /v1/employees
    if (req.method === 'GET' && path === '/v1/employees') {
      const rows = repo.list('employees', { tenantId: auth.tenantId, limit: 500 });
      return send(res, 200, { data: rows });
    }

    // GET /v1/suppliers
    if (req.method === 'GET' && path === '/v1/suppliers') {
      const rows = repo.list('suppliers', { tenantId: auth.tenantId, limit: 500 });
      return send(res, 200, { data: rows });
    }

    // GET /v1/branches
    if (req.method === 'GET' && path === '/v1/branches') {
      const rows = repo.list('branches', { tenantId: auth.tenantId, limit: 100 });
      return send(res, 200, { data: rows });
    }

    // GET /v1/payroll → latest payroll runs + lines
    if (req.method === 'GET' && path === '/v1/payroll') {
      const runs = repo.list('payroll_runs', {
        tenantId: auth.tenantId,
        limit: 24,
        orderBy: 'run_month DESC',
      });
      return send(res, 200, { data: runs });
    }

    // GET /v1/notifications
    if (req.method === 'GET' && path === '/v1/notifications') {
      const rows = repo.list('notifications', {
        tenantId: auth.tenantId,
        limit: 100,
        orderBy: 'created_at DESC',
      });
      return send(res, 200, { data: rows });
    }

    // GET /v1/store-orders
    if (req.method === 'GET' && path === '/v1/store-orders') {
      const rows = repo.list('store_orders', { tenantId: auth.tenantId, limit: 200 });
      return send(res, 200, { data: rows });
    }

    // GET /v1/analytics/sales?days=30 — daily sales series for the
    // owner dashboard charts. Returns [{ date: "YYYY-MM-DD",
    // sales: number, invoices: number }] up to `days` rows.
    if (req.method === 'GET' && path === '/v1/analytics/sales') {
      const days = Math.min(Number(url.searchParams.get('days') || '30'), 365);
      const rows = dbMod.get().prepare(
        `SELECT date(created_at) AS date,
                SUM(total) AS sales,
                COUNT(*) AS invoices
           FROM invoices
          WHERE tenant_id = ?
            AND created_at >= datetime('now', '-' || ? || ' days')
            AND is_return = 0
          GROUP BY date(created_at)
          ORDER BY date ASC`,
      ).all(auth.tenantId, days);
      return send(res, 200, { data: rows });
    }

    // GET /v1/analytics/top-products?days=30&limit=10
    if (req.method === 'GET' && path === '/v1/analytics/top-products') {
      const days = Math.min(Number(url.searchParams.get('days') || '30'), 365);
      const limit = Math.min(Number(url.searchParams.get('limit') || '10'), 100);
      const rows = dbMod.get().prepare(
        `SELECT p.id, p.name,
                SUM(ii.quantity) AS qty,
                SUM(ii.total) AS revenue
           FROM invoice_items ii
           JOIN invoices i ON i.id = ii.invoice_id
           JOIN products p ON p.id = ii.product_id
          WHERE i.tenant_id = ? AND i.created_at >= datetime('now', '-' || ? || ' days')
          GROUP BY p.id
          ORDER BY revenue DESC
          LIMIT ?`,
      ).all(auth.tenantId, days, limit);
      return send(res, 200, { data: rows });
    }

    // GET /v1/analytics/ar-aging — open invoices with how late
    if (req.method === 'GET' && path === '/v1/analytics/ar-aging') {
      const accounting = require('./accounting.cjs');
      return send(res, 200, { data: accounting.arAging({ tenantId: auth.tenantId }) });
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('[SystemAlaa API] error:', err);
    send(res, 500, { error: String(err.message || err) });
  }
}

module.exports = { start, stop, getServerState };
