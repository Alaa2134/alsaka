import { useEffect, useState } from "react";
import { api, money } from "@/lib/api";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";

export function AnalyticsPage() {
  const [series, setSeries] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [days, setDays] = useState(30);

  useEffect(() => {
    api.salesSeries(days).then((r) => setSeries(r.data || [])).catch(() => undefined);
    api.topProducts(days, 10).then((r) => setTopProducts(r.data || [])).catch(() => undefined);
    api.arAging().then((r) => setAging(r.data || [])).catch(() => undefined);
  }, [days]);

  const totalRevenue = series.reduce((s, x) => s + (x.sales || 0), 0);
  const totalInvoices = series.reduce((s, x) => s + (x.invoices || 0), 0);
  const avgInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  const buckets = aging.reduce(
    (acc: any, r: any) => {
      acc[r.bucket] = (acc[r.bucket] || 0) + (r.open_total || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const bucketRows = Object.entries(buckets).map(([k, v]) => ({ name: k, value: v }));
  const COLORS = ["hsl(142 76% 36%)", "hsl(38 92% 50%)", "hsl(25 95% 53%)", "hsl(0 84% 60%)", "hsl(0 84% 40%)"];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">تحليلات</h1>
          <p className="text-sm text-slate-500">آخر {days} يوم</p>
        </div>
        <div className="inline-flex gap-1 bg-white rounded-lg shadow-card p-1">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded text-sm ${days === d ? "bg-primary text-white" : "text-slate-600"}`}
            >
              {d === 365 ? "سنة" : `${d} يوم`}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-xs text-slate-500">إجمالي الإيرادات</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-success">{money(totalRevenue)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-xs text-slate-500">عدد الفواتير</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{totalInvoices}</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-xs text-slate-500">متوسط الفاتورة</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{money(avgInvoice)}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> المبيعات اليومية</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
            <YAxis fontSize={11} stroke="#94a3b8" />
            <Tooltip formatter={(v: any) => money(v)} />
            <Bar dataKey="sales" fill="hsl(221 83% 53%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold mb-3">أعلى 10 منتجات</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {topProducts.map((p, idx) => (
                <tr key={p.id}>
                  <td className="py-2 text-slate-400 w-8">{idx + 1}</td>
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-left tabular-nums text-xs text-slate-500">{p.qty} قطعة</td>
                  <td className="py-2 text-left tabular-nums font-bold">{money(p.revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-slate-500">لا توجد بيانات</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" /> أعمار الديون
          </h2>
          {bucketRows.length === 0 ? (
            <p className="text-sm text-success py-8 text-center">لا توجد ديون مفتوحة 🎉</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bucketRows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {bucketRows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="text-sm space-y-1 mt-2">
                {bucketRows.map((b, i) => (
                  <li key={b.name} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                      {b.name === "current" ? "ضمن المدة" : b.name}
                    </span>
                    <span className="tabular-nums font-semibold">{money(b.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
