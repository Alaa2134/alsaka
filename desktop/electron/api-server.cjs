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
const whatsappCloud = require('./whatsapp-cloud.cjs');
const marketplace = require('./marketplace.cjs');

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

function sendHtml(res, status, html) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Renders the QR-menu page customers see on their phone. Self-contained:
// inline CSS, no external assets, RTL Arabic, accent-coloured.
function renderMenuHtml(feed) {
  const s = feed.store || {};
  const accent = s.accent_color ? `hsl(${s.accent_color})` : '#3b82f6';
  const cur = s.currency_symbol || 'ج.م';
  const sections = (feed.sections || []).map((sec) => `
    <section class="sec">
      <h2>${esc(sec.name)}</h2>
      <div class="items">
        ${sec.items.map((it) => `
          <div class="item ${it.available ? '' : 'out'}">
            ${it.image_url ? `<img src="${esc(it.image_url)}" alt="" loading="lazy">` : '<div class="noimg">🍽️</div>'}
            <div class="meta">
              <div class="nm">${esc(it.name)}</div>
              ${s.show_descriptions && it.description ? `<div class="ds">${esc(it.description)}</div>` : ''}
            </div>
            ${s.show_prices ? `<div class="pr">${Number(it.price).toLocaleString()} ${esc(cur)}</div>` : ''}
          </div>`).join('')}
      </div>
    </section>`).join('');

  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.name || 'القائمة')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#f6f7f9;color:#111;padding-bottom:40px}
  .hero{background:${accent};color:#fff;padding:28px 18px;text-align:center}
  .hero img{height:64px;width:64px;border-radius:14px;object-fit:cover;margin-bottom:10px;background:#fff3}
  .hero h1{font-size:26px}
  .hero p{opacity:.9;margin-top:6px;font-size:14px}
  .sec{margin:18px 14px}
  .sec h2{font-size:18px;margin-bottom:10px;padding-right:8px;border-right:4px solid ${accent}}
  .items{display:grid;gap:10px}
  .item{display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:10px;box-shadow:0 1px 3px #0001}
  .item.out{opacity:.45}
  .item img,.noimg{height:60px;width:60px;border-radius:10px;object-fit:cover;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:26px;background:#f0f1f3}
  .meta{flex:1;min-width:0}
  .nm{font-weight:600}
  .ds{font-size:12px;color:#666;margin-top:2px}
  .pr{font-weight:700;color:${accent};white-space:nowrap}
  footer{text-align:center;color:#999;font-size:12px;margin-top:24px}
</style></head><body>
  <div class="hero">
    ${s.logo_url ? `<img src="${esc(s.logo_url)}" alt="">` : ''}
    <h1>${esc(s.name || '')}</h1>
    <p>${esc(s.welcome_message || s.tagline || '')}</p>
  </div>
  ${sections || '<p style="text-align:center;color:#999;margin-top:40px">لا توجد أصناف بعد</p>'}
  <footer>Powered by Horus System 𓁹</footer>
</body></html>`;
}

// Lightweight storefront preview — product grid with prices.
function renderShopHtml(feed) {
  const s = feed.store || feed.settings || feed || {};
  const accent = s.primary_color ? `hsl(${s.primary_color})` : '#3b82f6';
  const cur = s.currency_symbol || 'ج.م';
  const products = feed.products || [];
  const cards = products.map((p) => `
    <div class="card">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="" loading="lazy">` : '<div class="noimg">📦</div>'}
      <div class="nm">${esc(p.name)}</div>
      <div class="pr">${Number(p.store_price ?? p.price).toLocaleString()} ${esc(cur)}</div>
    </div>`).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.name || 'المتجر')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#f6f7f9;color:#111}
  .hero{background:${accent};color:#fff;padding:30px 18px;text-align:center}
  .hero h1{font-size:28px}.hero p{opacity:.9;margin-top:6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:16px}
  .card{background:#fff;border-radius:14px;padding:10px;box-shadow:0 1px 3px #0001;text-align:center}
  .card img,.noimg{height:120px;width:100%;border-radius:10px;object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:40px;background:#f0f1f3}
  .nm{font-weight:600;margin-top:8px;font-size:14px}
  .pr{font-weight:700;color:${accent};margin-top:4px}
  footer{text-align:center;color:#999;font-size:12px;padding:24px}
</style></head><body>
  <div class="hero"><h1>${esc(s.name || '')}</h1><p>${esc(s.tagline || '')}</p></div>
  <div class="grid">${cards || '<p style="color:#999">لا توجد منتجات</p>'}</div>
  <footer>Powered by Horus System 𓁹</footer>
</body></html>`;
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
    if (path === '/health') return send(res, 200, { ok: true, server: 'Horus', port: PORT });

    // Public store feed (matches the standalone storefront)
    if (req.method === 'GET' && path.startsWith('/v1/store/')) {
      const slug = path.split('/')[3];
      const feed = store.buildStorefrontFeed(slug);
      if (!feed) return send(res, 404, { error: 'store not found' });
      return send(res, 200, feed);
    }

    // Public menu — JSON feed when ?format=json, otherwise a full
    // self-contained HTML page the customer's phone (or the merchant's
    // preview) can open directly. This is what makes the localhost
    // preview links actually render instead of dumping raw JSON.
    if (req.method === 'GET' && path.startsWith('/menu/')) {
      const slug = decodeURIComponent(path.split('/')[2] || '');
      const feed = qrMenu.buildMenuFeed({ slug });
      if (!feed) {
        if (url.searchParams.get('format') === 'json') return send(res, 404, { error: 'menu not found' });
        return sendHtml(res, 404, '<h1 style="font-family:sans-serif;text-align:center;margin-top:80px">القائمة غير موجودة</h1>');
      }
      if (url.searchParams.get('format') === 'json') return send(res, 200, feed);
      return sendHtml(res, 200, renderMenuHtml(feed));
    }

    // Public storefront — same dual JSON/HTML behaviour.
    if (req.method === 'GET' && path.startsWith('/shop/')) {
      const slug = decodeURIComponent(path.split('/')[2] || '');
      const feed = store.buildStorefrontFeed(slug);
      if (!feed) return sendHtml(res, 404, '<h1 style="font-family:sans-serif;text-align:center;margin-top:80px">المتجر غير موجود</h1>');
      return sendHtml(res, 200, renderShopHtml(feed));
    }

    // WhatsApp Cloud webhook — Meta subscription verification (GET) +
    // incoming message handler (POST). The tenantId is bound via the
    // query string so the merchant can use one HTTPS endpoint per tenant.
    if (path.startsWith('/v1/wa/webhook')) {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const tenantId = url.searchParams.get('tenant');
      if (!tenantId) return send(res, 400, { error: 'tenant required' });
      if (req.method === 'GET') {
        const challenge = whatsappCloud.verifyWebhook({
          tenantId,
          mode: url.searchParams.get('hub.mode'),
          token: url.searchParams.get('hub.verify_token'),
          challenge: url.searchParams.get('hub.challenge'),
        });
        if (challenge == null) return send(res, 403, { error: 'verify failed' });
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(String(challenge));
        return;
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        return send(res, 200, whatsappCloud.handleWebhook({ tenantId, body }));
      }
    }

    // Marketplace webhooks — POST /v1/marketplace/:provider?tenant=...
    if (req.method === 'POST' && path.startsWith('/v1/marketplace/')) {
      const provider = path.split('/')[3];
      const url = new URL(req.url, `http://${req.headers.host}`);
      const tenantId = url.searchParams.get('tenant');
      if (!tenantId) return send(res, 400, { error: 'tenant required' });
      const rawBody = await new Promise((r) => {
        const bufs = [];
        req.on('data', (c) => bufs.push(c));
        req.on('end', () => r(Buffer.concat(bufs).toString('utf8')));
      });
      let payload = {};
      try { payload = JSON.parse(rawBody); } catch (_) {}
      try {
        const result = marketplace.receiveWebhook({
          provider,
          tenantId,
          payload,
          rawBody,
          topic: req.headers['x-shopify-topic'],
          signature: req.headers['x-talabat-signature'] || req.headers['x-hub-signature-256'],
        });
        return send(res, 200, result);
      } catch (err) {
        return send(res, 400, { error: String(err.message || err) });
      }
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

    // ---- Customer app: phone-OTP login + loyalty + QR scan-pay -------
    // OTP request — for v1 we accept any phone and return a static
    // hint; production stores the code in `pending_operations` with
    // TTL and dispatches via the WhatsApp queue.
    if (req.method === 'POST' && path === '/v1/customer/otp/request') {
      const body = await readJsonBody(req);
      if (!body?.phone) return send(res, 400, { error: 'phone required' });
      // TODO(prod): generate a 6-digit code, store hashed in
      // pending_operations with 5-minute TTL, dispatch via WA queue.
      return send(res, 200, { ok: true, otp_hint: 'check WhatsApp' });
    }
    if (req.method === 'POST' && path === '/v1/customer/otp/verify') {
      const body = await readJsonBody(req);
      if (!body?.phone || !body?.code) return send(res, 400, { error: 'phone + code required' });
      // Bind a synthetic customer token (signed) to the phone. The
      // desktop's auth.cjs may later upgrade this to a real session.
      const token = crypto.createHmac('sha256', process.env.HORUS_OTP_SECRET || 'horus-otp')
        .update(`${body.phone}:${body.code}`).digest('hex').slice(0, 24);
      return send(res, 200, { ok: true, token });
    }

    if (req.method === 'POST' && path === '/v1/customer/scan-pay') {
      const body = await readJsonBody(req);
      if (!body?.tenantId || !body?.ref) return send(res, 400, { error: 'tenantId + ref required' });
      // Mark the cashier-side invoice paid. The ref is the invoice id.
      try {
        dbMod.get().prepare(
          `UPDATE invoices SET paid = total, remaining = 0, status = 'paid', updated_at = datetime('now')
             WHERE id = ? AND tenant_id = ?`,
        ).run(body.ref, body.tenantId);
        return send(res, 200, { ok: true });
      } catch (err) {
        return send(res, 400, { error: String(err.message || err) });
      }
    }

    // ---- Driver app: login + queue + status + proof + shift ----------
    if (req.method === 'POST' && path === '/v1/driver/login') {
      const body = await readJsonBody(req);
      if (!body?.phone) return send(res, 400, { error: 'phone required' });
      const driver = dbMod.get().prepare(
        `SELECT id, name FROM employees WHERE phone = ? AND lower(position) LIKE '%driver%' AND is_active = 1 LIMIT 1`,
      ).get(body.phone);
      if (!driver) return send(res, 401, { error: 'driver not found' });
      // For v1 the "code" is the employee's stored access pin (or any
      // value if pin not set). Same caveat as customer OTP.
      const token = crypto.createHmac('sha256', process.env.HORUS_OTP_SECRET || 'horus-otp')
        .update(`driver:${driver.id}`).digest('hex').slice(0, 24);
      return send(res, 200, { ok: true, token, me: driver });
    }

    if (req.method === 'GET' && path.startsWith('/v1/deliveries')) {
      // Driver-scoped queue. For now we return *all* active deliveries
      // for the tenant; production would filter by driver_id from the
      // token claim.
      const url = new URL(req.url, `http://${req.headers.host}`);
      const tenant = url.searchParams.get('tenant');
      if (!tenant) return send(res, 400, { error: 'tenant required' });
      const rows = dbMod.get().prepare(
        `SELECT * FROM deliveries WHERE tenant_id = ? AND status IN ('queued','picked','in_transit')
         ORDER BY created_at ASC LIMIT 100`,
      ).all(tenant);
      return send(res, 200, { data: rows });
    }

    if (req.method === 'POST' && path.startsWith('/v1/deliveries/') && path.endsWith('/accept')) {
      const id = path.split('/')[3];
      dbMod.get().prepare(
        `UPDATE deliveries SET status = 'picked', accepted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      ).run(id);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path.startsWith('/v1/deliveries/') && path.endsWith('/status')) {
      const id = path.split('/')[3];
      const body = await readJsonBody(req);
      const isDelivered = body.status === 'delivered';
      dbMod.get().prepare(
        `UPDATE deliveries SET status = ?, notes = COALESCE(?, notes),
           delivered_at = CASE WHEN ? THEN datetime('now') ELSE delivered_at END,
           updated_at = datetime('now') WHERE id = ?`,
      ).run(body.status, body.note || null, isDelivered ? 1 : 0, id);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path.startsWith('/v1/deliveries/') && path.endsWith('/proof')) {
      const id = path.split('/')[3];
      const body = await readJsonBody(req);
      dbMod.get().prepare(
        `UPDATE deliveries SET proof_url = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(body.data_url || null, id);
      return send(res, 200, { ok: true });
    }

    if (req.method === 'POST' && path === '/v1/deliveries/route') {
      // Stub route optimizer — preserves stop order. Plug Mapbox
      // Optimization API here when ready.
      const body = await readJsonBody(req);
      return send(res, 200, { optimized: body?.stops || [] });
    }

    if (req.method === 'POST' && path === '/v1/driver/end-shift') {
      const body = await readJsonBody(req);
      const url = new URL(req.url, `http://${req.headers.host}`);
      const tenant = url.searchParams.get('tenant');
      if (!tenant) return send(res, 400, { error: 'tenant required' });
      const id = crypto.randomUUID();
      dbMod.get().prepare(
        `INSERT INTO driver_shifts (id, tenant_id, driver_id, started_at, ended_at, cash_collected, notes)
         VALUES (?, ?, COALESCE(?, ?), datetime('now', '-12 hours'), datetime('now'), ?, ?)`,
      ).run(id, tenant, body.driverId || null, '00000000-0000-0000-0000-000000000000', Number(body.cash_collected) || 0, body.notes || null);
      return send(res, 200, { ok: true });
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
