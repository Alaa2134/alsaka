// QR Menu builder: generates per-table QR codes that link customers to
// the public menu page on their phone. Each table gets a unique URL like
//   <store-base>/menu/<slug>?table=<table_id>
// When the customer places an order, it flows into restaurant_orders
// with table_id set, which automatically appears on the KDS screen.
const QRCode = require('qrcode');
const dbMod = require('./db.cjs');

function getStoreSlug(tenantId) {
  const db = dbMod.get();
  const row = db
    .prepare(`SELECT slug FROM store_settings WHERE tenant_id = ?`)
    .get(tenantId);
  return row?.slug || null;
}

function getMenuConfig(tenantId) {
  const db = dbMod.get();
  const rows = db
    .prepare(
      `SELECT key, value FROM company_settings WHERE tenant_id = ? AND key LIKE 'qrmenu.%'`,
    )
    .all(tenantId);
  const cfg = {
    base_url: 'http://localhost:5174',
    show_prices: true,
    show_descriptions: true,
    show_calories: false,
    accent_color: '221 83% 53%',
    hero_image: '',
    welcome_message: 'مرحبًا بك — تصفّح القائمة واطلب بنقرة واحدة',
  };
  for (const r of rows) {
    const k = r.key.replace(/^qrmenu\./, '');
    if (k === 'show_prices' || k === 'show_descriptions' || k === 'show_calories') {
      cfg[k] = r.value === '1';
    } else {
      cfg[k] = r.value;
    }
  }
  return cfg;
}

function setMenuConfig({ tenantId, patch }) {
  const db = dbMod.get();
  const { v4: uuid } = require('uuid');
  const upsert = db.prepare(
    `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  for (const [k, v] of Object.entries(patch)) {
    const val = typeof v === 'boolean' ? (v ? '1' : '0') : String(v ?? '');
    upsert.run(uuid(), tenantId, `qrmenu.${k}`, val);
  }
  return getMenuConfig(tenantId);
}

function buildTableUrl({ baseUrl, slug, tableId }) {
  const u = new URL(`/menu/${encodeURIComponent(slug)}`, baseUrl);
  if (tableId) u.searchParams.set('table', tableId);
  return u.toString();
}

async function generateQR({ url, size = 320 }) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: size,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

async function listTablesWithQr({ tenantId }) {
  const db = dbMod.get();
  const cfg = getMenuConfig(tenantId);
  const slug = getStoreSlug(tenantId);
  if (!slug) throw new Error('store_settings not initialised yet');

  const tables = db
    .prepare(
      `SELECT id, name, zone, seats, status FROM restaurant_tables WHERE tenant_id = ? ORDER BY name ASC`,
    )
    .all(tenantId);

  const out = [];
  for (const t of tables) {
    const url = buildTableUrl({ baseUrl: cfg.base_url, slug, tableId: t.id });
    const qrDataUrl = await generateQR({ url });
    out.push({ ...t, url, qr: qrDataUrl });
  }
  return out;
}

async function generalMenuQr({ tenantId }) {
  const cfg = getMenuConfig(tenantId);
  const slug = getStoreSlug(tenantId);
  if (!slug) throw new Error('store_settings not initialised yet');
  const url = buildTableUrl({ baseUrl: cfg.base_url, slug, tableId: null });
  return { url, qr: await generateQR({ url, size: 480 }) };
}

// Public menu feed consumed by the storefront /menu page. Groups
// products by their `menu_section` (falling back to `kitchen_section`
// then category) so the customer phone view can render the right
// sections.
function buildMenuFeed({ slug }) {
  const db = dbMod.get();
  const settings = db
    .prepare(`SELECT * FROM store_settings WHERE slug = ?`)
    .get(slug);
  if (!settings) return null;
  const tenantId = settings.tenant_id;
  const cfg = getMenuConfig(tenantId);

  const products = db
    .prepare(
      `SELECT id, name, description, store_description, image_url, store_image_urls,
              COALESCE(store_price, price) AS price,
              stock, is_active, COALESCE(store_visible, 1) AS visible,
              COALESCE(menu_section, kitchen_section) AS section,
              category_id
         FROM products
        WHERE tenant_id = ? AND is_active = 1
        ORDER BY section, name`,
    )
    .all(tenantId);

  const categories = db
    .prepare(`SELECT id, name FROM categories WHERE tenant_id = ?`)
    .all(tenantId);
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const groups = new Map();
  for (const p of products) {
    if (!p.visible) continue;
    const section = p.section || catName.get(p.category_id) || 'القائمة';
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push({
      id: p.id,
      name: p.name,
      description: p.store_description || p.description,
      price: p.price,
      image_url: p.image_url,
      available: p.stock > 0,
    });
  }

  return {
    store: {
      slug: settings.slug,
      name: settings.name,
      tagline: settings.tagline,
      logo_url: settings.logo_url,
      currency_symbol: settings.currency_symbol,
      whatsapp_phone: settings.whatsapp_phone,
      hero_image_url: settings.hero_image_url || cfg.hero_image,
      accent_color: settings.primary_color || cfg.accent_color,
      welcome_message: cfg.welcome_message,
      show_prices: cfg.show_prices,
      show_descriptions: cfg.show_descriptions,
    },
    sections: Array.from(groups.entries()).map(([name, items]) => ({ name, items })),
  };
}

module.exports = {
  getMenuConfig,
  setMenuConfig,
  buildTableUrl,
  generateQR,
  listTablesWithQr,
  generalMenuQr,
  buildMenuFeed,
};
