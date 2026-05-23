import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Pause, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Held {
  id: string;
  label: string;
  client_id: string | null;
  data_json: string;
  created_at: string;
}

export function HeldInvoicesScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Held[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(api().db.list<Held>("held_invoices", {
      tenantId: user.tenant_id,
      orderBy: "created_at DESC",
      limit: 200,
    }));
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const remove = async (id: string) => {
    if (!confirm("حذف الفاتورة المعلقة؟")) return;
    await unwrap(api().db.remove("held_invoices", id));
    refresh();
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2"><Pause className="h-5 w-5" /> الفواتير المعلقة</h2>
        <p className="text-xs text-muted-foreground mt-1">احفظ فاتورة مؤقتًا (Hold) واستردها لاحقًا من نفس مكانك.</p>
      </div>
      <DataTable>
        <THead>
          <TR>
            <TH>الوصف</TH>
            <TH>التاريخ</TH>
            <TH>عدد الأصناف</TH>
            <TH></TH>
          </TR>
        </THead>
        <tbody>
          {list.length === 0 ? (
            <TR><TD colSpan={4} className="text-center text-muted-foreground py-8">لا توجد فواتير معلقة.</TD></TR>
          ) : (
            list.map((h) => {
              let items = 0;
              try { items = (JSON.parse(h.data_json)?.rows || []).length; } catch { /* ignore */ }
              return (
                <TR key={h.id}>
                  <TD className="font-medium">{h.label || "بدون وصف"}</TD>
                  <TD>{arDate(h.created_at)}</TD>
                  <TD className="tabular-nums">{items}</TD>
                  <TD>
                    <button
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      onClick={() => remove(h.id)}
                    ><Trash2 className="h-4 w-4" /></button>
                  </TD>
                </TR>
              );
            })
          )}
        </tbody>
      </DataTable>
    </Card>
  );
}
