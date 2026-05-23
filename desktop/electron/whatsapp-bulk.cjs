// Bulk WhatsApp campaigns with anti-ban throttling.
//
// The single biggest cause of WhatsApp bans is blasting many messages
// in a short window. So instead of queueing everything to fire at once,
// we spread each recipient across time:
//   - a randomised human-like gap between every message (default 8–25s)
//   - a longer pause after every batch (default every 40 messages, 4 min)
// Each recipient row gets a `scheduled_at`; the queue drainer only sends
// rows whose time has arrived, so 500 messages naturally trickle out
// over hours rather than seconds.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// Personalise the template per recipient. Supported tokens:
//   {name} / {الاسم}  → recipient name (or "عميلنا العزيز" fallback)
function personalize(body, recipient) {
  const name = recipient.name || 'عميلنا العزيز';
  return String(body || '')
    .replace(/\{name\}/gi, name)
    .replace(/\{الاسم\}/g, name)
    .replace(/\{phone\}/gi, recipient.phone || '')
    .replace(/\{الرقم\}/g, recipient.phone || '');
}

// recipients: [{ phone, name? }]
function createCampaign({
  tenantId,
  name,
  body,
  recipients,
  dataUrl = null,
  caption = null,
  minDelaySec = 8,
  maxDelaySec = 25,
  batchSize = 40,
  batchPauseMin = 4,
}) {
  if (!body && !dataUrl) throw new Error('رسالة فارغة');
  const list = (recipients || [])
    .map((r) => ({ phone: String(r.phone || '').trim(), name: r.name || null }))
    .filter((r) => r.phone.length >= 6);
  if (list.length === 0) throw new Error('لا توجد أرقام صحيحة');

  const db = dbMod.get();
  const campaignId = uuid();
  db.prepare(
    `INSERT INTO whatsapp_campaigns
       (id, tenant_id, name, body, total, status, min_delay_sec, max_delay_sec, batch_size, batch_pause_min)
     VALUES (?, ?, ?, ?, ?, 'running', ?, ?, ?, ?)`,
  ).run(campaignId, tenantId, name || null, body || caption || '', list.length, minDelaySec, maxDelaySec, batchSize, batchPauseMin);

  const ins = db.prepare(
    `INSERT INTO whatsapp_outbox
       (id, tenant_id, to_phone, kind, body, data_url, caption, status, scheduled_at, campaign_id, recipient_name)
     VALUES (@id, @tenant_id, @to_phone, @kind, @body, @data_url, @caption, 'queued', @scheduled_at, @campaign_id, @recipient_name)`,
  );

  let cursorMs = Date.now() + 2000; // small head-start
  const txn = db.transaction(() => {
    list.forEach((r, i) => {
      if (i > 0) {
        cursorMs += rand(minDelaySec, maxDelaySec) * 1000;
        if (i % batchSize === 0) cursorMs += batchPauseMin * 60 * 1000;
      }
      ins.run({
        id: uuid(),
        tenant_id: tenantId,
        to_phone: r.phone,
        kind: dataUrl ? 'image' : 'text',
        body: dataUrl ? null : personalize(body, r),
        data_url: dataUrl,
        caption: dataUrl ? personalize(caption || body || '', r) : null,
        scheduled_at: new Date(cursorMs).toISOString(),
        campaign_id: campaignId,
        recipient_name: r.name,
      });
    });
  });
  txn();

  const etaMinutes = Math.ceil((cursorMs - Date.now()) / 60000);
  return { ok: true, campaignId, total: list.length, etaMinutes };
}

function listCampaigns({ tenantId, limit = 50 }) {
  const db = dbMod.get();
  return db
    .prepare(
      `SELECT * FROM whatsapp_campaigns WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(tenantId, limit);
}

function campaignProgress({ campaignId }) {
  const db = dbMod.get();
  const campaign = db.prepare(`SELECT * FROM whatsapp_campaigns WHERE id = ?`).get(campaignId);
  if (!campaign) return null;
  const counts = db
    .prepare(
      `SELECT
         SUM(status = 'sent') AS sent,
         SUM(status = 'failed') AS failed,
         SUM(status = 'queued') AS pending
       FROM whatsapp_outbox WHERE campaign_id = ?`,
    )
    .get(campaignId) || {};
  const nextRow = db
    .prepare(
      `SELECT MIN(scheduled_at) AS next FROM whatsapp_outbox WHERE campaign_id = ? AND status = 'queued'`,
    )
    .get(campaignId) || {};
  return {
    ...campaign,
    sent: counts.sent || 0,
    failed: counts.failed || 0,
    pending: counts.pending || 0,
    next_at: nextRow.next || null,
  };
}

// Cancel = drop the still-queued rows for this campaign.
function cancelCampaign({ campaignId }) {
  const db = dbMod.get();
  db.prepare(`DELETE FROM whatsapp_outbox WHERE campaign_id = ? AND status = 'queued'`).run(campaignId);
  db.prepare(`UPDATE whatsapp_campaigns SET status = 'paused', finished_at = datetime('now') WHERE id = ?`).run(campaignId);
  return { ok: true };
}

// Roll up campaign counters from the outbox — called by the drainer
// after each send so the UI progress stays live.
function syncCampaignCounters() {
  const db = dbMod.get();
  const running = db.prepare(`SELECT id FROM whatsapp_campaigns WHERE status = 'running'`).all();
  for (const c of running) {
    const counts = db
      .prepare(
        `SELECT SUM(status='sent') AS sent, SUM(status='failed') AS failed, SUM(status='queued') AS pending
           FROM whatsapp_outbox WHERE campaign_id = ?`,
      )
      .get(c.id) || {};
    const done = (counts.pending || 0) === 0;
    db.prepare(
      `UPDATE whatsapp_campaigns SET sent = ?, failed = ?, status = ?, finished_at = ? WHERE id = ?`,
    ).run(
      counts.sent || 0,
      counts.failed || 0,
      done ? 'done' : 'running',
      done ? new Date().toISOString() : null,
      c.id,
    );
  }
}

module.exports = {
  createCampaign,
  listCampaigns,
  campaignProgress,
  cancelCampaign,
  syncCampaignCounters,
  personalize,
};
