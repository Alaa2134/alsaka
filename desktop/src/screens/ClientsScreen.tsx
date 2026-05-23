import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2, UserCircle } from "lucide-react";
import { CustomerProfile } from "@/components/clients/CustomerProfile";
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

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
  credit_limit: number;
}

export function ClientsScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const [list, setList] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", credit_limit: "" });

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const data = await unwrap(api().db.list<Client>("clients", { tenantId, limit: 1000 }));
    setList(data ?? []);
  }, [tenantId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").includes(q) ||
        (c.email || "").toLowerCase().includes(q),
    );
  }, [list, query]);

  const submit = async () => {
    if (!user || !form.name.trim()) {
      toast.error("اكتب اسم العميل");
      return;
    }
    try {
      await unwrap(
        api().db.insert("clients", {
          tenant_id: user.tenant_id,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          credit_limit: Number(form.credit_limit) || 0,
          balance: 0,
        }),
      );
      toast.success("تم إضافة العميل");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", credit_limit: "" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا العميل؟")) return;
    await unwrap(api().db.remove("clients", id));
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
              <Plus className="h-4 w-4" /> عميل جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>عميل جديد</DialogTitle>
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
                <Label>سقف الائتمان</Label>
                <Input
                  value={form.credit_limit}
                  onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
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
              <TH>الرصيد</TH>
              <TH>سقف الائتمان</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-center text-muted-foreground py-8">
                  لا يوجد عملاء.
                </TD>
              </TR>
            ) : (
              filtered.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="tabular-nums">{c.phone || "—"}</TD>
                  <TD>{c.email || "—"}</TD>
                  <TD className="tabular-nums">{money(c.balance)}</TD>
                  <TD className="tabular-nums">{money(c.credit_limit)}</TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 text-primary hover:bg-primary/10 rounded"
                        onClick={() => setProfileId(c.id)}
                        title="ملف العميل"
                      >
                        <UserCircle className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 text-destructive hover:bg-destructive/10 rounded"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>

      {profileId && (
        <CustomerProfile tenantId={tenantId} clientId={profileId} onClose={() => setProfileId(null)} />
      )}
    </div>
  );
}
