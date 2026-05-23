// WhatsApp Business Cloud API adapter — the official Meta-supported path
// for tenants who hold a verified Business Account. Same outbox surface as
// whatsapp.cjs (sendText, sendImage) so the dispatcher in
// whatsapp-queue.cjs picks whichever transport the tenant configured.
//
// Setup (vendor or merchant):
//   1. business.facebook.com → register a WhatsApp Business app
//   2. Get a permanent System User access token + phone_number_id
//   3. Save them into company_settings as wa_cloud_token and wa_cloud_phone_id
//   4. Optionally set webhook_verify_token + a public HTTPS endpoint for
//      receiving incoming messages (the api-server route below).
//
// No Puppeteer, no QR scan, no ban risk — Meta's official rails.

const dbMod = require('./db.cjs');

const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

function loadConfig(tenantId) {
  const db = dbMod.get();
  const rows = db
    .prepare(`SELECT key, value FROM company_settings WHERE tenant_id = ? AND key LIKE 'wa_cloud_%'`)
    .all(tenantId);
  const kv = {};
  for (const r of rows) kv[r.key] = r.value;
  return {
    token: kv.wa_cloud_token,
    phoneId: kv.wa_cloud_phone_id,
    verifyToken: kv.wa_cloud_verify_token,
    enabled: !!(kv.wa_cloud_token && kv.wa_cloud_phone_id),
  };
}

function saveConfig({ tenantId, token, phoneId, verifyToken }) {
  const db = dbMod.get();
  const upsert = db.prepare(
    `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  );
  const { v4: uuid } = require('uuid');
  if (token != null)        upsert.run(uuid(), tenantId, 'wa_cloud_token', token);
  if (phoneId != null)      upsert.run(uuid(), tenantId, 'wa_cloud_phone_id', phoneId);
  if (verifyToken != null)  upsert.run(uuid(), tenantId, 'wa_cloud_verify_token', verifyToken);
  return loadConfig(tenantId);
}

function isEnabled(tenantId) {
  const cfg = loadConfig(tenantId);
  return !!cfg?.enabled;
}

async function call(tenantId, path, body) {
  const cfg = loadConfig(tenantId);
  if (!cfg?.enabled) throw new Error('whatsapp-cloud not configured');
  const r = await fetch(`${GRAPH_BASE}/${cfg.phoneId}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `WA Cloud ${r.status}`);
  return data;
}

// Strip "+", spaces and force E.164 digits-only — Meta is strict.
function normalize(number) {
  return String(number || '').replace(/[^\d]/g, '');
}

async function sendText({ tenantId, to, text }) {
  const wa_id = normalize(to);
  return call(tenantId, '/messages', {
    messaging_product: 'whatsapp',
    to: wa_id,
    type: 'text',
    text: { body: text },
  });
}

// Two options here: send via a hosted URL (simplest, what we use), or
// upload media first then reference media_id. For invoice PDFs we'll
// upload because the file lives only on the user's machine.
async function sendImage({ tenantId, to, link, caption }) {
  if (!link) throw new Error('image link required (host the file first)');
  return call(tenantId, '/messages', {
    messaging_product: 'whatsapp',
    to: normalize(to),
    type: 'image',
    image: { link, caption: caption || undefined },
  });
}

async function sendDocument({ tenantId, to, link, filename, caption }) {
  return call(tenantId, '/messages', {
    messaging_product: 'whatsapp',
    to: normalize(to),
    type: 'document',
    document: { link, filename, caption: caption || undefined },
  });
}

// Verifies the webhook subscription challenge from Meta. The api-server
// exposes a GET /v1/wa/webhook that calls this — return the challenge
// string if the token matches.
function verifyWebhook({ tenantId, mode, token, challenge }) {
  const cfg = loadConfig(tenantId);
  if (mode !== 'subscribe') return null;
  if (!cfg?.verifyToken) return null;
  if (token !== cfg.verifyToken) return null;
  return challenge;
}

// Handle incoming webhook POST. Logs every inbound message into
// whatsapp_inbox so the renderer can show a chat thread.
function handleWebhook({ tenantId, body }) {
  try {
    const entries = body?.entry || [];
    const db = dbMod.get();
    const ins = db.prepare(
      `INSERT INTO whatsapp_inbox (id, tenant_id, from_number, type, body, message_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(message_id) DO NOTHING`,
    );
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const msgs = change.value?.messages || [];
        for (const m of msgs) {
          const text = m.text?.body || m.button?.text || m.interactive?.button_reply?.title || '';
          ins.run(
            require('uuid').v4(),
            tenantId,
            m.from,
            m.type,
            text,
            m.id,
          );
        }
      }
    }
    return { ok: true, processed: entries.length };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

module.exports = {
  isEnabled,
  loadConfig,
  saveConfig,
  sendText,
  sendImage,
  sendDocument,
  verifyWebhook,
  handleWebhook,
};
