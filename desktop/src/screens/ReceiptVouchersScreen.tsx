import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Voucher {
  id: string;
  voucher_number: number;
  voucher_date: string;
  amount: number;
  method: string | null;
  description: string | null;
  reference: string | null;
}

export function ReceiptVouchersScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Voucher[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    method: "cash",
    description: "",
    reference: "",
  });

  const refresh = useCallback(async () => {
    if (!user) return;
    const [vouchers, cs] = await Promise.all([
      unwrap(
        api().db.list<Voucher>("receipt_vouchers", {
          tenantId: user.tenant_id,
          orderBy: "voucher_date DESC, voucher_number DESC",
          limit: 500,
        }),
      ),
      unwrap(api().db.list<any>("clients", { tenantId: user.tenant_id, limit: 1000 })),
    ]);
    setList(vouchers ?? []);
    setClients((cs ?? []).map((c: any) => ({ id: c.id, name: c.name })));
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("اكتب مبلغ صحيح");
      return;
    }
    try {
      await unwrap(
        api().accounting.saveReceipt({
          tenant_id: user.tenant_id,
          user_id: user.id,
          client_id: form.client_id || null,
          amount,
          method: form.method,
          description: form.description || null,
          reference: form.reference || null,
        }),
      );
      toast.success("تم تسجيل الإيصال");
      setOpen(false);
      setForm({ client_id: "", amount: "", method: "cash", description: "", reference: "" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> إيصال قبض جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إيصال قبض</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>العميل (اختياري)</Label>
                <select
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm"
                >
                  <option value="">— بدون عميل —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>المبلغ</Label>
                <Input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>طريقة الدفع</Label>
                <Input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>البيان</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>المرجع</Label>
                <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit}>حفظ</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              <TH>الرقم</TH>
              <TH>التاريخ</TH>
              <TH>المبلغ</TH>
              <TH>طريقة الدفع</TH>
              <TH>البيان</TH>
              <TH>المرجع</TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-center text-muted-foreground py-8">
                  <Receipt className="h-6 w-6 mx-auto mb-2 opacity-50" /> لا توجد إيصالات.
                </TD>
              </TR>
            ) : (
              list.map((v) => (
                <TR key={v.id}>
                  <TD className="font-medium">#{v.voucher_number}</TD>
                  <TD>{arDate(v.voucher_date)}</TD>
                  <TD className="tabular-nums text-[hsl(var(--success))] font-semibold">{money(v.amount)}</TD>
                  <TD>{v.method || "—"}</TD>
                  <TD className="text-muted-foreground">{v.description || "—"}</TD>
                  <TD className="text-muted-foreground">{v.reference || "—"}</TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
