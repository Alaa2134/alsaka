import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ShieldCheck, FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { money, arDate } from "@/lib/format";

const FIELDS: Array<{ key: string; label: string; hint?: string; isSecret?: boolean; isTextarea?: boolean }> = [
  { key: "zatca.mode", label: "البيئة", hint: "sandbox أو production" },
  { key: "zatca.vat_number", label: "الرقم الضريبي (VAT 15 رقم)" },
  { key: "zatca.cr_number", label: "السجل التجاري (CR)" },
  { key: "zatca.csid", label: "CSID (Cryptographic Stamp ID)", isSecret: true },
  { key: "zatca.cert_pem", label: "X.509 Certificate (PEM)", isTextarea: true },
  { key: "zatca.private_key_pem", label: "Private Key (PEM)", isTextarea: true, isSecret: true },
];

export function ZatcaPhase2Screen() {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const out: Record<string, string> = {};
    for (const f of FIELDS) {
      try {
        const r = await unwrap(api().zatcaPhase2.getSetting({ tenantId: user.tenant_id, key: f.key }));
        out[f.key] = r.value || "";
      } catch { /* ignore */ }
    }
    setValues(out);
    try {
      const s = await unwrap(api().zatcaPhase2.list({ tenantId: user.tenant_id, limit: 50 }));
      setList(s ?? []);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      for (const f of FIELDS) {
        await unwrap(api().zatcaPhase2.setSetting({ tenantId: user.tenant_id, key: f.key, value: values[f.key] || "" }));
      }
      toast.success("تم الحفظ");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> ZATCA Phase 2 (المملكة العربية السعودية)</CardTitle>
          <CardDescription>
            تكامل فاتورة ZATCA مع الـ Clearance / Reporting API. ارفع شهادتك المُصدَرة من بوابة ZATCA لتفعيل التوقيع التلقائي.
            <a href="https://zatca.gov.sa/ar/E-Invoicing" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 mr-2">
              <ExternalLink className="h-3 w-3" /> بوابة ZATCA
            </a>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          <TabsTrigger value="submissions">السجل ({list.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardContent className="p-6 space-y-3">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  {f.isTextarea ? (
                    <textarea
                      dir="ltr"
                      rows={4}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm font-mono mt-1.5"
                    />
                  ) : (
                    <Input
                      dir="ltr"
                      type={f.isSecret ? "password" : "text"}
                      value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="mt-1.5 font-mono"
                    />
                  )}
                  {f.hint && <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>}
                </div>
              ))}
              <Button onClick={save} disabled={busy}><Save className="h-4 w-4" /> حفظ</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card className="p-0 overflow-hidden">
            <DataTable>
              <THead>
                <TR><TH>التاريخ</TH><TH>الفاتورة</TH><TH>الإجمالي</TH><TH>النوع</TH><TH>الحالة</TH><TH>UUID</TH></TR>
              </THead>
              <tbody>
                {list.length === 0 ? (
                  <TR><TD colSpan={6} className="text-center text-muted-foreground py-8">
                    <FileText className="h-6 w-6 mx-auto opacity-50 mb-2" /> لا توجد ملفات مرسلة بعد.
                  </TD></TR>
                ) : (
                  list.map((s) => (
                    <TR key={s.id}>
                      <TD>{arDate(s.created_at)}</TD>
                      <TD>#{s.invoice_number}</TD>
                      <TD className="tabular-nums">{money(s.invoice_total)}</TD>
                      <TD>{s.kind === "standard" ? "قياسية" : "مبسطة"}</TD>
                      <TD>
                        <Badge variant={s.clearance_status === "cleared" ? "success" : s.clearance_status === "rejected" ? "destructive" : "warning"}>
                          {s.clearance_status}
                        </Badge>
                      </TD>
                      <TD className="text-xs font-mono">{s.cleared_uuid?.slice(0, 12) || "—"}</TD>
                    </TR>
                  ))
                )}
              </tbody>
            </DataTable>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
