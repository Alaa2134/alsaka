// Tiny typed REST client for the Horus embedded API. Settings live in
// localStorage so the owner can pair their phone/tablet/laptop once and
// then access the dashboard from anywhere.

const STORAGE_BASE = "horus.owner.base";
const STORAGE_KEY = "horus.owner.key";

export function getBase(): string {
  return localStorage.getItem(STORAGE_BASE) || "";
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
export function isConfigured(): boolean {
  return Boolean(getBase() && getKey());
}
export function logout() {
  localStorage.removeItem(STORAGE_BASE);
  localStorage.removeItem(STORAGE_KEY);
}

async function request<T>(path: string): Promise<T> {
  const r = await fetch(`${getBase()}${path}`, {
    headers: { Authorization: `Bearer ${getKey()}` },
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export const api = {
  health: () => fetch(`${getBase()}/health`).then((r) => r.json()),
  dashboard: () => request<{
    salesToday: number; salesMonth: number; invoicesCount: number;
    productsCount: number; clientsCount: number;
    lowStock: Array<{ id: string; name: string; stock: number; min_stock: number }>;
    recentInvoices: Array<any>;
  }>("/v1/dashboard"),
  invoices: () => request<{ data: any[] }>("/v1/invoices"),
  products: () => request<{ data: any[] }>("/v1/products"),
  clients: () => request<{ data: any[] }>("/v1/clients"),
  suppliers: () => request<{ data: any[] }>("/v1/suppliers"),
  employees: () => request<{ data: any[] }>("/v1/employees"),
  branches: () => request<{ data: any[] }>("/v1/branches"),
  payroll: () => request<{ data: any[] }>("/v1/payroll"),
  notifications: () => request<{ data: any[] }>("/v1/notifications"),
  storeOrders: () => request<{ data: any[] }>("/v1/store-orders"),
  salesSeries: (days = 30) => request<{ data: Array<{ date: string; sales: number; invoices: number }> }>(`/v1/analytics/sales?days=${days}`),
  topProducts: (days = 30, limit = 10) => request<{ data: Array<{ id: string; name: string; qty: number; revenue: number }> }>(`/v1/analytics/top-products?days=${days}&limit=${limit}`),
  arAging: () => request<{ data: any[] }>("/v1/analytics/ar-aging"),
};

export function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  if (!Number.isFinite(v)) return "0.00";
  return v.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function arDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
