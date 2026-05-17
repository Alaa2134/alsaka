import { useEffect, useMemo, useState } from "react";
import { api, money, arDate } from "@/lib/api";
import { Search } from "lucide-react";

export function InvoicesPage() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");

  useEffect(() => {
    api.invoices().then((r) => setList(r.data || [])).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    let arr = list;
    if (filter === "paid") arr = arr.filter((i) => i.remaining <= 0);
    if (filter === "unpaid") arr = arr.filter((i) => i.remaining > 0);
    if (q.trim()) arr = arr.filter((i) => String(i.number || "").includes(q.trim()));
    return arr;
  }, [list, filter, q]);

  const totalUnpaid = filtered.filter((i) => i.remaining > 0).reduce((s, i) => s + (i.remaining || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">الفواتير</h1>
        <p className="text-sm text-slate-500">
          إجمالي المستحق: <span className="font-bold text-destructive tabular-nums">{money(totalUnpaid)}</span>
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الفاتورة..."
            className="input-field pr-10"
          />
        </div>
        <div className="inline-flex gap-1 bg-white rounded-lg shadow-card p-1">
          {[
            { v: "all", l: `الكل (${list.length})` },
            { v: "unpaid", l: `غير مدفوعة (${list.filter((i) => i.remaining > 0).length})` },
            { v: "paid", l: `مدفوعة (${list.filter((i) => i.remaining <= 0).length})` },
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
              <th className="px-3 py-2.5 text-right">رقم</th>
              <th className="px-3 py-2.5 text-right">التاريخ</th>
              <th className="px-3 py-2.5 text-right">الإجمالي</th>
              <th className="px-3 py-2.5 text-right">المدفوع</th>
              <th className="px-3 py-2.5 text-right">المتبقي</th>
              <th className="px-3 py-2.5 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-slate-500 py-8">لا توجد فواتير.</td></tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-3 py-2 font-medium">#{inv.number || inv.id.slice(0, 6)}</td>
                  <td className="px-3 py-2">{arDate(inv.created_at)}</td>
                  <td className="px-3 py-2 tabular-nums">{money(inv.total)}</td>
                  <td className="px-3 py-2 tabular-nums">{money(inv.paid)}</td>
                  <td className={`px-3 py-2 tabular-nums font-bold ${inv.remaining > 0 ? "text-destructive" : "text-success"}`}>
                    {money(inv.remaining)}
                  </td>
                  <td className="px-3 py-2">
                    {inv.remaining <= 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">مدفوعة</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">غير مدفوعة</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
