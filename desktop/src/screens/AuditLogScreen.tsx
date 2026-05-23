import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { api, unwrap } from "@/lib/ipc";
import { arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface AuditRow {
  id: number;
  user_id: string | null;
  action: string;
  data: string | null;
  timestamp: string;
}

export function AuditLogScreen() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [verify, setVerify] = useState<{ ok: boolean; total: number; brokenAt?: number } | null>(null);

  const refresh = useCallback(async () => {
    const [list, v] = await Promise.all([
      unwrap(api().security.recentAudit({ limit: 200 })),
      unwrap(api().security.verifyAuditChain()),
    ]);
    setRows((list as AuditRow[]) ?? []);
    setVerify(v);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {verify?.ok ? (
              <Badge variant="success" className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /> سلسلة آمنة ({verify.total} حدث)
              </Badge>
            ) : verify ? (
              <Badge variant="destructive" className="gap-1.5">
                <ShieldAlert className="h-4 w-4" /> السلسلة مكسورة عند #{verify.brokenAt}
              </Badge>
            ) : null}
            <p className="text-sm text-muted-foreground">
              كل حدث مربوط بحدث قبله عبر HMAC-SHA256، أي تعديل يكسر السلسلة كلها.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" /> تحديث
          </Button>
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>الوقت</TH>
              <TH>الحدث</TH>
              <TH>المستخدم</TH>
              <TH>تفاصيل</TH>
            </TR>
          </THead>
          <tbody>
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={5} className="text-center text-muted-foreground py-8">
                  لا توجد أحداث.
                </TD>
              </TR>
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD className="tabular-nums">{r.id}</TD>
                  <TD>{arDate(r.timestamp)}</TD>
                  <TD>
                    <code className="text-xs font-mono">{r.action}</code>
                  </TD>
                  <TD className="text-muted-foreground text-xs">{r.user_id?.slice(0, 8) || "—"}</TD>
                  <TD className="text-muted-foreground text-xs truncate max-w-md">
                    {r.data || "—"}
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
