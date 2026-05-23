// Smart product import. The merchant uploads a supplier catalog (PDF),
// a price-list photo, or a spreadsheet, and Claude extracts a clean
// list of products — name, price, cost, barcode, unit, category — that
// the merchant reviews and commits in one batch.
//
// This is the headline onboarding feature: a new customer can populate
// their entire catalog in minutes instead of typing hundreds of rows.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');
const { getApiKey } = require('./ai-assistant.cjs');

let AnthropicSDK = null;
try {
  AnthropicSDK = require('@anthropic-ai/sdk');
} catch (_) { /* optional */ }

const EXTRACT_SCHEMA = `{
  "products": [
    {
      "name": "اسم المنتج كما يظهر",
      "price": رقم البيع للجمهور (0 لو غير موجود),
      "cost": رقم سعر التكلفة/الشراء (0 لو غير موجود),
      "barcode": "الباركود لو ظاهر وإلا null",
      "unit": "قطعة/كرتونة/كيلو/علبة... أو null",
      "category": "تصنيف مقترح أو null",
      "stock": رقم الكمية لو ظاهرة وإلا 0
    }
  ]
}`;

function buildClient(tenantId) {
  const apiKey = getApiKey(tenantId);
  if (!apiKey) throw new Error('AI: مفتاح Anthropic غير مهيّأ — افتح "المساعد الذكي" وأدخل المفتاح أولاً');
  if (!AnthropicSDK) throw new Error('AI: @anthropic-ai/sdk غير مثبت');
  const Anthropic = AnthropicSDK.default || AnthropicSDK;
  return new Anthropic({ apiKey });
}

function parseDataUrl(dataUrl) {
  const m = /^data:(.+?);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new Error('expected base64 data URL');
  return { mediaType: m[1], data: m[2] };
}

function extractJson(text) {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  // Be forgiving: grab the outermost { ... } if there's surrounding prose.
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

// Core: send the uploaded file to Claude and get back a product list.
// `kind` is 'pdf' | 'image' | 'text'. For text (CSV/Excel-as-text) we
// inline the content; for PDF/image we attach as a content block.
async function analyze({ tenantId, dataUrl, text, kind }) {
  const client = buildClient(tenantId);
  const db = dbMod.get();
  const categories = db
    .prepare(`SELECT name FROM categories WHERE tenant_id = ? LIMIT 30`)
    .all(tenantId)
    .map((c) => c.name);

  const userContent = [];
  if (kind === 'pdf') {
    const { data } = parseDataUrl(dataUrl);
    userContent.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data },
    });
  } else if (kind === 'image') {
    const { mediaType, data } = parseDataUrl(dataUrl);
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data },
    });
  } else {
    userContent.push({
      type: 'text',
      text: `محتوى الملف النصي:\n\n${String(text || '').slice(0, 50000)}`,
    });
  }
  userContent.push({
    type: 'text',
    text:
      'استخرج كل المنتجات من الملف المرفق. رتّبها في JSON بالشكل التالي تمامًا، ' +
      'بدون أي شرح أو نص إضافي وبدون ```:\n' + EXTRACT_SCHEMA +
      '\n\nقواعد:\n' +
      '- لو السعر مكتوب بصيغة "12.50" استخدمه رقمًا.\n' +
      '- لو في عمود تكلفة وعمود بيع، حط الاتنين.\n' +
      '- تجاهل صفوف العناوين والمجاميع.\n' +
      '- لو الباركود مش ظاهر، حط null.\n' +
      (categories.length ? `- التصنيفات الموجودة عند التاجر: ${categories.join('، ')}. استخدم منها لو مناسب.` : ''),
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    system: [
      {
        type: 'text',
        text:
          'أنت محرّك استخراج بيانات منتجات من كتالوجات الموردين وقوائم الأسعار والفواتير. ' +
          'دقيق جدًا في الأرقام. ترد بـ JSON صحيح فقط.',
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  });

  const out = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  let parsed;
  try {
    parsed = extractJson(out);
  } catch (err) {
    return { ok: false, error: 'تعذّر تحليل رد الـ AI كـ JSON', raw: out.slice(0, 2000) };
  }
  const products = Array.isArray(parsed.products) ? parsed.products : [];
  // Normalize + sanitize each row.
  const clean = products
    .map((p) => ({
      name: String(p.name || '').trim(),
      price: Number(p.price) || 0,
      cost: Number(p.cost) || 0,
      barcode: p.barcode ? String(p.barcode).trim() : null,
      unit: p.unit ? String(p.unit).trim() : null,
      category: p.category ? String(p.category).trim() : null,
      stock: Number(p.stock) || 0,
    }))
    .filter((p) => p.name.length > 0);

  return { ok: true, products: clean, count: clean.length };
}

// Commit reviewed products in one transaction. Creates categories on
// the fly, skips exact-duplicate barcodes within the tenant.
function commit({ tenantId, products }) {
  if (!Array.isArray(products) || products.length === 0) {
    return { ok: false, error: 'لا توجد منتجات للإضافة' };
  }
  const db = dbMod.get();

  // Resolve / create categories once.
  const catCache = new Map();
  const findCat = db.prepare(`SELECT id FROM categories WHERE tenant_id = ? AND name = ?`);
  const insCat = db.prepare(`INSERT INTO categories (id, tenant_id, name) VALUES (?, ?, ?)`);
  function categoryId(name) {
    if (!name) return null;
    if (catCache.has(name)) return catCache.get(name);
    const existing = findCat.get(tenantId, name);
    const id = existing ? existing.id : (() => { const nid = uuid(); insCat.run(nid, tenantId, name); return nid; })();
    catCache.set(name, id);
    return id;
  }

  const barcodeExists = db.prepare(
    `SELECT 1 FROM products WHERE tenant_id = ? AND barcode = ? LIMIT 1`,
  );
  const insProduct = db.prepare(
    `INSERT INTO products (id, tenant_id, name, barcode, category_id, price, cost, stock, is_active, created_at, updated_at)
     VALUES (@id, @tenant_id, @name, @barcode, @category_id, @price, @cost, @stock, 1, datetime('now'), datetime('now'))`,
  );

  let created = 0, skipped = 0;
  const txn = db.transaction(() => {
    for (const p of products) {
      if (p.barcode && barcodeExists.get(tenantId, p.barcode)) { skipped++; continue; }
      insProduct.run({
        id: uuid(),
        tenant_id: tenantId,
        name: p.name,
        barcode: p.barcode || null,
        category_id: categoryId(p.category),
        price: Number(p.price) || 0,
        cost: Number(p.cost) || 0,
        stock: Number(p.stock) || 0,
      });
      created++;
    }
  });
  txn();
  return { ok: true, created, skipped };
}

module.exports = { analyze, commit };
