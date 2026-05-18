import { useEffect, useState } from "react";
import { Key, ShieldOff, Clock, Activity, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function Dashboard() {
  const [totals, setTotals] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api.analytics();
        if (!alive) return;
        setTotals(r.totals);
        setRecent(r.recent || []);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!totals) return <div className="p-6 text-slate-500">جاري التحميل...</div>;

  const tiles = [
    { label: "تراخيص نشطة", v: totals.active, icon: Key, color: "bg-success" },
    { label: "ملغية", v: totals.revoked, icon: ShieldOff, color: "bg-destructive" },
    { label: "منتهية", v: totals.expired, icon: Clock, color: "bg-warning" },
    { label: "نشطة آخر 24 ساعة", v: totals.active_24h, icon: Activity, color: "bg-primary" },
    { label: "نشطة الأسبوع", v: totals.active_7d, icon: TrendingUp, color: "bg-accent" },
  ];

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">نظرة عامة</h1>
        <p className="text-sm text-slate-500">إحصائيات لحظية عن كل التراخيص والتركيبات</p>
      </header>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">{t.label}</div>
                <div className="text-3xl font-bold tabular-nums mt-1">{t.v ?? 0}</div>
              </div>
              <div className={`h-10 w-10 rounded-lg ${t.color} text-white grid place-items-center`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-card p-4">
        <h2 className="font-semibold mb-3">عدد التركيبات النشطة يوميًا — آخر 30 يوم</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={recent}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="d" fontSize={11} stroke="#94a3b8" />
            <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="c" fill="hsl(221 83% 53%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
