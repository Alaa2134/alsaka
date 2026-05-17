// ZATCA / ETA-compatible TLV QR code generator. Produces the base64
// payload required by Saudi ZATCA Phase 1 (and which Egypt's ETA also
// happily accepts on simplified receipts).
//
// Five TLV tags:
//   1: seller name (UTF-8)
//   2: VAT registration number (UTF-8)
//   3: invoice timestamp (ISO-8601 UTC)
//   4: invoice total with VAT (decimal as string)
//   5: VAT total (decimal as string)
//
// Output: base64 string ready to encode as a QR via the qrcode npm
// package on the renderer side.

function tlv(tag, value) {
  const bytes = Buffer.from(String(value), 'utf8');
  return Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
}

function buildQrPayload({ sellerName, vatNumber, timestamp, totalWithVat, vatTotal }) {
  const ts = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp || new Date().toISOString());
  const buf = Buffer.concat([
    tlv(1, sellerName || ''),
    tlv(2, vatNumber || ''),
    tlv(3, ts),
    tlv(4, Number(totalWithVat || 0).toFixed(2)),
    tlv(5, Number(vatTotal || 0).toFixed(2)),
  ]);
  return buf.toString('base64');
}

module.exports = { buildQrPayload };
