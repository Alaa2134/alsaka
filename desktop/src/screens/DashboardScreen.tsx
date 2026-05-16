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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

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

export function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      try {
        const data = await unwrap(api().db.dashboard({ tenantId: user.tenant_id }));
        if (!cancelled) setStats(data as Stats);
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

  return (
    <div className="space-y-6">
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
