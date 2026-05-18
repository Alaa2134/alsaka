// REST client for Horus customer-app. The merchant gives the customer a
// "store link" (slug) that maps to their tenant; everything is resolved
// from there. Sessions store the customer's phone and OTP-derived token.

const STORE_KEY = "horus.customer.store";
const PHONE_KEY = "horus.customer.phone";
const TOKEN_KEY = "horus.customer.token";
const BASE_KEY = "horus.customer.base";

export function getBase(): string {
  return localStorage.getItem(BASE_KEY) || "https://api.horus.local";
}
export function setBase(v: string) { localStorage.setItem(BASE_KEY, v); }
export function getStore(): string { return localStorage.getItem(STORE_KEY) || ""; }
export function setStore(v: string) { localStorage.setItem(STORE_KEY, v); }
export function getPhone(): string { return localStorage.getItem(PHONE_KEY) || ""; }
export function setPhone(v: string) { localStorage.setItem(PHONE_KEY, v); }
export function getToken(): string { return localStorage.getItem(TOKEN_KEY) || ""; }
export function setToken(v: string) { localStorage.setItem(TOKEN_KEY, v); }
export function clearSession() {
  localStorage.removeItem(PHONE_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const r = await fetch(`${getBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json();
}

export interface StoreFeed {
  tenant_id: string;
  name: string;
  hero?: string;
  primary_color?: string;
  categories: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; price: number; image_url?: string; stock: number; category_id?: string }>;
}

export const api = {
  storeFeed: (slug: string) => req<StoreFeed>(`/v1/store/${encodeURIComponent(slug)}`),
  placeOrder: (payload: {
    slug: string;
    client_name: string;
    client_phone: string;
    items: Array<{ product_id: string; quantity: number }>;
  }) => req<{ ok: boolean; order_number: number; id: string }>(`/v1/orders`, {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  // QR-pay flow: the cashier generates a QR with {tenantId, amount, ref}
  // and the customer scans it. We POST it back; the desktop's storefront
  // marks the cashier-side invoice paid + sends a push back to the app.
  scanPay: (payload: { tenantId: string; amount: number; ref: string }) =>
    req<{ ok: boolean }>(`/v1/customer/scan-pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  myLoyalty: () => req<{ points: number; tier: string; history: any[] }>(`/v1/customer/loyalty`),
  myOrders: () => req<{ data: any[] }>(`/v1/customer/orders`),
  requestOtp: (phone: string) =>
    req<{ ok: boolean; otp_hint?: string }>(`/v1/customer/otp/request`, {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, code: string) =>
    req<{ ok: boolean; token: string; name?: string }>(`/v1/customer/otp/verify`, {
      method: "POST",
      body: JSON.stringify({ phone, code }),
    }),
};
