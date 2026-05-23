import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Server, Power, Copy } from "lucide-react";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface State { listening: boolean; port: number }

const ENDPOINTS = [
  { method: "GET", path: "/health", auth: false, desc: "فحص حالة السيرفر" },
  { method: "GET", path: "/v1/store/:slug", auth: false, desc: "بيانات المتجر العامة (للمتجر الإلكتروني)" },
  { method: "POST", path: "/v1/orders", auth: false, desc: "إنشاء طلب من المتجر" },
  { method: "GET", path: "/v1/products", auth: true, desc: "قائمة المنتجات" },
  { method: "GET", path: "/v1/clients", auth: true, desc: "قائمة العملاء" },
  { method: "GET", path: "/v1/invoices", auth: true, desc: "قائمة الفواتير" },
  { method: "POST", path: "/v1/invoices", auth: true, desc: "إنشاء فاتورة (يتطلب scope: write)" },
  { method: "GET", path: "/v1/dashboard", auth: true, desc: "إحصائيات لوحة التحكم" },
];

export function ApiServerScreen() {
  const [s, setS] = useState<State | null>(null);

  const refresh = useCallback(async () => {
    try { setS(await unwrap(api().apiServer.state())); } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async () => {
    try {
      if (s?.listening) {
        await unwrap(api().apiServer.stop());
        toast.success("تم إيقاف السيرفر");
      } else {
        await unwrap(api().apiServer.start());
        toast.success("تم تشغيل السيرفر");
      }
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const base = s ? `http://127.0.0.1:${s.port}` : "";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> REST API Server</CardTitle>
            {s?.listening ? (
              <Badge variant="success">يعمل · المنفذ {s.port}</Badge>
            ) : (
              <Badge variant="muted">متوقف</Badge>
            )}
          </div>
          <CardDescription>
            سيرفر REST مدمج بيخلي تطبيقاتك التانية (موبايل، تكاملات، شركاء توصيل) تقرأ وتكتب في النظام.
            استخدم مفاتيح API من شاشة "مفاتيح API" للتوثيق.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button onClick={toggle}>
              <Power className="h-4 w-4" /> {s?.listening ? "إيقاف" : "تشغيل"}
            </Button>
            {s?.listening && (
              <code className="font-mono text-sm bg-secondary px-3 py-2 rounded-md flex items-center gap-2">
                {base}
                <button onClick={() => navigator.clipboard.writeText(base).then(() => toast.success("تم النسخ"))}>
                  <Copy className="h-3 w-3" />
                </button>
              </code>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            مثال للتجربة (curl):
            <code className="block mt-2 bg-card border border-border rounded p-2 font-mono ltr-text" dir="ltr">
              curl {base}/v1/dashboard -H "Authorization: Bearer YOUR_API_KEY"
            </code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Endpoints متاحة</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {ENDPOINTS.map((e) => (
            <div key={`${e.method} ${e.path}`} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/40 font-mono text-sm" dir="ltr">
              <Badge variant={e.method === "GET" ? "success" : "default"}>{e.method}</Badge>
              <code>{e.path}</code>
              <span className="text-muted-foreground text-xs mr-auto font-cairo" dir="rtl">{e.desc}</span>
              {e.auth && <Badge variant="warning">يتطلب مفتاح</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
