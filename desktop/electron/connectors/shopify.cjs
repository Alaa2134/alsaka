// Shopify connector — uses the Admin REST API. The tenant creates a
// custom app inside their Shopify admin and gives us the store domain +
// access token; we treat the token as the connection's access_token.
// Docs: https://shopify.dev/docs/api/admin-rest

const dbMod = require('../db.cjs');
const { v4: uuid } = require('uuid');

function configFor(tenantId) {
  const row = dbMod.get().prepare(
    `SELECT * FROM connections WHERE tenant_id = ? AND provider = 'shopify'`,
  ).get(tenantId);
  if (!row) throw new Error('Shopify not connected for this tenant');
  const dec = dbMod.decryptRow('connections', row);
  return {
    token: dec.access_token,
    domain: dec.account_login, // e.g. "my-shop.myshopify.com"
  };
}

async function call(tenantId, path, init = {}) {
  const { token, domain } = configFor(tenantId);
  const r = await fetch(`https://${domain}/admin/api/2024-10${path}`, {
    ...init,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.errors || `Shopify ${r.status}`);
  return data;
}

async function syncCatalog({ tenantId }) {
  const db = dbMod.get();
  const products = db
    .prepare(`SELECT id, name, sku, item_number, price, stock, description FROM products WHERE tenant_id = ? AND is_active = 1 LIMIT 500`)
    .all(tenantId);
  let pushed = 0, failed = 0;
  for (const p of products) {
    try {
      await call(tenantId, '/products.json', {
        method: 'POST',
        body: JSON.stringify({
          product: {
            title: p.name,
            body_html: p.description || '',
            status: 'active',
            variants: [{
              price: String(Number(p.price) || 0),
              sku: p.sku || p.item_number || p.id,
              inventory_quantity: Number(p.stock) || 0,
              inventory_management: 'shopify',
            }],
          },
        }),
      });
      pushed++;
    } catch (err) {
      failed++;
      console.warn('[Shopify] push failed for', p.name, err.message);
    }
  }
  return { ok: true, pushed, failed };
}

function receiveWebhook({ tenantId, topic, payload }) {
  if (!topic?.startsWith('orders/')) return { ok: true, ignored: true };
  const order = payload;
  if (!order?.id) return { ok: true, ignored: true };
  dbMod.get().prepare(
    `INSERT INTO store_orders (id, tenant_id, source, external_order_id, client_name, client_phone,
                               total, status, raw_json, created_at)
     VALUES (?, ?, 'shopify', ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, source, external_order_id) DO UPDATE SET
       status = excluded.status, raw_json = excluded.raw_json`,
  ).run(
    uuid(),
    tenantId,
    String(order.id),
    order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null,
    order.customer?.phone || order.phone || null,
    Number(order.total_price) || 0,
    order.financial_status || 'pending',
    JSON.stringify(order),
  );
  return { ok: true };
}

async function updateOrderStatus({ tenantId, externalOrderId, status }) {
  // Shopify uses fulfillment endpoints; this is a simplified call.
  return call(tenantId, `/orders/${externalOrderId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ order: { id: externalOrderId, note: `Status: ${status}` } }),
  });
}

module.exports = { syncCatalog, receiveWebhook, updateOrderStatus };
