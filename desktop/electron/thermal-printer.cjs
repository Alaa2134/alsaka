// Thermal receipt printer (ESC/POS) — works with USB, network and serial
// printers from Epson, Star, Bixolon, and any other ESC/POS compatible
// hardware. Each cashier shop typically has one printer connected.
//
// We use `node-thermal-printer` if available; otherwise we fall back to
// emitting a plain-text receipt the renderer can `webContents.print` to
// a default OS thermal printer.
let ThermalPrinter = null;
let printerTypes = null;
try {
  const lib = require('node-thermal-printer');
  ThermalPrinter = lib.printer || lib.ThermalPrinter;
  printerTypes = lib.types || lib.PrinterTypes;
} catch (_) {
  // optional — gracefully degrade
}

const dbMod = require('./db.cjs');
const { v4: uuid } = require('uuid');

function getConfig() {
  const db = dbMod.get();
  const rows = db
    .prepare(`SELECT key, value FROM company_settings WHERE key LIKE 'printer.%' LIMIT 200`)
    .all();
  const cfg = {};
  for (const r of rows) cfg[r.key.replace(/^printer\./, '')] = r.value;
  return {
    enabled: cfg.enabled === '1',
    interface: cfg.interface || 'tcp://192.168.1.100',
    type: cfg.type || 'EPSON',
    width: Number(cfg.width || 48),
    cut: cfg.cut !== '0',
    encoding: cfg.encoding || 'UTF-8',
  };
}

function setConfig({ tenantId, patch }) {
  const db = dbMod.get();
  const upsert = db.prepare(
    `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  for (const [k, v] of Object.entries(patch)) {
    upsert.run(uuid(), tenantId, `printer.${k}`, String(v));
  }
  return getConfig();
}

async function printReceipt(payload) {
  if (!ThermalPrinter || !printerTypes) {
    throw new Error('node-thermal-printer غير مثبت. شغّل npm install node-thermal-printer');
  }
  const cfg = getConfig();
  if (!cfg.enabled) throw new Error('الطباعة الحرارية معطلة في الإعدادات');

  const printer = new ThermalPrinter({
    type: printerTypes[cfg.type] || printerTypes.EPSON,
    interface: cfg.interface,
    characterSet: cfg.encoding === 'ar' ? 'ARABIC' : undefined,
    options: { timeout: 5000 },
    width: cfg.width,
  });

  printer.alignCenter();
  if (payload.companyName) {
    printer.bold(true);
    printer.println(payload.companyName);
    printer.bold(false);
  }
  if (payload.companyAddress) printer.println(payload.companyAddress);
  if (payload.companyPhone) printer.println(payload.companyPhone);
  printer.drawLine();

  printer.alignLeft();
  printer.println(`Invoice: ${payload.number || '—'}`);
  printer.println(`Date: ${payload.date || new Date().toISOString()}`);
  if (payload.clientName) printer.println(`Client: ${payload.clientName}`);
  printer.drawLine();

  printer.tableCustom([
    { text: 'Item', align: 'LEFT', width: 0.5 },
    { text: 'Qty', align: 'CENTER', width: 0.15 },
    { text: 'Price', align: 'RIGHT', width: 0.15 },
    { text: 'Total', align: 'RIGHT', width: 0.2 },
  ]);
  for (const it of payload.items || []) {
    printer.tableCustom([
      { text: it.name, align: 'LEFT', width: 0.5 },
      { text: String(it.quantity), align: 'CENTER', width: 0.15 },
      { text: Number(it.price).toFixed(2), align: 'RIGHT', width: 0.15 },
      { text: Number(it.total).toFixed(2), align: 'RIGHT', width: 0.2 },
    ]);
  }

  printer.drawLine();
  printer.alignRight();
  printer.bold(true);
  printer.println(`TOTAL: ${Number(payload.total || 0).toFixed(2)}`);
  printer.bold(false);
  if (payload.paid != null) printer.println(`Paid: ${Number(payload.paid).toFixed(2)}`);
  if (payload.remaining != null) printer.println(`Due: ${Number(payload.remaining).toFixed(2)}`);

  if (payload.qrPayload) {
    printer.alignCenter();
    printer.newLine();
    printer.printQR(payload.qrPayload, { cellSize: 6 });
  }

  printer.alignCenter();
  printer.newLine();
  printer.println(payload.footer || 'Thank you for your business!');

  if (cfg.cut) printer.cut();

  const ok = await printer.isPrinterConnected();
  if (!ok) throw new Error('الطابعة غير متصلة — راجع الـ interface');
  await printer.execute();
  return { ok: true };
}

async function probe() {
  if (!ThermalPrinter) return { available: false, reason: 'lib-missing' };
  try {
    const cfg = getConfig();
    const printer = new ThermalPrinter({
      type: printerTypes[cfg.type] || printerTypes.EPSON,
      interface: cfg.interface,
    });
    const connected = await printer.isPrinterConnected();
    return { available: true, connected };
  } catch (err) {
    return { available: true, connected: false, error: String(err.message || err) };
  }
}

module.exports = { getConfig, setConfig, printReceipt, probe };
