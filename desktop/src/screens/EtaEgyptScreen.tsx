import { useCallback, useEffect, useState } from "react";
import { Flag, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { money, arDate } from "@/lib/format";

export function EtaEgyptScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const s = await unwrap(api().eta.list({ tenantId: user.tenant_id, limit: 100 }));
      setList(s ?? []);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { refresh().catch(() => undefined); }, [refresh]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5" /> ETA Egypt (مصلحة الضرائب)</CardTitle>
          <CardDescription>
            تكامل الفاتورة الإلكترونية المصرية. اضبط بيانات OAuth وبيانات الممول في "إعدادات الشركة" بالمفاتيح:
            <code className="font-mono text-xs ml-2">eta.tax_id, eta.client_id, eta.client_secret, eta.mode (preprod/prod)</code>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border"><h2 className="font-semibold">سجل الإرسالات</h2></div>
        <DataTable>
          <THead>
            <TR><TH>التاريخ</TH><TH>الفاتورة</TH><TH>Internal ID</TH><TH>الإجمالي</TH><TH>الحالة</TH><TH>ETA UUID</TH></TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR><TD colSpan={6} className="text-center text-muted-foreground py-8">
                <FileText className="h-6 w-6 mx-auto opacity-50 mb-2" /> لا توجد إرسالات بعد.
              </TD></TR>
            ) : (
              list.map((s) => (
                <TR key={s.id}>
                  <TD>{arDate(s.created_at)}</TD>
                  <TD>#{s.invoice_number}</TD>
                  <TD className="font-mono text-xs">{s.internal_id}</TD>
                  <TD className="tabular-nums">{money(s.invoice_total)}</TD>
                  <TD>
                    <Badge variant={s.submission_status === "submitted" ? "success" : s.submission_status === "rejected" ? "destructive" : "warning"}>
                      {s.submission_status}
                    </Badge>
                  </TD>
                  <TD className="text-xs font-mono">{s.eta_uuid?.slice(0, 16) || "—"}</TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
