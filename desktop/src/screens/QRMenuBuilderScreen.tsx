import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  QrCode,
  Printer,
  Save,
  Globe,
  Download,
  Eye,
  Copy,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface TableQr {
  id: string;
  name: string;
  zone: string | null;
  seats: number;
  status: string;
  url: string;
  qr: string;
}

interface Cfg {
  base_url: string;
  show_prices: boolean;
  show_descriptions: boolean;
  show_calories: boolean;
  accent_color: string;
  hero_image: string;
  welcome_message: string;
}

export function QRMenuBuilderScreen() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [tables, setTables] = useState<TableQr[]>([]);
  const [generalQr, setGeneralQr] = useState<{ url: string; qr: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [c, t, g] = await Promise.all([
        unwrap(api().qrMenu.config(user.tenant_id)),
        unwrap(api().qrMenu.tables(user.tenant_id)),
        unwrap(api().qrMenu.general(user.tenant_id)),
      ]);
      setCfg(c as Cfg);
      setTables(t as TableQr[]);
      setGeneralQr(g as { url: string; qr: string });
    } catch (err) {
      console.warn(err);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async () => {
    if (!user || !cfg) return;
    setBusy(true);
    try {
      await unwrap(api().qrMenu.setConfig({ tenantId: user.tenant_id, patch: cfg as any }));
      toast.success("تم الحفظ");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("تم نسخ الرابط"));
  };

  const printSheet = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`
      <!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>طباعة بطاقات QR</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: 'Cairo', system-ui, sans-serif; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; }
        .card {
          border: 2px solid #1e40af; border-radius: 12px; padding: 16px;
          text-align: center; break-inside: avoid; page-break-inside: avoid;
        }
        .card .name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .card .zone { font-size: 12px; color: #64748b; margin-bottom: 12px; }
        .card .scan { font-size: 14px; margin-top: 12px; }
        .card img { width: 200px; height: 200px; }
      </style>
      </head><body>
      <div class="grid">
        ${tables.map((t) => `
          <div class="card">
            <div class="name">${t.name}</div>
            ${t.zone ? `<div class="zone">${t.zone} · ${t.seats} كراسي</div>` : ""}
            <img src="${t.qr}" alt="QR ${t.name}" />
            <div class="scan">امسح الكود لتصفّح القائمة والطلب</div>
          </div>
        `).join("")}
      </div>
      <script>setTimeout(() => window.print(), 400);</script>
      </body></html>
    `);
    w.document.close();
  };

  const downloadQr = (item: TableQr | { name: string; qr: string }) => {
    const a = document.createElement("a");
    a.href = (item as any).qr;
    a.download = `qr-${(item as any).name || "menu"}.png`;
    a.click();
  };

  if (!cfg) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> بناء مينيو بكود QR</CardTitle>
          <CardDescription className="text-primary-foreground/90">
            كل طاولة بتبقى ليها بطاقة QR — العميل بيمسحها بموبايله، يتصفّح المينيو، ويطلب مباشرة.
            الطلب بيظهر فورًا في شاشة المطبخ (KDS) ويتربط بالطاولة.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">إعدادات المينيو</TabsTrigger>
          <TabsTrigger value="tables">QR لكل طاولة ({tables.length})</TabsTrigger>
          <TabsTrigger value="general">QR عام (تيك أواي)</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> رابط الموقع العام</Label>
                  <Input
                    dir="ltr"
                    value={cfg.base_url}
                    onChange={(e) => setCfg({ ...cfg, base_url: e.target.value })}
                    className="mt-1.5 font-mono"
                    placeholder="https://menu.your-domain.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    العنوان اللي ينشر عليه موقع المتجر (Vercel/Netlify) — الـ QR هيوجّه العميل عليه.
                  </p>
                </div>
                <div>
                  <Label>صورة الـ Hero (URL)</Label>
                  <Input
                    dir="ltr"
                    value={cfg.hero_image}
                    onChange={(e) => setCfg({ ...cfg, hero_image: e.target.value })}
                    className="mt-1.5"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>رسالة الترحيب</Label>
                  <Input
                    value={cfg.welcome_message}
                    onChange={(e) => setCfg({ ...cfg, welcome_message: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Toggle label="عرض الأسعار في المينيو" value={cfg.show_prices} onChange={(v) => setCfg({ ...cfg, show_prices: v })} />
                <Toggle label="عرض الأوصاف" value={cfg.show_descriptions} onChange={(v) => setCfg({ ...cfg, show_descriptions: v })} />
                <Toggle label="عرض السعرات الحرارية" value={cfg.show_calories} onChange={(v) => setCfg({ ...cfg, show_calories: v })} />
              </div>

              <div className="flex gap-2">
                <Button onClick={save} disabled={busy}><Save className="h-4 w-4" /> حفظ الإعدادات</Button>
                <Button variant="outline" onClick={() => window.open(`${cfg.base_url}/menu/${user?.tenant_id ? "your-slug" : ""}`, "_blank")}>
                  <Eye className="h-4 w-4" /> معاينة المينيو
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tables">
          <div className="flex justify-end mb-3 gap-2">
            <Button onClick={printSheet} disabled={tables.length === 0}>
              <Printer className="h-4 w-4" /> طباعة كل البطاقات
            </Button>
          </div>

          {tables.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-3">لا توجد طاولات بعد.</p>
                <p className="text-xs text-muted-foreground">
                  ضيف طاولات من شاشة "طاولات المطعم" أو من واجهة البيع (وضع المطعم).
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {tables.map((t) => (
                <Card key={t.id} className="overflow-hidden">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="muted">{t.zone || "—"}</Badge>
                      <span className="text-xs text-muted-foreground">{t.seats} كراسي</span>
                    </div>
                    <h3 className="font-bold text-xl">{t.name}</h3>
                    <div className="bg-white p-2 rounded-lg my-3 mx-auto inline-block">
                      <img src={t.qr} alt={`QR ${t.name}`} className="w-44 h-44" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 break-all" dir="ltr">{t.url}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => copyUrl(t.url)}>
                        <Copy className="h-3.5 w-3.5" /> نسخ
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => downloadQr(t)}>
                        <Download className="h-3.5 w-3.5" /> تنزيل
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="general">
          {generalQr && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="inline-block mb-3">
                  <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                  <h3 className="font-bold text-lg">QR عام للمينيو</h3>
                  <p className="text-sm text-muted-foreground">للتيك أواي وخدمة الدلڤري — بدون ربط بطاولة.</p>
                </div>
                <div className="bg-white p-4 rounded-lg mx-auto inline-block my-3">
                  <img src={generalQr.qr} alt="QR Menu" className="w-72 h-72" />
                </div>
                <p className="text-sm text-muted-foreground mb-3 break-all" dir="ltr">{generalQr.url}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => copyUrl(generalQr.url)}>
                    <Copy className="h-4 w-4" /> نسخ الرابط
                  </Button>
                  <Button variant="outline" onClick={() => downloadQr({ name: "menu", qr: generalQr.qr })}>
                    <Download className="h-4 w-4" /> تنزيل QR
                  </Button>
                  <Button onClick={() => window.open(generalQr.url, "_blank")}>
                    <Eye className="h-4 w-4" /> فتح المينيو
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/40 cursor-pointer text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
