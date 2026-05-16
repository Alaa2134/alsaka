// Storefront data access. The standalone SPA can run in three modes:
//
//   1. Static — reads `/data/<slug>.json` exported by the desktop app.
//   2. API    — reads from `VITE_API_BASE/store/<slug>` (vendor's server).
//   3. Embed  — reads from `window.__STORE_FEED__` (injected by Electron
//      preview window).
//
// For order placement the SPA POSTs to `VITE_API_BASE/orders` by default;
// configure the env var when deploying.
import type { StoreFeed } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function fetchStoreFeed(slug: string): Promise<StoreFeed | null> {
  // Embed-mode short-circuit
  const injected = (globalThis as any).__STORE_FEED__;
  if (injected && injected.settings?.slug === slug) {
    return injected as StoreFeed;
  }

  // Try the dynamic API first if configured
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/store/${slug}`, { credentials: "include" });
      if (r.ok) return (await r.json()) as StoreFeed;
    } catch (_) {
      /* fall through to static */
    }
  }
  // Fall back to a static JSON file exported by the desktop app
  try {
    const r = await fetch(`/data/${slug}.json`);
    if (r.ok) return (await r.json()) as StoreFeed;
  } catch {
    /* ignore */
  }
  return null;
}

export interface PlaceOrderPayload {
  slug: string;
  customer: { name: string; phone: string; email?: string };
  address: {
    governorate?: string;
    city?: string;
    area?: string;
    street?: string;
    building?: string;
    notes?: string;
  };
  carrierId: string | null;
  gatewayId: string | null;
  couponCode?: string;
  items: Array<{ product_id: string; quantity: number }>;
  notes?: string;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<{
  ok: boolean;
  order_number?: number;
  redirect_url?: string | null;
  error?: string;
}> {
  if (!API_BASE) {
    // Demo mode: simulate success so the UX can be exercised end-to-end
    // before the vendor wires up the real backend.
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, order_number: Math.floor(1000 + Math.random() * 8999) };
  }
  const r = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    let err = "Order failed";
    try {
      const data = await r.json();
      err = data.error || err;
    } catch {
      /* ignore */
    }
    return { ok: false, error: err };
  }
  return (await r.json()) as { ok: true; order_number: number; redirect_url?: string | null };
}

export async function validateCoupon({
  slug,
  code,
  subtotal,
}: {
  slug: string;
  code: string;
  subtotal: number;
}): Promise<{ ok: boolean; discount?: number; free_shipping?: boolean; error?: string }> {
  if (!API_BASE) {
    return { ok: false, error: "no-backend" };
  }
  const r = await fetch(`${API_BASE}/store/${slug}/coupons/${encodeURIComponent(code)}?subtotal=${subtotal}`);
  if (!r.ok) return { ok: false, error: "invalid" };
  return await r.json();
}

export async function trackOrder({
  slug,
  orderNumber,
  phone,
}: {
  slug: string;
  orderNumber: string;
  phone: string;
}): Promise<any> {
  if (!API_BASE) return null;
  const r = await fetch(
    `${API_BASE}/store/${slug}/track?order=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
  );
  if (!r.ok) return null;
  return await r.json();
}
