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
    -- Storefront
    CREATE TABLE IF NOT EXISTS store_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT,
      description TEXT,
      logo_url TEXT,
      hero_image_url TEXT,
      banner_image_url TEXT,
      primary_color TEXT NOT NULL DEFAULT '221 83% 53%',
      accent_color TEXT NOT NULL DEFAULT '262 83% 58%',
      currency TEXT NOT NULL DEFAULT 'EGP',
      currency_symbol TEXT NOT NULL DEFAULT 'ج.م',
      phone TEXT,
      email TEXT,
      address TEXT,
      whatsapp_phone TEXT,
      facebook_url TEXT,
      instagram_url TEXT,
      tiktok_url TEXT,
      working_hours TEXT,
      delivery_note TEXT,
      return_policy TEXT,
      privacy_policy TEXT,
      terms TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      track_inventory INTEGER NOT NULL DEFAULT 1,
      allow_out_of_stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Per-tenant storefront customers (separate from app_users).
    CREATE TABLE IF NOT EXISTS store_customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      total_spent REAL NOT NULL DEFAULT 0,
      orders_count INTEGER NOT NULL DEFAULT 0,
      last_order_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, phone)
    );

    CREATE TABLE IF NOT EXISTS store_customer_addresses (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
      label TEXT,
      recipient_name TEXT,
      phone TEXT,
      country TEXT NOT NULL DEFAULT 'EG',
      governorate TEXT,
      city TEXT,
      area TEXT,
      street TEXT,
      building TEXT,
      floor TEXT,
      apartment TEXT,
      postal_code TEXT,
      notes TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      lat REAL,
      lng REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'percent',  -- percent|fixed|free_shipping
      value REAL NOT NULL DEFAULT 0,
      min_subtotal REAL NOT NULL DEFAULT 0,
      max_discount REAL,
      usage_limit INTEGER,
      times_used INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT,
      ends_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS shipping_carriers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,  -- aramex|bosta|jnt|fedex|custom
      config_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      flat_rate REAL NOT NULL DEFAULT 0,
      free_above REAL,
      estimated_days INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_gateways (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,  -- paymob|fawry|stripe|paypal|cod|bank_transfer
      config_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      surcharge_percent REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS store_order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      note TEXT,
      changed_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, product_id)
    );

    -- Augment products with store-specific fields (no-op if columns exist)
    -- SQLite doesn't support IF NOT EXISTS on ADD COLUMN, so we attempt and
    -- swallow errors; see migration block in JS below.

    -- Augment store_orders for full e-commerce flow
    -- (created below via migration block to handle column additions safely)
  `);

  // ---- Idempotent column-add migrations -------------------------------
  // SQLite has no IF NOT EXISTS for ADD COLUMN, so we probe and try-catch.
  function pragmaCols(table) {
    return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name));
  }
  function maybeAdd(table, name, def) {
    const cols = pragmaCols(table);
    if (!cols.has(name)) {
      try {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
      } catch (err) {
        console.warn(`[SystemAlaa] could not add ${table}.${name}:`, err.message);
      }
    }
  }
  maybeAdd('products', 'store_visible', 'INTEGER NOT NULL DEFAULT 1');
  maybeAdd('products', 'store_price', 'REAL');
  maybeAdd('products', 'store_description', 'TEXT');
  maybeAdd('products', 'store_image_urls', 'TEXT');
  maybeAdd('products', 'store_featured', 'INTEGER NOT NULL DEFAULT 0');
  maybeAdd('products', 'weight_kg', 'REAL NOT NULL DEFAULT 0');

  maybeAdd('store_orders', 'order_number', 'INTEGER');
  maybeAdd('store_orders', 'customer_id', 'TEXT REFERENCES store_customers(id) ON DELETE SET NULL');
  maybeAdd('store_orders', 'address_id', 'TEXT');
  maybeAdd('store_orders', 'shipping_address_json', 'TEXT');
  maybeAdd('store_orders', 'shipping_carrier_id', 'TEXT');
  maybeAdd('store_orders', 'shipping_fee', 'REAL NOT NULL DEFAULT 0');
  maybeAdd('store_orders', 'payment_gateway_id', 'TEXT');
  maybeAdd('store_orders', 'payment_status', 'TEXT NOT NULL DEFAULT "unpaid"');
  maybeAdd('store_orders', 'payment_reference', 'TEXT');
  maybeAdd('store_orders', 'tracking_number', 'TEXT');
  maybeAdd('store_orders', 'discount', 'REAL NOT NULL DEFAULT 0');
  maybeAdd('store_orders', 'coupon_id', 'TEXT REFERENCES coupons(id) ON DELETE SET NULL');
  maybeAdd('store_orders', 'subtotal', 'REAL NOT NULL DEFAULT 0');
  maybeAdd('store_orders', 'tax', 'REAL NOT NULL DEFAULT 0');
  maybeAdd('store_orders', 'notes', 'TEXT');
  maybeAdd('store_orders', 'updated_at', 'TEXT');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_settings_slug ON store_settings(slug);
    CREATE INDEX IF NOT EXISTS idx_store_customers_tenant ON store_customers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(tenant_id, code);
    CREATE INDEX IF NOT EXISTS idx_carriers_tenant ON shipping_carriers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_gateways_tenant ON payment_gateways(tenant_id);
  `);
}

// Encrypted-column helpers ----------------------------------------------------
// Spec: encrypt two_factor_secret, backup_codes, client_phone at rest.

const SENSITIVE = {
  app_users: new Set(['two_factor_secret', 'backup_codes']),
  clients: new Set(['phone']),
  suppliers: new Set(['phone']),
  store_customers: new Set(['phone']),
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
