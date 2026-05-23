// REST client for the driver app. Talks to the Horus REST API exposed
// by the desktop install on /v1/deliveries.

const BASE_KEY = "horus.driver.base";
const TOKEN_KEY = "horus.driver.token";
const ME_KEY = "horus.driver.me";

export function getBase(): string {
  return localStorage.getItem(BASE_KEY) || "http://localhost:27817";
}
export function setBase(v: string) { localStorage.setItem(BASE_KEY, v); }
export function getToken(): string { return localStorage.getItem(TOKEN_KEY) || ""; }
export function setToken(v: string) { localStorage.setItem(TOKEN_KEY, v); }
export function getMe(): { id: string; name: string } | null {
  const raw = localStorage.getItem(ME_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function setMe(v: { id: string; name: string }) { localStorage.setItem(ME_KEY, JSON.stringify(v)); }

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

export interface Delivery {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  total: number;
  status: "queued" | "picked" | "in_transit" | "delivered" | "failed";
  notes?: string | null;
  created_at: string;
}

export const api = {
  login: (phone: string, code: string) =>
    req<{ ok: boolean; token: string; me: { id: string; name: string } }>(
      "/v1/driver/login",
      { method: "POST", body: JSON.stringify({ phone, code }) },
    ),
  myQueue: () => req<{ data: Delivery[] }>("/v1/deliveries?mine=1"),
  accept: (id: string) =>
    req<{ ok: boolean }>(`/v1/deliveries/${id}/accept`, { method: "POST" }),
  setStatus: (id: string, status: string, note?: string) =>
    req<{ ok: boolean }>(`/v1/deliveries/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    }),
  proofUpload: (id: string, dataUrl: string) =>
    req<{ ok: boolean; url?: string }>(`/v1/deliveries/${id}/proof`, {
      method: "POST",
      body: JSON.stringify({ data_url: dataUrl }),
    }),
  route: (stopIds: string[]) =>
    req<{ optimized: string[] }>(`/v1/deliveries/route`, {
      method: "POST",
      body: JSON.stringify({ stops: stopIds }),
    }),
  endShift: (cashCollected: number) =>
    req<{ ok: boolean }>(`/v1/driver/end-shift`, {
      method: "POST",
      body: JSON.stringify({ cash_collected: cashCollected }),
    }),
};
