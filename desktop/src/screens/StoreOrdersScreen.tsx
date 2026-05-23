import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Order {
  id: string;
  order_number: number;
  client_name: string;
  client_phone: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
  tracking_number: string | null;
}

const STATUSES: Array<{ value: string; label: string; variant: "default" | "success" | "warning" | "destructive" | "muted" }> = [
  { value: "new", label: "جديد", variant: "default" },
  { value: "confirmed", label: "مؤكد", variant: "default" },
  { value: "preparing", label: "جاري التجهيز", variant: "warning" },
  { value: "shipped", label: "تم الشحن", variant: "warning" },
  { value: "delivered", label: "تم التسليم", variant: "success" },
  { value: "cancelled", label: "ملغي", variant: "destructive" },
  { value: "returned", label: "مرتجع", variant: "muted" },
];

export function StoreOrdersScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("");

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<Order>("store_orders", {
        tenantId: user.tenant_id,
        orderBy: "created_at DESC",
        limit: 500,
      }),
    );
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const setStatus = async (orderId: string, status: string) => {
    if (!user) return;
    try {
      await unwrap(
        api().store.updateOrderStatus({
          tenantId: user.tenant_id,
          orderId,
          status,
          userId: user.id,
        }),
      );
      toast.success("تم تحديث الحالة");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const filtered = filter ? list.filter((o) => o.status === filter) : list;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "" ? "default" : "outline"} size="sm" onClick={() => setFilter("")}>
          الكل ({list.length})
        </Button>
        {STATUSES.map((s) => {
          const count = list.filter((o) => o.status === s.value).length;
          return (
            <Button
              key={s.value}
              variant={filter === s.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s.value)}
            >
              {s.label} ({count})
            </Button>
          );
        })}
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              <TH>الرقم</TH>
              <TH>التاريخ</TH>
              <TH>العميل</TH>
              <TH>الهاتف</TH>
              <TH>الإجمالي</TH>
              <TH>الحالة</TH>
              <TH>الدفع</TH>
              <TH>التتبع</TH>
              <TH>تغيير الحالة</TH>
            </TR>
          </THead>
          <tbody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={9} className="text-center text-muted-foreground py-8">
                  <ShoppingBag className="h-6 w-6 mx-auto mb-2 opacity-50" /> لا توجد طلبات.
                </TD>
              </TR>
            ) : (
              filtered.map((o) => {
                const status = STATUSES.find((s) => s.value === o.status);
                return (
                  <TR key={o.id}>
                    <TD className="font-medium">#{o.order_number}</TD>
                    <TD>{arDate(o.created_at)}</TD>
                    <TD>{o.client_name || "—"}</TD>
                    <TD className="tabular-nums" dir="ltr">{o.client_phone || "—"}</TD>
                    <TD className="tabular-nums font-semibold">{money(o.total)}</TD>
                    <TD>
                      {status ? <Badge variant={status.variant}>{status.label}</Badge> : <Badge variant="muted">{o.status}</Badge>}
                    </TD>
                    <TD>
                      <Badge variant={o.payment_status === "paid" ? "success" : "warning"}>
                        {o.payment_status === "paid" ? "مدفوع" : "غير مدفوع"}
                      </Badge>
                    </TD>
                    <TD className="tabular-nums text-xs">{o.tracking_number || "—"}</TD>
                    <TD>
                      <select
                        value={o.status}
                        onChange={(e) => setStatus(o.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-2 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </TD>
                  </TR>
                );
              })
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
