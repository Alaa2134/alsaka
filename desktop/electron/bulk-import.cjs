// CSV bulk-import for products and clients. Returns a row-by-row result
// so the renderer can show "X created, Y updated, Z failed" with the
// reason for every failure.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

function parseCsv(text) {
  // Tiny RFC-4180-ish parser — handles quoted fields and embedded
  // commas/newlines without needing a heavy dep.
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (field !== '' || cur.length > 0) {
          cur.push(field);
          rows.push(cur);
          cur = [];
          field = '';
        }
        if (ch === '\r' && text[i + 1] === '\n') i++;
      } else field += ch;
    }
  }
  if (field !== '' || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows;
}

function importProducts({ tenantId, csv, replaceExisting = false }) {
  const rows = parseCsv(String(csv || ''));
  if (rows.length < 2) return { ok: false, error: 'CSV فارغ' };
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const db = dbMod.get();

  const expected = ['name', 'barcode', 'item_number', 'price', 'cost', 'stock', 'min_stock', 'expiry_date'];
  const indexOf = (k) => header.indexOf(k);

  const stats = { created: 0, updated: 0, failed: 0, errors: [] };
  const txn = db.transaction(() => {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.every((c) => !String(c).trim())) continue;
      try {
        const name = (row[indexOf('name')] || '').trim();
        if (!name) throw new Error(`السطر ${r + 1}: اسم المنتج مطلوب`);
        const data = {
          tenant_id: tenantId,
          name,
          barcode: (row[indexOf('barcode')] || '').trim() || null,
          item_number: (row[indexOf('item_number')] || '').trim() || null,
          price: Number(row[indexOf('price')] || 0),
          cost: Number(row[indexOf('cost')] || 0),
          stock: Number(row[indexOf('stock')] || 0),
          min_stock: Number(row[indexOf('min_stock')] || 0),
          expiry_date: (row[indexOf('expiry_date')] || '').trim() || null,
          is_active: 1,
        };
        // Find existing by barcode (preferred) or name
        let existing = null;
        if (data.barcode) {
          existing = db.prepare(
            `SELECT id FROM products WHERE tenant_id = ? AND barcode = ?`,
          ).get(tenantId, data.barcode);
        }
        if (!existing) {
          existing = db.prepare(
            `SELECT id FROM products WHERE tenant_id = ? AND name = ? LIMIT 1`,
          ).get(tenantId, name);
        }
        if (existing && replaceExisting) {
          const cols = Object.keys(data);
          db.prepare(
            `UPDATE products SET ${cols.map((c) => `${c} = @${c}`).join(', ')}, updated_at = datetime('now') WHERE id = @id`,
          ).run({ ...data, id: existing.id });
          stats.updated++;
        } else if (!existing) {
          const id = uuid();
          db.prepare(
            `INSERT INTO products (id, ${Object.keys(data).join(', ')})
             VALUES (@id, ${Object.keys(data).map((c) => '@' + c).join(', ')})`,
          ).run({ id, ...data });
          stats.created++;
        }
      } catch (err) {
        stats.failed++;
        stats.errors.push(String(err.message || err));
      }
    }
  });
  txn();
  return { ok: true, ...stats };
}

function importClients({ tenantId, csv, replaceExisting = false }) {
  const rows = parseCsv(String(csv || ''));
  if (rows.length < 2) return { ok: false, error: 'CSV فارغ' };
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const db = dbMod.get();
  const indexOf = (k) => header.indexOf(k);
  const stats = { created: 0, updated: 0, failed: 0, errors: [] };

  const txn = db.transaction(() => {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.every((c) => !String(c).trim())) continue;
      try {
        const name = (row[indexOf('name')] || '').trim();
        if (!name) throw new Error(`السطر ${r + 1}: اسم العميل مطلوب`);
        const phone = (row[indexOf('phone')] || '').trim() || null;
        const data = {
          tenant_id: tenantId,
          name,
          phone,
          email: (row[indexOf('email')] || '').trim() || null,
          address: (row[indexOf('address')] || '').trim() || null,
          credit_limit: Number(row[indexOf('credit_limit')] || 0),
          balance: Number(row[indexOf('balance')] || 0),
        };
        const encrypted = dbMod.encryptRow('clients', data);

        let existing = null;
        if (phone) {
          // Phone is encrypted at rest so we have to scan and decrypt
          const all = db.prepare(`SELECT * FROM clients WHERE tenant_id = ?`).all(tenantId);
          existing = all.find((x) => {
            try {
              return dbMod.decryptRow('clients', x).phone === phone;
            } catch { return false; }
          });
        }
        if (existing && replaceExisting) {
          const cols = Object.keys(encrypted);
          db.prepare(
            `UPDATE clients SET ${cols.map((c) => `${c} = @${c}`).join(', ')}, updated_at = datetime('now') WHERE id = @id`,
          ).run({ ...encrypted, id: existing.id });
          stats.updated++;
        } else if (!existing) {
          const id = uuid();
          db.prepare(
            `INSERT INTO clients (id, ${Object.keys(encrypted).join(', ')})
             VALUES (@id, ${Object.keys(encrypted).map((c) => '@' + c).join(', ')})`,
          ).run({ id, ...encrypted });
          stats.created++;
        }
      } catch (err) {
        stats.failed++;
        stats.errors.push(String(err.message || err));
      }
    }
  });
  txn();
  return { ok: true, ...stats };
}

module.exports = { importProducts, importClients, parseCsv };
