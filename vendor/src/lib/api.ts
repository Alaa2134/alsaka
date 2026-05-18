// Typed REST client for the Cloudflare Worker backend.

const TOKEN_KEY = "horus.vendor.token";
const USER_KEY = "horus.vendor.user";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function getUser(): { email: string; name: string } | null {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}
export function setSession(token: string, user: { email: string; name: string }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isAuthed(): boolean {
  return !!getToken();
}

const BASE = import.meta.env.VITE_API_BASE || "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (r.status === 401) {
    clearSession();
    window.location.hash = "#/login";
  }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export const api = {
  health: () => fetch(`${BASE}/api/health`).then((r) => r.json()),
  login: (email: string, password: string) =>
    request<{ ok: boolean; token: string; user: { email: string; name: string } }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  licenses: {
    list: () => request<{ data: any[] }>("/api/licenses"),
    issue: (payload: {
      tier?: string;
      expiry?: string;
      days?: number;
      customer_email?: string;
      customer_name?: string;
      customer_phone?: string;
      notes?: string;
      count?: number;
    }) => request<{ ok: boolean; keys: string[] }>("/api/licenses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    revoke: (key: string, reason?: string) =>
      request<{ ok: boolean }>(`/api/licenses/${encodeURIComponent(key)}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },
  releases: {
    list: () => request<{ data: any[] }>("/api/releases"),
    upload: (formData: FormData) =>
      fetch(`${BASE}/api/releases`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
        return r.json();
      }),
  },
  analytics: () => request<{ totals: any; recent: any[] }>("/api/analytics"),
  audit: () => request<{ data: any[] }>("/api/audit"),
};

export function arDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(d);
}
