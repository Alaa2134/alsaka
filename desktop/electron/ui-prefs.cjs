// Per-user UI preferences. Stores the POS layout, invoice template JSON,
// store theme JSON, language and density. Used by the renderer to pick
// the right component tree at startup.
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

const DEFAULTS = {
  pos_layout: 'classic',
  invoice_template_json: null,
  store_theme_json: null,
  language: 'ar',
  density: 'comfortable',
};

function getPrefs({ tenantId, userId }) {
  const db = dbMod.get();
  const row = db
    .prepare(`SELECT * FROM ui_preferences WHERE tenant_id = ? AND user_id = ?`)
    .get(tenantId, userId);
  if (!row) return { ...DEFAULTS, tenant_id: tenantId, user_id: userId };
  return { ...DEFAULTS, ...row };
}

function setPrefs({ tenantId, userId, patch }) {
  const db = dbMod.get();
  const allowed = ['pos_layout', 'invoice_template_json', 'store_theme_json', 'language', 'density'];
  const filtered = {};
  for (const k of allowed) if (k in patch) filtered[k] = patch[k];
  const existing = db
    .prepare(`SELECT id FROM ui_preferences WHERE tenant_id = ? AND user_id = ?`)
    .get(tenantId, userId);
  if (existing) {
    const cols = Object.keys(filtered);
    if (!cols.length) return getPrefs({ tenantId, userId });
    db.prepare(
      `UPDATE ui_preferences SET ${cols.map((c) => `${c} = @${c}`).join(', ')}, updated_at = datetime('now') WHERE id = @id`,
    ).run({ ...filtered, id: existing.id });
  } else {
    db.prepare(
      `INSERT INTO ui_preferences (id, tenant_id, user_id, pos_layout, invoice_template_json, store_theme_json, language, density)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      uuid(),
      tenantId,
      userId,
      filtered.pos_layout || DEFAULTS.pos_layout,
      filtered.invoice_template_json || null,
      filtered.store_theme_json || null,
      filtered.language || DEFAULTS.language,
      filtered.density || DEFAULTS.density,
    );
  }
  return getPrefs({ tenantId, userId });
}

module.exports = { getPrefs, setPrefs };
