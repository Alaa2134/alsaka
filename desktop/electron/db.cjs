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
  // Marketplace integration (Wave 4)
  maybeAdd('store_orders', 'source', "TEXT NOT NULL DEFAULT 'storefront'"); // storefront | salla | shopify | talabat
  maybeAdd('store_orders', 'external_order_id', 'TEXT');
  maybeAdd('store_orders', 'raw_json', 'TEXT');
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_store_orders_external ON store_orders(tenant_id, source, external_order_id) WHERE external_order_id IS NOT NULL;`);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_store_settings_slug ON store_settings(slug);
    CREATE INDEX IF NOT EXISTS idx_store_customers_tenant ON store_customers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(tenant_id, code);
    CREATE INDEX IF NOT EXISTS idx_carriers_tenant ON shipping_carriers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_gateways_tenant ON payment_gateways(tenant_id);

    -- Google Drive backup state. Single-row table (the desktop is
    -- single-user-per-machine after device binding).
    CREATE TABLE IF NOT EXISTS google_drive (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 0,
      refresh_token TEXT,
      access_token TEXT,
      token_expiry TEXT,
      account_email TEXT,
      account_name TEXT,
      backup_file_id TEXT,
      backup_file_name TEXT NOT NULL DEFAULT 'systemalaa-backup.db.enc',
      schedule_hour INTEGER NOT NULL DEFAULT 2,
      encrypt_payload INTEGER NOT NULL DEFAULT 1,
      last_success_at TEXT,
      last_attempt_at TEXT,
      last_size_bytes INTEGER,
      last_error TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ====================================================================
    -- POS extensions: cashier shifts, held invoices, multi-pricing,
    -- loyalty, gift cards, bundles, returns.
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS cashier_shifts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      opening_cash REAL NOT NULL DEFAULT 0,
      closing_cash REAL,
      expected_cash REAL,
      cash_in REAL NOT NULL DEFAULT 0,
      cash_out REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      total_returns REAL NOT NULL DEFAULT 0,
      invoice_count INTEGER NOT NULL DEFAULT 0,
      difference REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS held_invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      label TEXT,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loyalty_accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'standard',
      total_earned INTEGER NOT NULL DEFAULT 0,
      total_redeemed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, client_id)
    );

    CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,  -- earn | redeem | adjust
      points INTEGER NOT NULL,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gift_cards (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      issued_to_name TEXT,
      issued_to_phone TEXT,
      initial_balance REAL NOT NULL,
      current_balance REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EGP',
      pin_hash TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      issued_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS gift_card_redemptions (
      id TEXT PRIMARY KEY,
      gift_card_id TEXT NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_bundles (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bundle_price REAL NOT NULL,
      barcode TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS product_bundle_items (
      id TEXT PRIMARY KEY,
      bundle_id TEXT NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity REAL NOT NULL DEFAULT 1
    );

    -- ====================================================================
    -- Inventory extensions
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      sku TEXT,
      barcode TEXT,
      name TEXT NOT NULL,           -- e.g. "أحمر - L"
      attributes_json TEXT,         -- {"color":"red","size":"L"}
      price REAL,
      stock REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS stock_transfers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      transfer_number INTEGER,
      from_warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
      to_warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | in_transit | received | cancelled
      notes TEXT,
      created_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      received_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id TEXT PRIMARY KEY,
      transfer_id TEXT NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS stock_counts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      warehouse_id TEXT REFERENCES warehouses(id) ON DELETE SET NULL,
      count_number INTEGER,
      status TEXT NOT NULL DEFAULT 'open', -- open | committed | cancelled
      notes TEXT,
      created_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      committed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_count_items (
      id TEXT PRIMARY KEY,
      count_id TEXT NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      system_qty REAL NOT NULL DEFAULT 0,
      counted_qty REAL NOT NULL DEFAULT 0,
      difference REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      order_number INTEGER,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft', -- draft | sent | partial | received | cancelled
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      expected_at TEXT,
      created_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity REAL NOT NULL DEFAULT 0,
      received_quantity REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    -- ====================================================================
    -- Accounting extensions: currencies, bank, payroll, budgets, recurring
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS currencies (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,            -- ISO 4217: USD, EGP, ...
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      is_base INTEGER NOT NULL DEFAULT 0,
      rate REAL NOT NULL DEFAULT 1,  -- against base
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      iban TEXT,
      currency TEXT NOT NULL DEFAULT 'EGP',
      opening_balance REAL NOT NULL DEFAULT 0,
      account_id TEXT REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bank_transactions (
      id TEXT PRIMARY KEY,
      bank_account_id TEXT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
      transaction_date TEXT NOT NULL,
      description TEXT,
      reference TEXT,
      amount REAL NOT NULL,        -- positive = deposit, negative = withdrawal
      matched_with TEXT,            -- journal entry id when reconciled
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      national_id TEXT,
      phone TEXT,
      email TEXT,
      position TEXT,
      hire_date TEXT,
      basic_salary REAL NOT NULL DEFAULT 0,
      housing_allowance REAL NOT NULL DEFAULT 0,
      transport_allowance REAL NOT NULL DEFAULT 0,
      other_allowance REAL NOT NULL DEFAULT 0,
      insurance_deduction REAL NOT NULL DEFAULT 0,
      tax_deduction REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      run_month TEXT NOT NULL,    -- YYYY-MM
      total_gross REAL NOT NULL DEFAULT 0,
      total_net REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, run_month)
    );

    CREATE TABLE IF NOT EXISTS payroll_lines (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      gross REAL NOT NULL DEFAULT 0,
      deductions REAL NOT NULL DEFAULT 0,
      net REAL NOT NULL DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,        -- 1..12
      planned REAL NOT NULL DEFAULT 0,
      notes TEXT,
      UNIQUE(tenant_id, account_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS recurring_invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      template_json TEXT NOT NULL,    -- the line items + totals to clone
      cycle TEXT NOT NULL,            -- daily | weekly | monthly | yearly
      next_run_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ====================================================================
    -- Restaurant / café mode
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,        -- e.g. "T1", "VIP-3"
      seats INTEGER NOT NULL DEFAULT 4,
      zone TEXT,                 -- inside | terrace | rooftop
      status TEXT NOT NULL DEFAULT 'free', -- free | occupied | reserved | cleaning
      current_order_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurant_orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      table_id TEXT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
      order_type TEXT NOT NULL DEFAULT 'dine_in', -- dine_in | takeaway | delivery
      status TEXT NOT NULL DEFAULT 'open', -- open | paid | cancelled
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurant_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES restaurant_orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      kot_status TEXT NOT NULL DEFAULT 'new',  -- new | sent | preparing | ready | served | cancelled
      sent_to_kitchen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ====================================================================
    -- Returns (linked to original invoice)
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS return_lines (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
      invoice_item_id TEXT REFERENCES invoice_items(id) ON DELETE SET NULL,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );

    -- ====================================================================
    -- Webhooks + REST API keys + i18n
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      events TEXT NOT NULL,         -- comma-separated event names
      secret TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      payload TEXT NOT NULL,
      status_code INTEGER,
      response TEXT,
      delivered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      scopes TEXT NOT NULL DEFAULT 'read',  -- read | write | admin (comma-sep)
      last_used_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ====================================================================
    -- WhatsApp message outbox (offline queue)
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS whatsapp_outbox (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      to_phone TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text',  -- text | image
      body TEXT,
      data_url TEXT,
      caption TEXT,
      status TEXT NOT NULL DEFAULT 'queued',  -- queued | sent | failed
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at TEXT
    );

    -- WhatsApp Cloud API inbound webhook log
    CREATE TABLE IF NOT EXISTS whatsapp_inbox (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      from_number TEXT NOT NULL,
      type TEXT NOT NULL,
      body TEXT,
      message_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Driver / delivery queue (Wave 4 ecosystem)
    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      order_id TEXT REFERENCES store_orders(id) ON DELETE SET NULL,
      driver_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      cash_to_collect REAL NOT NULL DEFAULT 0,
      cash_collected REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'queued', -- queued | picked | in_transit | delivered | failed
      proof_url TEXT,
      notes TEXT,
      accepted_at TEXT,
      delivered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(tenant_id, status);

    -- Driver-day shift summary (cash reconciliation)
    CREATE TABLE IF NOT EXISTS driver_shifts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      driver_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      cash_collected REAL NOT NULL DEFAULT 0,
      deliveries_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT
    );

    -- Add product extensions: variant tracking flag, multi-pricing,
    -- expiry, ingredients (for restaurant), is_service flag.
  `);

  // Idempotent column additions for new POS features
  maybeAdd('products', 'has_variants', 'INTEGER NOT NULL DEFAULT 0');
  maybeAdd('products', 'wholesale_price', 'REAL');
  maybeAdd('products', 'vip_price', 'REAL');
  maybeAdd('products', 'expiry_date', 'TEXT');
  maybeAdd('products', 'is_service', 'INTEGER NOT NULL DEFAULT 0');
  maybeAdd('products', 'tax_rate', 'REAL NOT NULL DEFAULT 0');
  maybeAdd('products', 'kitchen_section', 'TEXT');
  maybeAdd('products', 'menu_section', 'TEXT');

  maybeAdd('clients', 'pricing_tier', "TEXT NOT NULL DEFAULT 'retail'");

  maybeAdd('invoices', 'shift_id', 'TEXT');
  maybeAdd('invoices', 'is_return', 'INTEGER NOT NULL DEFAULT 0');
  maybeAdd('invoices', 'parent_invoice_id', 'TEXT');
  maybeAdd('invoices', 'currency', "TEXT NOT NULL DEFAULT 'EGP'");
  maybeAdd('invoices', 'fx_rate', 'REAL NOT NULL DEFAULT 1');
  maybeAdd('invoices', 'tax', 'REAL NOT NULL DEFAULT 0');
  maybeAdd('invoices', 'loyalty_earned', 'INTEGER NOT NULL DEFAULT 0');
  maybeAdd('invoices', 'loyalty_redeemed', 'INTEGER NOT NULL DEFAULT 0');
  maybeAdd('invoices', 'gift_card_redeemed', 'REAL NOT NULL DEFAULT 0');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shifts_user ON cashier_shifts(user_id);
    CREATE INDEX IF NOT EXISTS idx_held_tenant ON held_invoices(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_loyalty_client ON loyalty_accounts(client_id);
    CREATE INDEX IF NOT EXISTS idx_gift_code ON gift_cards(tenant_id, code);
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_transfers_tenant ON stock_transfers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_counts_tenant ON stock_counts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON bank_transactions(bank_account_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_invoices(next_run_date);
    CREATE INDEX IF NOT EXISTS idx_tables_tenant ON restaurant_tables(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_resto_orders_table ON restaurant_orders(table_id);
    CREATE INDEX IF NOT EXISTS idx_resto_items_order ON restaurant_order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_status ON whatsapp_outbox(status);
    CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

    -- ====================================================================
    -- Multi-branch, reservations, kitchen display, plugin marketplace
    -- ====================================================================

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      manager_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      industry_template TEXT,  -- retail | restaurant | pharmacy | salon | services
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, code)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE,
      table_id TEXT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
      service_name TEXT,
      starts_at TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      party_size INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',  -- pending | confirmed | seated | completed | cancelled
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchen_screens (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sections TEXT,                -- comma-separated kitchen sections to watch
      auto_advance INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      vendor TEXT,
      version TEXT,
      manifest_url TEXT,
      manifest_json TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS marketplace_integrations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      api_credentials_json TEXT,
      is_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Quotations (عروض الأسعار) — Quote → Accept → Invoice pipeline
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      quote_number INTEGER,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      user_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      issue_date TEXT NOT NULL DEFAULT (date('now')),
      valid_until TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      converted_invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);

    -- ====================================================================
    -- Wave 2: Compliance + Hardware
    -- ====================================================================

    -- ZATCA Phase 2 submissions (Saudi e-invoice clearance/reporting)
    CREATE TABLE IF NOT EXISTS zatca_submissions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      kind TEXT NOT NULL DEFAULT 'standard',  -- standard | simplified
      flow TEXT NOT NULL DEFAULT 'clearance', -- clearance | reporting
      xml TEXT,
      xml_hash TEXT,
      signed_xml TEXT,
      qr_payload TEXT,
      cleared_uuid TEXT,
      clearance_status TEXT NOT NULL DEFAULT 'pending', -- pending | cleared | warning | rejected
      response_json TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ETA Egypt submissions
    CREATE TABLE IF NOT EXISTS eta_submissions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      eta_uuid TEXT,
      internal_id TEXT,
      hash_key TEXT,
      payload_json TEXT,
      submission_status TEXT NOT NULL DEFAULT 'pending',
      response_json TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Generic hardware device registry — cash drawer, card terminal,
    -- scale, label printer all map to rows here. Per-device config in
    -- config_json so adding a new device class needs zero schema work.
    CREATE TABLE IF NOT EXISTS hardware_devices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,  -- cash_drawer | card_terminal | scale | label_printer | barcode_scanner
      name TEXT NOT NULL,
      provider TEXT NOT NULL,  -- escpos | ingenico | verifone | mettler | bizerba | zebra | custom
      interface TEXT NOT NULL, -- tcp://192.168... | serial:/dev/ttyUSB0 | usb:auto
      config_json TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_zatca_invoice ON zatca_submissions(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_eta_invoice ON eta_submissions(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_hw_tenant ON hardware_devices(tenant_id);

    -- ====================================================================
    -- Wave 3: Industry-specific deep logic
    -- ====================================================================
    CREATE TABLE IF NOT EXISTS drug_interactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      drug_a_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      drug_b_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      severity TEXT NOT NULL DEFAULT 'medium',
      note TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, drug_a_id, drug_b_id)
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      prescription_number INTEGER,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      patient_name TEXT NOT NULL,
      doctor_name TEXT,
      doctor_license TEXT,
      diagnosis TEXT,
      issue_date TEXT NOT NULL DEFAULT (date('now')),
      items_json TEXT NOT NULL DEFAULT '[]',
      dispense_status TEXT NOT NULL DEFAULT 'pending',
      dispensed_at TEXT,
      dispensed_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS controlled_substance_log (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      quantity REAL NOT NULL,
      prescription_id TEXT REFERENCES prescriptions(id) ON DELETE SET NULL,
      patient_id_number TEXT,
      signed_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      witness_signature TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      serves INTEGER NOT NULL DEFAULT 1,
      total_cost REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      ingredient_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      unit TEXT
    );

    CREATE TABLE IF NOT EXISTS waste_log (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      reason TEXT,
      cost REAL NOT NULL DEFAULT 0,
      recorded_by TEXT REFERENCES app_users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS staff_schedules (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS service_packages (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sessions_count INTEGER NOT NULL,
      price REAL NOT NULL,
      valid_days INTEGER NOT NULL DEFAULT 365,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_packages (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      package_id TEXT NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
      sessions_left INTEGER NOT NULL,
      expires_at TEXT,
      purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
      vin TEXT,
      plate TEXT,
      make TEXT,
      model TEXT,
      year INTEGER,
      color TEXT,
      odometer_km INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_cards (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      job_number INTEGER,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open',
      mechanic_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
      complaint TEXT,
      diagnosis TEXT,
      labor_hours REAL NOT NULL DEFAULT 0,
      labor_total REAL NOT NULL DEFAULT 0,
      parts_total REAL NOT NULL DEFAULT 0,
      photos_json TEXT NOT NULL DEFAULT '[]',
      opened_at TEXT NOT NULL DEFAULT (datetime('now')),
      closed_at TEXT,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
      warranty_until TEXT
    );

    CREATE TABLE IF NOT EXISTS parts_cross_ref (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      oem_part TEXT NOT NULL,
      alt_part TEXT NOT NULL,
      manufacturer TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, oem_part, alt_part)
    );

    CREATE INDEX IF NOT EXISTS idx_drug_int_tenant ON drug_interactions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_tenant ON prescriptions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON recipes(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_emp ON staff_schedules(employee_id);
    CREATE INDEX IF NOT EXISTS idx_vehicles_client ON vehicles(client_id);
    CREATE INDEX IF NOT EXISTS idx_jobcards_vehicle ON job_cards(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_parts_oem ON parts_cross_ref(tenant_id, oem_part);

    -- Connections: per-tenant OAuth tokens / access tokens for external
    -- services (GitHub, Vercel, Netlify, Cloudflare, Meta, etc.). The
    -- tokens are AES-encrypted at rest via the standard column-
    -- encryption helper.
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,         -- github | vercel | netlify | cloudflare | meta | google_drive ...
      access_token TEXT,
      refresh_token TEXT,
      token_type TEXT,                -- bearer | personal | pat | oauth
      scopes TEXT,
      account_login TEXT,
      account_email TEXT,
      account_name TEXT,
      avatar_url TEXT,
      extra_json TEXT,                -- provider-specific metadata (team_id, project_id...)
      connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT,
      UNIQUE(tenant_id, provider)
    );

    -- Publishing deployments: a record per push so the customer sees
    -- a deploy history (URL, status, timestamp).
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      target TEXT NOT NULL,           -- store | menu | mobile | customer-display
      provider TEXT NOT NULL,         -- vercel | netlify | github_pages | custom
      url TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- pending | building | ready | error
      commit_sha TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_connections_tenant ON connections(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_tenant ON deployments(tenant_id);

    -- Per-user UI preferences (POS layout, invoice template, etc.).
    -- One row per (tenant, user). Default values applied at read time.
    CREATE TABLE IF NOT EXISTS ui_preferences (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
      pos_layout TEXT NOT NULL DEFAULT 'classic',  -- classic | grid | restaurant | quick | dual
      invoice_template_json TEXT,                  -- drag-drop design state
      store_theme_json TEXT,                       -- store builder state
      language TEXT NOT NULL DEFAULT 'ar',
      density TEXT NOT NULL DEFAULT 'comfortable', -- comfortable | compact
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(tenant_id, user_id)
    );
  `);
}

// Encrypted-column helpers ----------------------------------------------------
// Spec: encrypt two_factor_secret, backup_codes, client_phone at rest.

const SENSITIVE = {
  app_users: new Set(['two_factor_secret', 'backup_codes']),
  clients: new Set(['phone']),
  suppliers: new Set(['phone']),
  store_customers: new Set(['phone']),
  google_drive: new Set(['refresh_token', 'access_token']),
  gift_cards: new Set(['pin_hash']),
  employees: new Set(['national_id', 'phone']),
  webhooks: new Set(['secret']),
  api_keys: new Set(['key_hash']),
  whatsapp_outbox: new Set(['to_phone']),
  marketplace_integrations: new Set(['api_credentials_json']),
  connections: new Set(['access_token', 'refresh_token']),
  hardware_devices: new Set(['config_json']),
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
