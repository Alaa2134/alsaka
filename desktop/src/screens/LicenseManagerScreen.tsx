import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Plus, Copy, Ban, Search, BadgeDollarSign, Users, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Issued {
  id: string;
  license_key: string;
  tier: string;
  expiry: string;
  customer_name: string | null;
  customer_phone: string | null;
  price: number;
  status: string;
  issued_at: string;
}

const TIERS = ["BASIC", "PRO", "ELITE"];
const MONTHS = [1, 3, 6, 12, 24, 36];

function fmtExpiry(yyyymmdd: string) {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function LicenseManagerScreen() {
  const { user } = useAuth();
  const [tier, setTier] = useState("PRO");
  const [months, setMonths] = useState(12);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [price, setPrice] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [list, setList] = useState<Issued[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number; revoked: number; revenue: number } | null>(null);
  const [q, setQ] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [rows, st] = await Promise.all([
        unwrap(api().licensing.listIssued({ limit: 1000 })),
        unwrap(api().licensing.issuerStats()),
      ]);
      setList(rows || []);
      setStats(st);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const issue = async () => {
    setIssuing(true);
    try {
      const res = await unwrap(api().licensing.issueRecord({
        tier, months,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        price: Number(price) || 0,
      }));
      setLastKey(res.key);
      toast.success("تم إصدار المفتاح — انسخه وابعته للعميل");
      setCustomerName(""); setCustomerPhone(""); setPrice("");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setIssuing(false);
    }
  };

  const copy = (key: string) => {
    navigator.clipboard.writeText(key).then(() => toast.success("تم النسخ"));
  };

  const revoke = async (key: string) => {
    if (!confirm("إلغاء هذا الترخيص؟ العميل لن يقدر يفعّل بيه بعد كده (يتطلب اتصال السيرفر).")) return;
    await unwrap(api().licensing.revokeIssued({ licenseKey: key }));
    refresh();
  };

  const filtered = list.filter((l) => {
    const n = q.trim().toLowerCase();
    if (!n) return true;
    return l.license_key.toLowerCase().includes(n) || (l.customer_name || "").toLowerCase().includes(n) || (l.customer_phone || "").includes(n);
  });

  if (user?.role !== "system_manager" && user?.role !== "company_admin" && user?.role !== "admin") {
    return <div className="p-6 text-muted-foreground">هذه الشاشة للبائع فقط.</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> إدارة وبيع التراخيص</CardTitle>
          <CardDescription className="text-white/90">
            أصدر مفتاح ترخيص لكل عميل تبيع له. كل مفتاح موقّع وآمن، ويُربط بجهاز واحد فقط عند التفعيل.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "إجمالي المفاتيح", value: String(stats.total), icon: KeyRound },
            { label: "نشطة", value: String(stats.active), icon: ShieldCheck },
            { label: "ملغاة", value: String(stats.revoked), icon: Ban },
            { label: "الإيراد", value: money(stats.revenue), icon: BadgeDollarSign },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}><CardContent className="p-4">
                <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{s.label}</span><Icon className="h-4 w-4 text-primary" /></div>
                <div className="text-xl font-bold tabular-nums mt-1">{s.value}</div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      {/* Issue form */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> إصدار مفتاح جديد</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>الباقة</Label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full h-10 rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm">
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>المدة (شهور)</Label>
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full h-10 rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm">
                {MONTHS.map((m) => <option key={m} value={m}>{m} شهر</option>)}
              </select>
            </div>
            <div><Label>اسم العميل</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="اختياري" /></div>
            <div><Label>السعر المدفوع</Label><Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>موبايل العميل</Label><Input dir="ltr" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="اختياري" /></div>
            <div className="flex items-end">
              <Button onClick={issue} disabled={issuing} className="w-full">
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} إصدار المفتاح
              </Button>
            </div>
          </div>

          {lastKey && (
            <div className="rounded-lg border border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/5 p-3">
              <div className="text-xs text-muted-foreground mb-1">المفتاح الجديد — انسخه وابعته للعميل:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm break-all bg-card px-3 py-2 rounded border border-border" dir="ltr">{lastKey}</code>
                <Button size="sm" onClick={() => copy(lastKey)}><Copy className="h-4 w-4" /> نسخ</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issued list */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> المفاتيح المُصدَرة ({filtered.length})</CardTitle>
          <div className="relative w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث..." className="pr-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">لا توجد مفاتيح بعد.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs truncate" dir="ltr">{l.license_key}</code>
                      <Badge variant={l.status === "active" ? "success" : "destructive"} className="shrink-0 text-[10px]">{l.status === "active" ? "نشط" : "ملغى"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {l.customer_name || "—"} {l.customer_phone ? `· ${l.customer_phone}` : ""} · {l.tier} · ينتهي {fmtExpiry(l.expiry)} {l.price ? `· ${money(l.price)}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => copy(l.license_key)} className="p-1.5 rounded hover:bg-secondary" title="نسخ"><Copy className="h-4 w-4" /></button>
                    {l.status === "active" && (
                      <button onClick={() => revoke(l.license_key)} className="p-1.5 rounded text-destructive hover:bg-destructive/10" title="إلغاء"><Ban className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
