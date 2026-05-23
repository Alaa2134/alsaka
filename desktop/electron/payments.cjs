// Payment gateway abstraction. Each provider exports:
//   createCheckout(gateway, order) -> { ok, redirectUrl?, reference, status }
//   verifyWebhook(gateway, payload, signature) -> { ok, reference, status }
//
// Paymob and Fawry are real Egyptian-market integrations driven by the
// keys stored in the gateway's config_json. The rest stay as
// success-shaped stubs so the storefront flow is testable offline.
const crypto = require('node:crypto');

function cfgOf(gateway) {
  try { return JSON.parse(gateway.config_json || gateway.api_credentials_json || '{}'); }
  catch { return {}; }
}

async function createCheckoutFor(gateway, order) {
  const provider = providers[gateway.provider] || providers.cod;
  return provider.createCheckout(gateway, order);
}

function verifyWebhookFor(gateway, payload, signature) {
  const provider = providers[gateway.provider] || providers.cod;
  return provider.verifyWebhook(gateway, payload, signature);
}

const stubCheckout = (prefix) => async (gateway, order) => ({
  ok: true,
  provider: gateway.provider,
  reference: `${prefix}-${(order.id || '').slice(0, 8)}-${Date.now().toString(36)}`,
  redirectUrl: null,
  status: gateway.provider === 'cod' ? 'cod_pending' : 'pending',
});
const stubWebhook = () => ({ ok: true, status: 'paid' });

// ── Paymob (Egypt) ────────────────────────────────────────────────
// 3-step flow: auth token → register order → payment key → iframe URL.
// config: { api_key, integration_id, iframe_id, hmac_secret }
const paymob = {
  async createCheckout(gateway, order) {
    const cfg = cfgOf(gateway);
    if (!cfg.api_key || !cfg.integration_id || !cfg.iframe_id) {
      return { ok: false, error: 'Paymob config ناقص (api_key / integration_id / iframe_id)' };
    }
    const BASE = 'https://accept.paymob.com/api';
    const amountCents = Math.round((Number(order.total) || 0) * 100);

    const auth = await fetch(`${BASE}/auth/tokens`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: cfg.api_key }),
    }).then((r) => r.json());
    if (!auth.token) return { ok: false, error: 'Paymob auth failed' };

    const reg = await fetch(`${BASE}/ecommerce/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: auth.token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: 'EGP',
        merchant_order_id: `${order.id}-${Date.now()}`,
        items: [],
      }),
    }).then((r) => r.json());
    if (!reg.id) return { ok: false, error: 'Paymob order registration failed' };

    const nameParts = (order.client_name || 'Customer').split(' ');
    const pk = await fetch(`${BASE}/acceptance/payment_keys`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: auth.token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: reg.id,
        currency: 'EGP',
        integration_id: Number(cfg.integration_id),
        billing_data: {
          first_name: nameParts[0] || 'NA',
          last_name: nameParts.slice(1).join(' ') || 'NA',
          phone_number: order.client_phone || '+20000000000',
          email: order.client_email || 'customer@example.com',
          apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA',
          shipping_method: 'NA', postal_code: 'NA', city: 'NA',
          country: 'EG', state: 'NA',
        },
      }),
    }).then((r) => r.json());
    if (!pk.token) return { ok: false, error: 'Paymob payment key failed' };

    return {
      ok: true,
      provider: 'paymob',
      reference: String(reg.id),
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${cfg.iframe_id}?payment_token=${pk.token}`,
      status: 'pending',
    };
  },
  verifyWebhook(gateway, payload, signature) {
    const cfg = cfgOf(gateway);
    if (!cfg.hmac_secret) return { ok: false, error: 'no hmac_secret' };
    // Paymob concatenates a fixed set of fields in lexical order, then HMAC-SHA512.
    const obj = payload.obj || payload;
    const fields = [
      'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
      'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
      'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
      'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
    ];
    const concat = fields.map((f) => {
      const v = f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
      return v === undefined || v === null ? '' : String(v);
    }).join('');
    const expected = crypto.createHmac('sha512', cfg.hmac_secret).update(concat).digest('hex');
    const ok = expected === signature;
    return {
      ok,
      reference: String(obj?.order?.id ?? ''),
      status: obj?.success ? 'paid' : 'failed',
    };
  },
};

// ── Fawry (Egypt) ─────────────────────────────────────────────────
// config: { merchant_code, secure_key, base_url }
const fawry = {
  async createCheckout(gateway, order) {
    const cfg = cfgOf(gateway);
    if (!cfg.merchant_code || !cfg.secure_key) {
      return { ok: false, error: 'Fawry config ناقص (merchant_code / secure_key)' };
    }
    const base = cfg.base_url || 'https://atfawry.fawrystaging.com';
    const refNum = `${(order.id || '').slice(0, 8)}-${Date.now()}`;
    const amount = (Number(order.total) || 0).toFixed(2);
    // Fawry charge signature: merchantCode + merchantRefNum + custProfileId('') +
    //   paymentMethod('') + amount + cardNumber('') + cardExpiry('') + cvv('') + secureKey
    const signature = crypto
      .createHash('sha256')
      .update(`${cfg.merchant_code}${refNum}${amount}${cfg.secure_key}`)
      .digest('hex');
    const body = {
      merchantCode: cfg.merchant_code,
      merchantRefNum: refNum,
      customerName: order.client_name || 'Customer',
      customerMobile: order.client_phone || '',
      amount: Number(amount),
      currencyCode: 'EGP',
      description: `Order ${order.id || ''}`,
      paymentExpiry: Date.now() + 3600_000,
      chargeItems: [{ itemId: order.id || 'order', description: 'Order', price: Number(amount), quantity: 1 }],
      signature,
      paymentMethod: 'PAYATFAWRY',
    };
    try {
      const r = await fetch(`${base}/ECommerceWeb/Fawry/payments/charge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      return {
        ok: !!data.referenceNumber,
        provider: 'fawry',
        reference: data.referenceNumber || refNum,
        redirectUrl: null,
        fawryCode: data.referenceNumber || null, // customer pays with this code at any Fawry outlet
        status: 'pending',
      };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  },
  verifyWebhook(gateway, payload) {
    const obj = payload || {};
    const paid = obj.orderStatus === 'PAID' || obj.paymentStatus === 'PAID';
    return { ok: true, reference: String(obj.merchantRefNumber || obj.fawryRefNumber || ''), status: paid ? 'paid' : 'pending' };
  },
};

const providers = {
  paymob,
  fawry,
  vodafone_cash: { createCheckout: stubCheckout('VFCH'), verifyWebhook: stubWebhook },
  instapay: { createCheckout: stubCheckout('INST'), verifyWebhook: stubWebhook },
  stripe: { createCheckout: stubCheckout('STRP'), verifyWebhook: stubWebhook },
  paypal: { createCheckout: stubCheckout('PYPL'), verifyWebhook: stubWebhook },
  cod: { createCheckout: stubCheckout('COD'), verifyWebhook: stubWebhook },
  bank_transfer: { createCheckout: stubCheckout('BNKT'), verifyWebhook: stubWebhook },
};

module.exports = { createCheckoutFor, verifyWebhookFor, providers };
