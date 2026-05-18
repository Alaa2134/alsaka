// Persistent outbox for WhatsApp messages: when the renderer wants to
// send something but the WhatsApp client isn't ready, we enqueue it and
// drain the queue automatically once a connection is up.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');
const whatsapp = require('./whatsapp.cjs');
const whatsappCloud = require('./whatsapp-cloud.cjs');

let drainTimer = null;
let draining = false;

function enqueue({ tenantId, to, body, dataUrl, caption, kind }) {
  const id = uuid();
  const encrypted = dbMod.encryptRow('whatsapp_outbox', {
    id, tenant_id: tenantId, to_phone: to, kind: kind || (dataUrl ? 'image' : 'text'),
    body: body || null, data_url: dataUrl || null, caption: caption || null, status: 'queued',
  });
  const cols = Object.keys(encrypted);
  dbMod.get().prepare(
    `INSERT INTO whatsapp_outbox (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`,
  ).run(encrypted);
  startDrainer();
  return { ok: true, id };
}

function listPending({ tenantId }) {
  return dbMod.decryptRows(
    'whatsapp_outbox',
    dbMod.get()
      .prepare(`SELECT * FROM whatsapp_outbox WHERE tenant_id = ? AND status = 'queued' ORDER BY created_at ASC`)
      .all(tenantId),
  );
}

function listRecent({ tenantId, limit = 100 }) {
  return dbMod.decryptRows(
    'whatsapp_outbox',
    dbMod.get()
      .prepare(`SELECT * FROM whatsapp_outbox WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`)
      .all(tenantId, limit),
  );
}

async function drainOnce() {
  if (draining) return;
  draining = true;
  try {
    const db = dbMod.get();
    const waState = whatsapp.getState();
    const queue = dbMod.decryptRows(
      'whatsapp_outbox',
      db.prepare(`SELECT * FROM whatsapp_outbox WHERE status = 'queued' ORDER BY created_at ASC LIMIT 50`).all(),
    );
    for (const msg of queue) {
      // Prefer Cloud API per tenant if configured; otherwise fall back
      // to the QR-based whatsapp-web.js client if it's ready.
      const cloudEnabled = whatsappCloud.isEnabled(msg.tenant_id);
      if (!cloudEnabled && waState.state !== 'ready') continue;
      try {
        if (cloudEnabled) {
          if (msg.kind === 'image' && msg.data_url) {
            // For Cloud API we need a hosted URL, not a data: URL. If the
            // outbox only has a data URL we skip — the renderer should
            // upload to its own host first.
            if (!/^https?:\/\//i.test(msg.data_url)) {
              throw new Error('Cloud API needs a hosted image URL (https://). Use QR-based WA or host the image first.');
            }
            await whatsappCloud.sendImage({ tenantId: msg.tenant_id, to: msg.to_phone, link: msg.data_url, caption: msg.caption || '' });
          } else {
            await whatsappCloud.sendText({ tenantId: msg.tenant_id, to: msg.to_phone, text: msg.body || '' });
          }
        } else if (msg.kind === 'image' && msg.data_url) {
          await whatsapp.sendImage({ to: msg.to_phone, dataUrl: msg.data_url, caption: msg.caption || '' });
        } else {
          await whatsapp.sendText({ to: msg.to_phone, body: msg.body || '' });
        }
        db.prepare(
          `UPDATE whatsapp_outbox SET status = 'sent', sent_at = datetime('now') WHERE id = ?`,
        ).run(msg.id);
      } catch (err) {
        db.prepare(
          `UPDATE whatsapp_outbox SET attempt_count = attempt_count + 1, last_error = ?, status = CASE WHEN attempt_count >= 4 THEN 'failed' ELSE 'queued' END WHERE id = ?`,
        ).run(String(err.message || err), msg.id);
      }
    }
  } finally {
    draining = false;
  }
}

function startDrainer() {
  if (drainTimer) return;
  drainTimer = setInterval(drainOnce, 60_000);
  setTimeout(drainOnce, 5_000);
}

function stopDrainer() {
  if (drainTimer) clearInterval(drainTimer);
  drainTimer = null;
}

module.exports = { enqueue, listPending, listRecent, drainOnce, startDrainer, stopDrainer };
