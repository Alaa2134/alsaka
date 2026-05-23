import { useEffect, useState } from "react";
import { TrendingUp, FileText, Package, Users, AlertTriangle, ShoppingBag } from "lucide-react";
import { api, money, arDate } from "@/lib/api";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [s, ser] = await Promise.all([api.dashboard(), api.salesSeries(30)]);
        if (!alive) return;
        setStats(s);
        setSeries(ser.data || []);
      } catch (e) {
        setErr(String((e as Error).message || e));
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (err) return <div className="p-6 text-destructive">خطأ: {err}</div>;
  if (!stats) return <div className="p-6 text-slate-500">جاري التحميل...</div>;

  const tiles = [
    { label: "مبيعات اليوم", v: money(stats.salesToday), icon: TrendingUp, color: "bg-success" },
    { label: "مبيعات الشهر", v: money(stats.salesMonth), icon: TrendingUp, color: "bg-primary" },
    { label: "الفواتير", v: String(stats.invoicesCount), icon: FileText, color: "bg-accent" },
    { label: "المنتجات", v: String(stats.productsCount), icon: Package, color: "bg-warning" },
    { label: "العملاء", v: String(stats.clientsCount), icon: Users, color: "bg-primary" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">نظرة عامة</h1>
        <p className="text-sm text-slate-500">آخر تحديث: {arDate(new Date())} · تلقائي كل 30 ثانية</p>
      </header>

      {/* KPI tiles */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{t.label}</div>
                <div className="text-2xl font-bold tabular-nums mt-1">{t.v}</div>
              </div>
              <div className={`h-10 w-10 rounded-lg ${t.color} text-white grid place-items-center`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Sales trend chart */}
      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">المبيعات آخر 30 يوم</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip formatter={(v: any) => money(v)} />
            <Line type="monotone" dataKey="sales" stroke="hsl(221 83% 53%)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent invoices */}
        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> آخر الفواتير</h2>
          {(stats.recentInvoices || []).length === 0 ? (
            <p className="text-sm text-slate-500">لا توجد فواتير بعد.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recentInvoices.map((inv: any) => (
                <li key={inv.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">#{inv.number || inv.id.slice(0, 6)}</div>
                    <div className="text-xs text-slate-500">{arDate(inv.created_at)}</div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold tabular-nums">{money(inv.total)}</div>
                    <div className="text-xs">
                      {inv.remaining > 0 ? (
                        <span className="text-destructive">باقي {money(inv.remaining)}</span>
                      ) : (
                        <span className="text-success">مدفوعة</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-xl shadow-card p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> تنبيهات المخزون
          </h2>
          {(stats.lowStock || []).length === 0 ? (
            <p className="text-sm text-success">المخزون كله بخير ✓</p>
          ) : (
            <ul className="space-y-2">
              {stats.lowStock.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.name}</span>
                  <span className={`tabular-nums ${p.stock <= 0 ? "text-destructive" : "text-warning"}`}>
                    {p.stock} / حد {p.min_stock}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
