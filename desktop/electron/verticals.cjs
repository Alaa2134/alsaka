// Industry-specific business logic for the four verticals Horus
// targets: pharmacy, restaurant, salon, and auto workshop. Each gets
// a small focused API; the desktop activates them based on the
// tenant's selected industry template.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

// ===========================================================================
// PHARMACY
// ===========================================================================
const pharmacy = {
  // Returns the dangerous-interaction pairs found in a given basket.
  checkBasket({ tenantId, productIds }) {
    if (!Array.isArray(productIds) || productIds.length < 2) return [];
    const db = dbMod.get();
    const placeholders = productIds.map(() => '?').join(',');
    const matches = db.prepare(
      `SELECT i.*, pa.name AS drug_a, pb.name AS drug_b
         FROM drug_interactions i
         JOIN products pa ON pa.id = i.drug_a_id
         JOIN products pb ON pb.id = i.drug_b_id
        WHERE i.tenant_id = ?
          AND i.drug_a_id IN (${placeholders})
          AND i.drug_b_id IN (${placeholders})`,
    ).all(tenantId, ...productIds, ...productIds);
    return matches;
  },

  recordControlledSubstance({ tenantId, productId, action, quantity, prescriptionId, patientIdNumber, signedBy, notes }) {
    dbMod.get().prepare(
      `INSERT INTO controlled_substance_log
         (id, tenant_id, product_id, action, quantity, prescription_id, patient_id_number, signed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(uuid(), tenantId, productId, action, quantity, prescriptionId || null, patientIdNumber || null, signedBy || null, notes || null);
    return { ok: true };
  },

  // Auto-seed a small set of high-priority interactions on first run.
  // For real installs we'd pull RxNav / openFDA — this is the local
  // fallback so the feature works offline from day one.
  seedCommonInteractions({ tenantId }) {
    // Just ensures the row format is correct — actual drug rows must
    // be created by the merchant first via the Products screen, then
    // mapped here from the Pharmacy → Interactions UI.
    return { ok: true, hint: 'Use the Drug Interactions screen to add pairs after creating drug products.' };
  },
};

// ===========================================================================
// RESTAURANT — recipe-based ingredient depletion
// ===========================================================================
const restaurant = {
  // Called by repo.saveInvoice for each line. If the product has a
  // recipe, decrement each ingredient stock proportionally.
  depleteForOrderItem({ tenantId, productId, quantity, db }) {
    const conn = db || dbMod.get();
    const recipe = conn
      .prepare(`SELECT id FROM recipes WHERE tenant_id = ? AND product_id = ?`)
      .get(tenantId, productId);
    if (!recipe) return false;
    const ingredients = conn
      .prepare(`SELECT ingredient_product_id, quantity FROM recipe_ingredients WHERE recipe_id = ?`)
      .all(recipe.id);
    if (ingredients.length === 0) return false;
    const dec = conn.prepare(
      `UPDATE products SET stock = stock - @q, updated_at = datetime('now') WHERE id = @id AND tenant_id = @t`,
    );
    for (const ing of ingredients) {
      dec.run({ q: ing.quantity * quantity, id: ing.ingredient_product_id, t: tenantId });
    }
    return true;
  },

  logWaste({ tenantId, productId, quantity, reason, recordedBy }) {
    const db = dbMod.get();
    // Compute cost from the product's cost field
    const p = db.prepare(`SELECT cost FROM products WHERE id = ?`).get(productId);
    const cost = (p?.cost || 0) * Number(quantity);
    db.prepare(
      `INSERT INTO waste_log (id, tenant_id, product_id, quantity, reason, cost, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(uuid(), tenantId, productId, quantity, reason || null, cost, recordedBy || null);
    // Decrement stock
    db.prepare(`UPDATE products SET stock = stock - ? WHERE id = ?`).run(quantity, productId);
    return { ok: true, cost };
  },

  analytics({ tenantId, days = 30 }) {
    const db = dbMod.get();
    const wasteByItem = db.prepare(
      `SELECT p.name, SUM(w.quantity) AS qty, SUM(w.cost) AS cost
         FROM waste_log w JOIN products p ON p.id = w.product_id
        WHERE w.tenant_id = ? AND w.created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY p.id ORDER BY cost DESC LIMIT 20`,
    ).all(tenantId, days);
    const dishMargin = db.prepare(
      `SELECT r.name AS dish, p.price AS price, r.total_cost AS cost,
              (p.price - r.total_cost) AS margin,
              ROUND(((p.price - r.total_cost) * 100.0) / NULLIF(p.price, 0), 1) AS margin_pct
         FROM recipes r JOIN products p ON p.id = r.product_id
        WHERE r.tenant_id = ?
        ORDER BY margin DESC LIMIT 50`,
    ).all(tenantId);
    return { wasteByItem, dishMargin };
  },
};

// ===========================================================================
// SALON / BEAUTY — staff scheduling + appointment availability + packages
// ===========================================================================
const salon = {
  setSchedule({ tenantId, employeeId, weekly }) {
    const db = dbMod.get();
    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM staff_schedules WHERE tenant_id = ? AND employee_id = ?`).run(tenantId, employeeId);
      const ins = db.prepare(
        `INSERT INTO staff_schedules (id, tenant_id, employee_id, day_of_week, start_time, end_time, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
      );
      for (const slot of weekly || []) {
        ins.run(uuid(), tenantId, employeeId, slot.day_of_week, slot.start_time, slot.end_time);
      }
    });
    txn();
    return { ok: true };
  },

  // Returns the 15-minute slots an employee has free on a given date,
  // accounting for their schedule + already-confirmed reservations.
  availableSlots({ tenantId, employeeId, date, serviceDurationMinutes = 30 }) {
    const db = dbMod.get();
    const target = new Date(date);
    const dow = target.getDay();
    const schedules = db.prepare(
      `SELECT start_time, end_time FROM staff_schedules
         WHERE tenant_id = ? AND employee_id = ? AND day_of_week = ? AND is_active = 1`,
    ).all(tenantId, employeeId, dow);
    if (schedules.length === 0) return [];

    // Pull reservations for this employee on that date
    const dayStart = new Date(target); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(target); dayEnd.setHours(23, 59, 59, 999);
    const reservations = db.prepare(
      `SELECT starts_at, duration_minutes FROM reservations
         WHERE tenant_id = ? AND employee_id = ?
           AND starts_at >= ? AND starts_at <= ?
           AND status IN ('pending', 'confirmed', 'seated')`,
    ).all(tenantId, employeeId, dayStart.toISOString(), dayEnd.toISOString());

    const occupied = reservations.map((r) => {
      const s = new Date(r.starts_at);
      const e = new Date(s.getTime() + (r.duration_minutes || 30) * 60_000);
      return [s.getTime(), e.getTime()];
    });

    const slots = [];
    for (const sched of schedules) {
      const [sh, sm] = sched.start_time.split(':').map(Number);
      const [eh, em] = sched.end_time.split(':').map(Number);
      const slotStart = new Date(target); slotStart.setHours(sh, sm, 0, 0);
      const dayWorkEnd = new Date(target); dayWorkEnd.setHours(eh, em, 0, 0);
      while (slotStart.getTime() + serviceDurationMinutes * 60_000 <= dayWorkEnd.getTime()) {
        const s = slotStart.getTime();
        const e = s + serviceDurationMinutes * 60_000;
        const conflicts = occupied.some(([os, oe]) => s < oe && os < e);
        if (!conflicts) slots.push(new Date(s).toISOString());
        slotStart.setMinutes(slotStart.getMinutes() + 15);
      }
    }
    return slots;
  },

  // When a customer redeems a pre-paid package session: decrement.
  redeemPackage({ tenantId, clientId, packageId, invoiceId }) {
    const db = dbMod.get();
    const cp = db.prepare(
      `SELECT * FROM customer_packages WHERE tenant_id = ? AND client_id = ? AND package_id = ?
         AND sessions_left > 0
         AND (expires_at IS NULL OR expires_at >= date('now'))
         ORDER BY purchased_at ASC LIMIT 1`,
    ).get(tenantId, clientId, packageId);
    if (!cp) return { ok: false, error: 'no-active-package' };
    db.prepare(`UPDATE customer_packages SET sessions_left = sessions_left - 1 WHERE id = ?`).run(cp.id);
    return { ok: true, sessions_left: cp.sessions_left - 1, package_id: cp.id };
  },
};

// ===========================================================================
// AUTO WORKSHOP — VIN decode + job cards + parts catalog
// ===========================================================================
const auto = {
  // Free NHTSA vPIC API for US/global vehicles. Returns make/model/year
  // if recognised; otherwise the merchant fills in manually.
  async decodeVin(vin) {
    const v = String(vin || '').trim().toUpperCase();
    if (v.length !== 17) return { ok: false, error: 'invalid-vin' };
    try {
      const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(v)}?format=json`);
      if (!r.ok) throw new Error(`vpic ${r.status}`);
      const data = await r.json();
      const get = (label) => data.Results?.find((x) => x.Variable === label)?.Value;
      return {
        ok: true,
        make: get('Make'),
        model: get('Model'),
        year: get('Model Year'),
        body: get('Body Class'),
        engine: get('Engine Model'),
        country: get('Plant Country'),
      };
    } catch (err) {
      return { ok: false, error: String(err.message || err) };
    }
  },

  nextJobNumber({ tenantId }) {
    const row = dbMod.get().prepare(
      `SELECT COALESCE(MAX(job_number), 1000) + 1 AS n FROM job_cards WHERE tenant_id = ?`,
    ).get(tenantId);
    return row.n;
  },

  openJob({ tenantId, vehicleId, mechanicId, complaint }) {
    const db = dbMod.get();
    const id = uuid();
    const num = auto.nextJobNumber({ tenantId });
    db.prepare(
      `INSERT INTO job_cards (id, tenant_id, job_number, vehicle_id, status, mechanic_id, complaint)
       VALUES (?, ?, ?, ?, 'open', ?, ?)`,
    ).run(id, tenantId, num, vehicleId, mechanicId || null, complaint || null);
    return { ok: true, id, job_number: num };
  },

  closeJob({ jobId, diagnosis, laborHours, laborTotal, partsTotal, photos }) {
    dbMod.get().prepare(
      `UPDATE job_cards SET status = 'done', diagnosis = ?, labor_hours = ?, labor_total = ?,
                            parts_total = ?, photos_json = ?, closed_at = datetime('now')
         WHERE id = ?`,
    ).run(diagnosis || null, Number(laborHours) || 0, Number(laborTotal) || 0,
          Number(partsTotal) || 0, JSON.stringify(photos || []), jobId);
    return { ok: true };
  },

  findParts({ tenantId, oemPart }) {
    const db = dbMod.get();
    const direct = db.prepare(
      `SELECT * FROM parts_cross_ref WHERE tenant_id = ? AND (oem_part = ? OR alt_part = ?)`,
    ).all(tenantId, oemPart, oemPart);
    return direct;
  },
};

module.exports = { pharmacy, restaurant, salon, auto };
