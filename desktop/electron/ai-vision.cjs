// AI vision: upload a product photo → Claude proposes name, description,
// category, and a suggested retail price based on what it sees + the
// tenant's existing catalog.
const dbMod = require('./db.cjs');
const { getApiKey } = require('./ai-assistant.cjs');

let AnthropicSDK = null;
try {
  AnthropicSDK = require('@anthropic-ai/sdk');
} catch (_) { /* optional */ }

async function suggestProduct({ tenantId, imageDataUrl }) {
  const apiKey = getApiKey(tenantId);
  if (!apiKey) throw new Error('AI: مفتاح Anthropic غير مهيّأ');
  if (!AnthropicSDK) throw new Error('AI: @anthropic-ai/sdk غير مثبت');

  // Decode "data:image/png;base64,XXXX..." → mime + raw
  const m = /^data:(.+?);base64,(.+)$/.exec(imageDataUrl || '');
  if (!m) throw new Error('expected data URL');
  const mediaType = m[1];
  const data = m[2];

  // Sample the existing catalog so Claude picks consistent prices.
  const db = dbMod.get();
  const peers = db
    .prepare(
      `SELECT name, price FROM products WHERE tenant_id = ? AND is_active = 1 ORDER BY RANDOM() LIMIT 12`,
    )
    .all(tenantId);
  const categories = db
    .prepare(`SELECT name FROM categories WHERE tenant_id = ? LIMIT 20`)
    .all(tenantId)
    .map((c) => c.name);

  const Anthropic = AnthropicSDK.default || AnthropicSDK;
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 600,
    system: [
      {
        type: 'text',
        text:
          'أنت مساعد ذكي لإدخال المنتجات. حلل الصورة واقترح بيانات المنتج. ' +
          'الرد لازم يكون JSON صحيح فقط — بدون أي شرح، بدون ```json fences.',
      },
      {
        type: 'text',
        text:
          'كتالوج الشركة (للتسعير المتسق):\n' +
          JSON.stringify({ peers, categories }, null, 2),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          },
          {
            type: 'text',
            text:
              'أعطني JSON بالشكل التالي بدون أي زيادة:\n' +
              '{\n' +
              '  "name": "اسم المنتج بالعربية",\n' +
              '  "description": "وصف قصير (سطر واحد)",\n' +
              '  "category": "أحد التصنيفات الموجودة أو اقتراح جديد",\n' +
              '  "price_suggestion": رقم,\n' +
              '  "barcode_hint": "EAN-13 لو ظاهر في الصورة، وإلا null",\n' +
              '  "confidence": "high|medium|low"\n' +
              '}',
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim();

  // Strip ``` fences if Claude added them anyway
  const cleaned = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  try {
    return { ok: true, suggestion: JSON.parse(cleaned), raw: text };
  } catch (err) {
    return { ok: false, error: 'AI response not JSON', raw: text };
  }
}

module.exports = { suggestProduct };
