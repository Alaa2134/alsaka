// Shipping carrier abstraction. Each provider exports the same surface:
//   quote(carrier, order) -> { fee, etaDays }
//   book(carrier, order)  -> { tracking_number, label_url }
//
// The carrier row in `shipping_carriers` carries the credentials in
// `config_json`. For now we ship "stub" implementations that compute the
// fee from the carrier's flat_rate/free_above columns — drop in the real
// SDK call when keys are available.
const https = require('node:https');

function quoteFor(carrier, order) {
  const provider = providers[carrier.provider] || providers.custom;
  return provider.quote(carrier, order);
}

function bookFor(carrier, order) {
  const provider = providers[carrier.provider] || providers.custom;
  return provider.book(carrier, order);
}

function flatQuote(carrier, order) {
  const flat = Number(carrier.flat_rate || 0);
  if (carrier.free_above != null && Number(order.subtotal || 0) >= Number(carrier.free_above)) {
    return { fee: 0, etaDays: carrier.estimated_days };
  }
  return { fee: flat, etaDays: carrier.estimated_days };
}

function stubBook(prefix) {
  return (_carrier, _order) => ({
    ok: true,
    tracking_number: `${prefix}-${Date.now().toString(36).toUpperCase()}`,
    label_url: null,
  });
}

const providers = {
  aramex: {
    // Aramex Rest API: https://www.aramex.com/developers
    quote: flatQuote,
    book: stubBook('ARMX'),
  },
  bosta: {
    // Bosta API: https://docs.bosta.co
    quote: flatQuote,
    book: stubBook('BST'),
  },
  jnt: {
    // J&T Express
    quote: flatQuote,
    book: stubBook('JNT'),
  },
  fedex: {
    quote: flatQuote,
    book: stubBook('FDX'),
  },
  mylerz: {
    quote: flatQuote,
    book: stubBook('MYL'),
  },
  custom: {
    quote: flatQuote,
    book: stubBook('SHP'),
  },
};

module.exports = { quoteFor, bookFor, providers };
