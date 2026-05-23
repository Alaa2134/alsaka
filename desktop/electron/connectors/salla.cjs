// Salla connector — Saudi marketplace. We use a Personal Access Token
// (Merchant App → Tokens) for the simplest tenant-side onboarding.
// Salla docs: https://docs.salla.dev/

const dbMod = require('../db.cjs');
const { v4: uuid } = require('uuid');

const BASE = 'https://api.salla.dev/admin/v2';

function tokenFor(tenantId) {
  const row = dbMod.get().prepare(
    `SELECT * FROM connections WHERE tenant_id = ? AND provider = 'salla'`,
  ).get(tenantId);
  if (!row) throw new Error('Salla not connected for this tenant');
  return dbMod.decryptRow('connections', row).access_token;
}

async function call(tenantId, path, init = {}) {
  const token = tokenFor(tenantId);
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `Salla ${r.status}`);
  return data;
}

// Push every active product into Salla. Mapping is intentionally minimal
// because each Salla store has its own categories — we let the merchant
// finish the mapping inside Salla after the initial dump.
async function syncCatalog({ tenantId }) {
  const db = dbMod.get();
  const products = db
    .prepare(`SELECT id, name, sku, item_number, price, stock, description, image_url FROM products WHERE tenant_id = ? AND is_active = 1 LIMIT 500`)
    .all(tenantId);
  let pushed = 0, failed = 0;
  for (const p of products) {
    try {
      await call(tenantId, '/products', {
        method: 'POST',
        body: JSON.stringify({
          name: p.name,
          sku: p.sku || p.item_number || p.id,
          price: Number(p.price) || 0,
          quantity: Number(p.stock) || 0,
          description: p.description || '',
          status: 'sale',
        }),
      });
      pushed++;
    } catch (err) {
      failed++;
      console.warn('[Salla] push failed for', p.name, err.message);
    }
  }
  return { ok: true, pushed, failed };
}

// Salla pushes webhooks for new orders. The api-server forwards us the
// raw body; we map to store_orders so it appears in the Orders screen.
function receiveWebhook({ tenantId, payload }) {
  const event = payload?.event;
  if (event !== 'order.created' && event !== 'order.updated') return { ok: true, ignored: true };
  const order = payload.data;
  if (!order) return { ok: true, ignored: true };
  const db = dbMod.get();
  db.prepare(
    `INSERT INTO store_orders (id, tenant_id, source, external_order_id, client_name, client_phone,
                               total, status, raw_json, created_at)
     VALUES (?, ?, 'salla', ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, source, external_order_id) DO UPDATE SET
       status = excluded.status, raw_json = excluded.raw_json`,
  ).run(
    uuid(),
    tenantId,
    String(order.id),
    order?.customer?.name || null,
    order?.customer?.mobile || null,
    Number(order.amounts?.total?.amount) || 0,
    order.status?.name || 'new',
    JSON.stringify(order),
  );
  return { ok: true };
}

async function updateOrderStatus({ tenantId, externalOrderId, status }) {
  return call(tenantId, `/orders/${externalOrderId}/status`, {
    method: 'POST',
    body: JSON.stringify({ slug: status }),
  });
}

module.exports = { syncCatalog, receiveWebhook, updateOrderStatus };
