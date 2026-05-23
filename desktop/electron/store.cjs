// Storefront business logic. The same module powers the in-app management
// screens AND the data feed consumed by the standalone /store SPA. All DB
// writes happen here so the renderer never talks to SQLite directly.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function nextOrderNumber(tenantId) {
  const db = dbMod.get();
  const row = db
    .prepare(`SELECT COALESCE(MAX(order_number), 1000) + 1 AS n FROM store_orders WHERE tenant_id = ?`)
    .get(tenantId);
  return row.n;
}

// ---------------------------------------------------------------------------
// Store settings
// ---------------------------------------------------------------------------
function ensureStoreSettings(tenantId, tenantName) {
  const db = dbMod.get();
  const existing = db.prepare(`SELECT * FROM store_settings WHERE tenant_id = ?`).get(tenantId);
  if (existing) return existing;
  let slug = slugify(tenantName) || `store-${tenantId.slice(0, 6)}`;
  // Resolve slug collisions
  let suffix = 0;
  while (db.prepare(`SELECT id FROM store_settings WHERE slug = ?`).get(slug)) {
    suffix += 1;
    slug = `${slugify(tenantName) || 'store'}-${suffix}`;
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO store_settings (id, tenant_id, slug, name, currency, currency_symbol)
     VALUES (?, ?, ?, ?, 'EGP', 'ج.م')`,
  ).run(id, tenantId, slug, tenantName || 'SystemAlaa Store');
  return db.prepare(`SELECT * FROM store_settings WHERE id = ?`).get(id);
}

function getStoreSettings(tenantId) {
  const db = dbMod.get();
  return db.prepare(`SELECT * FROM store_settings WHERE tenant_id = ?`).get(tenantId);
}

function updateStoreSettings({ tenantId, patch }) {
  const db = dbMod.get();
  const allowed = [
    'slug',
    'name',
    'tagline',
    'description',
    'logo_url',
    'hero_image_url',
    'banner_image_url',
    'primary_color',
    'accent_color',
    'currency',
    'currency_symbol',
    'phone',
    'email',
    'address',
    'whatsapp_phone',
    'facebook_url',
    'instagram_url',
    'tiktok_url',
    'working_hours',
    'delivery_note',
    'return_policy',
    'privacy_policy',
    'terms',
    'is_published',
    'track_inventory',
    'allow_out_of_stock',
  ];
  const data = {};
  for (const k of allowed) if (k in patch) data[k] = patch[k];
  if (data.slug) data.slug = slugify(data.slug);
  if (!Object.keys(data).length) return getStoreSettings(tenantId);
  const cols = Object.keys(data);
  db.prepare(
    `UPDATE store_settings SET ${cols.map((c) => `${c} = @${c}`).join(', ')}, updated_at = datetime('now') WHERE tenant_id = @tenant_id`,
  ).run({ ...data, tenant_id: tenantId });
  return getStoreSettings(tenantId);
}

// ---------------------------------------------------------------------------
// Storefront feed — what the public /store SPA needs to render the shop
// ---------------------------------------------------------------------------
function buildStorefrontFeed(tenantIdOrSlug) {
  const db = dbMod.get();
  let settings = db
    .prepare(`SELECT * FROM store_settings WHERE tenant_id = ? OR slug = ?`)
    .get(tenantIdOrSlug, tenantIdOrSlug);
  if (!settings) return null;
  if (!settings.is_published) return { ...stripSettings(settings), published: false };

  const tenantId = settings.tenant_id;
  const trackInventory = !!settings.track_inventory;
  const allowOOS = !!settings.allow_out_of_stock;

  const products = db
    .prepare(
      `SELECT id, name, item_number, barcode, category_id, image_url,
              price, COALESCE(store_price, price) AS effective_price,
              stock, min_stock,
              COALESCE(store_description, description) AS description,
              store_image_urls, store_featured, weight_kg
         FROM products
        WHERE tenant_id = ? AND is_active = 1 AND COALESCE(store_visible, 1) = 1
        ORDER BY store_featured DESC, name ASC`,
    )
    .all(tenantId)
    .map((p) => {
      const inStock = trackInventory ? p.stock > 0 : true;
      return {
        id: p.id,
        name: p.name,
        sku: p.item_number,
        barcode: p.barcode,
        category_id: p.category_id,
        image_url: p.image_url,
        gallery: safeJson(p.store_image_urls),
        price: p.effective_price,
        original_price: p.effective_price !== p.price ? p.price : null,
        description: p.description,
        in_stock: inStock,
        stock: trackInventory ? p.stock : null,
        purchasable: inStock || allowOOS,
        featured: !!p.store_featured,
        weight_kg: p.weight_kg,
      };
    });

  const categories = db
    .prepare(`SELECT id, name, parent_id FROM categories WHERE tenant_id = ?`)
    .all(tenantId);

  const carriers = db
    .prepare(
      `SELECT id, name, provider, flat_rate, free_above, estimated_days
         FROM shipping_carriers WHERE tenant_id = ? AND is_active = 1`,
    )
    .all(tenantId);

  const gateways = db
    .prepare(
      `SELECT id, name, provider, surcharge_percent
         FROM payment_gateways WHERE tenant_id = ? AND is_active = 1`,
    )
    .all(tenantId);

  return {
    published: true,
    settings: stripSettings(settings),
    products,
    categories,
    carriers,
    gateways,
  };
}

function stripSettings(s) {
  // Don't leak the tenant UUID to the public feed; the slug is the identifier.
  const { tenant_id, ...rest } = s || {};
  return rest;
}

function safeJson(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Coupon validation
// ---------------------------------------------------------------------------
function validateCoupon({ tenantId, code, subtotal }) {
  const db = dbMod.get();
  const c = db
    .prepare(`SELECT * FROM coupons WHERE tenant_id = ? AND code = ? AND is_active = 1`)
    .get(tenantId, String(code || '').toUpperCase().trim());
  if (!c) return { ok: false, error: 'invalid' };
  const now = new Date();
  if (c.starts_at && new Date(c.starts_at) > now) return { ok: false, error: 'not-started' };
  if (c.ends_at && new Date(c.ends_at) < now) return { ok: false, error: 'expired' };
  if (c.usage_limit != null && c.times_used >= c.usage_limit) return { ok: false, error: 'used-up' };
  if (subtotal < (c.min_subtotal || 0)) return { ok: false, error: 'min-subtotal', min: c.min_subtotal };

  let discount = 0;
  if (c.kind === 'percent') discount = (subtotal * (c.value || 0)) / 100;
  else if (c.kind === 'fixed') discount = c.value || 0;
  else if (c.kind === 'free_shipping') discount = 0;
  if (c.max_discount != null) discount = Math.min(discount, c.max_discount);
  discount = Math.min(discount, subtotal);

  return {
    ok: true,
    coupon: { id: c.id, code: c.code, kind: c.kind, value: c.value, max_discount: c.max_discount },
    discount: round2(discount),
    free_shipping: c.kind === 'free_shipping',
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Shipping & payment quote helpers
// ---------------------------------------------------------------------------
function quoteShipping({ tenantId, carrierId, subtotal }) {
  const db = dbMod.get();
  const c = db
    .prepare(`SELECT * FROM shipping_carriers WHERE id = ? AND tenant_id = ?`)
    .get(carrierId, tenantId);
  if (!c) return { fee: 0, estimated_days: null };
  if (c.free_above != null && subtotal >= c.free_above) return { fee: 0, estimated_days: c.estimated_days };
  return { fee: round2(c.flat_rate || 0), estimated_days: c.estimated_days };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
function findOrCreateCustomer({ tenantId, name, phone, email }) {
  const db = dbMod.get();
  const phoneClean = String(phone || '').trim();
  if (!phoneClean) throw new Error('phone required');
  const existing = db
    .prepare(`SELECT * FROM store_customers WHERE tenant_id = ? AND phone = ?`)
    .get(tenantId, phoneClean);
  if (existing) {
    if (name && existing.name !== name) {
      db.prepare(`UPDATE store_customers SET name = ?, updated_at = datetime('now') WHERE id = ?`).run(
        name,
        existing.id,
      );
    }
    return dbMod.decryptRow('store_customers', existing);
  }
  const id = uuid();
  const encrypted = dbMod.encryptRow('store_customers', {
    id,
    tenant_id: tenantId,
    name: name || 'عميل المتجر',
    phone: phoneClean,
    email: email || null,
  });
  db.prepare(
    `INSERT INTO store_customers (id, tenant_id, name, phone, email)
     VALUES (@id, @tenant_id, @name, @phone, @email)`,
  ).run(encrypted);
  return dbMod.decryptRow(
    'store_customers',
    db.prepare(`SELECT * FROM store_customers WHERE id = ?`).get(id),
  );
}

// ---------------------------------------------------------------------------
// Order placement (called from the storefront via IPC or HTTPS)
// ---------------------------------------------------------------------------
function placeOrder(payload) {
  const db = dbMod.get();
  const {
    tenantId,
    customer,
    items,
    address,
    carrierId,
    gatewayId,
    couponCode,
    notes,
  } = payload;

  if (!tenantId) throw new Error('tenantId required');
  if (!Array.isArray(items) || items.length === 0) throw new Error('no items');

  const settings = db.prepare(`SELECT * FROM store_settings WHERE tenant_id = ?`).get(tenantId);
  if (!settings || !settings.is_published) throw new Error('store not published');

  // Snapshot prices and stock from DB (never trust client-supplied prices)
  const productIds = items.map((it) => it.product_id);
  const placeholders = productIds.map(() => '?').join(',');
  const products = db
    .prepare(
      `SELECT id, name, COALESCE(store_price, price) AS price, stock,
              COALESCE(store_visible, 1) AS visible, is_active
         FROM products WHERE id IN (${placeholders}) AND tenant_id = ?`,
    )
    .all(...productIds, tenantId);
  const byId = new Map(products.map((p) => [p.id, p]));

  const normalized = items.map((it) => {
    const p = byId.get(it.product_id);
    if (!p || !p.is_active || !p.visible) throw new Error(`unavailable: ${it.product_id}`);
    if (settings.track_inventory && !settings.allow_out_of_stock && p.stock < it.quantity) {
      throw new Error(`الكمية المطلوبة من "${p.name}" غير متوفرة (المتاح: ${p.stock})`);
    }
    return {
      product_id: p.id,
      product_name: p.name,
      quantity: Number(it.quantity) || 0,
      price: Number(p.price) || 0,
      total: round2((Number(p.price) || 0) * (Number(it.quantity) || 0)),
    };
  });

  const subtotal = normalized.reduce((s, r) => s + r.total, 0);
  const shipping = carrierId ? quoteShipping({ tenantId, carrierId, subtotal }) : { fee: 0 };

  let discount = 0;
  let couponId = null;
  let freeShipping = false;
  if (couponCode) {
    const c = validateCoupon({ tenantId, code: couponCode, subtotal });
    if (c.ok) {
      discount = c.discount;
      couponId = c.coupon.id;
      freeShipping = c.free_shipping;
    }
  }
  const shippingFee = freeShipping ? 0 : shipping.fee;
  const total = round2(subtotal - discount + shippingFee);

  const cust = findOrCreateCustomer({
    tenantId,
    name: customer?.name,
    phone: customer?.phone,
    email: customer?.email,
  });

  const id = uuid();
  const number = nextOrderNumber(tenantId);

  const txn = db.transaction(() => {
    db.prepare(
      `INSERT INTO store_orders
         (id, tenant_id, customer_id, client_name, client_phone, order_number,
          subtotal, discount, shipping_fee, tax, total, status, payment_status,
          shipping_address_json, shipping_carrier_id, payment_gateway_id,
          coupon_id, notes, updated_at)
       VALUES (@id, @tenant_id, @customer_id, @client_name, @client_phone, @order_number,
               @subtotal, @discount, @shipping_fee, 0, @total, 'new', 'unpaid',
               @shipping_address_json, @shipping_carrier_id, @payment_gateway_id,
               @coupon_id, @notes, datetime('now'))`,
    ).run({
      id,
      tenant_id: tenantId,
      customer_id: cust.id,
      client_name: cust.name,
      client_phone: cust.phone,
      order_number: number,
      subtotal: round2(subtotal),
      discount: round2(discount),
      shipping_fee: round2(shippingFee),
      total,
      shipping_address_json: address ? JSON.stringify(address) : null,
      shipping_carrier_id: carrierId || null,
      payment_gateway_id: gatewayId || null,
      coupon_id: couponId,
      notes: notes || null,
    });

    const itemStmt = db.prepare(
      `INSERT INTO store_order_items (id, order_id, product_id, product_name, quantity, price, total)
       VALUES (@id, @order_id, @product_id, @product_name, @quantity, @price, @total)`,
    );
    const decStock = db.prepare(
      `UPDATE products SET stock = MAX(0, stock - @qty), updated_at = datetime('now') WHERE id = @pid`,
    );
    for (const it of normalized) {
      itemStmt.run({ id: uuid(), order_id: id, ...it });
      if (settings.track_inventory) decStock.run({ qty: it.quantity, pid: it.product_id });
    }

    // Coupon usage counter
    if (couponId) {
      db.prepare(`UPDATE coupons SET times_used = times_used + 1 WHERE id = ?`).run(couponId);
    }

    // Customer rollup
    db.prepare(
      `UPDATE store_customers
          SET orders_count = orders_count + 1,
              total_spent = total_spent + @total,
              last_order_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = @cid`,
    ).run({ total, cid: cust.id });

    db.prepare(
      `INSERT INTO store_order_status_history (id, order_id, from_status, to_status, note)
       VALUES (?, ?, NULL, 'new', 'Order placed via storefront')`,
    ).run(uuid(), id, 'new');
  });
  txn();

  const order = db.prepare(`SELECT * FROM store_orders WHERE id = ?`).get(id);
  return { ok: true, order };
}

function updateOrderStatus({ tenantId, orderId, status, note, userId }) {
  const db = dbMod.get();
  const order = db
    .prepare(`SELECT * FROM store_orders WHERE id = ? AND tenant_id = ?`)
    .get(orderId, tenantId);
  if (!order) throw new Error('order not found');
  db.prepare(
    `UPDATE store_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(status, orderId);
  db.prepare(
    `INSERT INTO store_order_status_history (id, order_id, from_status, to_status, note, changed_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), orderId, order.status, status, note || null, userId || null);
  return db.prepare(`SELECT * FROM store_orders WHERE id = ?`).get(orderId);
}

function trackOrder({ orderNumber, phone }) {
  const db = dbMod.get();
  // Phone is encrypted at rest in store_customers, so we look up by order
  // number first then verify via the decrypted customer row.
  const order = db
    .prepare(
      `SELECT o.*, c.phone AS customer_phone_enc
         FROM store_orders o
         LEFT JOIN store_customers c ON c.id = o.customer_id
        WHERE o.order_number = ?`,
    )
    .get(Number(orderNumber));
  if (!order) return null;
  const customerPhone = order.customer_phone_enc
    ? dbMod.decryptRow('store_customers', { phone: order.customer_phone_enc }).phone
    : order.client_phone;
  if (phone && customerPhone !== String(phone).trim()) return null;
  const history = db
    .prepare(
      `SELECT to_status AS status, note, changed_at
         FROM store_order_status_history WHERE order_id = ? ORDER BY changed_at ASC`,
    )
    .all(order.id);
  return {
    order_number: order.order_number,
    status: order.status,
    total: order.total,
    tracking_number: order.tracking_number,
    created_at: order.created_at,
    history,
  };
}

module.exports = {
  ensureStoreSettings,
  getStoreSettings,
  updateStoreSettings,
  buildStorefrontFeed,
  validateCoupon,
  quoteShipping,
  findOrCreateCustomer,
  placeOrder,
  updateOrderStatus,
  trackOrder,
  slugify,
};
