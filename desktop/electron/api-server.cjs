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

    send(res, 404, { error: 'not found' });
  } catch (err) {
    console.error('[SystemAlaa API] error:', err);
    send(res, 500, { error: String(err.message || err) });
  }
}

module.exports = { start, stop, getServerState };
