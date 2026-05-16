import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Invoice {
  id: string;
  number: number | null;
  total: number;
  paid: number;
  remaining: number;
  status: string;
  created_at: string;
}

export function InvoicesListScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<Invoice[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(api().db.list<Invoice>("invoices", { tenantId: user.tenant_id, limit: 500 }));
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <Card className="p-0 overflow-hidden">
      <DataTable>
        <THead>
          <TR>
            <TH>الرقم</TH>
            <TH>التاريخ</TH>
            <TH>الإجمالي</TH>
            <TH>المدفوع</TH>
            <TH>المتبقي</TH>
            <TH>الحالة</TH>
          </TR>
        </THead>
        <tbody>
          {list.length === 0 ? (
            <TR>
              <TD colSpan={6} className="text-center text-muted-foreground py-8">
                لا توجد فواتير بعد.
              </TD>
            </TR>
          ) : (
            list.map((inv) => (
              <TR key={inv.id}>
                <TD className="font-medium">#{inv.number ?? inv.id.slice(0, 6)}</TD>
                <TD>{arDate(inv.created_at)}</TD>
                <TD className="tabular-nums">{money(inv.total)}</TD>
                <TD className="tabular-nums">{money(inv.paid)}</TD>
                <TD className={`tabular-nums ${inv.remaining > 0 ? "text-destructive" : "text-[hsl(var(--success))]"}`}>
                  {money(inv.remaining)}
                </TD>
                <TD>
                  {inv.remaining <= 0 ? (
                    <Badge variant="success">مدفوعة</Badge>
                  ) : (
                    <Badge variant="warning">مفتوحة</Badge>
                  )}
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </DataTable>
    </Card>
  );
}
