// Background schedulers: spin up daemons for time-driven workflows.
//
//   - Recurring invoices: every hour, find recurring_invoices whose
//     next_run_date is today or earlier, clone the template into a fresh
//     invoice for that client, advance next_run_date.
//   - Reservation reminders: every 30 minutes, find reservations starting
//     in the next 2 hours that don't have a reminder_sent flag, enqueue
//     a WhatsApp message via the offline outbox.
//   - Stock expiry alerts: once a day, scan products with expiry_date
//     within the next 14 days and emit an in-app notification.
//
// All daemons are tolerant — failures get logged but never crash the
// process.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');
const repo = require('./repo.cjs');
const waQueue = require('./whatsapp-queue.cjs');

let timers = [];

function start() {
  stop();
  timers.push(setInterval(runRecurring, 60 * 60 * 1000));
  timers.push(setInterval(runReservationReminders, 30 * 60 * 1000));
  timers.push(setInterval(runExpiryAlerts, 12 * 60 * 60 * 1000));
  // Initial run shortly after boot
  setTimeout(runRecurring, 60_000);
  setTimeout(runReservationReminders, 60_000);
  setTimeout(runExpiryAlerts, 5 * 60_000);
}

function stop() {
  for (const t of timers) clearInterval(t);
  timers = [];
}

// ---------------------------------------------------------------------------
// Recurring invoices
// ---------------------------------------------------------------------------
function runRecurring() {
  try {
    const db = dbMod.get();
    const due = db
      .prepare(
        `SELECT * FROM recurring_invoices
         WHERE is_active = 1
           AND next_run_date <= date('now')
           AND (end_date IS NULL OR end_date >= date('now'))`,
      )
      .all();
    for (const rec of due) {
      try {
        const tpl = JSON.parse(rec.template_json || '{}');
        const items = Array.isArray(tpl.items) ? tpl.items : [];
        if (items.length === 0) {
          advance(rec);
          continue;
        }
        repo.saveInvoice({
          invoice: {
            tenant_id: rec.tenant_id,
            client_id: rec.client_id,
            user_id: rec.user_id || null,
            type: 'sales',
            discount: tpl.discount || 0,
            paid: 0,
            status: 'open',
            notes: tpl.notes || 'فاتورة متكررة',
          },
          items,
        });
        advance(rec);
      } catch (err) {
        console.warn('[schedulers] recurring failed for', rec.id, err.message);
      }
    }
  } catch (err) {
    console.warn('[schedulers] recurring tick error:', err.message);
  }
}

function advance(rec) {
  const db = dbMod.get();
  const next = nextDate(rec.next_run_date, rec.cycle);
  db.prepare(
    `UPDATE recurring_invoices SET next_run_date = ?, last_run_at = datetime('now') WHERE id = ?`,
  ).run(next, rec.id);
}

function nextDate(current, cycle) {
  const d = new Date(current);
  if (cycle === 'daily') d.setDate(d.getDate() + 1);
  else if (cycle === 'weekly') d.setDate(d.getDate() + 7);
  else if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Reservation reminders
// ---------------------------------------------------------------------------
function runReservationReminders() {
  try {
    const db = dbMod.get();
    // Ensure the flag column exists (idempotent)
    try {
      db.exec(`ALTER TABLE reservations ADD COLUMN reminder_sent INTEGER NOT NULL DEFAULT 0`);
    } catch (_) { /* already exists */ }

    const upcoming = db
      .prepare(
        `SELECT r.*, c.name AS client_name, c.phone AS client_phone
           FROM reservations r
           LEFT JOIN clients c ON c.id = r.client_id
          WHERE r.status IN ('confirmed', 'pending')
            AND r.reminder_sent = 0
            AND datetime(r.starts_at) BETWEEN datetime('now') AND datetime('now', '+2 hours')`,
      )
      .all();
    for (const r of upcoming) {
      try {
        const phone = r.client_phone
          ? dbMod.decryptRow('clients', { phone: r.client_phone }).phone
          : null;
        if (!phone) {
          db.prepare(`UPDATE reservations SET reminder_sent = 1 WHERE id = ?`).run(r.id);
          continue;
        }
        const when = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
          dateStyle: 'medium', timeStyle: 'short',
        }).format(new Date(r.starts_at));
        const body =
          `تذكير بحجزك: ${r.service_name || ''}\n` +
          `الموعد: ${when}\n` +
          `${r.notes ? '\nملاحظات: ' + r.notes : ''}`;
        waQueue.enqueue({
          tenantId: r.tenant_id,
          to: phone,
          body,
          kind: 'text',
        });
        db.prepare(`UPDATE reservations SET reminder_sent = 1 WHERE id = ?`).run(r.id);
      } catch (err) {
        console.warn('[schedulers] reminder failed for', r.id, err.message);
      }
    }
  } catch (err) {
    console.warn('[schedulers] reservation tick error:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Expiry alerts
// ---------------------------------------------------------------------------
function runExpiryAlerts() {
  try {
    const db = dbMod.get();
    const items = db
      .prepare(
        `SELECT id, tenant_id, name, expiry_date
           FROM products
          WHERE is_active = 1
            AND expiry_date IS NOT NULL
            AND date(expiry_date) <= date('now', '+14 days')`,
      )
      .all();
    const insert = db.prepare(
      `INSERT INTO notifications (id, tenant_id, title, body)
       VALUES (?, ?, ?, ?)`,
    );
    for (const it of items) {
      try {
        const days = Math.ceil(
          (new Date(it.expiry_date).getTime() - Date.now()) / 86_400_000,
        );
        const title =
          days <= 0 ? `⚠️ منتج منتهي: ${it.name}` : `⏰ ${it.name} قارب على الانتهاء`;
        const body = days <= 0
          ? `انتهت صلاحية ${it.name} (تاريخ الانتهاء: ${it.expiry_date}).`
          : `${it.name} ينتهي خلال ${days} يوم.`;
        insert.run(uuid(), it.tenant_id, title, body);
      } catch (_) { /* ignore */ }
    }
  } catch (err) {
    console.warn('[schedulers] expiry tick error:', err.message);
  }
}

module.exports = { start, stop, runRecurring, runReservationReminders, runExpiryAlerts };
