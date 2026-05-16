import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
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

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  balance: number;
}

export function SuppliersScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const [list, setList] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", tax_number: "" });

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const data = await unwrap(api().db.list<Supplier>("suppliers", { tenantId, limit: 1000 }));
    setList(data ?? []);
  }, [tenantId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone || "").includes(q) ||
        (s.email || "").toLowerCase().includes(q),
    );
  }, [list, query]);

  const submit = async () => {
    if (!user || !form.name.trim()) {
      toast.error("اكتب اسم المورد");
      return;
    }
    try {
      await unwrap(
        api().db.insert("suppliers", {
          tenant_id: user.tenant_id,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          tax_number: form.tax_number.trim() || null,
          balance: 0,
        }),
      );
      toast.success("تم إضافة المورد");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", tax_number: "" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المورد؟")) return;
    await unwrap(api().db.remove("suppliers", id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الهاتف"
            className="pr-10"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> مورد جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>مورد جديد</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>البريد</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الرقم الضريبي</Label>
                <Input
                  value={form.tax_number}
                  onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
                />
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
              <TH>الاسم</TH>
              <TH>الهاتف</TH>
              <TH>البريد</TH>
              <TH>الرقم الضريبي</TH>
              <TH>الرصيد</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-center text-muted-foreground py-8">
                  لا يوجد موردون.
                </TD>
              </TR>
            ) : (
              filtered.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium">{s.name}</TD>
                  <TD className="tabular-nums">{s.phone || "—"}</TD>
                  <TD>{s.email || "—"}</TD>
                  <TD className="tabular-nums">{s.tax_number || "—"}</TD>
                  <TD className="tabular-nums">{money(s.balance)}</TD>
                  <TD>
                    <button
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      onClick={() => remove(s.id)}
                    >
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
