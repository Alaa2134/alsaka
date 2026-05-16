import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ExternalLink, Eye, EyeOff, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface StoreSettings {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  banner_image_url: string | null;
  primary_color: string;
  accent_color: string;
  currency: string;
  currency_symbol: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  working_hours: string | null;
  delivery_note: string | null;
  return_policy: string | null;
  privacy_policy: string | null;
  terms: string | null;
  is_published: number;
  track_inventory: number;
  allow_out_of_stock: number;
}

const PALETTE: Array<{ label: string; value: string }> = [
  { label: "أزرق (افتراضي)", value: "221 83% 53%" },
  { label: "بنفسجي", value: "262 83% 58%" },
  { label: "زمردي", value: "142 76% 36%" },
  { label: "كهرماني", value: "38 92% 50%" },
  { label: "وردي", value: "330 81% 60%" },
  { label: "أحمر", value: "0 84% 60%" },
  { label: "سماوي", value: "199 89% 48%" },
  { label: "بني", value: "25 47% 35%" },
];

export function StoreManagementScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    let s = await unwrap(api().store.getSettings(tenantId));
    if (!s) {
      s = await unwrap(api().store.ensureSettings({ tenantId, tenantName: "SystemAlaa" }));
    }
    setSettings(s as StoreSettings);
  }, [tenantId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  if (!settings) return null;

  const setField = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    try {
      const result = await unwrap(
        api().store.updateSettings({
          tenantId,
          patch: settings as unknown as Record<string, unknown>,
        }),
      );
      setSettings(result as StoreSettings);
      toast.success("تم الحفظ ✓");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async () => {
    setBusy(true);
    try {
      const next = settings.is_published ? 0 : 1;
      const r = await unwrap(
        api().store.updateSettings({ tenantId, patch: { is_published: next } }),
      );
      setSettings(r as StoreSettings);
      toast.success(next ? "تم نشر المتجر" : "تم إيقاف نشر المتجر");
    } finally {
      setBusy(false);
    }
  };

  const exportFeed = async () => {
    try {
      const r = await unwrap(api().store.exportFeed({ slug: settings.slug }));
      toast.success("تم تصدير المتجر إلى: " + r.path);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const primaryStyle = { backgroundColor: `hsl(${settings.primary_color})` } as React.CSSProperties;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>إدارة المتجر الإلكتروني</CardTitle>
              <CardDescription>
                رابط متجرك: <code className="font-mono text-foreground">/store/{settings.slug}</code>
                {settings.is_published ? (
                  <Badge variant="success" className="mr-2">منشور</Badge>
                ) : (
                  <Badge variant="warning" className="mr-2">غير منشور</Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={togglePublish} disabled={busy}>
                {settings.is_published ? (
                  <><EyeOff className="h-4 w-4" /> إخفاء</>
                ) : (
                  <><Eye className="h-4 w-4" /> نشر</>
                )}
              </Button>
              <Button variant="outline" onClick={exportFeed}>
                <Download className="h-4 w-4" /> تصدير
              </Button>
              <Button onClick={save} disabled={busy}>
                <Save className="h-4 w-4" /> حفظ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="brand">
            <TabsList>
              <TabsTrigger value="brand">الهوية والمظهر</TabsTrigger>
              <TabsTrigger value="contact">التواصل</TabsTrigger>
              <TabsTrigger value="policies">السياسات</TabsTrigger>
              <TabsTrigger value="inventory">المخزون</TabsTrigger>
            </TabsList>

            <TabsContent value="brand">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>اسم المتجر</Label>
                  <Input value={settings.name} onChange={(e) => setField("name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>الرابط (slug)</Label>
                  <Input dir="ltr" value={settings.slug} onChange={(e) => setField("slug", e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>الشعار</Label>
                  <Input value={settings.tagline || ""} onChange={(e) => setField("tagline", e.target.value)} placeholder="جملة قصيرة تحت اسم المتجر" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>الوصف</Label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm"
                    value={settings.description || ""}
                    onChange={(e) => setField("description", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>رابط اللوجو (URL)</Label>
                  <Input dir="ltr" value={settings.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>صورة الواجهة (Hero)</Label>
                  <Input dir="ltr" value={settings.hero_image_url || ""} onChange={(e) => setField("hero_image_url", e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>اللون الأساسي</Label>
                  <div className="flex flex-wrap gap-2">
                    {PALETTE.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setField("primary_color", p.value)}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all ${
                          settings.primary_color === p.value
                            ? "border-foreground shadow-glow"
                            : "border-border"
                        }`}
                      >
                        <span
                          className="h-5 w-5 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: `hsl(${p.value})` }}
                        />
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>العملة</Label>
                  <Input value={settings.currency} onChange={(e) => setField("currency", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>رمز العملة</Label>
                  <Input value={settings.currency_symbol} onChange={(e) => setField("currency_symbol", e.target.value)} />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 rounded-lg overflow-hidden border border-border">
                <div className="h-40 flex flex-col items-center justify-center text-white" style={primaryStyle}>
                  <div className="text-2xl font-bold">{settings.name}</div>
                  {settings.tagline && <div className="text-sm opacity-90 mt-1">{settings.tagline}</div>}
                </div>
                <div className="bg-card p-4 text-sm text-muted-foreground">
                  معاينة سريعة لشكل الواجهة (Hero) في المتجر
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="هاتف المتجر" value={settings.phone} onChange={(v) => setField("phone", v)} ltr />
                <Field label="بريد إلكتروني" value={settings.email} onChange={(v) => setField("email", v)} ltr />
                <Field label="رقم واتساب (مع كود الدولة)" value={settings.whatsapp_phone} onChange={(v) => setField("whatsapp_phone", v)} ltr />
                <Field label="العنوان" value={settings.address} onChange={(v) => setField("address", v)} />
                <Field label="ساعات العمل" value={settings.working_hours} onChange={(v) => setField("working_hours", v)} />
                <Field label="فيسبوك" value={settings.facebook_url} onChange={(v) => setField("facebook_url", v)} ltr />
                <Field label="إنستجرام" value={settings.instagram_url} onChange={(v) => setField("instagram_url", v)} ltr />
                <Field label="تيك توك" value={settings.tiktok_url} onChange={(v) => setField("tiktok_url", v)} ltr />
              </div>
            </TabsContent>

            <TabsContent value="policies">
              <div className="grid gap-4">
                <TextArea label="ملاحظات التسليم" value={settings.delivery_note} onChange={(v) => setField("delivery_note", v)} />
                <TextArea label="سياسة الإرجاع" value={settings.return_policy} onChange={(v) => setField("return_policy", v)} />
                <TextArea label="سياسة الخصوصية" value={settings.privacy_policy} onChange={(v) => setField("privacy_policy", v)} />
                <TextArea label="الشروط والأحكام" value={settings.terms} onChange={(v) => setField("terms", v)} />
              </div>
            </TabsContent>

            <TabsContent value="inventory">
              <div className="space-y-4 text-sm">
                <Toggle
                  label="تتبع المخزون"
                  description="إذا مفعّل، الكميات في المتجر تتطابق مع المخزن وتُخصم تلقائيًا بعد كل طلب."
                  value={!!settings.track_inventory}
                  onChange={(v) => setField("track_inventory", v ? 1 : 0)}
                />
                <Toggle
                  label="السماح بطلب منتج نفد منه المخزون"
                  description="يظهر المنتج للعميل حتى لو الكمية صفر — مناسب للطلب المسبق فقط."
                  value={!!settings.allow_out_of_stock}
                  onChange={(v) => setField("allow_out_of_stock", v ? 1 : 0)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  ltr,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  ltr?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input dir={ltr ? "ltr" : undefined} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea
        rows={3}
        className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border p-4 cursor-pointer hover:bg-secondary/40">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4"
      />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-1">{description}</div>
      </div>
    </label>
  );
}
