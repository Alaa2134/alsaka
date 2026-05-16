import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Gateway {
  id: string;
  name: string;
  provider: string;
  surcharge_percent: number;
  is_active: number;
  config_json: string | null;
}

const PROVIDERS = [
  { value: "cod", label: "الدفع عند الاستلام (COD)" },
  { value: "paymob", label: "Paymob (بطاقات + موبايل ولت)" },
  { value: "fawry", label: "Fawry" },
  { value: "vodafone_cash", label: "فودافون كاش" },
  { value: "instapay", label: "InstaPay" },
  { value: "stripe", label: "Stripe (دولي)" },
  { value: "paypal", label: "PayPal" },
  { value: "bank_transfer", label: "تحويل بنكي" },
];

const HINTS: Record<string, string> = {
  paymob: '{"api_key":"sk_test_...","integration_id":12345,"hmac_secret":"...","iframe_id":"..."}',
  fawry: '{"merchant_code":"...","secure_key":"...","base_url":"https://atfawry.fawrystaging.com"}',
  stripe: '{"secret_key":"sk_test_...","webhook_secret":"whsec_..."}',
  paypal: '{"client_id":"...","client_secret":"..."}',
  vodafone_cash: '{"merchant_id":"...","secret":"..."}',
  instapay: '{"merchant_id":"...","secret":"..."}',
  cod: "{}",
  bank_transfer: '{"iban":"EG...","bank_name":"..."}',
};

export function PaymentGatewaysScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Gateway[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "الدفع عند الاستلام",
    provider: "cod",
    surcharge_percent: "0",
    config: "{}",
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<Gateway>("payment_gateways", { tenantId: user.tenant_id, limit: 100 }),
    );
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("اكتب اسم وسيلة الدفع");
      return;
    }
    if (form.config.trim()) {
      try {
        JSON.parse(form.config);
      } catch {
        toast.error("بيانات الإعداد يجب أن تكون JSON صحيح");
        return;
      }
    }
    try {
      await unwrap(
        api().db.insert("payment_gateways", {
          tenant_id: user.tenant_id,
          name: form.name.trim(),
          provider: form.provider,
          surcharge_percent: Number(form.surcharge_percent) || 0,
          config_json: form.config.trim() || null,
          is_active: 1,
        }),
      );
      toast.success("تم إضافة وسيلة الدفع");
      setOpen(false);
      setForm({ name: "", provider: "cod", surcharge_percent: "0", config: "{}" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف وسيلة الدفع؟")) return;
    await unwrap(api().db.remove("payment_gateways", id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">وسائل الدفع</h2>
            <p className="text-xs text-muted-foreground mt-1">
              للتفعيل الكامل اربط بيانات الـ API (مفتاح، Secret، HMAC) في خانة الإعدادات لكل وسيلة. الـ stubs الحالية تعمل لتجربة تدفق الـ checkout.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> إضافة وسيلة دفع
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>وسيلة دفع جديدة</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>الاسم المعروض</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>الموفّر</Label>
                  <select
                    value={form.provider}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        provider: e.target.value,
                        config: HINTS[e.target.value] || "{}",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>رسوم إضافية (%)</Label>
                  <Input value={form.surcharge_percent} onChange={(e) => setForm({ ...form, surcharge_percent: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>الإعدادات (JSON)</Label>
                  <textarea
                    rows={4}
                    dir="ltr"
                    className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm font-mono"
                    value={form.config}
                    onChange={(e) => setForm({ ...form, config: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    مفاتيح الـ API تُحفظ كما هي. تأكد أنك لا تشاركها مع أي شخص خارج فريقك.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit}>حفظ</Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable>
          <THead>
            <TR>
              <TH>الاسم</TH>
              <TH>الموفّر</TH>
              <TH>رسوم إضافية</TH>
              <TH>الحالة</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center text-muted-foreground py-8">
                  <CreditCard className="h-6 w-6 mx-auto mb-2 opacity-50" /> لا توجد وسائل دفع بعد.
                </TD>
              </TR>
            ) : (
              list.map((g) => (
                <TR key={g.id}>
                  <TD className="font-medium">{g.name}</TD>
                  <TD><Badge variant="muted">{g.provider}</Badge></TD>
                  <TD className="tabular-nums">{g.surcharge_percent}%</TD>
                  <TD>{g.is_active ? <Badge variant="success">مفعّل</Badge> : <Badge variant="muted">معطّل</Badge>}</TD>
                  <TD>
                    <button onClick={() => remove(g.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
