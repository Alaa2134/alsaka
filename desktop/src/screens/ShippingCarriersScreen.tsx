import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Carrier {
  id: string;
  name: string;
  provider: string;
  flat_rate: number;
  free_above: number | null;
  estimated_days: number | null;
  is_active: number;
  config_json: string | null;
}

const PROVIDERS = [
  { value: "aramex", label: "أرامكس" },
  { value: "bosta", label: "Bosta" },
  { value: "jnt", label: "J&T Express" },
  { value: "mylerz", label: "Mylerz" },
  { value: "fedex", label: "FedEx" },
  { value: "custom", label: "مخصص (سعر ثابت)" },
];

export function ShippingCarriersScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Carrier[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    provider: "custom",
    flat_rate: "50",
    free_above: "",
    estimated_days: "3",
    config: "{}",
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<Carrier>("shipping_carriers", { tenantId: user.tenant_id, limit: 100 }),
    );
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("اكتب اسم شركة الشحن");
      return;
    }
    let config = null;
    if (form.config.trim()) {
      try {
        JSON.parse(form.config);
        config = form.config;
      } catch {
        toast.error("بيانات الإعداد يجب أن تكون JSON صحيح");
        return;
      }
    }
    try {
      await unwrap(
        api().db.insert("shipping_carriers", {
          tenant_id: user.tenant_id,
          name: form.name.trim(),
          provider: form.provider,
          flat_rate: Number(form.flat_rate) || 0,
          free_above: form.free_above ? Number(form.free_above) : null,
          estimated_days: form.estimated_days ? Number(form.estimated_days) : null,
          config_json: config,
          is_active: 1,
        }),
      );
      toast.success("تم إضافة الشركة");
      setOpen(false);
      setForm({ name: "", provider: "custom", flat_rate: "50", free_above: "", estimated_days: "3", config: "{}" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف شركة الشحن؟")) return;
    await unwrap(api().db.remove("shipping_carriers", id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">شركات الشحن</h2>
            <p className="text-xs text-muted-foreground mt-1">
              ضع بيانات الـ API (المفاتيح) في حقل الإعدادات لكل شركة، والتطبيق هيحسب التكلفة تلقائيًا في الـ checkout.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> إضافة شركة شحن
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>شركة شحن جديدة</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>الاسم المعروض</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="شحن داخل القاهرة" />
                </div>
                <div className="space-y-1.5">
                  <Label>الموفّر</Label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>السعر الثابت</Label>
                  <Input value={form.flat_rate} onChange={(e) => setForm({ ...form, flat_rate: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>شحن مجاني فوق</Label>
                  <Input value={form.free_above} onChange={(e) => setForm({ ...form, free_above: e.target.value })} placeholder="مثل: 500" />
                </div>
                <div className="space-y-1.5">
                  <Label>مدة التسليم بالأيام</Label>
                  <Input value={form.estimated_days} onChange={(e) => setForm({ ...form, estimated_days: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>الإعدادات (JSON)</Label>
                  <textarea
                    rows={4}
                    dir="ltr"
                    className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm font-mono"
                    value={form.config}
                    onChange={(e) => setForm({ ...form, config: e.target.value })}
                    placeholder='{"api_key":"...","account":"..."}'
                  />
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
              <TH>السعر</TH>
              <TH>مجاني فوق</TH>
              <TH>مدة التسليم</TH>
              <TH>الحالة</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR>
                <TD colSpan={7} className="text-center text-muted-foreground py-8">
                  <Truck className="h-6 w-6 mx-auto mb-2 opacity-50" /> لا توجد شركات شحن بعد.
                </TD>
              </TR>
            ) : (
              list.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD><Badge variant="muted">{c.provider}</Badge></TD>
                  <TD className="tabular-nums">{money(c.flat_rate)}</TD>
                  <TD className="tabular-nums">{c.free_above != null ? money(c.free_above) : "—"}</TD>
                  <TD className="tabular-nums">{c.estimated_days ? `${c.estimated_days} يوم` : "—"}</TD>
                  <TD>{c.is_active ? <Badge variant="success">مفعّل</Badge> : <Badge variant="muted">معطّل</Badge>}</TD>
                  <TD>
                    <button onClick={() => remove(c.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
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
