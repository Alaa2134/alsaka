// AI assistant — Anthropic Claude wrapper that uses prompt caching to
// keep the system prompt + business context warm across messages. The
// API key is stored encrypted in company_settings.
//
// The system prompt grounds Claude in the user's actual data: it
// receives the current product catalog snapshot, the past month's
// sales totals, and the top customers. That way questions like "what
// are my best sellers?" or "how much did I sell yesterday?" get
// real, accurate answers.
const dbMod = require('./db.cjs');

let AnthropicSDK = null;
try {
  AnthropicSDK = require('@anthropic-ai/sdk');
} catch (_) {
  // Optional dependency — the screen will show a setup message.
}

function getApiKey(tenantId) {
  const db = dbMod.get();
  const row = db
    .prepare(`SELECT value FROM company_settings WHERE tenant_id = ? AND key = 'ai.anthropic_api_key'`)
    .get(tenantId);
  return row?.value || null;
}

function setApiKey(tenantId, apiKey) {
  const { v4: uuid } = require('uuid');
  dbMod
    .get()
    .prepare(
      `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
       VALUES (?, ?, 'ai.anthropic_api_key', ?, datetime('now'))
       ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
    .run(uuid(), tenantId, apiKey);
  return { ok: true };
}

// Build a compact, JSON-shaped business snapshot so Claude can answer
// data questions without us shipping every row of the DB.
function buildContext(tenantId) {
  const db = dbMod.get();
  const tenant = db.prepare(`SELECT name, slug FROM tenants WHERE id = ?`).get(tenantId);
  const topProducts = db
    .prepare(
      `SELECT p.name, SUM(ii.quantity) AS qty, SUM(ii.total) AS revenue
         FROM invoice_items ii
         JOIN invoices i ON i.id = ii.invoice_id
         JOIN products p ON p.id = ii.product_id
        WHERE i.tenant_id = ? AND i.created_at >= date('now', '-30 days')
        GROUP BY p.id
        ORDER BY revenue DESC LIMIT 10`,
    )
    .all(tenantId);
  const lowStock = db
    .prepare(
      `SELECT name, stock, min_stock FROM products
        WHERE tenant_id = ? AND stock <= min_stock AND is_active = 1
        ORDER BY stock ASC LIMIT 10`,
    )
    .all(tenantId);
  const totals = db
    .prepare(
      `SELECT
         (SELECT COALESCE(SUM(total),0) FROM invoices WHERE tenant_id = ? AND date(created_at) = date('now')) AS today,
         (SELECT COALESCE(SUM(total),0) FROM invoices WHERE tenant_id = ? AND created_at >= date('now', '-7 days')) AS week,
         (SELECT COALESCE(SUM(total),0) FROM invoices WHERE tenant_id = ? AND created_at >= date('now', '-30 days')) AS month`,
    )
    .get(tenantId, tenantId, tenantId);
  return { tenant, totals, topProducts, lowStock };
}

async function chat({ tenantId, messages }) {
  const apiKey = getApiKey(tenantId);
  if (!apiKey) throw new Error('AI assistant: لم يتم إعداد مفتاح Anthropic بعد');
  if (!AnthropicSDK) throw new Error('AI assistant: @anthropic-ai/sdk غير مثبت. شغّل npm install');
  const Anthropic = AnthropicSDK.default || AnthropicSDK;
  const client = new Anthropic({ apiKey });
  const ctx = buildContext(tenantId);
  const system = [
    {
      type: 'text',
      text:
        'أنت مساعد ذكي عربي لنظام محاسبة ومبيعات اسمه SystemAlaa. ' +
        'تجاوب باختصار ومباشرة. تقترح إجراءات عملية. تذكر الأرقام بالعملة المحلية (ج.م افتراضيًا). ' +
        'لو السؤال محتاج بيانات تتأكد من سياق العمل المرفق.',
    },
    {
      type: 'text',
      text: 'سياق العمل (محدّث):\n' + JSON.stringify(ctx, null, 2),
      cache_control: { type: 'ephemeral' },
    },
  ];
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system,
    messages,
  });
  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
  return { ok: true, text, usage: response.usage };
}

module.exports = { chat, getApiKey, setApiKey, buildContext };
