// SQLite layer for SystemAlaa Desktop.
// Mirrors the multi-tenant schema described in the spec. All renderer access
// goes through IPC handlers in main.cjs so the renderer never touches the
// file system directly.
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');
const { encrypt, decrypt } = require('./crypto.cjs');

let db = null;

function open(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  bootstrap();
  return db;
}

function get() {
  if (!db) throw new Error('Database not opened. Call open() first.');
  return db;
}

function bootstrap() {
  db.exec(`
    -- Multi-tenant core
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      logo_url TEXT,
      settings_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      password_hash TEXT NOT NULL,
      access_code_hash TEXT,
      device_fingerprint TEXT,
      role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER NOT NULL DEFAULT 1,
      two_factor_secret TEXT,
      backup_codes TEXT,
      last_login TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      UNIQUE(user_id, role)
    );

    -- Catalog
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      item_number TEXT,
      barcode TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      stock REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Invoicing
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      number INTEGER,
      type TEXT NOT NULL DEFAULT 'sales',
      total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      paid REAL NOT NULL DEFAULT 0,
      remaining REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      commission_rate REAL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      method TEXT,
      date TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      total REAL NOT NULL DEFAULT 0,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      quantity REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    -- Settings & templates
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, key)
    );

    CREATE TABLE IF NOT EXISTS invoice_templates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      layout_json TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS label_templates (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      config_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Security & audit
    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      city TEXT,
      country TEXT,
      user_agent TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      old_data TEXT,
      new_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Storefront
    CREATE TABLE IF NOT EXISTS store_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      client_name TEXT,
      client_phone TEXT,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    -- Notifications & sync queue
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pending_operations (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      data_json TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      retry_count INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    );

    -- ====================================================================
    -- Accounting (full double-entry bookkeeping)
    -- ====================================================================

    -- Chart of Accounts (دليل / شجرة الحسابات)
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      account_type TEXT NOT NULL,   -- asset|liability|equity|revenue|expense
      account_subtype TEXT,
      parent_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      is_group INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      currency TEXT NOT NULL DEFAULT 'EGP',
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    -- Fiscal periods (الفترات المحاسبية)
    CREATE TABLE IF NOT EXISTS fiscal_periods (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_closed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Journal entries (القيود اليومية)
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      entry_number INTEGER,
      entry_date TEXT NOT NULL DEFAULT (date('now')),
      reference TEXT,
      description TEXT,
      source_type TEXT,
      source_id TEXT,
      total_debit REAL NOT NULL DEFAULT 0,
      total_credit REAL NOT NULL DEFAULT 0,
      is_posted INTEGER NOT NULL DEFAULT 1,
      created_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      description TEXT,
      cost_center_id TEXT REFERENCES cost_centers(id) ON DELETE SET NULL,
      line_no INTEGER NOT NULL DEFAULT 0
    );

    -- Suppliers (الموردون)
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_number TEXT,
      balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Purchase invoices (فواتير المشتريات)
    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      number INTEGER,
      invoice_date TEXT NOT NULL DEFAULT (date('now')),
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paid REAL NOT NULL DEFAULT 0,
      remaining REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      cost REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    -- Receipt vouchers (إيصالات القبض - cash in)
    CREATE TABLE IF NOT EXISTS receipt_vouchers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      voucher_number INTEGER,
      voucher_date TEXT NOT NULL DEFAULT (date('now')),
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      cash_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      counter_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      method TEXT,
      description TEXT,
      reference TEXT,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Payment vouchers (إيصالات الصرف - cash out)
    CREATE TABLE IF NOT EXISTS payment_vouchers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      voucher_number INTEGER,
      voucher_date TEXT NOT NULL DEFAULT (date('now')),
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      cash_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      counter_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      method TEXT,
      description TEXT,
      reference TEXT,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cost centers (مراكز التكلفة)
    CREATE TABLE IF NOT EXISTS cost_centers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    -- Fixed assets (الأصول الثابتة)
    CREATE TABLE IF NOT EXISTS fixed_assets (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT,
      acquisition_date TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      salvage_value REAL NOT NULL DEFAULT 0,
      useful_life_years INTEGER NOT NULL DEFAULT 5,
      depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
      asset_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      depreciation_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      accumulated_depreciation_account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      is_disposed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(tenant_id, barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_security_events_date ON security_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_pending_ops_synced ON pending_operations(synced);

    CREATE INDEX IF NOT EXISTS idx_coa_tenant ON chart_of_accounts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);
    CREATE INDEX IF NOT EXISTS idx_je_tenant_date ON journal_entries(tenant_id, entry_date);
    CREATE INDEX IF NOT EXISTS idx_je_source ON journal_entries(source_type, source_id);
    CREATE INDEX IF NOT EXISTS idx_jel_entry ON journal_entry_lines(entry_id);
    CREATE INDEX IF NOT EXISTS idx_jel_account ON journal_entry_lines(account_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_pi_tenant_date ON purchase_invoices(tenant_id, invoice_date);
    CREATE INDEX IF NOT EXISTS idx_rv_tenant_date ON receipt_vouchers(tenant_id, voucher_date);
    CREATE INDEX IF NOT EXISTS idx_pv_tenant_date ON payment_vouchers(tenant_id, voucher_date);
  `);
}

// Encrypted-column helpers ----------------------------------------------------
// Spec: encrypt two_factor_secret, backup_codes, client_phone at rest.

const SENSITIVE = {
  app_users: new Set(['two_factor_secret', 'backup_codes']),
  clients: new Set(['phone']),
  suppliers: new Set(['phone']),
};

function encryptRow(table, row) {
  if (!row || typeof row !== 'object') return row;
  const cols = SENSITIVE[table];
  if (!cols) return row;
  const out = { ...row };
  for (const col of cols) {
    if (col in out && out[col] != null && out[col] !== '') out[col] = encrypt(out[col]);
  }
  return out;
}

function decryptRow(table, row) {
  if (!row || typeof row !== 'object') return row;
  const cols = SENSITIVE[table];
  if (!cols) return row;
  const out = { ...row };
  for (const col of cols) {
    if (col in out && typeof out[col] === 'string' && out[col].startsWith('v1:')) {
      out[col] = decrypt(out[col]);
    }
  }
  return out;
}

function decryptRows(table, rows) {
  return Array.isArray(rows) ? rows.map((r) => decryptRow(table, r)) : rows;
}

module.exports = { open, get, encryptRow, decryptRow, decryptRows };
