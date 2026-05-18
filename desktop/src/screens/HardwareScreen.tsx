import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus, Trash2, Power, Banknote, CreditCard, Scale, Tag as TagIcon,
  CheckCircle2, AlertTriangle, Send,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Device {
  id: string;
  kind: "cash_drawer" | "card_terminal" | "scale" | "label_printer";
  name: string;
  provider: string;
  interface: string;
  config_json: string | null;
  is_default: number;
  is_active: number;
}

const KIND_META: Record<string, { label: string; icon: any; providers: string[]; hint: string }> = {
  cash_drawer: { label: "درج النقدية", icon: Banknote, providers: ["escpos", "custom"],
    hint: "أدخل tcp://IP:9100 لو الدرج مربوط بطابعة شبكة، أو file:/dev/usb/lp0 على لينكس." },
  card_terminal: { label: "ماكينة الدفع", icon: CreditCard, providers: ["ingenico", "verifone", "custom"],
    hint: "بروتوكول TCP/IP — tcp://192.168.x.y:6000. يمكنك تخصيص الشكل في config_json." },
  scale: { label: "ميزان", icon: Scale, providers: ["mettler", "bizerba", "custom"],
    hint: "Mettler-Toledo SICS عبر Serial-to-TCP bridge. tcp://192.168.x.y:8001" },
  label_printer: { label: "طابعة باركود", icon: TagIcon, providers: ["zebra", "custom"],
    hint: "Zebra ZPL II عبر TCP. مثال tcp://192.168.x.y:9100" },
};

export function HardwareScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<keyof typeof KIND_META>("cash_drawer");
  const [list, setList] = useState<Device[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "", interface: "", config_json: "{}", is_default: true });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(api().hardware.list({ tenantId: user.tenant_id, kind: tab }));
    setList((data as Device[]) ?? []);
  }, [user, tab]);

  useEffect(() => { refresh().catch(() => undefined); }, [refresh]);

  const submit = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.interface.trim()) {
      toast.error("اكتب الاسم و عنوان الجهاز");
      return;
    }
    try { JSON.parse(form.config_json || "{}"); } catch { toast.error("config_json غير صحيح"); return; }
    setBusy(true);
    try {
      await unwrap(api().hardware.save({
        tenantId: user.tenant_id,
        kind: tab,
        name: form.name.trim(),
        provider: form.provider || KIND_META[tab].providers[0],
        interface: form.interface.trim(),
        config_json: form.config_json,
        is_default: form.is_default ? 1 : 0,
        is_active: 1,
      }));
      toast.success("تم الحفظ");
      setOpen(false);
      setForm({ name: "", provider: "", interface: "", config_json: "{}", is_default: true });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally { setBusy(false); }
  };

  const test = async (id: string) => {
    if (!user) return;
    try {
      if (tab === "cash_drawer") {
        const r = await unwrap(api().hardware.openDrawer({ tenantId: user.tenant_id }));
        r.ok ? toast.success("تم فتح الدرج ✓") : toast.error(r.error || "فشل");
      } else if (tab === "card_terminal") {
        const r = await unwrap(api().hardware.chargeCard({ tenantId: user.tenant_id, amountSar: 1, reference: "TEST" }));
        r.ok ? toast.success("تواصل ناجح: " + (r.approval_code || "OK")) : toast.error(r.error || "فشل");
      } else if (tab === "scale") {
        const r = await unwrap(api().hardware.readWeight({ tenantId: user.tenant_id }));
        r.ok ? toast.success(`الوزن: ${r.weight_kg} كجم`) : toast.error(r.error || "فشل");
      } else if (tab === "label_printer") {
        const zplResp = await unwrap(api().hardware.buildZpl({ name: "منتج تجريبي", barcode: "1234567890123", priceText: "100.00" }));
        const r = await unwrap(api().hardware.printLabel({ tenantId: user.tenant_id, zpl: zplResp.zpl }));
        r.ok ? toast.success("تم إرسال الطباعة ✓") : toast.error(r.error || "فشل");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الجهاز؟")) return;
    await unwrap(api().hardware.remove({ id }));
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <CardHeader>
          <CardTitle>ربط الأجهزة (Hardware)</CardTitle>
          <CardDescription className="text-primary-foreground/90">
            درج النقدية + ماكينة الدفع + الميزان + طابعة الباركود — كل بروتوكولاتها مدعومة بدون SDK خارجي.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as keyof typeof KIND_META)}>
        <TabsList className="w-full">
          {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => {
            const M = KIND_META[k];
            const Icon = M.icon;
            return (
              <TabsTrigger key={k} value={k} className="flex-1 gap-2">
                <Icon className="h-4 w-4" /> {M.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((k) => (
          <TabsContent key={k} value={k}>
            <div className="flex justify-end mb-3">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setForm({ ...form, provider: KIND_META[k].providers[0] })}>
                    <Plus className="h-4 w-4" /> إضافة {KIND_META[k].label}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{KIND_META[k].label} جديد</DialogTitle></DialogHeader>
                  <div className="grid gap-3">
                    <div>
                      <Label>الاسم</Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>الموفّر</Label>
                      <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}
                              className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm mt-1.5">
                        {KIND_META[k].providers.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>عنوان الجهاز</Label>
                      <Input dir="ltr" value={form.interface} onChange={(e) => setForm({ ...form, interface: e.target.value })}
                             placeholder="tcp://192.168.1.10:9100" className="mt-1.5 font-mono" />
                      <p className="text-xs text-muted-foreground mt-1">{KIND_META[k].hint}</p>
                    </div>
                    <div>
                      <Label>الإعدادات (JSON)</Label>
                      <textarea dir="ltr" rows={3} value={form.config_json}
                                onChange={(e) => setForm({ ...form, config_json: e.target.value })}
                                className="flex w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] p-3 text-sm font-mono mt-1.5" />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                      تعيين كافتراضي
                    </label>
                  </div>
                  <DialogFooter>
                    <Button onClick={submit} disabled={busy}>حفظ</Button>
                    <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {list.length === 0 ? (
              <Card><CardContent className="text-center py-12 text-muted-foreground">لا توجد {KIND_META[k].label}.</CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold">{d.name}</h3>
                        <div className="flex gap-1">
                          {d.is_default ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> افتراضي</Badge> : null}
                          {d.is_active ? <Badge variant="muted">نشط</Badge> : <Badge variant="warning">متوقف</Badge>}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="muted">{d.provider}</Badge>
                        <code dir="ltr" className="font-mono ml-2">{d.interface}</code>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => test(d.id)} className="flex-1">
                          <Send className="h-4 w-4" /> اختبار
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
