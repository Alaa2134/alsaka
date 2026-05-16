// Payment gateway abstraction. Each provider exports:
//   createCheckout(gateway, order) -> { redirectUrl?, reference, status }
//   verifyWebhook(gateway, payload, signature) -> { ok, reference, status }
//
// The real Paymob / Fawry / Stripe SDK calls need API keys stored in the
// gateway's `config_json`. The stubs return success-shaped responses so
// the storefront flow is end-to-end testable without live credentials.

function createCheckoutFor(gateway, order) {
  const provider = providers[gateway.provider] || providers.cod;
  return provider.createCheckout(gateway, order);
}

function verifyWebhookFor(gateway, payload, signature) {
  const provider = providers[gateway.provider] || providers.cod;
  return provider.verifyWebhook(gateway, payload, signature);
}

const stubCheckout = (prefix) => (gateway, order) => ({
  ok: true,
  provider: gateway.provider,
  reference: `${prefix}-${(order.id || '').slice(0, 8)}-${Date.now().toString(36)}`,
  redirectUrl: null,
  status: gateway.provider === 'cod' ? 'cod_pending' : 'pending',
});

const stubWebhook = () => ({ ok: true, status: 'paid' });

const providers = {
  // Egypt
  paymob: {
    // https://docs.paymob.com — needs API key, integration ID, HMAC secret.
    createCheckout: stubCheckout('PYMB'),
    verifyWebhook: stubWebhook,
  },
  fawry: {
    // https://developer.fawrystaging.com — needs merchant code + secure key.
    createCheckout: stubCheckout('FWRY'),
    verifyWebhook: stubWebhook,
  },
  vodafone_cash: {
    createCheckout: stubCheckout('VFCH'),
    verifyWebhook: stubWebhook,
  },
  instapay: {
    createCheckout: stubCheckout('INST'),
    verifyWebhook: stubWebhook,
  },

  // International
  stripe: {
    // https://stripe.com/docs/api — needs sk_live + webhook signing secret.
    createCheckout: stubCheckout('STRP'),
    verifyWebhook: stubWebhook,
  },
  paypal: {
    createCheckout: stubCheckout('PYPL'),
    verifyWebhook: stubWebhook,
  },

  // Offline
  cod: {
    createCheckout: stubCheckout('COD'),
    verifyWebhook: stubWebhook,
  },
  bank_transfer: {
    createCheckout: stubCheckout('BNKT'),
    verifyWebhook: stubWebhook,
  },
};

module.exports = { createCheckoutFor, verifyWebhookFor, providers };
