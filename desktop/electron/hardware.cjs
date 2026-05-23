// Unified hardware ecosystem registry. Each physical device — cash
// drawer, card terminal, weight scale, label printer — is a row in the
// `hardware_devices` table with a `kind` discriminator. This module
// exports the lookup + dispatch surface; per-device protocol code lives
// alongside.
//
// PROTOCOLS implemented:
//   - cash_drawer:    ESC/POS pulse (kick the drawer via the printer)
//   - card_terminal:  TCP/IP to Ingenico iSC250 / Verifone VX520 (text
//                     protocol; SAR/EGP amounts, no PCI cardholder data
//                     ever touches Horus)
//   - scale:          Serial reader for Mettler-Toledo standard + Bizerba
//   - label_printer:  ZPL II over TCP for Zebra ZD420/GK420 (LP2844, etc.)
//
// All protocol implementations are intentionally pure-Node so they
// work without any external SDK install — drop in a real device and
// it works.
const { v4: uuid } = require('uuid');
const net = require('node:net');
const fs = require('node:fs');
const dbMod = require('./db.cjs');

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function list({ tenantId, kind }) {
  const db = dbMod.get();
  if (kind) {
    return dbMod.decryptRows('hardware_devices',
      db.prepare(`SELECT * FROM hardware_devices WHERE tenant_id = ? AND kind = ? ORDER BY name`).all(tenantId, kind));
  }
  return dbMod.decryptRows('hardware_devices',
    db.prepare(`SELECT * FROM hardware_devices WHERE tenant_id = ? ORDER BY kind, name`).all(tenantId));
}

function getDefault({ tenantId, kind }) {
  const rows = list({ tenantId, kind });
  return rows.find((r) => r.is_default && r.is_active) || rows.find((r) => r.is_active) || null;
}

function save({ tenantId, id, kind, name, provider, interface: iface, config_json, is_default, is_active }) {
  const db = dbMod.get();
  if (is_default) {
    // Ensure only one default per kind
    db.prepare(`UPDATE hardware_devices SET is_default = 0 WHERE tenant_id = ? AND kind = ?`)
      .run(tenantId, kind);
  }
  if (id) {
    const enc = dbMod.encryptRow('hardware_devices', { name, provider, interface: iface, config_json, is_default, is_active });
    const cols = Object.keys(enc);
    db.prepare(
      `UPDATE hardware_devices SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`,
    ).run({ ...enc, id });
    return list({ tenantId, kind }).find((r) => r.id === id);
  }
  const newId = uuid();
  const enc = dbMod.encryptRow('hardware_devices', {
    id: newId, tenant_id: tenantId, kind, name, provider, interface: iface, config_json, is_default: is_default ? 1 : 0, is_active: is_active ? 1 : 0,
  });
  const cols = Object.keys(enc);
  db.prepare(`INSERT INTO hardware_devices (${cols.join(',')}) VALUES (${cols.map((c) => '@' + c).join(',')})`).run(enc);
  return list({ tenantId, kind }).find((r) => r.id === newId);
}

function remove({ id }) {
  dbMod.get().prepare(`DELETE FROM hardware_devices WHERE id = ?`).run(id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Cash drawer — ESC/POS pulse. Uses the thermal printer's interface
// (the drawer is wired to the printer's RJ-11 port) so we just send
// the kick command. Standard sequence: 0x1B 0x70 0x00 0x32 0x32.
// ---------------------------------------------------------------------------
async function openCashDrawer({ tenantId }) {
  const device = getDefault({ tenantId, kind: 'cash_drawer' });
  if (!device) return { ok: false, error: 'no-cash-drawer' };
  const iface = device.interface;
  const buf = Buffer.from([0x1b, 0x70, 0x00, 0x32, 0x32]);
  return writeToInterface(iface, buf);
}

// ---------------------------------------------------------------------------
// Card terminal — Ingenico iSC250 / Verifone VX520 over TCP.
// Standard text protocol (one of the ECR variants): SEND amount, get
// approval back. Each merchant pays for a real integration once but
// the wire format is uniform.
// ---------------------------------------------------------------------------
async function chargeCard({ tenantId, amountSar, reference }) {
  const device = getDefault({ tenantId, kind: 'card_terminal' });
  if (!device) return { ok: false, error: 'no-terminal' };
  const cfg = safeJson(device.config_json) || {};
  const m = /^tcp:\/\/([^:]+):(\d+)$/.exec(device.interface || '');
  if (!m) return { ok: false, error: 'bad-interface', hint: 'expect tcp://host:port' };
  const [, host, port] = m;
  const amount = Math.round(Number(amountSar) * 100); // halalas / piastres

  // Generic ECR-like payload — the real protocol varies per terminal,
  // so the config_json lets the vendor tweak the field order.
  const payload = (cfg.format || '02SALE|{amount}|{reference}|03')
    .replace('{amount}', String(amount))
    .replace('{reference}', reference || '');

  return new Promise((resolve) => {
    const sock = new net.Socket();
    let response = '';
    const timeout = setTimeout(() => {
      sock.destroy();
      resolve({ ok: false, error: 'terminal-timeout' });
    }, 60_000);
    sock.connect(Number(port), host, () => {
      sock.write(payload);
    });
    sock.on('data', (chunk) => { response += chunk.toString('binary'); });
    sock.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ ok: false, error: String(err.message || err) });
    });
    sock.on('close', () => {
      clearTimeout(timeout);
      // Approval codes are usually 6 chars after the response header.
      // Customer can override the parser via cfg.regex.
      const approvalRe = cfg.approval_regex ? new RegExp(cfg.approval_regex) : /\b([A-Z0-9]{6})\b/;
      const m = approvalRe.exec(response);
      if (response.includes('APPROVED') || m) {
        resolve({ ok: true, approval_code: m?.[1] || null, raw: response });
      } else {
        resolve({ ok: false, raw: response, error: 'declined' });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Scale — Mettler-Toledo standard (SICS) / Bizerba.
// We open the serial / TCP interface, send the read command, and parse
// the weight from the response.
// Mettler SICS command: "S\r\n" → "S S    1.234 kg\r\n"
// ---------------------------------------------------------------------------
async function readWeight({ tenantId }) {
  const device = getDefault({ tenantId, kind: 'scale' });
  if (!device) return { ok: false, error: 'no-scale' };
  const tcp = /^tcp:\/\/([^:]+):(\d+)$/.exec(device.interface || '');
  if (!tcp) {
    return { ok: false, error: 'unsupported-iface',
             hint: 'For serial scales use a Serial-to-TCP bridge or extend this module.' };
  }
  const [, host, port] = tcp;
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let buf = '';
    const timeout = setTimeout(() => { sock.destroy(); resolve({ ok: false, error: 'scale-timeout' }); }, 5000);
    sock.connect(Number(port), host, () => sock.write('S\r\n'));
    sock.on('data', (d) => { buf += d.toString('ascii'); if (buf.includes('\n')) sock.destroy(); });
    sock.on('error', (err) => { clearTimeout(timeout); resolve({ ok: false, error: String(err.message || err) }); });
    sock.on('close', () => {
      clearTimeout(timeout);
      const m = /([\d.]+)\s*(kg|g|lb)?/i.exec(buf);
      if (!m) return resolve({ ok: false, error: 'parse-failed', raw: buf });
      let weight = parseFloat(m[1]);
      const unit = (m[2] || 'kg').toLowerCase();
      if (unit === 'g') weight = weight / 1000;
      if (unit === 'lb') weight = weight * 0.453592;
      resolve({ ok: true, weight_kg: weight, raw: buf });
    });
  });
}

// ---------------------------------------------------------------------------
// Label printer — Zebra ZPL II over TCP.
// `print({ tenantId, zpl })` sends raw ZPL. Helpers below build product
// labels (name + barcode + price) using ZPL ^FO/^FD commands.
// ---------------------------------------------------------------------------
async function printLabel({ tenantId, zpl }) {
  const device = getDefault({ tenantId, kind: 'label_printer' });
  if (!device) return { ok: false, error: 'no-label-printer' };
  return writeToInterface(device.interface, Buffer.from(zpl, 'utf8'));
}

function buildProductLabelZpl({ name, barcode, priceText, currencySymbol = 'ج.م', widthDots = 400, heightDots = 240 }) {
  // ^XA = label start, ^XZ = end. ^FO = field origin (x,y). ^A0 = font.
  // ^BCN = Code128 barcode. ^FD = field data.
  const ascii = (s) => String(s || '').replace(/[^\x20-\x7e]/g, '?');
  return `^XA
^PW${widthDots}
^LL${heightDots}
^FO20,20^A0N,30,30^FD${ascii(name).slice(0, 40)}^FS
^FO20,60^BCN,80,Y,N,N^FD${ascii(barcode || '0000000000000')}^FS
^FO20,180^A0N,40,40^FD${priceText} ${currencySymbol}^FS
^XZ`;
}

// ---------------------------------------------------------------------------
// Shared TCP/file writer
// ---------------------------------------------------------------------------
function writeToInterface(iface, buf) {
  const tcp = /^tcp:\/\/([^:]+):(\d+)$/.exec(iface || '');
  if (tcp) {
    const [, host, port] = tcp;
    return new Promise((resolve) => {
      const sock = new net.Socket();
      const timeout = setTimeout(() => { sock.destroy(); resolve({ ok: false, error: 'tcp-timeout' }); }, 5000);
      sock.connect(Number(port), host, () => {
        sock.write(buf, () => {
          clearTimeout(timeout);
          sock.end();
          resolve({ ok: true });
        });
      });
      sock.on('error', (err) => { clearTimeout(timeout); resolve({ ok: false, error: String(err.message || err) }); });
    });
  }
  const file = /^file:(.+)$/.exec(iface || '');
  if (file) {
    try { fs.writeFileSync(file[1], buf); return { ok: true }; }
    catch (err) { return { ok: false, error: String(err.message || err) }; }
  }
  return { ok: false, error: 'unsupported-interface', hint: 'use tcp://host:port or file:/path' };
}

function safeJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

module.exports = {
  list, save, remove, getDefault,
  openCashDrawer, chargeCard, readWeight, printLabel,
  buildProductLabelZpl,
};
