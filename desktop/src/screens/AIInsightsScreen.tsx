import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  Package,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Forecast {
  id: string;
  name: string;
  current_stock: number;
  daily_avg: number;
  forecast_horizon: number;
  days_of_stock: number | null;
  suggested_order: number;
  status: "stockout" | "reorder" | "low" | "ok";
}

interface Anomaly {
  kind: string;
  severity: "high" | "medium" | "low" | "info";
  title: string;
  detail: string;
}

export function AIInsightsScreen() {
  const { user } = useAuth();
  const [forecast, setForecast] = useState<Forecast[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const [f, a] = await Promise.all([
        unwrap(api().ai.forecast({ tenantId: user.tenant_id, horizonDays: 14 })),
        unwrap(api().ai.anomalies({ tenantId: user.tenant_id, lookbackDays: 7 })),
      ]);
      setForecast((f as Forecast[]) ?? []);
      setAnomalies((a as Anomaly[]) ?? []);
    } finally {
      setBusy(false);
    }
  }, [user]);

  const ask = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await unwrap(api().ai.explain({
        tenantId: user.tenant_id,
        findings: anomalies,
        forecast,
      }));
      setExplanation(r.explanation);
      if (!r.explanation) toast.message("لم يتم إعداد مفتاح AI — الإحصائيات بدون تعليق ذكي.");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const needRestock = forecast.filter((f) => f.status === "stockout" || f.status === "reorder").length;
  const high = anomalies.filter((a) => a.severity === "high").length;
  const medium = anomalies.filter((a) => a.severity === "medium").length;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8" />
            <div>
              <h2 className="text-xl font-bold">رؤى ذكية للأعمال</h2>
              <p className="text-sm opacity-90">توقع الطلب على المنتجات + اكتشاف الشذوذ في العمليات</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={refresh} disabled={busy} variant="outline" className="bg-white/10 text-white border-white/30">
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
            <Button onClick={ask} disabled={busy || (anomalies.length === 0 && forecast.length === 0)} className="bg-white text-foreground hover:bg-white/90">
              <Lightbulb className="h-4 w-4" /> اقترح خطوات تنفيذية
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <KPI label="منتجات تحتاج طلبية" value={String(needRestock)} icon={<Package className="h-5 w-5" />} color="text-primary" />
        <KPI label="ملاحظات حرجة" value={String(high)} icon={<AlertTriangle className="h-5 w-5" />} color="text-destructive" />
        <KPI label="ملاحظات متوسطة" value={String(medium)} icon={<AlertTriangle className="h-5 w-5" />} color="text-[hsl(var(--warning))]" />
      </div>

      {explanation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> توصيات ذكية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{explanation}</div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="forecast">
        <TabsList>
          <TabsTrigger value="forecast">توقع الطلب</TabsTrigger>
          <TabsTrigger value="anomalies">تنبيهات وشذوذ</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          <Card className="p-0 overflow-hidden">
            <DataTable>
              <THead>
                <TR>
                  <TH>المنتج</TH>
                  <TH>المخزون الحالي</TH>
                  <TH>متوسط البيع اليومي</TH>
                  <TH>التوقع لـ 14 يوم</TH>
                  <TH>أيام المخزون</TH>
                  <TH>الطلبية المقترحة</TH>
                  <TH>الحالة</TH>
                </TR>
              </THead>
              <tbody>
                {forecast.length === 0 ? (
                  <TR><TD colSpan={7} className="text-center text-muted-foreground py-8">لا توجد بيانات كافية بعد — اعمل فواتير لمدة أسبوع لتظهر التوقعات.</TD></TR>
                ) : (
                  forecast.map((f) => (
                    <TR key={f.id}>
                      <TD className="font-medium">{f.name}</TD>
                      <TD className="tabular-nums">{f.current_stock}</TD>
                      <TD className="tabular-nums">{f.daily_avg}</TD>
                      <TD className="tabular-nums">{f.forecast_horizon}</TD>
                      <TD className="tabular-nums">{f.days_of_stock ?? "∞"}</TD>
                      <TD className="tabular-nums font-bold">{f.suggested_order > 0 ? f.suggested_order : "—"}</TD>
                      <TD>{statusBadge(f.status)}</TD>
                    </TR>
                  ))
                )}
              </tbody>
            </DataTable>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies">
          <Card className="p-0 overflow-hidden">
            {anomalies.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <TrendingUp className="h-8 w-8 mx-auto opacity-50 mb-2" />
                لا توجد ملاحظات — كل العمليات تبدو طبيعية 🎉
              </div>
            ) : (
              <div className="divide-y divide-border">
                {anomalies.map((a, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    {severityIcon(a.severity)}
                    <div className="flex-1">
                      <div className="font-semibold">{a.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{a.detail}</div>
                    </div>
                    {severityBadge(a.severity)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-lg bg-secondary flex items-center justify-center ${color}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function statusBadge(s: Forecast["status"]) {
  const m: Record<string, [string, any]> = {
    stockout: ["نفد", "destructive"],
    reorder: ["اطلب فورًا", "warning"],
    low: ["منخفض", "warning"],
    ok: ["مناسب", "success"],
  };
  const [l, v] = m[s] || [s, "muted"];
  return <Badge variant={v}>{l}</Badge>;
}

function severityIcon(s: Anomaly["severity"]) {
  if (s === "high") return <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />;
  if (s === "medium") return <AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))] shrink-0 mt-0.5" />;
  return <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />;
}

function severityBadge(s: Anomaly["severity"]) {
  const m: Record<string, [string, any]> = {
    high: ["حرج", "destructive"],
    medium: ["متوسط", "warning"],
    low: ["منخفض", "muted"],
    info: ["معلومة", "default"],
  };
  const [l, v] = m[s] || [s, "muted"];
  return <Badge variant={v}>{l}</Badge>;
}
