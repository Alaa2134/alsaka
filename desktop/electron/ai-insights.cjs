// AI-powered business insights: demand forecasting and anomaly
// detection. Both run statistically first (so they're useful even
// without an API key) and then layer a Claude explanation on top when
// the key is configured.
const dbMod = require('./db.cjs');
const { getApiKey } = require('./ai-assistant.cjs');

let AnthropicSDK = null;
try { AnthropicSDK = require('@anthropic-ai/sdk'); } catch (_) { /* optional */ }

// ---------------------------------------------------------------------------
// Demand forecast — simple 7-day moving average of sales per product over
// the last 60 days, projected for next 14 days. Returns the top
// candidates that need restocking (current_stock < forecasted demand).
// ---------------------------------------------------------------------------
function forecastDemand({ tenantId, horizonDays = 14 }) {
  const db = dbMod.get();
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.stock, p.min_stock,
              COALESCE(SUM(ii.quantity), 0) AS sold_60d
         FROM products p
         LEFT JOIN invoice_items ii ON ii.product_id = p.id
         LEFT JOIN invoices i ON i.id = ii.invoice_id
                              AND i.tenant_id = p.tenant_id
                              AND i.created_at >= datetime('now', '-60 days')
        WHERE p.tenant_id = ? AND p.is_active = 1
        GROUP BY p.id
        HAVING sold_60d > 0
        ORDER BY sold_60d DESC`,
    )
    .all(tenantId);

  return rows.map((r) => {
    const dailyAvg = r.sold_60d / 60;
    const forecast = dailyAvg * horizonDays;
    const daysOfStock = dailyAvg > 0 ? r.stock / dailyAvg : Infinity;
    const status =
      r.stock <= 0 ? 'stockout' :
      r.stock < forecast ? 'reorder' :
      daysOfStock < 7 ? 'low' : 'ok';
    return {
      id: r.id,
      name: r.name,
      current_stock: r.stock,
      min_stock: r.min_stock,
      sold_60d: r.sold_60d,
      daily_avg: Math.round(dailyAvg * 100) / 100,
      forecast_horizon: Math.round(forecast),
      days_of_stock: Number.isFinite(daysOfStock) ? Math.round(daysOfStock) : null,
      suggested_order: Math.max(0, Math.round(forecast * 1.2 - r.stock)),
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// Anomaly detection — flags transactions that look unusual:
//   - invoices much larger than the typical daily total for that user
//   - products that suddenly sold 10x their normal velocity
//   - returns from a single cashier exceeding a threshold
// ---------------------------------------------------------------------------
function detectAnomalies({ tenantId, lookbackDays = 7 }) {
  const db = dbMod.get();
  const findings = [];

  // 1. Cashier outliers
  const cashiers = db
    .prepare(
      `SELECT u.id AS user_id, u.email,
              AVG(i.total) AS avg_total, MAX(i.total) AS max_total, COUNT(*) AS n
         FROM invoices i
         JOIN app_users u ON u.id = i.user_id
        WHERE i.tenant_id = ? AND i.created_at >= datetime('now', ?)
        GROUP BY u.id
        HAVING n > 3 AND max_total > 5 * avg_total`,
    )
    .all(tenantId, `-${lookbackDays} days`);
  for (const c of cashiers) {
    findings.push({
      kind: 'cashier_outlier',
      severity: 'medium',
      title: `فاتورة استثنائية من ${c.email}`,
      detail: `أكبر فاتورة (${c.max_total.toFixed(2)}) أكبر بكثير من المتوسط (${c.avg_total.toFixed(2)}).`,
    });
  }

  // 2. Sudden velocity spikes
  const spikes = db
    .prepare(
      `SELECT p.id, p.name,
              SUM(CASE WHEN i.created_at >= datetime('now', '-7 days') THEN ii.quantity ELSE 0 END) AS recent,
              SUM(CASE WHEN i.created_at <  datetime('now', '-7 days') THEN ii.quantity ELSE 0 END) AS prior
         FROM products p
         JOIN invoice_items ii ON ii.product_id = p.id
         JOIN invoices i ON i.id = ii.invoice_id
        WHERE p.tenant_id = ? AND i.created_at >= datetime('now', '-30 days')
        GROUP BY p.id
        HAVING recent > 10 AND recent > prior * 5`,
    )
    .all(tenantId);
  for (const s of spikes) {
    findings.push({
      kind: 'velocity_spike',
      severity: 'info',
      title: `${s.name} زاد طلبه فجأة`,
      detail: `بيع الأسبوع الجاري ${s.recent} مقابل ${s.prior} في الفترات السابقة. ممكن يكون trend.`,
    });
  }

  // 3. Negative-stock guards (already prevented by code, but if a manual
  //    adjustment slipped through, surface it).
  const negative = db
    .prepare(
      `SELECT id, name, stock FROM products WHERE tenant_id = ? AND stock < 0`,
    )
    .all(tenantId);
  for (const n of negative) {
    findings.push({
      kind: 'negative_stock',
      severity: 'high',
      title: `مخزون سالب: ${n.name}`,
      detail: `الكمية المسجلة ${n.stock} — يحتاج جرد فوري.`,
    });
  }

  // 4. Return rate per cashier
  const returnsByUser = db
    .prepare(
      `SELECT u.email,
              SUM(CASE WHEN i.is_return = 1 THEN i.total ELSE 0 END) AS returns,
              SUM(CASE WHEN i.is_return = 0 THEN i.total ELSE 0 END) AS sales
         FROM invoices i
         JOIN app_users u ON u.id = i.user_id
        WHERE i.tenant_id = ? AND i.created_at >= datetime('now', ?)
        GROUP BY u.id
        HAVING sales > 0 AND returns > sales * 0.2`,
    )
    .all(tenantId, `-${lookbackDays} days`);
  for (const r of returnsByUser) {
    findings.push({
      kind: 'high_returns',
      severity: 'medium',
      title: `نسبة مرتجعات مرتفعة: ${r.email}`,
      detail: `المرتجعات ${r.returns.toFixed(2)} مقابل مبيعات ${r.sales.toFixed(2)} — راجع.`,
    });
  }

  return findings;
}

async function explainInsights({ tenantId, findings, forecast }) {
  const apiKey = getApiKey(tenantId);
  if (!apiKey || !AnthropicSDK) return { explanation: null };
  try {
    const Anthropic = AnthropicSDK.default || AnthropicSDK;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 600,
      system: 'أنت مستشار أعمال مختصر بالعربية. اقترح خطوات تنفيذية واضحة.',
      messages: [{
        role: 'user',
        content:
          'هذه البيانات من نظامي. اقترح 3-5 خطوات عملية محددة:\n\n' +
          JSON.stringify({ anomalies: findings, top_forecast: forecast.slice(0, 5) }, null, 2),
      }],
    });
    const text = response.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    return { explanation: text };
  } catch (err) {
    return { explanation: null, error: String(err.message || err) };
  }
}

module.exports = { forecastDemand, detectAnomalies, explainInsights };
