import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Gift, Trash2, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface GiftCard {
  id: string;
  code: string;
  issued_to_name: string | null;
  issued_to_phone: string | null;
  initial_balance: number;
  current_balance: number;
  is_active: number;
  expires_at: string | null;
  created_at: string;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "GC-";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function GiftCardsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<GiftCard[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", phone: "", amount: "100", expires_at: "" });

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(api().db.list<GiftCard>("gift_cards", {
      tenantId: user.tenant_id, limit: 500, orderBy: "created_at DESC",
    }));
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("أدخل قيمة صحيحة");
      return;
    }
    const code = (form.code || generateCode()).toUpperCase();
    try {
      await unwrap(api().db.insert("gift_cards", {
        tenant_id: user.tenant_id,
        code,
        issued_to_name: form.name || null,
        issued_to_phone: form.phone || null,
        initial_balance: amount,
        current_balance: amount,
        expires_at: form.expires_at || null,
        is_active: 1,
        issued_by: user.id,
      }));
      toast.success("تم إصدار البطاقة");
      setOpen(false);
      setForm({ code: "", name: "", phone: "", amount: "100", expires_at: "" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success("تم النسخ"));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> إصدار بطاقة هدية</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>بطاقة هدية جديدة</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>الكود (اتركه فارغ للتوليد تلقائي)</Label>
                <Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="font-mono" />
              </div>
              <div>
                <Label>القيمة</Label>
                <Input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label>اسم المستفيد</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>هاتف المستفيد</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>ينتهي في (اختياري)</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit}>إصدار</Button>
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
              <TH>المستفيد</TH>
              <TH>القيمة الأصلية</TH>
              <TH>الرصيد الحالي</TH>
              <TH>صلاحية</TH>
              <TH>الحالة</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR><TD colSpan={7} className="text-center text-muted-foreground py-8">
                <Gift className="h-6 w-6 mx-auto opacity-50 mb-2" /> لا توجد بطاقات.
              </TD></TR>
            ) : (
              list.map((c) => (
                <TR key={c.id}>
                  <TD className="font-mono text-sm flex items-center gap-1">
                    {c.code}
                    <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground p-0.5"><Copy className="h-3 w-3" /></button>
                  </TD>
                  <TD>{c.issued_to_name || "—"}</TD>
                  <TD className="tabular-nums">{money(c.initial_balance)}</TD>
                  <TD className="tabular-nums font-bold">{money(c.current_balance)}</TD>
                  <TD>{c.expires_at || "—"}</TD>
                  <TD>
                    {c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date()) && c.current_balance > 0
                      ? <Badge variant="success">مفعّلة</Badge>
                      : <Badge variant="muted">منتهية</Badge>}
                  </TD>
                  <TD>
                    <button onClick={async () => {
                      if (!confirm("حذف البطاقة؟")) return;
                      await unwrap(api().db.remove("gift_cards", c.id));
                      refresh();
                    }} className="p-1 text-destructive"><Trash2 className="h-4 w-4" /></button>
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
