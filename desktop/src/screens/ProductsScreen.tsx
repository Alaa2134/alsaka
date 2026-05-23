import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  item_number: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  is_active: number | boolean;
  updated_at: string;
}

export function ProductsScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const [list, setList] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    barcode: "",
    item_number: "",
    price: "",
    cost: "",
    stock: "",
    min_stock: "",
  });

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const data = await unwrap(api().db.list<Product>("products", { tenantId, limit: 1000 }));
    setList(data ?? []);
  }, [tenantId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || "").includes(q) ||
        (p.item_number || "").toLowerCase().includes(q),
    );
  }, [list, query]);

  const submit = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("اكتب اسم المنتج");
      return;
    }
    try {
      await unwrap(
        api().db.insert("products", {
          tenant_id: user.tenant_id,
          name: form.name.trim(),
          barcode: form.barcode.trim() || null,
          item_number: form.item_number.trim() || null,
          price: Number(form.price) || 0,
          cost: Number(form.cost) || 0,
          stock: Number(form.stock) || 0,
          min_stock: Number(form.min_stock) || 0,
        }),
      );
      toast.success("تم إضافة المنتج");
      setOpen(false);
      setForm({ name: "", barcode: "", item_number: "", price: "", cost: "", stock: "", min_stock: "" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا المنتج؟")) return;
    try {
      await unwrap(api().db.remove("products", id));
      toast.success("تم الحذف");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الباركود أو رقم الصنف"
            className="pr-10"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> إضافة منتج
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>منتج جديد</DialogTitle>
              <DialogDescription>أدخل بيانات المنتج. الحقول الفارغة تُحفظ كـ 0.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الباركود</Label>
                <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الصنف</Label>
                <Input value={form.item_number} onChange={(e) => setForm({ ...form, item_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>السعر</Label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>التكلفة</Label>
                <Input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الكمية</Label>
                <Input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الحد الأدنى</Label>
                <Input value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
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
              <TH>الباركود / رقم الصنف</TH>
              <TH>السعر</TH>
              <TH>التكلفة</TH>
              <TH>المتاح</TH>
              <TH>آخر تحديث</TH>
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={7} className="text-center text-muted-foreground py-8">
                  لا توجد منتجات.
                </TD>
              </TR>
            ) : (
              filtered.map((p) => (
                <TR key={p.id}>
                  <TD className="font-medium">{p.name}</TD>
                  <TD className="text-muted-foreground tabular-nums">
                    {p.barcode || p.item_number || "—"}
                  </TD>
                  <TD className="tabular-nums">{money(p.price)}</TD>
                  <TD className="tabular-nums">{money(p.cost)}</TD>
                  <TD className="tabular-nums">
                    {p.stock <= 0 ? (
                      <Badge variant="destructive">نفد</Badge>
                    ) : p.stock <= p.min_stock ? (
                      <Badge variant="warning">{p.stock}</Badge>
                    ) : (
                      <Badge variant="success">{p.stock}</Badge>
                    )}
                  </TD>
                  <TD className="text-xs text-muted-foreground">{arDate(p.updated_at)}</TD>
                  <TD>
                    <button
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      onClick={() => remove(p.id)}
                      aria-label="حذف"
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
