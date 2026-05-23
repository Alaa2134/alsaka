import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  FileText,
  Package,
  Users,
  AlertTriangle,
  ArrowRight,
  LineChart,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { WhatsAppInlineCard } from "@/components/shared/WhatsAppInlineCard";

interface Stats {
  salesToday: number;
  salesMonth: number;
  invoicesCount: number;
  productsCount: number;
  clientsCount: number;
  lowStock: Array<{ id: string; name: string; stock: number; min_stock: number }>;
  recentInvoices: Array<{
    id: string;
    number: number | null;
    total: number;
    paid: number;
    remaining: number;
    status: string;
    created_at: string;
  }>;
}

interface MiniReport {
  daily: Array<{ day: string; sales: number; invoices: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  headline: { estProfit: number };
}

export function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [report, setReport] = useState<MiniReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const [data, rep] = await Promise.all([
          unwrap(api().db.dashboard({ tenantId: user.tenant_id })),
          unwrap(api().db.salesReport({ tenantId: user.tenant_id, days: 14 })).catch(() => null),
        ]);
        if (!cancelled) {
          setStats(data as Stats);
          if (rep) setReport(rep as MiniReport);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <Spinner label="جاري تحميل لوحة التحكم..." />;
  if (!stats) return null;

  const tiles = [
    {
      label: "مبيعات اليوم",
      value: money(stats.salesToday),
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: "gradient-success",
    },
    {
      label: "مبيعات الشهر",
      value: money(stats.salesMonth),
      icon: <TrendingUp className="h-5 w-5" />,
      gradient: "gradient-primary",
    },
    {
      label: "الفواتير",
      value: stats.invoicesCount.toLocaleString(),
      icon: <FileText className="h-5 w-5" />,
      gradient: "gradient-primary",
    },
    {
      label: "المنتجات",
      value: stats.productsCount.toLocaleString(),
      icon: <Package className="h-5 w-5" />,
      gradient: "gradient-warning",
    },
    {
      label: "العملاء",
      value: stats.clientsCount.toLocaleString(),
      icon: <Users className="h-5 w-5" />,
      gradient: "gradient-primary",
    },
  ];

  // First-run guidance: show setup steps until the shop has products.
  const needsOnboarding = stats.productsCount === 0;

  return (
    <div className="space-y-6">
      {needsOnboarding && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">🚀 خطوات البداية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { n: 1, title: "بيانات محلك", desc: "الاسم واللوجو للفاتورة", to: "/company-settings" },
                { n: 2, title: "اختر ثيم نشاطك", desc: "ألوان + تصنيفات جاهزة", to: "/industry-templates" },
                { n: 3, title: "أضف منتجاتك", desc: "يدويًا أو استيراد ذكي بالـ AI", to: "/smart-import" },
                { n: 4, title: "أول فاتورة بيع", desc: "ابدأ تبيع فورًا", to: "/invoice" },
              ].map((step) => (
                <Link key={step.n} to={step.to} className="rounded-xl border border-border bg-card p-4 hover:shadow-elevated hover:border-primary transition-all">
                  <div className="h-8 w-8 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm mb-2">{step.n}</div>
                  <div className="font-semibold text-sm">{step.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <WhatsAppInlineCard />
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t, idx) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{t.value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-lg ${t.gradient} flex items-center justify-center text-primary-foreground`}>
                    {t.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Sales trend + top products */}
      {report && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><LineChart className="h-4 w-4" /> مبيعات آخر ١٤ يوم</CardTitle>
              <Link to="/reports" className="text-sm text-primary inline-flex items-center gap-1">
                التقارير <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              </Link>
            </CardHeader>
            <CardContent>
              {report.daily.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">لا توجد مبيعات بعد</p>
              ) : (
                <div className="flex items-end gap-1.5 h-36 pb-5 relative">
                  {(() => {
                    const max = Math.max(1, ...report.daily.map((d) => d.sales));
                    return report.daily.map((d) => (
                      <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <div
                          className="w-full rounded-t bg-primary/75 hover:bg-primary transition-all"
                          style={{ height: `${(d.sales / max) * 100}%` }}
                          title={`${d.day}: ${money(d.sales)}`}
                        />
                        <span className="absolute -bottom-5 text-[9px] text-muted-foreground tabular-nums">{d.day.slice(5)}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> الأكثر مبيعًا</CardTitle></CardHeader>
            <CardContent>
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">لا توجد بيانات</p>
              ) : (
                <ul className="space-y-2">
                  {report.topProducts.slice(0, 5).map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate">{i + 1}. {p.name}</span>
                      <span className="tabular-nums font-semibold shrink-0 mr-2 text-primary">{money(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">آخر الفواتير</CardTitle>
            <Link to="/invoices" className="text-sm text-primary inline-flex items-center gap-1">
              عرض الكل <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد فواتير بعد.</p>
            ) : (
              <ul className="divide-y divide-border">
                {stats.recentInvoices.map((inv) => (
                  <li key={inv.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">#{inv.number ?? inv.id.slice(0, 6)}</div>
                      <div className="text-xs text-muted-foreground">{arDate(inv.created_at)}</div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold tabular-nums">{money(inv.total)}</div>
                      <div className="text-xs">
                        {inv.remaining > 0 ? (
                          <span className="text-destructive">باقي {money(inv.remaining)}</span>
                        ) : (
                          <span className="text-[hsl(var(--success))]">مدفوعة</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
              تنبيهات المخزون
            </CardTitle>
            <Link to="/products" className="text-sm text-primary inline-flex items-center gap-1">
              المنتجات <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats.lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">المخزون كله بخير ✓</p>
            ) : (
              <ul className="space-y-2">
                {stats.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <Badge variant={p.stock <= 0 ? "destructive" : "warning"} className="tabular-nums">
                      المتاح {p.stock} / الحد {p.min_stock}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
