// Single-entry dispatcher for marketplace connectors. Renderer calls one
// IPC with { provider, action, payload } — we resolve to the right
// connector and invoke the matching method. Keeps the IPC surface small
// and lets us add new marketplaces without touching main.cjs.

const salla = require('./connectors/salla.cjs');
const shopify = require('./connectors/shopify.cjs');
const talabat = require('./connectors/talabat.cjs');

const PROVIDERS = { salla, shopify, talabat };

function get(provider) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error(`unknown marketplace provider: ${provider}`);
  return p;
}

async function syncCatalog({ provider, tenantId }) {
  return get(provider).syncCatalog({ tenantId });
}

function receiveWebhook({ provider, tenantId, payload, topic, signature, rawBody }) {
  return get(provider).receiveWebhook({ tenantId, payload, topic, signature, rawBody });
}

async function updateOrderStatus({ provider, tenantId, externalOrderId, status, callbackUrl }) {
  return get(provider).updateOrderStatus({ tenantId, externalOrderId, status, callbackUrl });
}

function listProviders() {
  return [
    { id: 'salla',   name: 'Salla',   region: 'KSA',   description: 'سوق سعودي — يدفع طلبات تلقائيًا للنظام.' },
    { id: 'shopify', name: 'Shopify', region: 'Global', description: 'منصة عالمية — نسخ المنتجات + ويب هوك للطلبات.' },
    { id: 'talabat', name: 'Talabat', region: 'MENA',  description: 'توصيل طعام — استقبال طلبات بإمضاء HMAC.' },
  ];
}

module.exports = { syncCatalog, receiveWebhook, updateOrderStatus, listProviders, PROVIDERS };
