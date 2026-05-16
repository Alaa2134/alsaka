import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface JournalEntry {
  id: string;
  entry_number: number | null;
  entry_date: string;
  reference: string | null;
  description: string | null;
  source_type: string | null;
  total_debit: number;
  total_credit: number;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "يدوي",
  sales_invoice: "فاتورة مبيعات",
  sales_invoice_cogs: "تكلفة بضاعة",
  purchase_invoice: "فاتورة مشتريات",
  receipt_voucher: "إيصال قبض",
  payment_voucher: "إيصال صرف",
  opening: "افتتاحي",
};

export function JournalsScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<JournalEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<JournalEntry>("journal_entries", {
        tenantId: user.tenant_id,
        orderBy: "entry_date DESC, entry_number DESC",
        limit: 500,
      }),
    );
    setList(data ?? []);
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">القيود اليومية</h2>
        <p className="text-xs text-muted-foreground mt-1">
          كل قيد متوازن بين المدين والدائن. القيود المرتبطة بفواتير/سندات تُنشأ تلقائيًا.
        </p>
      </div>
      <DataTable>
        <THead>
          <TR>
            <TH>الرقم</TH>
            <TH>التاريخ</TH>
            <TH>المرجع</TH>
            <TH>المصدر</TH>
            <TH>البيان</TH>
            <TH>مدين</TH>
            <TH>دائن</TH>
          </TR>
        </THead>
        <tbody>
          {list.length === 0 ? (
            <TR>
              <TD colSpan={7} className="text-center text-muted-foreground py-8">
                لا توجد قيود بعد.
              </TD>
            </TR>
          ) : (
            list.map((j) => (
              <TR key={j.id}>
                <TD className="font-medium tabular-nums">#{j.entry_number ?? j.id.slice(0, 6)}</TD>
                <TD>{arDate(j.entry_date)}</TD>
                <TD className="tabular-nums">{j.reference || "—"}</TD>
                <TD>
                  <Badge variant="muted">{SOURCE_LABEL[j.source_type || "manual"] || j.source_type}</Badge>
                </TD>
                <TD className="text-muted-foreground">{j.description || "—"}</TD>
                <TD className="tabular-nums">{money(j.total_debit)}</TD>
                <TD className="tabular-nums">{money(j.total_credit)}</TD>
              </TR>
            ))
          )}
        </tbody>
      </DataTable>
    </Card>
  );
}
