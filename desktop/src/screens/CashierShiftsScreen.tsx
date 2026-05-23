import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Square, FileText, Banknote, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money, arDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

interface Shift {
  id: string;
  user_id: string;
  user_name?: string | null;
  user_email?: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_in: number;
  cash_out: number;
  total_sales: number;
  total_returns: number;
  invoice_count: number;
  difference: number | null;
}

export function CashierShiftsScreen() {
  const { user } = useAuth();
  const [active, setActive] = useState<Shift | null>(null);
  const [list, setList] = useState<Shift[]>([]);
  const [openingCash, setOpeningCash] = useState("0");
  const [closingCash, setClosingCash] = useState("");
  const [cashOut, setCashOut] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [a, l] = await Promise.all([
        unwrap(api().shifts.active(user.id)),
        unwrap(api().shifts.list({ tenantId: user.tenant_id, limit: 50 })),
      ]);
      setActive(a as Shift | null);
      setList((l as Shift[]) ?? []);
    } catch (err) {
      console.warn(err);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const open = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const r = await unwrap(api().shifts.open({
        tenantId: user.tenant_id,
        userId: user.id,
        openingCash: Number(openingCash) || 0,
        notes,
      }));
      if (!r.ok) {
        toast.error(r.error === "shift-already-open" ? "يوجد وردية مفتوحة بالفعل" : (r.error || ""));
        return;
      }
      toast.success("تم فتح الوردية");
      setOpeningCash("0");
      setNotes("");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const xReport = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const r = await unwrap(api().shifts.xReport(active.id));
      setActive(r as Shift);
      toast.success("تم تحديث X-Report");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (!active) return;
    const cash = Number(closingCash);
    if (!Number.isFinite(cash)) {
      toast.error("أدخل النقدية الفعلية");
      return;
    }
    if (!confirm(`تأكيد قفل الوردية بنقدية ${money(cash)}؟`)) return;
    setBusy(true);
    try {
      const r = await unwrap(api().shifts.close({
        shiftId: active.id,
        closingCash: cash,
        cashOut: Number(cashOut) || 0,
        notes,
      }));
      if (!r.ok) {
        toast.error(r.error || "تعذر القفل");
        return;
      }
      toast.success("تم قفل الوردية ✓");
      setActive(null);
      setClosingCash("");
      setCashOut("0");
      setNotes("");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {active ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" /> الوردية المفتوحة
              </CardTitle>
              <Badge variant="success">مفتوحة</Badge>
            </div>
            <p className="text-xs text-muted-foreground">منذ {arDate(active.opened_at)}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-5">
              <Tile label="رأس المال" value={money(active.opening_cash)} />
              <Tile label="المبيعات" value={money(active.total_sales)} color="text-[hsl(var(--success))]" />
              <Tile label="المرتجعات" value={money(active.total_returns)} color="text-destructive" />
              <Tile label="عدد الفواتير" value={String(active.invoice_count)} />
              <Tile label="نقدية مستحقة" value={money((active.opening_cash || 0) + (active.cash_in || 0))} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>صرفيات (Cash Out)</Label>
                <Input inputMode="decimal" value={cashOut} onChange={(e) => setCashOut(e.target.value)} />
              </div>
              <div>
                <Label>النقدية الفعلية في الدرج</Label>
                <Input inputMode="decimal" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} placeholder="عند القفل" />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={close} disabled={busy} variant="destructive">
                <Square className="h-4 w-4" /> قفل الوردية (Z Report)
              </Button>
              <Button onClick={xReport} variant="outline" disabled={busy}>
                <RefreshCw className="h-4 w-4" /> تحديث X-Report
              </Button>
              <Button variant="outline" onClick={() => window.electronAPI?.print()}>
                <FileText className="h-4 w-4" /> طباعة
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>فتح وردية جديدة</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>رأس مال الدرج (افتتاح)</Label>
                <Input inputMode="decimal" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>ملاحظات</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <Button onClick={open} disabled={busy} className="mt-3">
              <Play className="h-4 w-4" /> فتح وردية
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="font-semibold">الورديات الأخيرة</h3></div>
        <DataTable>
          <THead>
            <TR>
              <TH>الفتح</TH>
              <TH>القفل</TH>
              <TH>الموظف</TH>
              <TH>المبيعات</TH>
              <TH>عدد الفواتير</TH>
              <TH>الفرق</TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR><TD colSpan={6} className="text-center text-muted-foreground py-8">لا توجد ورديات بعد.</TD></TR>
            ) : (
              list.map((s) => (
                <TR key={s.id}>
                  <TD>{arDate(s.opened_at)}</TD>
                  <TD>{s.closed_at ? arDate(s.closed_at) : <Badge variant="success">مفتوحة</Badge>}</TD>
                  <TD>{s.user_name || s.user_email || "—"}</TD>
                  <TD className="tabular-nums">{money(s.total_sales)}</TD>
                  <TD className="tabular-nums">{s.invoice_count}</TD>
                  <TD className="tabular-nums">
                    {s.difference == null ? "—" : (
                      <Badge variant={Math.abs(s.difference) < 0.01 ? "success" : s.difference < 0 ? "destructive" : "warning"}>
                        {s.difference > 0 ? "+" : ""}{money(s.difference)}
                      </Badge>
                    )}
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

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tabular-nums mt-1 ${color || ""}`}>{value}</div>
    </div>
  );
}
