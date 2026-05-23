import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Save, Image as ImageIcon, Receipt, Phone, MapPin, Hash } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingRow { id: string; key: string; value: string | null; }

const FIELDS: Array<{ key: string; label: string; placeholder: string; icon: typeof Building2; dir?: "ltr" }> = [
  { key: "business_name", label: "اسم المحل / الشركة", placeholder: "مثلاً: سوبر ماركت النور", icon: Building2 },
  { key: "phone", label: "رقم التليفون", placeholder: "01000000000", icon: Phone, dir: "ltr" },
  { key: "address", label: "العنوان", placeholder: "المدينة، الشارع...", icon: MapPin },
  { key: "vat_number", label: "الرقم الضريبي (اختياري)", placeholder: "100000000000003", icon: Hash, dir: "ltr" },
  { key: "business_logo", label: "رابط اللوجو (اختياري)", placeholder: "https://...", icon: ImageIcon, dir: "ltr" },
  { key: "receipt_footer", label: "رسالة أسفل الفاتورة", placeholder: "شكرًا لتعاملكم معنا 🌟", icon: Receipt },
];

export function CompanySettingsScreen() {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [ids, setIds] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const rows = await unwrap(api().db.list<SettingRow>("company_settings", { tenantId: user.tenant_id, limit: 500 }));
        const v: Record<string, string> = {};
        const idMap: Record<string, string> = {};
        for (const r of rows || []) { v[r.key] = r.value || ""; idMap[r.key] = r.id; }
        setValues(v);
        setIds(idMap);
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const f of FIELDS) {
        const val = values[f.key] ?? "";
        if (ids[f.key]) {
          await unwrap(api().db.update("company_settings", ids[f.key], { value: val }));
        } else if (val.trim()) {
          const created = await unwrap(
            api().db.insert<SettingRow>("company_settings", { tenant_id: user.tenant_id, key: f.key, value: val }),
          );
          if (created?.id) setIds((m) => ({ ...m, [f.key]: created.id }));
        }
      }
      toast.success("تم حفظ بيانات الشركة — هتظهر في الفواتير المطبوعة");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="p-6 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> إعدادات الشركة</CardTitle>
          <CardDescription className="text-primary-foreground/90">
            البيانات دي بتظهر في أعلى وأسفل كل فاتورة مطبوعة وفي المتجر الإلكتروني.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-6 grid gap-4 md:grid-cols-2">
          {FIELDS.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.key} className={f.key === "address" || f.key === "receipt_footer" ? "md:col-span-2" : ""}>
                <Label className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {f.label}</Label>
                <Input
                  dir={f.dir}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Live receipt header preview */}
      <Card>
        <CardHeader><CardTitle className="text-base">معاينة رأس الفاتورة</CardTitle></CardHeader>
        <CardContent>
          <div className="mx-auto w-[280px] bg-white text-black rounded-lg border p-4 text-center" dir="rtl">
            {values.business_logo ? (
              <img src={values.business_logo} alt="" className="h-12 mx-auto mb-2 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            ) : null}
            <div className="font-bold text-lg">{values.business_name || "اسم المحل"}</div>
            {values.address ? <div className="text-xs">{values.address}</div> : null}
            {values.phone ? <div className="text-xs" dir="ltr">{values.phone}</div> : null}
            {values.vat_number ? <div className="text-xs">رقم ضريبي: {values.vat_number}</div> : null}
            <div className="border-t border-dashed border-black my-2" />
            <div className="text-xs text-gray-500">— نموذج —</div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} size="lg">
        <Save className="h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ البيانات"}
      </Button>
    </div>
  );
}
