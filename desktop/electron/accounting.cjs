// Core accounting engine: chart of accounts seed, double-entry posting,
// auto-posting hooks from sales/purchase/voucher operations, plus the main
// financial reports (Trial Balance, Income Statement, Balance Sheet,
// General Ledger, AR/AP aging).
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

// ---------------------------------------------------------------------------
// Standard Arabic Chart of Accounts (Egyptian/general).
// `parent` references parent code so the seed is order-independent at read.
// Each `code` is unique per tenant.
// ---------------------------------------------------------------------------
const STANDARD_COA = [
  // Assets ------------------------------------------------------------------
  { code: '1000', name: 'الأصول', type: 'asset', group: true, parent: null },
  { code: '1100', name: 'الأصول المتداولة', type: 'asset', group: true, parent: '1000' },
  { code: '1110', name: 'النقدية والبنوك', type: 'asset', group: true, parent: '1100' },
  { code: '1111', name: 'الصندوق الرئيسي', type: 'asset', subtype: 'cash', parent: '1110', system: 'cash_default' },
  { code: '1112', name: 'البنك', type: 'asset', subtype: 'bank', parent: '1110' },
  { code: '1120', name: 'العملاء (المدينون)', type: 'asset', subtype: 'receivable', parent: '1100', system: 'accounts_receivable' },
  { code: '1130', name: 'المخزون', type: 'asset', subtype: 'inventory', parent: '1100', system: 'inventory' },
  { code: '1140', name: 'مدفوعات مقدمة', type: 'asset', parent: '1100' },
  { code: '1190', name: 'أصول متداولة أخرى', type: 'asset', parent: '1100' },

  { code: '1200', name: 'الأصول الثابتة', type: 'asset', group: true, parent: '1000' },
  { code: '1210', name: 'الأثاث والمفروشات', type: 'asset', subtype: 'fixed', parent: '1200' },
  { code: '1220', name: 'السيارات', type: 'asset', subtype: 'fixed', parent: '1200' },
  { code: '1230', name: 'الأجهزة والمعدات', type: 'asset', subtype: 'fixed', parent: '1200' },
  { code: '1240', name: 'المباني', type: 'asset', subtype: 'fixed', parent: '1200' },
  { code: '1290', name: 'مجمع الإهلاك', type: 'asset', subtype: 'accumulated_depreciation', parent: '1200' },

  // Liabilities -------------------------------------------------------------
  { code: '2000', name: 'الالتزامات', type: 'liability', group: true, parent: null },
  { code: '2100', name: 'الالتزامات المتداولة', type: 'liability', group: true, parent: '2000' },
  { code: '2110', name: 'الموردون (الدائنون)', type: 'liability', subtype: 'payable', parent: '2100', system: 'accounts_payable' },
  { code: '2120', name: 'ضريبة القيمة المضافة', type: 'liability', subtype: 'tax', parent: '2100', system: 'vat_payable' },
  { code: '2130', name: 'المرتبات المستحقة', type: 'liability', parent: '2100' },
  { code: '2140', name: 'مصروفات مستحقة', type: 'liability', parent: '2100' },
  { code: '2190', name: 'التزامات متداولة أخرى', type: 'liability', parent: '2100' },

  { code: '2200', name: 'الالتزامات طويلة الأجل', type: 'liability', group: true, parent: '2000' },
  { code: '2210', name: 'القروض طويلة الأجل', type: 'liability', parent: '2200' },

  // Equity ------------------------------------------------------------------
  { code: '3000', name: 'حقوق الملكية', type: 'equity', group: true, parent: null },
  { code: '3100', name: 'رأس المال', type: 'equity', parent: '3000', system: 'capital' },
  { code: '3200', name: 'الأرباح المحتجزة', type: 'equity', parent: '3000', system: 'retained_earnings' },
  { code: '3300', name: 'جاري الشركاء', type: 'equity', parent: '3000' },

  // Revenue -----------------------------------------------------------------
  { code: '4000', name: 'الإيرادات', type: 'revenue', group: true, parent: null },
  { code: '4100', name: 'إيرادات المبيعات', type: 'revenue', parent: '4000', system: 'sales_revenue' },
  { code: '4200', name: 'إيرادات الخدمات', type: 'revenue', parent: '4000' },
  { code: '4300', name: 'إيرادات أخرى', type: 'revenue', parent: '4000' },
  { code: '4400', name: 'خصومات مكتسبة', type: 'revenue', parent: '4000' },

  // Expenses ----------------------------------------------------------------
  { code: '5000', name: 'المصروفات', type: 'expense', group: true, parent: null },
  { code: '5100', name: 'تكلفة البضاعة المباعة', type: 'expense', parent: '5000', system: 'cogs' },
  { code: '5200', name: 'المصروفات التشغيلية', type: 'expense', group: true, parent: '5000' },
  { code: '5210', name: 'الإيجار', type: 'expense', parent: '5200' },
  { code: '5220', name: 'المرتبات والأجور', type: 'expense', parent: '5200' },
  { code: '5230', name: 'الكهرباء والمياه', type: 'expense', parent: '5200' },
  { code: '5240', name: 'الاتصالات والإنترنت', type: 'expense', parent: '5200' },
  { code: '5250', name: 'الصيانة', type: 'expense', parent: '5200' },
  { code: '5260', name: 'الإهلاك', type: 'expense', parent: '5200' },
  { code: '5270', name: 'المواصلات', type: 'expense', parent: '5200' },
  { code: '5280', name: 'الدعاية والإعلان', type: 'expense', parent: '5200' },
  { code: '5290', name: 'مصروفات إدارية أخرى', type: 'expense', parent: '5200' },
  { code: '5300', name: 'خصومات مسموح بها', type: 'expense', parent: '5000' },
  { code: '5400', name: 'مصروفات تمويلية', type: 'expense', parent: '5000' },
];

function ensureChartOfAccounts(tenantId) {
  const db = dbMod.get();
  const exists = db
    .prepare(`SELECT COUNT(*) AS n FROM chart_of_accounts WHERE tenant_id = ?`)
    .get(tenantId).n;
  if (exists > 0) return;

  const insert = db.prepare(
    `INSERT INTO chart_of_accounts
       (id, tenant_id, code, name, account_type, account_subtype, parent_id, is_group, is_active)
     VALUES (@id, @tenant_id, @code, @name, @account_type, @account_subtype, @parent_id, @is_group, 1)`,
  );

  const txn = db.transaction(() => {
    const codeToId = new Map();
    for (const acc of STANDARD_COA) {
      const id = uuid();
      codeToId.set(acc.code, id);
      insert.run({
        id,
        tenant_id: tenantId,
        code: acc.code,
        name: acc.name,
        account_type: acc.type,
        account_subtype: acc.subtype || null,
        parent_id: acc.parent ? codeToId.get(acc.parent) || null : null,
        is_group: acc.group ? 1 : 0,
      });
    }

    // Save system-account mappings into company_settings so later postings
    // can resolve "the AR account", "the cash account", etc.
    const upsertSetting = db.prepare(
      `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
       VALUES (@id, @tenant_id, @key, @value, datetime('now'))
       ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    );
    for (const acc of STANDARD_COA) {
      if (!acc.system) continue;
      upsertSetting.run({
        id: uuid(),
        tenant_id: tenantId,
        key: `accounting.system_account.${acc.system}`,
        value: codeToId.get(acc.code),
      });
    }

    // Default tax rate (14% Egypt VAT)
    upsertSetting.run({
      id: uuid(),
      tenant_id: tenantId,
      key: 'accounting.default_tax_rate',
      value: '14',
    });
  });

  txn();
}

function getSystemAccount(tenantId, key) {
  const db = dbMod.get();
  const row = db
    .prepare(
      `SELECT value FROM company_settings WHERE tenant_id = ? AND key = ?`,
    )
    .get(tenantId, `accounting.system_account.${key}`);
  return row?.value || null;
}

function setSystemAccount(tenantId, key, accountId) {
  const db = dbMod.get();
  db.prepare(
    `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
       VALUES (@id, @tenant_id, @key, @value, datetime('now'))
     ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run({
    id: uuid(),
    tenant_id: tenantId,
    key: `accounting.system_account.${key}`,
    value: accountId,
  });
}

function listSystemAccounts(tenantId) {
  const db = dbMod.get();
  const prefix = 'accounting.system_account.';
  const rows = db
    .prepare(
      `SELECT key, value FROM company_settings WHERE tenant_id = ? AND key LIKE ?`,
    )
    .all(tenantId, `${prefix}%`);
  const out = {};
  for (const r of rows) out[r.key.slice(prefix.length)] = r.value;
  return out;
}

// ---------------------------------------------------------------------------
// Next sequential numbers (entry_number, voucher_number, invoice number)
// Stored in a small helper table-less approach: just take MAX+1 per tenant.
// ---------------------------------------------------------------------------
function nextNumber(table, column, tenantId) {
  const db = dbMod.get();
  const row = db
    .prepare(`SELECT COALESCE(MAX(${column}), 0) + 1 AS n FROM ${table} WHERE tenant_id = ?`)
    .get(tenantId);
  return row.n;
}

// ---------------------------------------------------------------------------
// Core posting: write a journal entry with N balanced lines.
// `lines` = [{ account_id, debit?, credit?, description?, cost_center_id? }]
// Always validates debit total === credit total before committing.
// ---------------------------------------------------------------------------
function postJournalEntry({
  tenantId,
  entryDate,
  reference,
  description,
  sourceType,
  sourceId,
  createdBy,
  lines,
}) {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('Journal entry requires at least 2 lines');
  }
  const cleaned = lines
    .map((l, idx) => ({
      account_id: l.account_id,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: l.description || null,
      cost_center_id: l.cost_center_id || null,
      line_no: idx + 1,
    }))
    .filter((l) => l.account_id && (l.debit > 0 || l.credit > 0));

  const totalDebit = cleaned.reduce((s, l) => s + l.debit, 0);
  const totalCredit = cleaned.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(
      `Journal entry not balanced: debit=${totalDebit.toFixed(2)} credit=${totalCredit.toFixed(2)}`,
    );
  }
  if (totalDebit === 0) throw new Error('Journal entry has no amounts');

  const db = dbMod.get();
  const id = uuid();
  const txn = db.transaction(() => {
    const number = nextNumber('journal_entries', 'entry_number', tenantId);
    db.prepare(
      `INSERT INTO journal_entries
         (id, tenant_id, entry_number, entry_date, reference, description,
          source_type, source_id, total_debit, total_credit, is_posted, created_by)
       VALUES (@id, @tenant_id, @entry_number, @entry_date, @reference, @description,
               @source_type, @source_id, @total_debit, @total_credit, 1, @created_by)`,
    ).run({
      id,
      tenant_id: tenantId,
      entry_number: number,
      entry_date: entryDate || new Date().toISOString().slice(0, 10),
      reference: reference || null,
      description: description || null,
      source_type: sourceType || 'manual',
      source_id: sourceId || null,
      total_debit: round2(totalDebit),
      total_credit: round2(totalCredit),
      created_by: createdBy || null,
    });
    const lineStmt = db.prepare(
      `INSERT INTO journal_entry_lines
         (id, entry_id, account_id, debit, credit, description, cost_center_id, line_no)
       VALUES (@id, @entry_id, @account_id, @debit, @credit, @description, @cost_center_id, @line_no)`,
    );
    for (const line of cleaned) {
      lineStmt.run({ id: uuid(), entry_id: id, ...line, debit: round2(line.debit), credit: round2(line.credit) });
    }
  });
  txn();
  return id;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Auto-posting from operational documents
// ---------------------------------------------------------------------------

// Sales invoice → DR Cash/AR, CR Sales, CR VAT; plus DR COGS, CR Inventory.
function postSalesInvoice({ tenantId, invoiceId, userId }) {
  const db = dbMod.get();
  const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!inv) throw new Error('invoice not found');

  const cashId = getSystemAccount(tenantId, 'cash_default');
  const arId = getSystemAccount(tenantId, 'accounts_receivable');
  const salesId = getSystemAccount(tenantId, 'sales_revenue');
  const vatId = getSystemAccount(tenantId, 'vat_payable');
  const inventoryId = getSystemAccount(tenantId, 'inventory');
  const cogsId = getSystemAccount(tenantId, 'cogs');

  if (!salesId) throw new Error('Sales revenue account is not configured');

  // Tax modelled as a portion of total; if you haven't enabled tax yet, the
  // `tax` column is just 0 and the entry stays simple.
  const tax = Number(inv.tax || 0);
  const discount = Number(inv.discount || 0);
  const total = Number(inv.total || 0);
  const paid = Number(inv.paid || 0);
  const remaining = total - discount - paid;
  const netSales = total - tax; // revenue net of VAT

  // Replace any prior auto-entry for this invoice (e.g. on edit)
  const oldIds = db
    .prepare(`SELECT id FROM journal_entries WHERE source_type = 'sales_invoice' AND source_id = ?`)
    .all(invoiceId);
  for (const o of oldIds) {
    db.prepare(`DELETE FROM journal_entries WHERE id = ?`).run(o.id);
  }

  const lines = [];
  if (paid > 0 && cashId) lines.push({ account_id: cashId, debit: paid });
  if (remaining > 0 && arId) lines.push({ account_id: arId, debit: remaining });
  if (discount > 0) {
    // Discount allowed = expense
    const disc = getSystemAccount(tenantId, 'sales_discount');
    if (disc) lines.push({ account_id: disc, debit: discount });
  }
  lines.push({ account_id: salesId, credit: netSales > 0 ? netSales : total });
  if (tax > 0 && vatId) lines.push({ account_id: vatId, credit: tax });

  postJournalEntry({
    tenantId,
    entryDate: (inv.created_at || '').slice(0, 10),
    reference: `INV-${inv.number ?? inv.id.slice(0, 6)}`,
    description: `قيد بيع للفاتورة ${inv.number ?? ''}`.trim(),
    sourceType: 'sales_invoice',
    sourceId: invoiceId,
    createdBy: userId,
    lines,
  });

  // COGS leg (only if inventory + cogs accounts configured and items have a cost)
  if (inventoryId && cogsId) {
    const items = db
      .prepare(
        `SELECT ii.quantity, COALESCE(p.cost, 0) AS cost
           FROM invoice_items ii
           LEFT JOIN products p ON p.id = ii.product_id
          WHERE ii.invoice_id = ?`,
      )
      .all(invoiceId);
    const cogs = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.cost) || 0), 0);
    if (cogs > 0) {
      postJournalEntry({
        tenantId,
        entryDate: (inv.created_at || '').slice(0, 10),
        reference: `COGS-${inv.number ?? inv.id.slice(0, 6)}`,
        description: `تكلفة بضاعة مباعة للفاتورة ${inv.number ?? ''}`.trim(),
        sourceType: 'sales_invoice_cogs',
        sourceId: invoiceId,
        createdBy: userId,
        lines: [
          { account_id: cogsId, debit: cogs },
          { account_id: inventoryId, credit: cogs },
        ],
      });
    }
  }
}

// Purchase invoice → DR Inventory + DR VAT, CR Cash/AP
function postPurchaseInvoice({ tenantId, invoiceId, userId }) {
  const db = dbMod.get();
  const inv = db.prepare(`SELECT * FROM purchase_invoices WHERE id = ?`).get(invoiceId);
  if (!inv) throw new Error('purchase invoice not found');

  const cashId = getSystemAccount(tenantId, 'cash_default');
  const apId = getSystemAccount(tenantId, 'accounts_payable');
  const inventoryId = getSystemAccount(tenantId, 'inventory');
  const vatId = getSystemAccount(tenantId, 'vat_payable');

  if (!inventoryId) throw new Error('Inventory account is not configured');

  const subtotal = Number(inv.subtotal || 0);
  const tax = Number(inv.tax || 0);
  const discount = Number(inv.discount || 0);
  const total = Number(inv.total || 0);
  const paid = Number(inv.paid || 0);
  const remaining = total - paid;

  // Clear any prior auto-entry
  for (const o of db
    .prepare(`SELECT id FROM journal_entries WHERE source_type = 'purchase_invoice' AND source_id = ?`)
    .all(invoiceId)) {
    db.prepare(`DELETE FROM journal_entries WHERE id = ?`).run(o.id);
  }

  const lines = [
    { account_id: inventoryId, debit: subtotal - discount },
  ];
  if (tax > 0 && vatId) lines.push({ account_id: vatId, debit: tax });
  if (paid > 0 && cashId) lines.push({ account_id: cashId, credit: paid });
  if (remaining > 0 && apId) lines.push({ account_id: apId, credit: remaining });

  postJournalEntry({
    tenantId,
    entryDate: inv.invoice_date,
    reference: `PINV-${inv.number ?? inv.id.slice(0, 6)}`,
    description: `قيد شراء للفاتورة ${inv.number ?? ''}`.trim(),
    sourceType: 'purchase_invoice',
    sourceId: invoiceId,
    createdBy: userId,
    lines,
  });
}

// Receipt voucher → DR Cash, CR counter (default AR)
function postReceiptVoucher({ tenantId, voucherId, userId }) {
  const db = dbMod.get();
  const v = db.prepare(`SELECT * FROM receipt_vouchers WHERE id = ?`).get(voucherId);
  if (!v) throw new Error('voucher not found');
  const cashId = v.cash_account_id || getSystemAccount(tenantId, 'cash_default');
  const counterId = v.counter_account_id || getSystemAccount(tenantId, 'accounts_receivable');
  if (!cashId || !counterId) throw new Error('Cash or counter account missing');

  for (const o of db
    .prepare(`SELECT id FROM journal_entries WHERE source_type = 'receipt_voucher' AND source_id = ?`)
    .all(voucherId)) {
    db.prepare(`DELETE FROM journal_entries WHERE id = ?`).run(o.id);
  }

  postJournalEntry({
    tenantId,
    entryDate: v.voucher_date,
    reference: `RCV-${v.voucher_number ?? v.id.slice(0, 6)}`,
    description: v.description || 'إيصال قبض',
    sourceType: 'receipt_voucher',
    sourceId: voucherId,
    createdBy: userId,
    lines: [
      { account_id: cashId, debit: Number(v.amount) },
      { account_id: counterId, credit: Number(v.amount) },
    ],
  });
}

// Payment voucher → DR counter (default AP/expense), CR Cash
function postPaymentVoucher({ tenantId, voucherId, userId }) {
  const db = dbMod.get();
  const v = db.prepare(`SELECT * FROM payment_vouchers WHERE id = ?`).get(voucherId);
  if (!v) throw new Error('voucher not found');
  const cashId = v.cash_account_id || getSystemAccount(tenantId, 'cash_default');
  const counterId = v.counter_account_id || getSystemAccount(tenantId, 'accounts_payable');
  if (!cashId || !counterId) throw new Error('Cash or counter account missing');

  for (const o of db
    .prepare(`SELECT id FROM journal_entries WHERE source_type = 'payment_voucher' AND source_id = ?`)
    .all(voucherId)) {
    db.prepare(`DELETE FROM journal_entries WHERE id = ?`).run(o.id);
  }

  postJournalEntry({
    tenantId,
    entryDate: v.voucher_date,
    reference: `PAY-${v.voucher_number ?? v.id.slice(0, 6)}`,
    description: v.description || 'إيصال صرف',
    sourceType: 'payment_voucher',
    sourceId: voucherId,
    createdBy: userId,
    lines: [
      { account_id: counterId, debit: Number(v.amount) },
      { account_id: cashId, credit: Number(v.amount) },
    ],
  });
}

// ---------------------------------------------------------------------------
// Composite operations called from IPC
// ---------------------------------------------------------------------------
function savePurchaseInvoice({ invoice, items, autoPost = true }) {
  const db = dbMod.get();
  const id = invoice.id || uuid();
  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.cost || 0), 0);
  const tax = Number(invoice.tax || 0);
  const discount = Number(invoice.discount || 0);
  const total = subtotal + tax - discount;
  const paid = Number(invoice.paid || 0);
  const remaining = total - paid;

  const txn = db.transaction(() => {
    const existing = db.prepare(`SELECT id FROM purchase_invoices WHERE id = ?`).get(id);
    const number = invoice.number || nextNumber('purchase_invoices', 'number', invoice.tenant_id);
    const payload = {
      id,
      tenant_id: invoice.tenant_id,
      supplier_id: invoice.supplier_id || null,
      user_id: invoice.user_id || null,
      number,
      invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      subtotal: round2(subtotal),
      tax: round2(tax),
      discount: round2(discount),
      total: round2(total),
      paid: round2(paid),
      remaining: round2(remaining),
      status: remaining <= 0 ? 'paid' : 'open',
      reference: invoice.reference || null,
      notes: invoice.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const cols = Object.keys(payload);
      db.prepare(
        `UPDATE purchase_invoices SET ${cols.map((c) => `${c}=@${c}`).join(', ')} WHERE id = @id`,
      ).run(payload);
      db.prepare(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`).run(id);
    } else {
      const cols = Object.keys(payload);
      db.prepare(
        `INSERT INTO purchase_invoices (${cols.join(',')}) VALUES (${cols
          .map((c) => '@' + c)
          .join(',')})`,
      ).run(payload);
    }

    const itemStmt = db.prepare(
      `INSERT INTO purchase_invoice_items (id, invoice_id, product_id, product_name, quantity, cost, total)
       VALUES (@id, @invoice_id, @product_id, @product_name, @quantity, @cost, @total)`,
    );
    const stockUp = db.prepare(
      `UPDATE products SET stock = stock + @qty, cost = @cost, updated_at = datetime('now') WHERE id = @pid`,
    );
    for (const it of items) {
      itemStmt.run({
        id: uuid(),
        invoice_id: id,
        product_id: it.product_id || null,
        product_name: it.product_name,
        quantity: Number(it.quantity) || 0,
        cost: Number(it.cost) || 0,
        total: Number(it.quantity || 0) * Number(it.cost || 0),
      });
      if (!existing && it.product_id) {
        stockUp.run({ qty: Number(it.quantity) || 0, cost: Number(it.cost) || 0, pid: it.product_id });
      }
    }

    // Update supplier balance
    if (invoice.supplier_id) {
      db.prepare(
        `UPDATE suppliers SET balance = balance + @delta, updated_at = datetime('now') WHERE id = @sid`,
      ).run({ delta: remaining, sid: invoice.supplier_id });
    }
  });

  txn();
  if (autoPost) {
    try {
      postPurchaseInvoice({ tenantId: invoice.tenant_id, invoiceId: id, userId: invoice.user_id });
    } catch (err) {
      console.warn('[SystemAlaa] purchase auto-post skipped:', err.message);
    }
  }
  return db.prepare(`SELECT * FROM purchase_invoices WHERE id = ?`).get(id);
}

function saveReceiptVoucher(payload, autoPost = true) {
  const db = dbMod.get();
  const id = payload.id || uuid();
  const number = nextNumber('receipt_vouchers', 'voucher_number', payload.tenant_id);
  db.prepare(
    `INSERT INTO receipt_vouchers
       (id, tenant_id, voucher_number, voucher_date, client_id, cash_account_id,
        counter_account_id, amount, method, description, reference, user_id)
     VALUES (@id, @tenant_id, @voucher_number, @voucher_date, @client_id, @cash_account_id,
             @counter_account_id, @amount, @method, @description, @reference, @user_id)`,
  ).run({
    id,
    tenant_id: payload.tenant_id,
    voucher_number: number,
    voucher_date: payload.voucher_date || new Date().toISOString().slice(0, 10),
    client_id: payload.client_id || null,
    cash_account_id: payload.cash_account_id || null,
    counter_account_id: payload.counter_account_id || null,
    amount: Number(payload.amount) || 0,
    method: payload.method || 'cash',
    description: payload.description || null,
    reference: payload.reference || null,
    user_id: payload.user_id || null,
  });

  if (payload.client_id) {
    db.prepare(
      `UPDATE clients SET balance = balance - @amt, updated_at = datetime('now') WHERE id = @cid`,
    ).run({ amt: Number(payload.amount) || 0, cid: payload.client_id });
  }
  if (autoPost) postReceiptVoucher({ tenantId: payload.tenant_id, voucherId: id, userId: payload.user_id });
  return db.prepare(`SELECT * FROM receipt_vouchers WHERE id = ?`).get(id);
}

function savePaymentVoucher(payload, autoPost = true) {
  const db = dbMod.get();
  const id = payload.id || uuid();
  const number = nextNumber('payment_vouchers', 'voucher_number', payload.tenant_id);
  db.prepare(
    `INSERT INTO payment_vouchers
       (id, tenant_id, voucher_number, voucher_date, supplier_id, cash_account_id,
        counter_account_id, amount, method, description, reference, user_id)
     VALUES (@id, @tenant_id, @voucher_number, @voucher_date, @supplier_id, @cash_account_id,
             @counter_account_id, @amount, @method, @description, @reference, @user_id)`,
  ).run({
    id,
    tenant_id: payload.tenant_id,
    voucher_number: number,
    voucher_date: payload.voucher_date || new Date().toISOString().slice(0, 10),
    supplier_id: payload.supplier_id || null,
    cash_account_id: payload.cash_account_id || null,
    counter_account_id: payload.counter_account_id || null,
    amount: Number(payload.amount) || 0,
    method: payload.method || 'cash',
    description: payload.description || null,
    reference: payload.reference || null,
    user_id: payload.user_id || null,
  });

  if (payload.supplier_id) {
    db.prepare(
      `UPDATE suppliers SET balance = balance - @amt, updated_at = datetime('now') WHERE id = @sid`,
    ).run({ amt: Number(payload.amount) || 0, sid: payload.supplier_id });
  }
  if (autoPost) postPaymentVoucher({ tenantId: payload.tenant_id, voucherId: id, userId: payload.user_id });
  return db.prepare(`SELECT * FROM payment_vouchers WHERE id = ?`).get(id);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

// Returns an array of accounts plus their leaf debit/credit totals between
// `from` and `to` (inclusive). Groups roll up via descendant sums in the
// formatted reports below.
function leafBalances(tenantId, from, to) {
  const db = dbMod.get();
  const where = ['je.tenant_id = ?'];
  const params = [tenantId];
  if (from) {
    where.push(`je.entry_date >= ?`);
    params.push(from);
  }
  if (to) {
    where.push(`je.entry_date <= ?`);
    params.push(to);
  }
  return db
    .prepare(
      `SELECT a.id, a.code, a.name, a.account_type, a.parent_id, a.is_group,
              COALESCE(SUM(l.debit), 0) AS debit,
              COALESCE(SUM(l.credit), 0) AS credit
         FROM chart_of_accounts a
         LEFT JOIN journal_entry_lines l ON l.account_id = a.id
         LEFT JOIN journal_entries je ON je.id = l.entry_id
        WHERE a.tenant_id = ?
          AND (je.id IS NULL OR (${where.join(' AND ')}))
        GROUP BY a.id
        ORDER BY a.code`,
    )
    .all(tenantId, ...params);
}

function trialBalance({ tenantId, from = null, to = null }) {
  const rows = leafBalances(tenantId, from, to);
  const out = rows
    .filter((r) => !r.is_group)
    .map((r) => {
      const debit = Number(r.debit) || 0;
      const credit = Number(r.credit) || 0;
      const balance = debit - credit;
      // For liability/equity/revenue, a positive balance is normally credit
      const normal = ['asset', 'expense'].includes(r.account_type) ? 'debit' : 'credit';
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.account_type,
        debit,
        credit,
        balance,
        normal,
        balanceDebit: normal === 'debit' ? Math.max(0, balance) : 0,
        balanceCredit: normal === 'credit' ? Math.max(0, -balance) : 0,
      };
    });
  const totals = out.reduce(
    (s, r) => ({
      debit: s.debit + r.debit,
      credit: s.credit + r.credit,
      balanceDebit: s.balanceDebit + r.balanceDebit,
      balanceCredit: s.balanceCredit + r.balanceCredit,
    }),
    { debit: 0, credit: 0, balanceDebit: 0, balanceCredit: 0 },
  );
  return { rows: out, totals };
}

function incomeStatement({ tenantId, from, to }) {
  const rows = leafBalances(tenantId, from, to).filter((r) => !r.is_group);
  const revenue = rows
    .filter((r) => r.account_type === 'revenue')
    .map((r) => ({ id: r.id, code: r.code, name: r.name, amount: round2(r.credit - r.debit) }));
  const expenses = rows
    .filter((r) => r.account_type === 'expense')
    .map((r) => ({ id: r.id, code: r.code, name: r.name, amount: round2(r.debit - r.credit) }));
  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  return {
    revenue,
    expenses,
    totalRevenue: round2(totalRevenue),
    totalExpenses: round2(totalExpenses),
    netIncome: round2(totalRevenue - totalExpenses),
  };
}

function balanceSheet({ tenantId, asOf = null }) {
  const to = asOf || new Date().toISOString().slice(0, 10);
  const rows = leafBalances(tenantId, null, to).filter((r) => !r.is_group);
  const sign = (r) => (['asset', 'expense'].includes(r.account_type) ? 1 : -1);

  const pick = (type) =>
    rows
      .filter((r) => r.account_type === type)
      .map((r) => ({ id: r.id, code: r.code, name: r.name, amount: round2((r.debit - r.credit) * sign(r)) }))
      .filter((r) => Math.abs(r.amount) > 0.001);

  const assets = pick('asset');
  const liabilities = pick('liability');
  const equity = pick('equity');

  // Net income for the period flows into equity for the as-of view
  const period = incomeStatement({ tenantId, from: null, to });
  const equityWithIncome = [
    ...equity,
    { id: 'net-income', code: '—', name: 'صافي الربح/الخسارة', amount: period.netIncome },
  ];

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const totalEquity = equityWithIncome.reduce((s, r) => s + r.amount, 0);

  return {
    asOf: to,
    assets,
    liabilities,
    equity: equityWithIncome,
    totalAssets: round2(totalAssets),
    totalLiabilities: round2(totalLiabilities),
    totalEquity: round2(totalEquity),
    totalLiabilitiesAndEquity: round2(totalLiabilities + totalEquity),
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.5,
  };
}

function generalLedger({ tenantId, accountId, from = null, to = null }) {
  const db = dbMod.get();
  const where = ['je.tenant_id = ?', 'l.account_id = ?'];
  const params = [tenantId, accountId];
  if (from) {
    where.push(`je.entry_date >= ?`);
    params.push(from);
  }
  if (to) {
    where.push(`je.entry_date <= ?`);
    params.push(to);
  }
  const rows = db
    .prepare(
      `SELECT je.entry_date, je.entry_number, je.reference, je.description AS entry_desc,
              l.debit, l.credit, l.description AS line_desc
         FROM journal_entry_lines l
         JOIN journal_entries je ON je.id = l.entry_id
        WHERE ${where.join(' AND ')}
        ORDER BY je.entry_date ASC, je.entry_number ASC`,
    )
    .all(...params);

  let running = 0;
  const out = rows.map((r) => {
    running += (Number(r.debit) || 0) - (Number(r.credit) || 0);
    return { ...r, balance: round2(running) };
  });
  return { rows: out, closingBalance: round2(running) };
}

function arAging({ tenantId, asOf = null }) {
  const db = dbMod.get();
  const now = asOf ? new Date(asOf) : new Date();
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.phone, c.balance,
              COALESCE(SUM(CASE WHEN i.remaining > 0 THEN i.remaining ELSE 0 END), 0) AS open_total,
              MIN(i.created_at) AS oldest_open
         FROM clients c
         LEFT JOIN invoices i ON i.client_id = c.id AND i.remaining > 0
        WHERE c.tenant_id = ?
        GROUP BY c.id
       HAVING open_total > 0
        ORDER BY open_total DESC`,
    )
    .all(tenantId);

  return rows.map((r) => {
    const oldest = r.oldest_open ? new Date(r.oldest_open) : null;
    const days = oldest ? Math.floor((now - oldest) / 86400000) : 0;
    let bucket = 'current';
    if (days > 90) bucket = '90+';
    else if (days > 60) bucket = '61-90';
    else if (days > 30) bucket = '31-60';
    else if (days > 0) bucket = '1-30';
    return { ...r, days, bucket };
  });
}

module.exports = {
  ensureChartOfAccounts,
  getSystemAccount,
  setSystemAccount,
  listSystemAccounts,
  postJournalEntry,
  postSalesInvoice,
  postPurchaseInvoice,
  savePurchaseInvoice,
  saveReceiptVoucher,
  savePaymentVoucher,
  trialBalance,
  incomeStatement,
  balanceSheet,
  generalLedger,
  arAging,
};
