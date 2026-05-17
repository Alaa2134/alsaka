// Tiny REST client for the SystemAlaa embedded API server. The server
// runs on the cashier PC on port 27817; the mobile PWA scans for it on
// the local network or uses a configured base URL stored in
// localStorage so the cashier can edit it from the settings screen.

const STORAGE_BASE = "systemalaa.mobile.base";
const STORAGE_KEY = "systemalaa.mobile.key";

export function getBase(): string {
  return localStorage.getItem(STORAGE_BASE) || "http://localhost:27817";
}
export function setBase(v: string) {
  localStorage.setItem(STORAGE_BASE, v);
}
export function getKey(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}
export function setKey(v: string) {
  localStorage.setItem(STORAGE_KEY, v);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getKey();
  const r = await fetch(`${getBase()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json();
}

export const api = {
  health: () => request<{ ok: boolean; port: number }>("/health"),
  products: () => request<{ data: any[] }>("/v1/products"),
  clients: () => request<{ data: any[] }>("/v1/clients"),
  invoices: () => request<{ data: any[] }>("/v1/invoices"),
  dashboard: () => request<any>("/v1/dashboard"),
  createInvoice: (payload: any) =>
    request<any>("/v1/invoices", { method: "POST", body: JSON.stringify(payload) }),
};
