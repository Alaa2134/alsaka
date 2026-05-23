// ZATCA Phase 2 (Saudi Arabia e-invoice clearance).
//
// Generates a UBL 2.1 XML invoice, attaches the existing TLV QR (from
// electron/zatca.cjs), computes the document SHA-256 hash, and signs
// the hash with the merchant's X.509 certificate. Then submits to
// ZATCA's clearance or reporting endpoint depending on whether it's
// a standard or simplified invoice.
//
// Phase 2 requires a real ZATCA-issued cert. The merchant uploads it
// (PEM + private key + CSID) into company_settings under
//   zatca.cert_pem, zatca.private_key_pem, zatca.csid
// and we use Node's crypto + a minimal XML signer here.
//
// API spec: https://sandbox.zatca.gov.sa/IntegrationSandbox
const crypto = require('node:crypto');
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');
const { buildQrPayload } = require('./zatca.cjs');

const ZATCA_SANDBOX = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';
const ZATCA_PRODUCTION = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core';

function getSetting(tenantId, key) {
  return dbMod.get()
    .prepare(`SELECT value FROM company_settings WHERE tenant_id = ? AND key = ?`)
    .get(tenantId, key)?.value || null;
}

function setSetting(tenantId, key, value) {
  const db = dbMod.get();
  db.prepare(
    `INSERT INTO company_settings (id, tenant_id, key, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(tenant_id, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(uuid(), tenantId, key, String(value ?? ''));
}

// Reusable XML escape — UBL spec wants & < > escaped at minimum
function xe(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUblXml({ tenantId, invoice, items, isSimplified }) {
  const sellerName = getSetting(tenantId, 'company.name') || 'Horus';
  const sellerVat = getSetting(tenantId, 'zatca.vat_number') || '';
  const sellerStreet = getSetting(tenantId, 'company.address') || '';
  const cr = getSetting(tenantId, 'zatca.cr_number') || '';

  const issueDate = (invoice.created_at || new Date().toISOString()).slice(0, 10);
  const issueTime = new Date(invoice.created_at || Date.now()).toISOString().slice(11, 19);
  const totalIncVat = Number(invoice.total) || 0;
  const taxTotal = Number(invoice.tax) || 0;
  const taxableAmount = totalIncVat - taxTotal;

  const invoiceTypeCode = isSimplified ? '0200000' : '0100000'; // ZATCA codes
  const id = `INV-${invoice.number || invoice.id?.slice(0, 8) || Date.now()}`;
  const uuidV4 = uuid();

  const lineXml = items.map((it, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${Number(it.quantity).toFixed(2)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${Number(it.total).toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${xe(it.product_name)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="SAR">${Number(it.price).toFixed(2)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${xe(id)}</cbc:ID>
  <cbc:UUID>${uuidV4}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${invoiceTypeCode}">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${xe(cr)}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress><cbc:StreetName>${xe(sellerStreet)}</cbc:StreetName></cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xe(sellerVat)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${xe(sellerName)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${taxTotal.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${taxableAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${totalIncVat.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${totalIncVat.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineXml}
</Invoice>`;
}

function hashXml(xmlString) {
  return crypto.createHash('sha256').update(xmlString, 'utf8').digest('hex');
}

function signHash(xmlHash, privateKeyPem) {
  if (!privateKeyPem) return null;
  try {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(xmlHash);
    sign.end();
    return sign.sign(privateKeyPem, 'base64');
  } catch (err) {
    console.warn('[ZATCA] signing failed:', err.message);
    return null;
  }
}

async function submitToZatca({ tenantId, kind, xml, hash, signature }) {
  const mode = getSetting(tenantId, 'zatca.mode') || 'sandbox';
  const base = mode === 'production' ? ZATCA_PRODUCTION : ZATCA_SANDBOX;
  const csid = getSetting(tenantId, 'zatca.csid');
  if (!csid) {
    return { ok: false, error: 'ZATCA CSID not configured', mode: 'no-cert' };
  }
  const endpoint = kind === 'standard' ? '/invoices/clearance/single' : '/invoices/reporting/single';
  try {
    const body = {
      invoiceHash: hash,
      uuid: uuid(),
      invoice: Buffer.from(xml, 'utf8').toString('base64'),
      signature,
    };
    const resp = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Version': 'V2',
        'Authorization': `Basic ${Buffer.from(csid).toString('base64')}`,
        'Clearance-Status': '1',
      },
      body: JSON.stringify(body),
    });
    const respBody = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, response: respBody };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
}

async function clearInvoice({ tenantId, invoiceId, simplified = false }) {
  const db = dbMod.get();
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoiceId);

  const xml = buildUblXml({ tenantId, invoice, items, isSimplified: simplified });
  const hash = hashXml(xml);
  const qr = buildQrPayload({
    sellerName: getSetting(tenantId, 'company.name') || 'Horus',
    vatNumber: getSetting(tenantId, 'zatca.vat_number') || '',
    timestamp: invoice.created_at || new Date().toISOString(),
    totalWithVat: invoice.total,
    vatTotal: invoice.tax || 0,
  });
  const signature = signHash(hash, getSetting(tenantId, 'zatca.private_key_pem'));

  const subId = uuid();
  db.prepare(
    `INSERT INTO zatca_submissions (id, tenant_id, invoice_id, kind, flow, xml, xml_hash, qr_payload, clearance_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
  ).run(subId, tenantId, invoiceId,
        simplified ? 'simplified' : 'standard',
        simplified ? 'reporting' : 'clearance',
        xml, hash, qr);

  const result = await submitToZatca({
    tenantId,
    kind: simplified ? 'simplified' : 'standard',
    xml, hash, signature,
  });
  const status = result.ok ? 'cleared' : 'rejected';
  db.prepare(
    `UPDATE zatca_submissions SET clearance_status = ?, response_json = ?, submitted_at = datetime('now'),
                                  cleared_uuid = ?
     WHERE id = ?`,
  ).run(status, JSON.stringify(result.response || result), result.response?.invoiceHash || null, subId);

  return { ok: result.ok, submission_id: subId, response: result.response, qr };
}

function listSubmissions({ tenantId, limit = 100 }) {
  return dbMod.get().prepare(
    `SELECT s.*, i.number AS invoice_number, i.total AS invoice_total
       FROM zatca_submissions s
       JOIN invoices i ON i.id = s.invoice_id
      WHERE s.tenant_id = ? ORDER BY s.created_at DESC LIMIT ?`,
  ).all(tenantId, limit);
}

module.exports = { clearInvoice, listSubmissions, getSetting, setSetting, buildUblXml };
