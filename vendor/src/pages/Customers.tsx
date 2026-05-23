import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, ShieldOff, Copy, RefreshCw } from "lucide-react";
import { api, arDate } from "@/lib/api";

interface License {
  key: string;
  tier: string;
  expiry: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
  is_revoked: number;
  created_at: string;
  fingerprint_short: string | null;
  version: string | null;
  last_ip: string | null;
  last_country: string | null;
  last_seen: string | null;
}

function maskKey(key: string): string {
  return key.replace(/^(SA-[A-Z0-9]+-\d{8}-)([A-Z0-9]+)-([A-F0-9]{10})$/, "$1****-**********");
}

export function CustomersPage() {
  const [list, setList] = useState<License[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "revoked" | "expired" | "dormant">("all");

  const refresh = async () => {
    try {
      const r = await api.licenses.list();
      setList(r.data || []);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    let arr = list;
    if (filter === "active") {
      arr = arr.filter((l) => !l.is_revoked && new Date(l.expiry) >= now);
    } else if (filter === "revoked") {
      arr = arr.filter((l) => l.is_revoked);
    } else if (filter === "expired") {
      arr = arr.filter((l) => new Date(l.expiry) < now);
    } else if (filter === "dormant") {
      arr = arr.filter((l) => !l.last_seen || new Date(l.last_seen) < sevenDaysAgo);
    }
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      arr = arr.filter((l) =>
        l.key.toLowerCase().includes(qq) ||
        (l.customer_email || "").toLowerCase().includes(qq) ||
        (l.customer_name || "").toLowerCase().includes(qq) ||
        (l.customer_phone || "").includes(qq),
      );
    }
    return arr;
  }, [list, filter, q]);

  const revoke = async (key: string) => {
    const reason = prompt("سبب الإلغاء (اختياري)");
    if (reason === null) return;
    try {
      await api.licenses.revoke(key, reason || undefined);
      toast.success("تم الإلغاء — العميل هيتقفل عنده التطبيق على أول heartbeat");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => toast.success("تم النسخ"));
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">العملاء والتراخيص</h1>
          <p className="text-sm text-slate-500">{list.length} ترخيص إجمالي</p>
        </div>
        <button onClick={refresh} className="btn-outline">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالكود أو الإيميل أو الاسم..."
            className="input-field pr-10"
          />
        </div>
        <div className="inline-flex gap-1 bg-white rounded-lg shadow-card p-1">
          {[
            { v: "all", l: `الكل (${list.length})` },
            { v: "active", l: "نشطة" },
            { v: "dormant", l: "غير نشطة" },
            { v: "expired", l: "منتهية" },
            { v: "revoked", l: "ملغية" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setFilter(o.v as any)}
              className={`px-3 py-1.5 rounded text-sm ${filter === o.v ? "bg-primary text-white" : "text-slate-600"}`}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-right">الكود</th>
              <th className="px-3 py-2.5 text-right">الباقة</th>
              <th className="px-3 py-2.5 text-right">العميل</th>
              <th className="px-3 py-2.5 text-right">ينتهي</th>
              <th className="px-3 py-2.5 text-right">آخر اتصال</th>
              <th className="px-3 py-2.5 text-right">IP/الدولة</th>
              <th className="px-3 py-2.5 text-right">الحالة</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-500 py-12">لا توجد بيانات.</td></tr>
            ) : (
              filtered.map((l) => {
                const now = new Date();
                const expired = new Date(l.expiry) < now;
                const status = l.is_revoked ? "revoked" : expired ? "expired" : "active";
                return (
                  <tr key={l.key}>
                    <td className="px-3 py-2 font-mono text-xs">
                      <div className="flex items-center gap-1">
                        {maskKey(l.key)}
                        <button onClick={() => copyKey(l.key)} className="p-0.5 hover:text-primary">
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">{l.tier}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div>{l.customer_name || "—"}</div>
                      {l.customer_email && <div className="text-xs text-slate-500" dir="ltr">{l.customer_email}</div>}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{l.expiry}</td>
                    <td className="px-3 py-2 text-xs">{arDate(l.last_seen)}</td>
                    <td className="px-3 py-2 text-xs">
                      {l.last_ip ? <span dir="ltr">{l.last_ip}{l.last_country && ` · ${l.last_country}`}</span> : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {status === "active" && <span className="inline-block px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">نشط</span>}
                      {status === "expired" && <span className="inline-block px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-semibold">منتهي</span>}
                      {status === "revoked" && <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">ملغي</span>}
                    </td>
                    <td className="px-3 py-2">
                      {!l.is_revoked && (
                        <button onClick={() => revoke(l.key)} className="p-1 text-destructive hover:bg-destructive/10 rounded" title="إلغاء">
                          <ShieldOff className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
