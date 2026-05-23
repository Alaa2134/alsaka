import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  LineChart,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Trophy,
  Download,
  RefreshCw,
  Banknote,
  CreditCard,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Report {
  days: number;
  headline: { sales: number; collected: number; outstanding: number; invoices: number; estProfit: number };
  daily: Array<{ day: string; invoices: number; sales: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  byPayment: Array<{ method: string; invoices: number; sales: number }>;
  lowStock: Array<{ id: string; name: string; stock: number; min_stock: number }>;
}

const RANGES = [7, 30, 90];
const PAY_META: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: "كاش", icon: Banknote },
  card: { label: "فيزا/شبكة", icon: CreditCard },
  wallet: { label: "محفظة", icon: Wallet },
  credit: { label: "آجل", icon: Clock },
};

export function ReportsScreen() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await unwrap(api().db.salesReport({ tenantId: user.tenant_id, days }));
      setData(res as Report);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setLoading(false);
    }
  }, [user, days]);

  useEffect(() => { refresh(); }, [refresh]);

  const exportCsv = () => {
    if (!data) return;
    const lines = ["اليوم,عدد الفواتير,المبيعات"];
    for (const d of data.daily) lines.push(`${d.day},${d.invoices},${d.sales}`);
    lines.push("", "أفضل المنتجات,الكمية,الإيراد");
    for (const p of data.topProducts) lines.push(`${p.name.replace(/,/g, " ")},${p.qty},${p.revenue}`);
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horus-report-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxSales = data ? Math.max(1, ...data.daily.map((d) => d.sales)) : 1;
  const maxProductRev = data ? Math.max(1, ...data.topProducts.map((p) => p.revenue)) : 1;
  const totalPay = data ? Math.max(1, data.byPayment.reduce((s, p) => s + p.sales, 0)) : 1;

  return (
    <div className="space-y-4">
      {/* Header + range selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              className={`px-3 h-9 rounded-md text-sm border transition-colors ${
                days === r ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary border-border"
              }`}
            >
              آخر {r} يوم
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data}>
            <Download className="h-4 w-4" /> تصدير CSV
          </Button>
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "المبيعات", value: money(data?.headline.sales || 0), icon: TrendingUp, tone: "text-primary" },
          { label: "المُحصّل", value: money(data?.headline.collected || 0), icon: Wallet, tone: "text-[hsl(var(--success))]" },
          { label: "المتبقي (آجل)", value: money(data?.headline.outstanding || 0), icon: Clock, tone: "text-amber-500" },
          { label: "الربح التقديري", value: money(data?.headline.estProfit || 0), icon: Trophy, tone: "text-violet-500" },
          { label: "عدد الفواتير", value: String(data?.headline.invoices || 0), icon: LineChart, tone: "text-foreground" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <Icon className={`h-4 w-4 ${k.tone}`} />
                </div>
                <div className={`text-xl font-bold tabular-nums mt-1 ${k.tone}`}>{k.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily sales bar chart */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><LineChart className="h-4 w-4" /> المبيعات اليومية</CardTitle></CardHeader>
        <CardContent>
          {!data || data.daily.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد مبيعات في هذه الفترة</p>
          ) : (
            <div className="flex items-end gap-1 h-44 overflow-x-auto pb-6 relative">
              {data.daily.map((d) => (
                <div key={d.day} className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group relative">
                  <div
                    className="w-full rounded-t bg-primary/80 hover:bg-primary transition-all"
                    style={{ height: `${(d.sales / maxSales) * 100}%` }}
                    title={`${d.day}: ${money(d.sales)} (${d.invoices} فاتورة)`}
                  />
                  <span className="absolute -bottom-5 text-[9px] text-muted-foreground rotate-0 tabular-nums">
                    {d.day.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> أفضل المنتجات مبيعًا</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!data || data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            ) : (
              data.topProducts.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{i + 1}. {p.name}</span>
                    <span className="tabular-nums font-semibold shrink-0 mr-2">{money(p.revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(p.revenue / maxProductRev) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Payment method split */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> المبيعات حسب طريقة الدفع</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!data || data.byPayment.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p>
            ) : (
              data.byPayment.map((p) => {
                const meta = PAY_META[p.method] || { label: p.method, icon: Banknote };
                const Icon = meta.icon;
                const pct = Math.round((p.sales / totalPay) * 100);
                return (
                  <div key={p.method} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {meta.label}</span>
                      <span className="tabular-nums"><b>{money(p.sales)}</b> · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low stock */}
      {data && data.lowStock.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-amber-600"><AlertTriangle className="h-4 w-4" /> أصناف وصلت حد الطلب ({data.lowStock.length})</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.lowStock.map((s) => (
              <div key={s.id} className="flex justify-between items-center text-sm px-3 py-2 rounded-lg bg-secondary/50">
                <span className="truncate">{s.name}</span>
                <span className="tabular-nums text-amber-600 shrink-0 mr-2">{s.stock} / {s.min_stock}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
