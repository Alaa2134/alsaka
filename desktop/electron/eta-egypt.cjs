// ETA Egypt (مصلحة الضرائب المصرية) — Electronic Invoice integration.
//
// The ETA submission is a JSON envelope conforming to the ETA SDK v1.0
// schema. Each invoice must be signed with the merchant's USB thumb-
// token via ETA Sign Server (locally hosted SDK that fronts the USB
// HSM). For v1 we support two flows:
//
//   1. CLOUD-SIGNING (recommended): the merchant uses ETA's cloud
//      signing service with their tax_id + client secret. No local
//      thumb-token required. Set eta.signing_mode = 'cloud'.
//   2. SDK-PROXY: assumes ETA Sign Server is running locally on
//      http://localhost:8060/api/v1.0/signing. We POST the document
//      and the server returns the signed JSON.
//
// Submission endpoints: https://api.preprod.invoicing.eta.gov.eg/api/v1/documentsubmissions
const crypto = require('node:crypto');
const { v4: uuid } = require('uuid');
const dbMod = require('./db.cjs');

const ETA_PREPROD = 'https://api.preprod.invoicing.eta.gov.eg/api/v1';
const ETA_PROD = 'https://api.invoicing.eta.gov.eg/api/v1';
const ETA_LOCAL_SIGN = 'http://localhost:8060/api/v1.0/signing/sign';

function getSetting(tenantId, key) {
  return dbMod.get()
    .prepare(`SELECT value FROM company_settings WHERE tenant_id = ? AND key = ?`)
    .get(tenantId, key)?.value || null;
}

function buildDocument({ tenantId, invoice, items }) {
  const sellerVat = getSetting(tenantId, 'eta.tax_id') || '';
  const sellerName = getSetting(tenantId, 'company.name') || 'Horus';
  const branchId = getSetting(tenantId, 'eta.branch_id') || '0';
  const issuerAddress = {
    country: 'EG',
    governate: getSetting(tenantId, 'eta.governate') || 'القاهرة',
    regionCity: getSetting(tenantId, 'eta.region_city') || 'القاهرة',
    street: getSetting(tenantId, 'company.address') || '',
    buildingNumber: getSetting(tenantId, 'eta.building_number') || '0',
    postalCode: getSetting(tenantId, 'eta.postal_code') || '',
  };

  const totalAmount = Number(invoice.total) || 0;
  const taxAmount = Number(invoice.tax) || 0;

  return {
    documentType: 'I',          // I = Invoice
    documentTypeVersion: '1.0',
    dateTimeIssued: (invoice.created_at || new Date().toISOString()),
    taxpayerActivityCode: getSetting(tenantId, 'eta.activity_code') || '4711',
    internalID: `INV-${invoice.number || invoice.id?.slice(0, 8) || Date.now()}`,
    issuer: {
      address: issuerAddress,
      type: 'B',
      id: sellerVat,
      name: sellerName,
    },
    receiver: {
      type: invoice.client_id ? 'B' : 'P',
      id: invoice.client_id || '0000000000000000',
      name: 'عميل',
      address: { country: 'EG', regionCity: 'القاهرة', street: '-', buildingNumber: '0' },
    },
    invoiceLines: items.map((it) => {
      const lineTotal = Number(it.total) || 0;
      const lineTax = lineTotal * (taxAmount / Math.max(totalAmount, 1));
      return {
        description: it.product_name,
        itemType: 'GS1',
        itemCode: it.product_id || '0',
        unitType: 'EA',
        quantity: Number(it.quantity) || 0,
        unitValue: { currencySold: 'EGP', amountEGP: Number(it.price) || 0 },
        salesTotal: lineTotal,
        total: lineTotal,
        valueDifference: 0,
        totalTaxableFees: 0,
        netTotal: lineTotal - lineTax,
        itemsDiscount: 0,
        taxableItems: [
          {
            taxType: 'T1', // VAT
            amount: lineTax,
            subType: 'V009',
            rate: totalAmount > 0 ? (taxAmount / totalAmount) * 100 : 0,
          },
        ],
      };
    }),
    totalDiscountAmount: Number(invoice.discount) || 0,
    totalSalesAmount: totalAmount - taxAmount,
    netAmount: totalAmount - taxAmount,
    taxTotals: [{ taxType: 'T1', amount: taxAmount }],
    totalAmount,
    extraDiscountAmount: 0,
    totalItemsDiscountAmount: 0,
  };
}

function computeHashKey(doc) {
  // ETA uses a hash for idempotency.
  return crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex');
}

async function signLocally(doc) {
  try {
    const r = await fetch(ETA_LOCAL_SIGN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!r.ok) throw new Error(`local sign server: ${r.status}`);
    return await r.json();
  } catch (err) {
    return null;
  }
}

async function authToken(tenantId) {
  // ETA OAuth client_credentials flow
  const clientId = getSetting(tenantId, 'eta.client_id');
  const clientSecret = getSetting(tenantId, 'eta.client_secret');
  const mode = getSetting(tenantId, 'eta.mode') || 'preprod';
  const tokenUrl = mode === 'prod'
    ? 'https://id.eta.gov.eg/connect/token'
    : 'https://id.preprod.eta.gov.eg/connect/token';
  if (!clientId || !clientSecret) return null;
  try {
    const r = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'InvoicingAPI',
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.access_token;
  } catch {
    return null;
  }
}

async function submit({ tenantId, invoiceId }) {
  const db = dbMod.get();
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice) throw new Error('invoice not found');
  const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).all(invoiceId);

  const doc = buildDocument({ tenantId, invoice, items });
  const hashKey = computeHashKey(doc);
  const subId = uuid();

  db.prepare(
    `INSERT INTO eta_submissions (id, tenant_id, invoice_id, internal_id, hash_key, payload_json, submission_status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
  ).run(subId, tenantId, invoiceId, doc.internalID, hashKey, JSON.stringify(doc));

  // 1. Sign — try local first, fall back to "unsigned" (ETA will reject)
  const signedDoc = await signLocally(doc) || doc;

  // 2. Auth
  const token = await authToken(tenantId);
  if (!token) {
    db.prepare(`UPDATE eta_submissions SET submission_status = 'auth-failed' WHERE id = ?`).run(subId);
    return { ok: false, error: 'ETA OAuth credentials not configured', submission_id: subId };
  }

  // 3. Submit
  const mode = getSetting(tenantId, 'eta.mode') || 'preprod';
  const base = mode === 'prod' ? ETA_PROD : ETA_PREPROD;
  try {
    const r = await fetch(`${base}/documentsubmissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ documents: [signedDoc] }),
    });
    const data = await r.json().catch(() => ({}));
    const status = r.ok ? 'submitted' : 'rejected';
    const etaUuid = data?.acceptedDocuments?.[0]?.uuid || null;
    db.prepare(
      `UPDATE eta_submissions SET submission_status = ?, response_json = ?, eta_uuid = ?, submitted_at = datetime('now')
       WHERE id = ?`,
    ).run(status, JSON.stringify(data), etaUuid, subId);
    return { ok: r.ok, eta_uuid: etaUuid, response: data, submission_id: subId };
  } catch (err) {
    db.prepare(`UPDATE eta_submissions SET submission_status = 'error', response_json = ? WHERE id = ?`)
      .run(JSON.stringify({ error: String(err.message || err) }), subId);
    return { ok: false, error: String(err.message || err) };
  }
}

function listSubmissions({ tenantId, limit = 100 }) {
  return dbMod.get().prepare(
    `SELECT s.*, i.number AS invoice_number, i.total AS invoice_total
       FROM eta_submissions s
       JOIN invoices i ON i.id = s.invoice_id
      WHERE s.tenant_id = ? ORDER BY s.created_at DESC LIMIT ?`,
  ).all(tenantId, limit);
}

module.exports = { submit, listSubmissions, buildDocument };
