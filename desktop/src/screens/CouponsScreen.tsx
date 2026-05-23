import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Ticket } from "lucide-react";
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

interface Coupon {
  id: string;
  code: string;
  kind: "percent" | "fixed" | "free_shipping";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  usage_limit: number | null;
  times_used: number;
  ends_at: string | null;
  is_active: number;
}

const KIND_LABEL: Record<string, string> = {
  percent: "نسبة %",
  fixed: "مبلغ ثابت",
  free_shipping: "شحن مجاني",
};

export function CouponsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    kind: "percent",
    value: "10",
    min_subtotal: "0",
    max_discount: "",
    usage_limit: "",
    ends_at: "",
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<Coupon>("coupons", { tenantId: user.tenant_id, limit: 500 }),
    );
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    if (!form.code.trim()) {
      toast.error("اكتب كود الكوبون");
      return;
    }
    try {
      await unwrap(
        api().db.insert("coupons", {
          tenant_id: user.tenant_id,
          code: form.code.trim().toUpperCase(),
          kind: form.kind,
          value: Number(form.value) || 0,
          min_subtotal: Number(form.min_subtotal) || 0,
          max_discount: form.max_discount ? Number(form.max_discount) : null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          ends_at: form.ends_at || null,
        }),
      );
      toast.success("تم إنشاء الكوبون");
      setOpen(false);
      setForm({ code: "", kind: "percent", value: "10", min_subtotal: "0", max_discount: "", usage_limit: "", ends_at: "" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الكوبون؟")) return;
    await unwrap(api().db.remove("coupons", id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> كوبون جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>كوبون خصم</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>الكود</Label>
                <Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME10" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>النوع</Label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm"
                >
                  <option value="percent">نسبة %</option>
                  <option value="fixed">مبلغ ثابت</option>
                  <option value="free_shipping">شحن مجاني</option>
                </select>
              </div>
              {form.kind !== "free_shipping" && (
                <div className="space-y-1.5">
                  <Label>{form.kind === "percent" ? "النسبة %" : "المبلغ"}</Label>
                  <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>الحد الأدنى للسلة</Label>
                <Input value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>أقصى خصم (اختياري)</Label>
                <Input value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>عدد مرات الاستخدام (اختياري)</Label>
                <Input value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit}>حفظ</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              <TH>الكود</TH>
              <TH>النوع</TH>
              <TH>القيمة</TH>
              <TH>الحد الأدنى</TH>
              <TH>الاستخدام</TH>
              <TH>الحالة</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR>
                <TD colSpan={7} className="text-center text-muted-foreground py-8">
                  <Ticket className="h-6 w-6 mx-auto mb-2 opacity-50" /> لا توجد كوبونات.
                </TD>
              </TR>
            ) : (
              list.map((c) => (
                <TR key={c.id}>
                  <TD className="font-mono font-bold">{c.code}</TD>
                  <TD><Badge>{KIND_LABEL[c.kind]}</Badge></TD>
                  <TD className="tabular-nums">{c.kind === "percent" ? `${c.value}%` : c.kind === "fixed" ? money(c.value) : "—"}</TD>
                  <TD className="tabular-nums">{money(c.min_subtotal)}</TD>
                  <TD className="tabular-nums">{c.times_used}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</TD>
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
