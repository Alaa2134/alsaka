// @horus/sdk — typed client for the Horus System REST API.
//
//   import { HorusClient } from '@horus/sdk';
//   const horus = new HorusClient({ baseUrl: 'http://192.168.1.10:6420', apiKey: 'hk_…' });
//   const products = await horus.products.list();
//
// The SDK works in Node 18+ (uses global fetch), the browser, and React
// Native. No runtime dependencies.

export interface HorusClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku?: string | null;
  item_number?: string | null;
  price: number;
  cost?: number;
  stock: number;
  min_stock?: number;
  is_active: number;
  category_id?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance?: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  number?: string | null;
  client_id?: string | null;
  total: number;
  discount: number;
  paid: number;
  remaining: number;
  status: string;
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface DashboardStats {
  salesToday: number;
  salesMonth: number;
  invoicesCount: number;
  productsCount: number;
  clientsCount: number;
  lowStock: Array<{ id: string; name: string; stock: number; min_stock: number }>;
  recentInvoices: Array<Pick<Invoice, 'id' | 'number' | 'total' | 'paid' | 'remaining' | 'status' | 'created_at'>>;
}

export class HorusError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message || `Horus API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

export class HorusClient {
  private baseUrl: string;
  private apiKey: string | undefined;
  private timeoutMs: number;
  private fetchImpl: typeof fetch;

  constructor(opts: HorusClientOptions) {
    if (!opts.baseUrl) throw new Error('baseUrl is required');
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const r = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new HorusError(r.status, json, (json as { error?: string }).error);
      return json as T;
    } finally {
      clearTimeout(t);
    }
  }

  health() { return this.req<{ ok: boolean; server: string; port: number }>('GET', '/health'); }

  products = {
    list: () => this.req<{ data: Product[] }>('GET', '/v1/products').then((r) => r.data),
  };

  clients = {
    list: () => this.req<{ data: Client[] }>('GET', '/v1/clients').then((r) => r.data),
  };

  invoices = {
    list: () => this.req<{ data: Invoice[] }>('GET', '/v1/invoices').then((r) => r.data),
    create: (payload: { invoice: Partial<Invoice>; items: InvoiceItem[] }) =>
      this.req<{ ok: boolean; invoice: Invoice; items: InvoiceItem[] }>('POST', '/v1/invoices', payload),
  };

  dashboard = () => this.req<DashboardStats>('GET', '/v1/dashboard');

  analytics = {
    sales: (days = 30) =>
      this.req<Array<{ date: string; total: number }>>('GET', `/v1/analytics/sales?days=${days}`),
    topProducts: (days = 30, limit = 10) =>
      this.req<Array<{ id: string; name: string; qty: number; revenue: number }>>(
        'GET',
        `/v1/analytics/top-products?days=${days}&limit=${limit}`,
      ),
    arAging: () => this.req<Array<{ id: string; client_name: string; remaining: number; days_overdue: number }>>(
      'GET', '/v1/analytics/ar-aging',
    ),
  };

  store = {
    feed: (slug: string) => this.req<any>('GET', `/v1/store/${encodeURIComponent(slug)}`),
    placeOrder: (payload: { slug: string; client_name: string; client_phone: string; items: Array<{ product_id: string; quantity: number }> }) =>
      this.req<{ ok: boolean; order_number: number; id: string }>('POST', '/v1/orders', payload),
  };
}

export default HorusClient;
