// Talabat connector — the Middle East food delivery giant. Talabat does
// NOT publish a public Admin API; integration is via their Partner Portal
// + signed webhooks. We expose the receive side here (incoming orders)
// and a stub status-update that POSTs back through the merchant's
// configured callback URL.
//
// Tenants configure the shared secret in company_settings under
// talabat_webhook_secret.

const dbMod = require('../db.cjs');
const { v4: uuid } = require('uuid');
const crypto = require('node:crypto');

function secretFor(tenantId) {
  const row = dbMod.get().prepare(
    `SELECT value FROM company_settings WHERE tenant_id = ? AND key = 'talabat_webhook_secret'`,
  ).get(tenantId);
  return row?.value || null;
}

// Verify HMAC-SHA256 signature in X-Talabat-Signature header
function verifySignature({ tenantId, rawBody, signature }) {
  const secret = secretFor(tenantId);
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch (_) {
    return false;
  }
}

function receiveWebhook({ tenantId, payload, signature, rawBody }) {
  if (rawBody && signature && !verifySignature({ tenantId, rawBody, signature })) {
    throw new Error('invalid talabat signature');
  }
  const order = payload?.order || payload;
  if (!order?.id && !order?.order_id) return { ok: true, ignored: true };
  const id = String(order.id || order.order_id);
  dbMod.get().prepare(
    `INSERT INTO store_orders (id, tenant_id, source, external_order_id, client_name, client_phone,
                               total, status, raw_json, created_at)
     VALUES (?, ?, 'talabat', ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, source, external_order_id) DO UPDATE SET
       status = excluded.status, raw_json = excluded.raw_json`,
  ).run(
    uuid(),
    tenantId,
    id,
    order.customer?.name || null,
    order.customer?.phone || null,
    Number(order.total) || Number(order.amount) || 0,
    order.status || 'received',
    JSON.stringify(order),
  );
  return { ok: true };
}

// Talabat does not offer outbound status push on a public endpoint; the
// vendor POSTS to whatever callback URL the merchant configured in the
// Partner Portal. We treat it as best-effort and record the attempt.
async function updateOrderStatus({ tenantId, externalOrderId, status, callbackUrl }) {
  if (!callbackUrl) return { ok: false, error: 'callback URL not configured' };
  const secret = secretFor(tenantId);
  const body = JSON.stringify({ order_id: externalOrderId, status });
  const sig = secret ? crypto.createHmac('sha256', secret).update(body).digest('hex') : '';
  const r = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Talabat-Signature': sig,
    },
    body,
  });
  return { ok: r.ok, status: r.status };
}

function syncCatalog() {
  // Talabat catalog is managed inside their Partner Portal — there is no
  // outbound push endpoint. We document this and let the merchant manage
  // their menu in Talabat directly.
  return { ok: false, error: 'Talabat catalog is managed inside Partner Portal — no push API available.' };
}

module.exports = { syncCatalog, receiveWebhook, updateOrderStatus, verifySignature };
