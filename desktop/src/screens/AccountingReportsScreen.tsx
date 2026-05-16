import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { money } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balanceDebit: number;
  balanceCredit: number;
}

export function AccountingReportsScreen() {
  const { user } = useAuth();
  const tenantId = user?.tenant_id;
  const [tb, setTb] = useState<{ rows: TrialBalanceRow[]; totals: any } | null>(null);
  const [is, setIs] = useState<any>(null);
  const [bs, setBs] = useState<any>(null);
  const [aging, setAging] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [t, i, b, a] = await Promise.all([
      unwrap(api().accounting.trialBalance({ tenantId })),
      unwrap(api().accounting.incomeStatement({ tenantId })),
      unwrap(api().accounting.balanceSheet({ tenantId })),
      unwrap(api().accounting.arAging({ tenantId })),
    ]);
    setTb(t);
    setIs(i);
    setBs(b);
    setAging(a);
  }, [tenantId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">التقارير المحاسبية</h2>
        <Button variant="outline" size="sm" onClick={() => window.electronAPI?.print()}>
          <Printer className="h-4 w-4" /> طباعة
        </Button>
      </div>
      <Tabs defaultValue="trial">
        <TabsList>
          <TabsTrigger value="trial">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="income">قائمة الدخل</TabsTrigger>
          <TabsTrigger value="balance">الميزانية</TabsTrigger>
          <TabsTrigger value="aging">أعمار الديون</TabsTrigger>
        </TabsList>

        <TabsContent value="trial">
          {!tb ? (
            <Spinner />
          ) : (
            <DataTable>
              <THead>
                <TR>
                  <TH>الكود</TH>
                  <TH>الحساب</TH>
                  <TH>مدين الحركة</TH>
                  <TH>دائن الحركة</TH>
                  <TH>رصيد مدين</TH>
                  <TH>رصيد دائن</TH>
                </TR>
              </THead>
              <tbody>
                {tb.rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-mono text-xs tabular-nums">{r.code}</TD>
                    <TD>{r.name}</TD>
                    <TD className="tabular-nums">{money(r.debit)}</TD>
                    <TD className="tabular-nums">{money(r.credit)}</TD>
                    <TD className="tabular-nums">{money(r.balanceDebit)}</TD>
                    <TD className="tabular-nums">{money(r.balanceCredit)}</TD>
                  </TR>
                ))}
                <TR>
                  <TD className="font-bold" colSpan={2}>
                    الإجمالي
                  </TD>
                  <TD className="font-bold tabular-nums">{money(tb.totals.debit)}</TD>
                  <TD className="font-bold tabular-nums">{money(tb.totals.credit)}</TD>
                  <TD className="font-bold tabular-nums">{money(tb.totals.balanceDebit)}</TD>
                  <TD className="font-bold tabular-nums">{money(tb.totals.balanceCredit)}</TD>
                </TR>
              </tbody>
            </DataTable>
          )}
        </TabsContent>

        <TabsContent value="income">
          {!is ? (
            <Spinner />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">الإيرادات</h3>
                <ul className="divide-y divide-border">
                  {is.revenue.map((r: any) => (
                    <li key={r.id} className="py-1.5 flex justify-between text-sm">
                      <span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums ml-2">{r.code}</span>
                        {r.name}
                      </span>
                      <span className="tabular-nums">{money(r.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                  <span>إجمالي الإيرادات</span>
                  <span className="tabular-nums text-[hsl(var(--success))]">{money(is.totalRevenue)}</span>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold mb-3">المصروفات</h3>
                <ul className="divide-y divide-border">
                  {is.expenses.map((r: any) => (
                    <li key={r.id} className="py-1.5 flex justify-between text-sm">
                      <span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums ml-2">{r.code}</span>
                        {r.name}
                      </span>
                      <span className="tabular-nums">{money(r.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
                  <span>إجمالي المصروفات</span>
                  <span className="tabular-nums text-destructive">{money(is.totalExpenses)}</span>
                </div>
              </Card>
              <Card className="p-5 md:col-span-2 gradient-primary text-primary-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">صافي الربح/الخسارة</span>
                  <span className="text-2xl font-bold tabular-nums">{money(is.netIncome)}</span>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="balance">
          {!bs ? (
            <Spinner />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">الأصول</h3>
                <SectionList rows={bs.assets} total={bs.totalAssets} totalLabel="إجمالي الأصول" />
              </Card>
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">الالتزامات</h3>
                  <SectionList rows={bs.liabilities} total={bs.totalLiabilities} totalLabel="إجمالي الالتزامات" />
                </Card>
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">حقوق الملكية</h3>
                  <SectionList rows={bs.equity} total={bs.totalEquity} totalLabel="إجمالي حقوق الملكية" />
                </Card>
              </div>
              <Card className={`p-5 md:col-span-2 ${bs.balanced ? "gradient-success" : "bg-destructive"} text-primary-foreground`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    {bs.balanced ? "✓ الميزانية متوازنة" : "✗ الميزانية غير متوازنة"}
                  </span>
                  <span className="tabular-nums">
                    {money(bs.totalAssets)} = {money(bs.totalLiabilitiesAndEquity)}
                  </span>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="aging">
          {!aging ? (
            <Spinner />
          ) : (
            <DataTable>
              <THead>
                <TR>
                  <TH>العميل</TH>
                  <TH>الهاتف</TH>
                  <TH>المتأخر</TH>
                  <TH>عمر أقدم فاتورة (يوم)</TH>
                  <TH>الفئة</TH>
                </TR>
              </THead>
              <tbody>
                {aging.length === 0 ? (
                  <TR>
                    <TD colSpan={5} className="text-center text-muted-foreground py-8">
                      لا توجد ديون مفتوحة 🎉
                    </TD>
                  </TR>
                ) : (
                  aging.map((r) => (
                    <TR key={r.id}>
                      <TD className="font-medium">{r.name}</TD>
                      <TD className="tabular-nums">{r.phone || "—"}</TD>
                      <TD className="tabular-nums text-destructive">{money(r.open_total)}</TD>
                      <TD className="tabular-nums">{r.days}</TD>
                      <TD>
                        <Badge
                          variant={
                            r.bucket === "90+"
                              ? "destructive"
                              : r.bucket === "61-90"
                              ? "warning"
                              : r.bucket === "31-60"
                              ? "warning"
                              : "muted"
                          }
                        >
                          {r.bucket === "current" ? "ضمن المدة" : r.bucket}
                        </Badge>
                      </TD>
                    </TR>
                  ))
                )}
              </tbody>
            </DataTable>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function SectionList({
  rows,
  total,
  totalLabel,
}: {
  rows: Array<{ id: string; code: string; name: string; amount: number }>;
  total: number;
  totalLabel: string;
}) {
  return (
    <>
      <ul className="divide-y divide-border">
        {rows.length === 0 ? (
          <li className="py-2 text-sm text-muted-foreground">لا توجد أرصدة</li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="py-1.5 flex justify-between text-sm">
              <span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums ml-2">{r.code}</span>
                {r.name}
              </span>
              <span className="tabular-nums">{money(r.amount)}</span>
            </li>
          ))
        )}
      </ul>
      <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold">
        <span>{totalLabel}</span>
        <span className="tabular-nums">{money(total)}</span>
      </div>
    </>
  );
}
