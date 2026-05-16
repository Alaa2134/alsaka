// Cashier shifts: open / close, X/Z reports, cash-in / cash-out tracking,
// and automatic stamping of the active shift_id on every invoice the
// cashier saves while the shift is open.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

function activeShift(userId) {
  const db = dbMod.get();
  return db
    .prepare(`SELECT * FROM cashier_shifts WHERE user_id = ? AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 1`)
    .get(userId);
}

function open({ tenantId, userId, openingCash = 0, notes }) {
  const existing = activeShift(userId);
  if (existing) return { ok: false, error: 'shift-already-open', shift: existing };
  const id = uuid();
  dbMod
    .get()
    .prepare(
      `INSERT INTO cashier_shifts (id, tenant_id, user_id, opening_cash, notes)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, tenantId, userId, Number(openingCash) || 0, notes || null);
  return { ok: true, shift: get(id) };
}

function get(id) {
  return dbMod.get().prepare(`SELECT * FROM cashier_shifts WHERE id = ?`).get(id);
}

function refreshTotals(shiftId) {
  const db = dbMod.get();
  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN is_return = 0 THEN total ELSE 0 END), 0) AS sales,
         COALESCE(SUM(CASE WHEN is_return = 1 THEN total ELSE 0 END), 0) AS returns,
         COUNT(*) AS cnt
       FROM invoices WHERE shift_id = ?`,
    )
    .get(shiftId);
  const cash = db
    .prepare(
      `SELECT COALESCE(SUM(paid), 0) AS v FROM invoices WHERE shift_id = ? AND is_return = 0`,
    )
    .get(shiftId);
  db.prepare(
    `UPDATE cashier_shifts
       SET total_sales = ?, total_returns = ?, invoice_count = ?, cash_in = ?
     WHERE id = ?`,
  ).run(totals.sales, totals.returns, totals.cnt, cash.v, shiftId);
  return get(shiftId);
}

function close({ shiftId, closingCash = 0, cashOut = 0, notes }) {
  const db = dbMod.get();
  const shift = refreshTotals(shiftId);
  if (!shift) return { ok: false, error: 'not-found' };
  if (shift.closed_at) return { ok: false, error: 'already-closed' };
  const expected = (shift.opening_cash || 0) + (shift.cash_in || 0) - (Number(cashOut) || 0);
  const difference = (Number(closingCash) || 0) - expected;
  db.prepare(
    `UPDATE cashier_shifts
       SET closed_at = datetime('now'),
           closing_cash = ?, cash_out = ?, expected_cash = ?, difference = ?,
           notes = COALESCE(notes || char(10), '') || COALESCE(?, '')
     WHERE id = ?`,
  ).run(Number(closingCash) || 0, Number(cashOut) || 0, expected, difference, notes || '', shiftId);
  return { ok: true, shift: get(shiftId) };
}

function xReport(shiftId) {
  // X = mid-shift snapshot (no close)
  refreshTotals(shiftId);
  return get(shiftId);
}

function listRecent({ tenantId, limit = 50 }) {
  return dbMod
    .get()
    .prepare(
      `SELECT s.*, u.email AS user_email, u.name AS user_name
         FROM cashier_shifts s
         LEFT JOIN app_users u ON u.id = s.user_id
        WHERE s.tenant_id = ?
        ORDER BY s.opened_at DESC LIMIT ?`,
    )
    .all(tenantId, limit);
}

module.exports = { open, close, activeShift, xReport, listRecent, refreshTotals };
